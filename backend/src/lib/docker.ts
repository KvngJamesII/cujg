import { logger } from "./logger";
import { createRequire } from "module";

const _require = createRequire(import.meta.url);

export interface ContainerStats {
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  networkOutBytes: number;
  networkInBytes: number;
  uptimeSeconds: number;
}

export type ContainerStatus = "running" | "stopped" | "crashed" | "not_created" | "restarting";

const DOCKER_ENABLED = process.env.DOCKER_ENABLED === "true";

export const PLAN_LIMITS: Record<string, { ramMb: number; cpuCores: number }> = {
  basic:      { ramMb: 400,  cpuCores: 0.5  },
  pro:        { ramMb: 768,  cpuCores: 1.0  },
  // Legacy fallbacks
  free_trial: { ramMb: 256,  cpuCores: 0.25 },
  starter:    { ramMb: 400,  cpuCores: 0.5  },
  developer:  { ramMb: 768,  cpuCores: 0.75 },
};

function containerName(userId: string, botId: string): string {
  return `bot_${userId}_${botId}`;
}

function getDocker() {
  const Docker = _require("dockerode");
  return new Docker();
}

export async function createAndStartContainer(
  userId: string, botId: string, runtime: "nodejs" | "python",
  startFile: string, envVars: Record<string, string>, plan: string
): Promise<void> {
  const name = containerName(userId, botId);
  if (!DOCKER_ENABLED) {
    logger.info({ name, runtime, startFile }, "Docker mock: would start container");
    return;
  }
  const docker = getDocker();
  try {
    // Check if container exists and is running
    try {
      const existing = docker.getContainer(name);
      const info = await existing.inspect();
      if (info.State?.Running) {
        logger.info({ name }, "Docker: container already running, skipping start");
        return;
      }
      // Not running — force remove it
      await existing.remove({ force: true, v: true });
      await new Promise(r => setTimeout(r, 500));
    } catch (e: any) {
      // Container doesn't exist (404) — that's fine, we'll create it
      if (e?.statusCode === 404 || e?.message?.includes("no such container")) {
        logger.info({ name }, "Docker: no existing container, will create one");
      } else {
        logger.warn({ name, err: e }, "Docker: could not inspect/remove old container");
      }
    }
    // Create fresh
    await createContainerInternal(docker, userId, botId, runtime, startFile, envVars, plan);
    const container = docker.getContainer(name);
    try {
      await container.start();
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      const status = e?.statusCode ?? e?.response?.statusCode ?? (msg.includes("304") ? 304 : 0);
      if (status === 304 || msg.includes("already started") || msg.includes("already in use")) {
        logger.info({ name }, "Docker: container already running");
        return;
      }
      throw e;
    }
    logger.info({ name, runtime, startFile, plan }, "Docker: container started");
  } catch (e: any) {
    logger.error({ name, err: e }, "Docker: failed to start container");
    require("fs").appendFileSync("/tmp/redon3-errors.log", `[${new Date().toISOString()}] START ERROR ${name}: ${e?.message}\n`);
    throw e;
  }
}

async function createContainerInternal(
  docker: any, userId: string, botId: string, runtime: "nodejs" | "python",
  startFile: string, envVars: Record<string, string>, plan: string
): Promise<void> {
  const name   = containerName(userId, botId);
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.basic;
  const image  = runtime === "nodejs" ? "node:20-alpine" : "python:3.11-alpine";
  const entrypoint = runtime === "nodejs"
    ? ["/opt/redon3/scripts/node-entrypoint.sh"]
    : ["/opt/redon3/scripts/python-entrypoint.sh"];
  const cmd = [startFile];

  try {
    await new Promise<void>((resolve, reject) => {
      docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err: Error | null) => { if (err) reject(err); else resolve(); });
      });
    });
  } catch (e) {
    logger.warn({ image, err: e }, "Docker: image pull failed, will use cached if available");
  }

  try {
    await docker.createContainer({
      name, Image: image, Entrypoint: entrypoint, Cmd: cmd,
      Env: Object.entries(envVars).map(([k, v]) => `${k}=${v}`),
      WorkingDir: "/app",
      OpenStdin: true, StdinOnce: false, AttachStdin: true,
      HostConfig: {
        Memory: limits.ramMb * 1024 * 1024,
        MemorySwap: limits.ramMb * 1024 * 1024,
        CpuPeriod: 100000,
        CpuQuota: Math.floor(limits.cpuCores * 100000),
        Binds: [
          `/home/bots/${userId}/${botId}:/app`,
          `/opt/redon3/scripts/${runtime === "nodejs" ? "node-entrypoint.sh" : "python-entrypoint.sh"}:/opt/redon3/scripts/${runtime === "nodejs" ? "node-entrypoint.sh" : "python-entrypoint.sh"}:ro`,
          `/opt/redon3/cache/${runtime === "nodejs" ? "node" : "pip"}:/opt/redon3/cache/${runtime === "nodejs" ? "node" : "pip"}:ro`,
        ],
        RestartPolicy: { Name: "on-failure", MaximumRetryCount: 5 },
        NetworkMode: "bridge",
      },
    });
  } catch (e: any) {
    if (e?.message?.includes("no such container") || e?.message?.includes("already exists")) {
      logger.warn({ name, err: e }, "Docker: container create issue, continuing");
    } else {
      throw e;
    }
  }
}

