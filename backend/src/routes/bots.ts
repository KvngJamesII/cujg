import { Router } from "express";
import { db } from "@workspace/db";
import { botsTable, envVariablesTable, containerStatsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { generateId, encryptValue, decryptValue } from "../lib/auth";
import { createAndStartContainer, stopContainer, restartContainer, deleteContainer, getContainerStats, streamContainerLogs } from "../lib/docker";
import { auditLog } from "../lib/audit";
import type { Server as SocketServer } from "socket.io";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === ".zip") cb(null, true);
    else cb(new Error("Only .zip files are allowed"));
  },
});

let io: SocketServer | null = null;
export function setIo(socketIo: SocketServer) { io = socketIo; }

function formatBot(bot: typeof botsTable.$inferSelect, stats?: Partial<{ cpuPercent: number; memoryUsedMb: number; memoryLimitMb: number; uptimeSeconds: number }>) {
  return {
    id:            bot.id,
    userId:        bot.userId,
    name:          bot.name,
    runtime:       bot.runtime ?? null,
    startFile:     bot.startFile ?? null,
    plan:          (bot as any).plan ?? "basic",
    status:        bot.status,
    memoryUsedMb:  stats?.memoryUsedMb  ?? 0,
    memoryLimitMb: stats?.memoryLimitMb ?? 400,
    cpuPercent:    stats?.cpuPercent    ?? 0,
    uptimeSeconds: stats?.uptimeSeconds ?? 0,
    createdAt:     bot.createdAt.toISOString(),
    updatedAt:     bot.updatedAt.toISOString(),
  };
}

// GET /api/bots
router.get("/", requireAuth, async (req, res) => {
  const bots = await db.select().from(botsTable).where(eq(botsTable.userId, req.userId!));
  const results = await Promise.all(
    bots.map(async (bot) => {
      try { const stats = await getContainerStats(req.userId!, bot.id); return formatBot(bot, stats); }
      catch { return formatBot(bot); }
    })
  );
  res.json(results);
});

// POST /api/bots — no slot limit, plan required
router.post("/", requireAuth, async (req, res) => {
  const { name, runtime, plan } = req.body as { name: string; runtime?: "nodejs" | "python"; plan?: string };
  if (!name?.trim()) { res.status(400).json({ error: "Bot name is required" }); return; }

  const botId = generateId();
  await db.insert(botsTable).values({
    id:     botId,
    userId: req.userId!,
    name:   name.trim(),
    runtime: runtime ?? null,
    status: "not_created",
    ...(plan ? { plan } as any : {}),
  });

  await auditLog("bot.created", { userId: req.userId, req, metadata: { botId, name, plan: plan ?? "basic" } });

  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, botId)).limit(1);
  res.status(201).json(formatBot(bot));
});

// GET /api/bots/:id
router.get("/:id", requireAuth, async (req, res) => {
  const [bot] = await db.select().from(botsTable)
    .where(and(eq(botsTable.id, String(req.params.id)), eq(botsTable.userId, req.userId!))).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  try { const stats = await getContainerStats(req.userId!, bot.id); res.json(formatBot(bot, stats)); }
  catch { res.json(formatBot(bot)); }
});

// PATCH /api/bots/:id
router.patch("/:id", requireAuth, async (req, res) => {
  const [bot] = await db.select().from(botsTable)
    .where(and(eq(botsTable.id, String(req.params.id)), eq(botsTable.userId, req.userId!))).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  const { name, startFile, plan, runtime } = req.body as { name?: string; startFile?: string; plan?: string; runtime?: "nodejs" | "python" };
  const updates: Record<string,any> = { updatedAt: new Date() };
  if (name)      updates.name      = name.trim();
  if (startFile) {
    const sf = startFile.trim();
    const botRuntime = runtime ?? bot.runtime;
    const ext = sf.includes(".") ? "." + sf.split(".").pop() : "";
    const validNode = [".js", ".mjs", ".cjs"];
    const validPy = [".py"];
    if (botRuntime === "python" && !validPy.includes(ext)) {
      res.status(400).json({ error: "Python panels require a .py startup file" }); return;
    }
    if (botRuntime === "nodejs" && !validNode.includes(ext)) {
      res.status(400).json({ error: "Node.js panels require a .js, .mjs, or .cjs startup file" }); return;
    }
    updates.startFile = sf;
  }
  if (plan && ["basic","pro"].includes(plan)) updates.plan = plan;
  if (runtime && ["nodejs","python"].includes(runtime)) {
    updates.runtime = runtime;
    if (bot.status === "not_created") {
      updates.status = "stopped";
    }
  }

  await db.update(botsTable).set(updates as any).where(eq(botsTable.id, bot.id));
  await auditLog("bot.updated", { userId: req.userId, req, metadata: { botId: bot.id } });
  const [updated] = await db.select().from(botsTable).where(eq(botsTable.id, bot.id)).limit(1);
  res.json(formatBot(updated));
});

