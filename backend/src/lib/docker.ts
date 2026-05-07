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
  const name   = containerName(userId, botId);
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.basic;

  if (!DOCKER_ENABLED) {
    logger.info({ name, runtime, startFile, ramMb: limits.ramMb }, "Docker mock: would create container");
    return;
  }

  const docker = getDocker();
  const image  = runtime === "nodejs" ? "node:20-alpine" : "python:3.11-alpine";
  const cmd    = runtime === "nodejs" ? ["node", startFile] : ["python", startFile];

  try { const e = docker.getContainer(name); await e.remove({ force: true }); } catch {}

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

  const container = await docker.createContainer({
    name,
    Image:       image,
    Cmd:         cmd,
    Env:         Object.entries(envVars).map(([k, v]) => `${k}=${v}`),
    WorkingDir:  "/app",
    OpenStdin:   true,
    StdinOnce:   false,
    AttachStdin: true,
    HostConfig: {
      Memory:            limits.ramMb * 1024 * 1024,
      MemorySwap:        limits.ramMb * 1024 * 1024,
      CpuPeriod:         100000,
      CpuQuota:          Math.floor(limits.cpuCores * 100000),
      Binds:             [`/home/bots/${userId}/${botId}:/app`],
      RestartPolicy:     { Name: "on-failure", MaximumRetryCount: 5 },
      NetworkMode:       "bridge",
    },
  });

  await container.start();
  logger.info({ name, runtime, startFile, plan, ramMb: limits.ramMb }, "Docker: container started");
}

export async function stopContainer(userId: string, botId: string): Promise<void> {
  const name = containerName(userId, botId);
  if (!DOCKER_ENABLED) { logger.info({ name }, "Docker mock: would stop container"); return; }
  const docker = getDocker();
  try {
    const container = docker.getContainer(name);
    await container.stop({ t: 10 });
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
    await container.restart({ t: 10 });
    logger.info({ name }, "Docker: container restarted");
  } catch (e: any) {
    if (e?.statusCode === 404) logger.warn({ name }, "Docker: container not found to restart");
    else throw e;
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
    const cpuPercent  = systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0;
    const memUsage    = rawStats.memory_stats?.usage ?? 0;
    const memCache    = rawStats.memory_stats?.stats?.cache ?? 0;
    const memoryUsedMb   = (memUsage - memCache) / (1024 * 1024);
    const memoryLimitMb  = (rawStats.memory_stats?.limit ?? 400 * 1024 * 1024) / (1024 * 1024);
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

  const name    = containerName(userId, botId);
  let destroyed = false;
  let streamRef: any = null;

  (async () => {
    try {
      const docker    = getDocker();
      const container = docker.getContainer(name);
      const stream    = await container.logs({
        follow: true, stdout: true, stderr: true, tail: 200, timestamps: true,
      }) as any;
      streamRef = stream;
      if (destroyed) { stream.destroy?.(); return; }
      const stdoutP = { write: (chunk: Buffer) => onLine(chunk.toString().replace(/\r?\n$/, ""), false) };
      const stderrP = { write: (chunk: Buffer) => onLine(chunk.toString().replace(/\r?\n$/, ""), true) };
      (container as any).modem.demuxStream(stream, stdoutP, stderrP);
      stream.on("end", () => onLine("[stream ended]", false));
    } catch (e: any) {
      onLine(`[error reading logs: ${e?.message ?? "unknown"}]`, true);
    }
  })();

  return () => { destroyed = true; streamRef?.destroy?.(); };
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
