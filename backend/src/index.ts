import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { spawn } from "child_process";
import app from "./app";
import { logger } from "./lib/logger";
import { setIo } from "./routes/bots";
import { streamContainerLogs, getContainerStdinStream } from "./lib/docker";
import { verifyAccessToken } from "./lib/auth";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

// Clear error log on startup
try { require("fs").unlinkSync("/tmp/redon3-errors.log"); } catch {}

const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: { origin: true, credentials: true },
  path: "/api/socket.io",
});

setIo(io);

function extractUserId(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
  if (!match) return null;
  try {
    const { userId } = verifyAccessToken(decodeURIComponent(match[1]));
    return userId;
  } catch { return null; }
}

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id, cookie: socket.handshake.headers.cookie ? "present" : "missing" }, "Socket connected");

  const userId = extractUserId(socket.handshake.headers.cookie);
  logger.info({ socketId: socket.id, userId: userId ?? "null" }, "Socket auth result");
  const stdinStreams = new Map<string, { write: (d: string) => void; end: () => void }>();

  // ── Console log streaming ───────────────────────────────────────────────
  // Track active log streams per socket to prevent duplicates
  const activeCleanups = new Map<string, () => void>();

  socket.on("logs:subscribe", ({ botId }: { botId: string }) => {
    logger.info({ socketId: socket.id, botId, userId: userId ?? "null" }, "logs:subscribe received");
    if (!userId) { socket.emit("error", "Unauthorized"); return; }

    // Stop any previous stream for this bot
    const prev = activeCleanups.get(botId);
    if (prev) { prev(); activeCleanups.delete(botId); }

    socket.join(`bot:${botId}`);

    const cleanupLogs = streamContainerLogs(userId, botId, (line, isStderr) => {
      socket.emit("console-log", { text: line, isStderr });
    });

    getContainerStdinStream(userId, botId).then((s) => {
      if (s) stdinStreams.set(botId, s);
    }).catch(() => {});

    const cleanup = () => {
      cleanupLogs();
      const s = stdinStreams.get(botId);
      if (s) { s.end(); stdinStreams.delete(botId); }
      activeCleanups.delete(botId);
    };
    activeCleanups.set(botId, cleanup);
    socket.on("logs:unsubscribe", cleanup);
    socket.on("disconnect", cleanup);
  });

  socket.on("console-input", ({ botId, data }: { botId: string; data: string }) => {
    if (!userId) return;
    const s = stdinStreams.get(botId);
    if (s) s.write(data);
  });

  // ── Interactive terminal (docker exec sh) ───────────────────────────────
  socket.on("terminal:subscribe", ({ botId }: { botId: string }) => {
    if (!userId) { socket.emit("error", "Unauthorized"); return; }

    const containerName = `bot_${userId}_${botId}`;
    let proc: ReturnType<typeof spawn> | null = null;

    try {
      proc = spawn("docker", ["exec", "-i", containerName, "sh"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      proc.stdout?.on("data", (data: Buffer) => {
        socket.emit("terminal:data", { data: data.toString() });
      });
      proc.stderr?.on("data", (data: Buffer) => {
        socket.emit("terminal:data", { data: data.toString() });
      });
      proc.on("close", (code) => {
        socket.emit("terminal:data", { data: `\r\n[Shell exited with code ${code ?? 0}]\r\n` });
        proc = null;
      });
      proc.on("error", (err) => {
        socket.emit("terminal:data", { data: `\r\n[Error: ${err.message}]\r\n` });
        proc = null;
      });

      socket.emit("terminal:ready", {});
      logger.info({ socketId: socket.id, containerName }, "Terminal session started");
    } catch (e: any) {
      socket.emit("terminal:data", { data: `\r\n[Could not start shell: ${e.message}]\r\n` });
    }

    const inputHandler = ({ data }: { data: string }) => {
      if (proc?.stdin?.writable) {
        try { proc.stdin.write(data); } catch {}
      }
    };
    socket.on("terminal:input", inputHandler);

    const cleanup = () => {
      socket.off("terminal:input", inputHandler);
      if (proc) { try { proc.kill("SIGTERM"); } catch {} proc = null; }
    };
    socket.on("terminal:unsubscribe", cleanup);
    socket.on("disconnect", cleanup);
  });

  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Socket disconnected");
    stdinStreams.forEach((s) => { try { s.end(); } catch {} });
    stdinStreams.clear();
  });
});

httpServer.listen(port, "0.0.0.0", (err?: Error) => {
  if (err) { logger.error({ err }, "Error listening on port"); process.exit(1); }
  logger.info({ port }, "Redon3 API server listening");
});

// Global error handlers to prevent process crashes
process.on("uncaughtException", (err) => {
  logger.error({ err, origin: "uncaughtException" }, "Uncaught exception — keeping process alive");
  require("fs").appendFileSync("/tmp/redon3-errors.log", `[${new Date().toISOString()}] UNCAUGHT ${err.message}\n${err.stack}\n`);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason, origin: "unhandledRejection" }, "Unhandled rejection — keeping process alive");
  require("fs").appendFileSync("/tmp/redon3-errors.log", `[${new Date().toISOString()}] UNHANDLED ${reason}\n`);
});