// DELETE /api/bots/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const [bot] = await db.select().from(botsTable)
    .where(and(eq(botsTable.id, String(req.params.id)), eq(botsTable.userId, req.userId!))).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }

  await deleteContainer(req.userId!, bot.id);
  // Remove bot files
  const botDir = `/home/bots/${req.userId}/${bot.id}`;
  try { fs.rmSync(botDir, { recursive: true, force: true }); } catch {}
  await db.delete(envVariablesTable).where(eq(envVariablesTable.botId, bot.id));
  await db.delete(containerStatsTable).where(eq(containerStatsTable.botId, bot.id));
  await db.delete(botsTable).where(eq(botsTable.id, bot.id));
  await auditLog("bot.deleted", { userId: req.userId, req, metadata: { botId: bot.id, name: bot.name } });
  res.json({ message: "Bot deleted" });
});

// POST /api/bots/:id/start
router.post("/:id/start", requireAuth, async (req, res) => {
  const [bot] = await db.select().from(botsTable)
    .where(and(eq(botsTable.id, String(req.params.id)), eq(botsTable.userId, req.userId!))).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  if (!bot.runtime || !bot.startFile) {
    res.status(400).json({ error: "Set a startup file in Config before starting." }); return;
  }

  const envVars = await db.select().from(envVariablesTable).where(eq(envVariablesTable.botId, bot.id));
  const envMap  = Object.fromEntries(envVars.map((e) => [e.key, decryptValue(e.valueEncrypted)]));
  const plan    = (bot as any).plan ?? "basic";

  await db.update(botsTable).set({ status: "setting_up", updatedAt: new Date() }).where(eq(botsTable.id, bot.id));
  try {
    await createAndStartContainer(req.userId!, bot.id, bot.runtime, bot.startFile, envMap, plan);
    await db.update(botsTable).set({ status: "running", updatedAt: new Date() }).where(eq(botsTable.id, bot.id));
  } catch (e: any) {
    await db.update(botsTable).set({ status: "crashed", lastError: e?.message ?? "Container start failed", updatedAt: new Date() }).where(eq(botsTable.id, bot.id));
    res.status(500).json({ error: e?.message ?? "Container failed to start" });
    return;
  }
  await auditLog("bot.started", { userId: req.userId, req, metadata: { botId: bot.id } });
  res.json({ message: "Bot started" });
});

// POST /api/bots/:id/stop
router.post("/:id/stop", requireAuth, async (req, res) => {
  const [bot] = await db.select().from(botsTable)
    .where(and(eq(botsTable.id, String(req.params.id)), eq(botsTable.userId, req.userId!))).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  await stopContainer(req.userId!, bot.id);
  await db.update(botsTable).set({ status: "stopped", updatedAt: new Date() }).where(eq(botsTable.id, bot.id));
  await auditLog("bot.stopped", { userId: req.userId, req, metadata: { botId: bot.id } });
  res.json({ message: "Bot stopped" });
});

// POST /api/bots/:id/restart
router.post("/:id/restart", requireAuth, async (req, res) => {
  const [bot] = await db.select().from(botsTable)
    .where(and(eq(botsTable.id, String(req.params.id)), eq(botsTable.userId, req.userId!))).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  await restartContainer(req.userId!, bot.id);
  await db.update(botsTable).set({ status: "running", updatedAt: new Date() }).where(eq(botsTable.id, bot.id));
  await auditLog("bot.restarted", { userId: req.userId, req, metadata: { botId: bot.id } });
  res.json({ message: "Bot restarted" });
});

// GET /api/bots/:id/stats
router.get("/:id/stats", requireAuth, async (req, res) => {
  const [bot] = await db.select().from(botsTable)
    .where(and(eq(botsTable.id, String(req.params.id)), eq(botsTable.userId, req.userId!))).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const stats = await getContainerStats(req.userId!, bot.id);
  res.json({ ...stats, recordedAt: new Date().toISOString() });
});