export async function createContainer(
  userId: string, botId: string, runtime?: "nodejs" | "python" | null,
  startFile?: string | null, envVars?: Record<string, string>, plan?: string | null
): Promise<void> {
  const rt  = runtime ?? "nodejs";
  const sf  = startFile ?? (rt === "nodejs" ? "index.js" : "main.py");
  const env = envVars ?? {};
  const p   = plan ?? "basic";
  if (!DOCKER_ENABLED) return;
  const docker = getDocker();
  try { const e = docker.getContainer(containerName(userId, botId)); await e.remove({ force: true }); } catch {}
  await createContainerInternal(docker, userId, botId, rt, sf, env, p);
}

export async function stopContainer(userId: string, botId: string): Promise<void> {
  const name = containerName(userId, botId);
  if (!DOCKER_ENABLED) { logger.info({ name }, "Docker mock: would stop container"); return; }
  const docker = getDocker();
  try {
    const container = docker.getContainer(name);
    await container.stop({ t: 3 });
    logger.info({ name }, "Docker: container stopped");
  } catch (e: any) {
    if (e?.statusCode !== 304 && e?.statusCode !== 404) throw e;
  }
}

export async function restartContainer(userId: string, botId: string): Promise<void> {
  const name = containerName(userId, botId);
  if (!DOCKER_ENABLED) { logger.info({ name }, "Docker mock: would restart container"); return; }
  const docker = getDocker();
  try {
    const container = docker.getContainer(name);
    await container.restart({ t: 3 });
    logger.info({ name }, "Docker: container restarted");
  } catch (e: any) {
    if (e?.statusCode === 404) logger.warn({ name }, "Docker: container not found to restart");
    else {
      require("fs").appendFileSync("/tmp/redon3-errors.log", `[${new Date().toISOString()}] RESTART ERROR ${name}: ${e?.message}\n`);
      throw e;
    }
  }
}

export async function deleteContainer(userId: string, botId: string): Promise<void> {
  const name = containerName(userId, botId);
  if (!DOCKER_ENABLED) { logger.info({ name }, "Docker mock: would delete container"); return; }
  const docker = getDocker();
  try {
    const container = docker.getContainer(name);
    await container.remove({ force: true });
    logger.info({ name }, "Docker: container deleted");
  } catch (e: any) {
    if (e?.statusCode !== 404) throw e;
  }
}

export async function getContainerStats(userId: string, botId: string): Promise<ContainerStats> {
  if (!DOCKER_ENABLED) {
    return {
      cpuPercent:      Math.random() * 15,
      memoryUsedMb:    120 + Math.random() * 200,
      memoryLimitMb:   400,
      networkOutBytes: Math.floor(Math.random() * 1000000),
      networkInBytes:  Math.floor(Math.random() * 500000),
      uptimeSeconds:   Math.floor(Math.random() * 86400),
    };
  }
  const docker = getDocker();
  const name   = containerName(userId, botId);
  try {
    const container = docker.getContainer(name);
    const [rawStats, info] = await Promise.all([
      container.stats({ stream: false }) as Promise<any>,
      container.inspect() as Promise<any>,
    ]);
    const cpuDelta    = (rawStats.cpu_stats?.cpu_usage?.total_usage ?? 0) - (rawStats.precpu_stats?.cpu_usage?.total_usage ?? 0);
    const systemDelta = (rawStats.cpu_stats?.system_cpu_usage ?? 0) - (rawStats.precpu_stats?.system_cpu_usage ?? 0);
    const cpuCount    = rawStats.cpu_stats?.online_cpus ?? 1;
    const cpuPercent  = Math.round((systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0) * 100) / 100;
    const memUsage    = rawStats.memory_stats?.usage ?? 0;
    const memCache    = rawStats.memory_stats?.stats?.cache ?? 0;
    const memoryUsedMb   = Math.round(((memUsage - memCache) / (1024 * 1024)) * 100) / 100;
    const memoryLimitMb  = Math.round((rawStats.memory_stats?.limit ?? 400 * 1024 * 1024) / (1024 * 1024));
    const netStats       = Object.values(rawStats.networks ?? {}) as any[];
    const networkOutBytes = netStats.reduce((s: number, n: any) => s + (n.tx_bytes ?? 0), 0);
    const networkInBytes  = netStats.reduce((s: number, n: any) => s + (n.rx_bytes ?? 0), 0);
    const startedAt      = new Date(info.State?.StartedAt ?? Date.now()).getTime();
    const uptimeSeconds  = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    return { cpuPercent, memoryUsedMb, memoryLimitMb, networkOutBytes, networkInBytes, uptimeSeconds };
  } catch {
    return { cpuPercent: 0, memoryUsedMb: 0, memoryLimitMb: 400, networkOutBytes: 0, networkInBytes: 0, uptimeSeconds: 0 };
  }
}

