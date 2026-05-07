import { Router } from "express";
import fs from "fs";
import path from "path";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

const LOG_FILE = process.env.DEBUG_LOG_PATH || "/opt/redon3/logs/client-debug.log";
const MAX_FILE_MB = 20;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

function rotateIfNeeded() {
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size > MAX_FILE_BYTES) {
      const rotated = LOG_FILE.replace(".log", `.${Date.now()}.log`);
      fs.renameSync(LOG_FILE, rotated);
    }
  } catch { /* file may not exist yet */ }
}

// POST /api/debug/logs — accepts batches from the frontend
router.post("/logs", (req, res) => {
  const { entries } = req.body as { entries: Array<Record<string, unknown>> };
  if (!Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ error: "entries must be a non-empty array" });
    return;
  }

  rotateIfNeeded();

  const userId = (req as any).userId ?? "anon";
  const ip = req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "?";

  const lines = entries
    .slice(0, 50)
    .map((e) => JSON.stringify({ ...e, _ip: ip, _uid: userId }) + "\n")
    .join("");

  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, lines, "utf8");
  } catch (err: any) {
    res.status(500).json({ error: "failed to write log" });
    return;
  }

  res.json({ ok: true, written: entries.length });
});

// GET /api/debug/logs?lines=200 — admin only, tail the log file
router.get("/logs", requireAuth, requireAdmin, (req, res) => {
  const n = Math.min(parseInt(String(req.query.lines ?? "200"), 10), 2000);
  const search = req.query.search ? String(req.query.search).toLowerCase() : null;
  const typeFilter = req.query.type ? String(req.query.type) : null;

  try {
    if (!fs.existsSync(LOG_FILE)) {
      res.json({ lines: [], total: 0, file: LOG_FILE });
      return;
    }

    const raw = fs.readFileSync(LOG_FILE, "utf8");
    let parsed = raw
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        try { return JSON.parse(l); } catch { return { ts: "", type: "raw", msg: l }; }
      });

    if (typeFilter) parsed = parsed.filter((e) => e.type === typeFilter);
    if (search) parsed = parsed.filter((e) => JSON.stringify(e).toLowerCase().includes(search));

    const total = parsed.length;
    const lines = parsed.slice(-n).reverse();

    res.json({ lines, total, file: LOG_FILE });
  } catch (err: any) {
    res.status(500).json({ error: "failed to read log", detail: err.message });
  }
});

// DELETE /api/debug/logs — admin only, clear the log
router.delete("/logs", requireAuth, requireAdmin, (_req, res) => {
  try {
    fs.writeFileSync(LOG_FILE, "", "utf8");
    res.json({ ok: true, message: "Log cleared" });
  } catch (err: any) {
    res.status(500).json({ error: "failed to clear log" });
  }
});

export default router;