// GET /api/bots/:id/env
router.get("/:id/env", requireAuth, async (req, res) => {
  const [bot] = await db.select({ id: botsTable.id }).from(botsTable)
    .where(and(eq(botsTable.id, String(req.params.id)), eq(botsTable.userId, req.userId!))).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const vars = await db.select().from(envVariablesTable).where(eq(envVariablesTable.botId, bot.id));
  res.json(vars.map((v) => ({ id: v.id, key: v.key, value: "••••••••", createdAt: v.createdAt.toISOString() })));
});

// POST /api/bots/:id/env
router.post("/:id/env", requireAuth, async (req, res) => {
  const [bot] = await db.select({ id: botsTable.id }).from(botsTable)
    .where(and(eq(botsTable.id, String(req.params.id)), eq(botsTable.userId, req.userId!))).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const { key, value } = req.body as { key: string; value: string };
  if (!key?.trim() || !value) { res.status(400).json({ error: "Key and value are required" }); return; }
  const varId = generateId();
  await db.insert(envVariablesTable).values({
    id: varId, botId: bot.id, userId: req.userId!,
    key: key.trim().toUpperCase(), valueEncrypted: encryptValue(value),
  });
  await auditLog("bot.env.created", { userId: req.userId, req, metadata: { botId: bot.id, key: key.trim().toUpperCase() } });
  res.status(201).json({ id: varId, key: key.trim().toUpperCase(), value: "••••••••", createdAt: new Date().toISOString() });
});

// PATCH /api/bots/:id/env/:varId
router.patch("/:id/env/:varId", requireAuth, async (req, res) => {
  const [envVar] = await db.select().from(envVariablesTable)
    .where(and(eq(envVariablesTable.id, String(req.params.varId)), eq(envVariablesTable.userId, req.userId!))).limit(1);
  if (!envVar) { res.status(404).json({ error: "Variable not found" }); return; }
  const { key, value } = req.body as { key?: string; value?: string };
  const updates: Partial<typeof envVariablesTable.$inferInsert> = { updatedAt: new Date() };
  if (key)   updates.key            = key.trim().toUpperCase();
  if (value) updates.valueEncrypted = encryptValue(value);
  await db.update(envVariablesTable).set(updates).where(eq(envVariablesTable.id, envVar.id));
  res.json({ id: envVar.id, key: updates.key ?? envVar.key, value: "••••••••", createdAt: envVar.createdAt.toISOString() });
});

// DELETE /api/bots/:id/env/:varId
router.delete("/:id/env/:varId", requireAuth, async (req, res) => {
  const [envVar] = await db.select().from(envVariablesTable)
    .where(and(eq(envVariablesTable.id, String(req.params.varId)), eq(envVariablesTable.userId, req.userId!))).limit(1);
  if (!envVar) { res.status(404).json({ error: "Variable not found" }); return; }
  await db.delete(envVariablesTable).where(eq(envVariablesTable.id, envVar.id));
  res.json({ message: "Variable deleted" });
});

// GET /api/bots/:id/logs
router.get("/:id/logs", requireAuth, async (req, res) => {
  const [bot] = await db.select().from(botsTable)
    .where(and(eq(botsTable.id, String(req.params.id)), eq(botsTable.userId, req.userId!))).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const lines: string[] = [];
  await new Promise<void>((resolve) => {
    const stop = streamContainerLogs(req.userId!, bot.id, (line) => {
      if (line === "[stream ended]") { resolve(); return; }
      lines.push(line);
    });
    setTimeout(() => { try { stop(); } catch {} resolve(); }, 3500);
  });
  res.setHeader("Content-Type", "text/plain");
  res.send(lines.join("\n"));
});

// GET /api/bots/:id/deploy-status
router.get("/:id/deploy-status", requireAuth, async (req, res) => {
  const [bot] = await db.select().from(botsTable)
    .where(and(eq(botsTable.id, String(req.params.id)), eq(botsTable.userId, req.userId!))).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const stageMap: Record<string,string> = {
    setting_up: "install", stopped: "complete", running: "complete", crashed: "failed", not_created: "upload",
  };
  res.json({ stage: stageMap[bot.status] ?? bot.deployStage ?? "upload", queuePosition: null, error: bot.lastError ?? null });
});

// ── File Management ──────────────────────────────────────────────────────────
const fileUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function safePath(userId: string, botId: string, rel: string): string {
  const base = path.resolve(`/home/bots/${userId}/${botId}`);
  const full = path.resolve(base, String(rel ?? "").replace(/^\/+/, ""));
  if (!full.startsWith(base)) throw new Error("Path traversal denied");
  return full;
}