export async function getContainerStatus(userId: string, botId: string): Promise<ContainerStatus> {
  if (!DOCKER_ENABLED) return "stopped";
  const docker = getDocker();
  const name   = containerName(userId, botId);
  try {
    const container = docker.getContainer(name);
    const info      = await container.inspect() as any;
    const state     = info.State?.Status;
    if (state === "running")    return "running";
    if (state === "restarting") return "restarting";
    if (state === "exited")     return (info.State?.ExitCode ?? 0) !== 0 ? "crashed" : "stopped";
    return "stopped";
  } catch (e: any) {
    if (e?.statusCode === 404) return "not_created";
    return "stopped";
  }
}

function parseDockerLogStream(raw: Buffer | NodeJS.ReadableStream): { text: string; isStderr: boolean }[] {
  const lines: { text: string; isStderr: boolean }[] = [];
  const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as any);
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const streamType = buf[offset];
    const frameSize = buf.readUInt32BE(offset + 4);
    if (offset + 8 + frameSize > buf.length) break;
    const payload = buf.subarray(offset + 8, offset + 8 + frameSize).toString("utf-8");
    const isStderr = streamType === 2;
    for (const raw of payload.split("\n").filter(Boolean)) {
      const text = raw.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, "");
      if (text) lines.push({ text, isStderr });
    }
    offset += 8 + frameSize;
  }
  return lines;
}

export function streamContainerLogs(
  userId: string, botId: string,
  onLine: (line: string, isStderr: boolean) => void
): () => void {
  if (!DOCKER_ENABLED) {
    const lines = [
      "[INFO] Bot initializing...",
      "[INFO] Loading environment variables...",
      "[INFO] Connecting to service...",
      "[INFO] Bot is ready and listening!",
      "[INFO] Waiting for events...",
    ];
    let i = 0;
    const interval = setInterval(() => { if (i < lines.length) onLine(lines[i++], false); }, 500);
    return () => clearInterval(interval);
  }

  const name = containerName(userId, botId);
  let destroyed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let activeStream: NodeJS.ReadableStream | null = null;

  const startStreaming = async () => {
    if (destroyed) return;

    const docker = getDocker();
    try {
      const container = docker.getContainer(name);
      const info = await container.inspect();
      if (!info.State?.Running) {
        onLine("Panel is offline", false);
        retryTimer = setTimeout(startStreaming, 2000);
        return;
      }

      // First, send the last 50 lines of existing logs
      const since = Math.floor(Date.now() / 1000);
      const existing = await container.logs({
        stdout: true,
        stderr: true,
        tail: 50,
        timestamps: true,
      });

      if (destroyed) return;

      // Parse and emit existing logs
      const existingLines = parseDockerLogStream(existing);
      for (const line of existingLines) {
        if (destroyed) return;
        onLine(line.text, line.isStderr);
      }

      // Then stream new logs from now
      const stream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        since,
        timestamps: true,
      });

      if (destroyed) { stream.destroy(); return; }
      activeStream = stream;
      logger.info({ name }, "Docker log stream started");

      let buffer = Buffer.alloc(0);
      stream.on("data", (chunk: Buffer) => {
        if (destroyed) return;
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 8) {
          const header = buffer.subarray(0, 8);
          const streamType = header[0];
          const frameSize = header.readUInt32BE(4);
          if (buffer.length < 8 + frameSize) break;
          const payload = buffer.subarray(8, 8 + frameSize).toString("utf-8");
          buffer = buffer.subarray(8 + frameSize);
          const isStderr = streamType === 2;
          for (const raw of payload.split("\n").filter(Boolean)) {
            const text = raw.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, "");
            if (text) onLine(text, isStderr);
          }
        }
      });

      stream.on("end", () => {
        if (destroyed) return;
        onLine("Panel is offline", false);
        retryTimer = setTimeout(startStreaming, 3000);
      });

      stream.on("error", () => {
        if (destroyed) return;
        onLine("Panel is offline", false);
        retryTimer = setTimeout(startStreaming, 3000);
      });
    } catch {
      if (destroyed) return;
      onLine("Panel is offline", false);
      retryTimer = setTimeout(startStreaming, 2000);
    }
  };

  startStreaming().catch((err) => {
    if (!destroyed) {
      onLine("Panel is offline", false);
      retryTimer = setTimeout(startStreaming, 3000);
    }
  });

  return () => {
    destroyed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (activeStream) activeStream.destroy();
  };
}

export async function getContainerStdinStream(
  userId: string, botId: string
): Promise<{ write: (data: string) => void; end: () => void } | null> {
  if (!DOCKER_ENABLED) return { write: (_d) => {}, end: () => {} };
  const name   = containerName(userId, botId);
  const docker = getDocker();
  try {
    const container = docker.getContainer(name);
    const stream    = await (container as any).attach({
      stdin: true, stdout: false, stderr: false, stream: true, hijack: true,
    });
    return {
      write: (data: string) => { try { stream.write(data); } catch {} },
      end:   () => { try { stream.end(); } catch {} },
    };
  } catch { return null; }
}