async function botOwner(id: string, userId: string) {
  const [bot] = await db.select({ id: botsTable.id }).from(botsTable)
    .where(and(eq(botsTable.id, id), eq(botsTable.userId, userId))).limit(1);
  return bot ?? null;
}

router.get("/:id/files", requireAuth, async (req, res) => {
  const bot = await botOwner(String(req.params.id), req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  try {
    const dir = safePath(req.userId!, bot.id, (req.query.path as string) || "/");
    if (!fs.existsSync(dir)) { res.json([]); return; }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries.map(e => {
      const fp = path.join(dir, e.name); const stat = fs.statSync(fp);
      return { name: e.name, isDir: e.isDirectory(), size: stat.size, modified: stat.mtime.toISOString() };
    }).sort((a, b) => a.isDir !== b.isDir ? (a.isDir ? -1 : 1) : a.name.localeCompare(b.name));
    res.json(files);
  } catch { res.json([]); }
});

router.get("/:id/files/content", requireAuth, async (req, res) => {
  const bot = await botOwner(String(req.params.id), req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  try {
    const fp = safePath(req.userId!, bot.id, (req.query.path as string) || "");
    res.json({ content: fs.readFileSync(fp, "utf-8") });
  } catch { res.status(400).json({ error: "Cannot read file" }); }
});

router.put("/:id/files/content", requireAuth, async (req, res) => {
  const bot = await botOwner(String(req.params.id), req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const { path: filePath, content } = req.body as { path: string; content: string };
  try { const fp = safePath(req.userId!, bot.id, filePath); fs.writeFileSync(fp, content, "utf-8"); res.json({ ok: true }); }
  catch { res.status(400).json({ error: "Cannot write file" }); }
});

router.post("/:id/files/create", requireAuth, async (req, res) => {
  const bot = await botOwner(String(req.params.id), req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const { path: filePath, type } = req.body as { path: string; type: "file" | "dir" };
  try {
    const fp = safePath(req.userId!, bot.id, filePath);
    if (type === "dir") fs.mkdirSync(fp, { recursive: true });
    else { fs.mkdirSync(path.dirname(fp), { recursive: true }); if (!fs.existsSync(fp)) fs.writeFileSync(fp, "", "utf-8"); }
    res.json({ ok: true });
  } catch { res.status(400).json({ error: "Cannot create" }); }
});

router.delete("/:id/files", requireAuth, async (req, res) => {
  const bot = await botOwner(String(req.params.id), req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const { path: filePath } = req.body as { path: string };
  try {
    const fp = safePath(req.userId!, bot.id, filePath);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) fs.rmSync(fp, { recursive: true, force: true }); else fs.unlinkSync(fp);
    res.json({ ok: true });
  } catch { res.status(400).json({ error: "Cannot delete" }); }
});

router.post("/:id/files/rename", requireAuth, async (req, res) => {
  const bot = await botOwner(String(req.params.id), req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const { from, to } = req.body as { from: string; to: string };
  try {
    fs.renameSync(safePath(req.userId!, bot.id, from), safePath(req.userId!, bot.id, to));
    res.json({ ok: true });
  } catch { res.status(400).json({ error: "Cannot rename" }); }
});

router.post("/:id/files/clone", requireAuth, async (req, res) => {
  const bot = await botOwner(String(req.params.id), req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const { path: filePath } = req.body as { path: string };
  try {
    const fp = safePath(req.userId!, bot.id, filePath);
    const dir = path.dirname(fp); const ext = path.extname(fp); const base = path.basename(fp, ext);
    const cloneFp = path.join(dir, `clone_${base}${ext}`);
    fs.copyFileSync(fp, cloneFp);
    res.json({ ok: true, cloneName: `clone_${base}${ext}` });
  } catch { res.status(400).json({ error: "Cannot clone" }); }
});

router.get("/:id/files/download", requireAuth, async (req, res) => {
  const bot = await botOwner(String(req.params.id), req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  try {
    const fp = safePath(req.userId!, bot.id, (req.query.path as string) || "");
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(fp)}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    fs.createReadStream(fp).pipe(res);
  } catch { res.status(400).json({ error: "Cannot download" }); }
});

router.post("/:id/files/upload", requireAuth, fileUpload.array("files", 50), async (req, res) => {
  const bot = await botOwner(String(req.params.id), req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  const uploadPath = (req.body.path as string) || "/";
  const files      = (req.files as Express.Multer.File[]) ?? [];
  const relPaths   = req.body.relativePaths as string[] | string | undefined;
  try {
    for (let i = 0; i < files.length; i++) {
      const f   = files[i];
      const rel = Array.isArray(relPaths) ? relPaths[i] : (relPaths ?? f.originalname);
      const fp  = safePath(req.userId!, bot.id, path.join(uploadPath, rel));
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, f.buffer);
    }
    res.json({ ok: true, uploaded: files.length });
  } catch { res.status(400).json({ error: "Upload failed" }); }
});

// POST /api/bots/:id/upload (zip deploy)
router.post("/:id/upload", requireAuth, upload.single("file"), async (req, res) => {
  const [bot] = await db.select().from(botsTable)
    .where(and(eq(botsTable.id, String(req.params.id)), eq(botsTable.userId, req.userId!))).limit(1);
  if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const startFile = (req.body.startFile as string) || null;
  let detectedRuntime: "nodejs" | "python" | null = null;
  let detectedStartFile: string | null = startFile;
  const validationResults: Array<{ status: "success"|"warning"|"error"; text: string }> = [];

  try {
    const { default: AdmZip } = await import("adm-zip").catch(() => ({ default: null })) as { default: typeof import("adm-zip") | null };
    if (AdmZip && req.file.buffer) {
      const zip     = new AdmZip(req.file.buffer);
      const entries = zip.getEntries().map((e) => e.entryName.toLowerCase());
      const hasPkg  = entries.some(e => e === "package.json" || e.endsWith("/package.json"));
      const hasReqs = entries.some(e => e === "requirements.txt" || e.endsWith("/requirements.txt"));
      if (hasPkg) {
        detectedRuntime = "nodejs";
        validationResults.push({ status:"success", text:"package.json found — Node.js bot detected" });
        const hasIndex = entries.some(e => e === "index.js" || e.endsWith("/index.js"));
        if (hasIndex) { detectedStartFile = detectedStartFile ?? "index.js"; validationResults.push({ status:"success", text:`Start file: ${detectedStartFile}` }); }
        else validationResults.push({ status:"warning", text:"Start file not detected — set it in Config tab." });
      } else if (hasReqs) {
        detectedRuntime = "python";
        validationResults.push({ status:"success", text:"requirements.txt found — Python bot detected" });
        const hasMain = entries.some(e => e === "main.py" || e.endsWith("/main.py"));
        if (hasMain) { detectedStartFile = detectedStartFile ?? "main.py"; validationResults.push({ status:"success", text:`Start file: ${detectedStartFile}` }); }
        else validationResults.push({ status:"warning", text:"Start file not detected — set it in Config tab." });
      } else {
        res.status(400).json({ error:"No package.json or requirements.txt found.", validationResults, message:"Upload failed" }); return;
      }
    } else {
      detectedRuntime = "nodejs"; detectedStartFile = detectedStartFile ?? "index.js";
      validationResults.push({ status:"success", text:"File uploaded" });
    }
  } catch {
    detectedRuntime = "nodejs"; detectedStartFile = detectedStartFile ?? "index.js";
    validationResults.push({ status:"success", text:"File uploaded" });
  }

  await db.update(botsTable).set({ runtime: detectedRuntime, startFile: detectedStartFile, status:"setting_up", deployStage:"install", updatedAt:new Date() }).where(eq(botsTable.id, bot.id));

  (async () => {
    try {
      const botDir = `/home/bots/${req.userId}/${bot.id}`;
      fs.mkdirSync(botDir, { recursive: true });
      const { default: AdmZipExtract } = await import("adm-zip").catch(() => ({ default: null })) as { default: typeof import("adm-zip") | null };
      if (AdmZipExtract && req.file?.buffer) { const zip = new AdmZipExtract(req.file.buffer); zip.extractAllTo(botDir, true); }
      await db.update(botsTable).set({ status:"stopped", deployStage:"complete", updatedAt:new Date() }).where(eq(botsTable.id, bot.id));
      io?.to(`bot:${bot.id}`).emit("deploy:complete", { botId: bot.id });
    } catch {
      await db.update(botsTable).set({ status:"stopped", deployStage:"complete", updatedAt:new Date() }).where(eq(botsTable.id, bot.id));
      io?.to(`bot:${bot.id}`).emit("deploy:complete", { botId: bot.id });
    }
  })();

  await auditLog("bot.uploaded", { userId: req.userId, req, metadata: { botId: bot.id, runtime: detectedRuntime } });
  res.json({ message:"Upload received. Deploying…", detectedRuntime, detectedStartFile, validationResults });
});

export default router;
