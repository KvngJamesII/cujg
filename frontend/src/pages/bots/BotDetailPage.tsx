import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import {
  Play, Square, RefreshCw, ChevronLeft, Trash2, X, Save, Undo2, Redo2,
  Upload, FolderUp, FilePlus, FolderPlus, MoreVertical, Pencil, Copy, Check,
  Download, FolderInput, Folder, FolderOpen, ChevronRight, Loader2, Send,
  Eraser, AlertTriangle, Bug, Zap, Cpu, HardDrive, RotateCcw, Terminal,
} from "lucide-react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, undo, redo } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

/* ─────────────────── design tokens (match Redon3) ─────────────────── */
const C = {
  bg: "#08090D",
  surface: "#0E1117",
  card: "#111520",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  text: "#F8FAFC",
  dim: "#94A3B8",
  mute: "#64748B",
  green: "#22C55E",
  red: "#EF4444",
  yellow: "#EAB308",
  accent: "#F97316",
  blue: "#3B82F6",
  cyan: "#22D3EE",
  console: "#0A0C12",
};

/* ─────────────────── language icons (real SVG) ─────────────────── */
const NodeIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M16 2L3 9.5v13L16 30l13-7.5v-13L16 2z" fill="#3C873A" />
    <path d="M16 2v28l13-7.5v-13L16 2z" fill="#2F6B2C" />
    <path
      d="M16 22.5c-2.4 0-3-.7-3.2-1.7 0-.2-.2-.3-.4-.3h-.7c-.2 0-.4.2-.4.4 0 1.3.7 2.8 4.7 2.8 2.9 0 4.6-1.1 4.6-3 0-1.9-1.3-2.4-4-2.7-2.8-.4-3-.6-3-1.3 0-.6.2-1.3 2.3-1.3 1.8 0 2.5.4 2.8 1.6.1.2.2.3.4.3h.7c.1 0 .2-.1.3-.2.1-.1.1-.2.1-.3-.2-2-1.6-3-4.3-3-2.5 0-4 1.1-4 2.9 0 2 1.6 2.5 4.1 2.8 3 .3 3.2.7 3.2 1.3 0 1-.8 1.7-2.7 1.7z"
      fill="#FFF"
    />
  </svg>
);
const PythonIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 2c-3.4 0-3.2 1.5-3.2 1.5v1.5h3.3v.5H10s-2.2-.2-2.2 3.2c0 3.4 2 3.3 2 3.3h1v-1.6s0-2 2-2h3.3s1.9 0 1.9-1.9V3.9S18.4 2 16 2zm-1.8 1c.3 0 .6.3.6.6s-.3.6-.6.6-.6-.3-.6-.6.3-.6.6-.6z"
      fill="#3776AB"
    />
    <path
      d="M16 30c3.4 0 3.2-1.5 3.2-1.5V27h-3.3v-.5H22s2.2.2 2.2-3.2c0-3.4-2-3.3-2-3.3h-1v1.6s0 2-2 2h-3.3s-1.9 0-1.9 1.9v3.6S13.6 30 16 30zm1.8-1c-.3 0-.6-.3-.6-.6s.3-.6.6-.6.6.3.6.6-.3.6-.6.6z"
      fill="#FFD43B"
    />
  </svg>
);
const LangIcon: React.FC<{ runtime?: string | null; size?: number }> = ({ runtime, size }) =>
  runtime === "python" ? <PythonIcon size={size} /> : <NodeIcon size={size} />;

/* ─────────────────── file type icon (by extension) ─────────────────── */
const FileTypeIcon: React.FC<{ name: string; size?: number }> = ({ name, size = 16 }) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const colorMap: Record<string, string> = {
    js: "#F7DF1E", mjs: "#F7DF1E", cjs: "#F7DF1E",
    ts: "#3178C6", tsx: "#3178C6", jsx: "#61DAFB",
    json: "#A3BE8C", py: "#3776AB", md: "#9CA3AF",
    html: "#E34F26", css: "#1572B6", env: "#10B981",
    txt: "#94A3B8", lock: "#64748B", yml: "#CB171E", yaml: "#CB171E",
    png: "#A78BFA", jpg: "#A78BFA", jpeg: "#A78BFA", gif: "#A78BFA", svg: "#A78BFA",
    zip: "#F59E0B", sh: "#22D3EE",
  };
  if (ext === "js" || ext === "mjs" || ext === "cjs") return <NodeIcon size={size} />;
  if (ext === "py") return <PythonIcon size={size} />;
  const color = colorMap[ext] ?? "#64748B";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7z"
        fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.6" strokeLinejoin="round"
      />
      <path d="M13 2v7h7" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
};

/* ─────────────────── helpers ─────────────────── */
const joinPath = (a: string, b: string) => (a + "/" + b).replace(/\/+/g, "/");
const fmtBytes = (b: number) =>
  b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(0)}K` : `${(b / 1048576).toFixed(1)}M`;

interface FileEntry { name: string; isDir: boolean; size: number; modified: string; }

/* ─────────────────── socket (singleton) ─────────────────── */
const socket: Socket = io(window.location.origin, { path: "/api/socket.io", autoConnect: false });

/* ═════════════════════ MAIN PAGE ═════════════════════ */
const BotDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<"console" | "files" | "startup" | "config" | "logs">("console");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [streaming, setStreaming] = useState(false);
  const seenLines = useRef(new Set<string>());
  const qc = useQueryClient();
  const t = useToast();

  const { data: bot } = useQuery<any>({
    queryKey: ["bot", id],
    queryFn: async () => (await api.get(`/bots/${id}`)).data,
    refetchInterval: 5000,
  });

  const isRunning = bot?.status === "running";

  // Keep socket connected at all times
  useEffect(() => {
    if (!id) return;
    if (!socket.connected) socket.connect();
  }, [id]);

  // Subscribe/unsubscribe to logs based on running status
  useEffect(() => {
    if (!id) return;

    // Always unsubscribe first
    socket.off("console-log");
    socket.emit("logs:unsubscribe", { botId: id });

    if (!isRunning) {
      setStreaming(false);
      return;
    }

    seenLines.current.clear();
    setStreaming(true); // Show streaming state immediately on subscribe

    const onLog = (l: LogLine) => {
      if (seenLines.current.has(l.text)) return;
      seenLines.current.add(l.text);
      if (seenLines.current.size > 200) {
        const arr = [...seenLines.current];
        arr.shift();
        seenLines.current = new Set(arr);
      }
      setStreaming(true);
      setLogs((p: LogLine[]) => [...p.slice(-49), l]);
    };

    const doSubscribe = () => {
      socket.off("console-log", onLog);
      socket.on("console-log", onLog);
      socket.emit("logs:subscribe", { botId: id });
    };

    if (socket.connected) {
      doSubscribe();
    } else {
      socket.connect();
      socket.once("connect", doSubscribe);
    }

    return () => {
      socket.off("console-log", onLog);
      socket.emit("logs:unsubscribe", { botId: id });
    };
  }, [id, isRunning]);

  const action = useMutation({
    mutationFn: async (a: "start" | "stop" | "restart") => {
      setLogs([]); setStreaming(false);
      return (await api.post(`/bots/${id}/${a}`)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bot", id] }),
    onError: (e: any) => {
      const msg = e?.response?.data?.error ?? e?.message ?? "Try again";
      const status = e?.response?.status;
      const fullMsg = `${msg} (${status})`;
      console.error(`[REDON3 ACTION ERROR] ${fullMsg}`, e);
      t.error("Action failed", fullMsg);
    },
  });

  const isSettingUp = bot?.status === "setting_up";
  const runtime = bot?.runtime;

  return (
    <DashboardLayout fullHeight>
      <div className="flex flex-col flex-1 min-h-0" style={{ background: C.bg, color: C.text }}>
        {/* HEADER */}
        <header
          className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0"
          style={{ borderColor: C.border, background: C.surface }}
        >
          <Link href="/bots">
            <button
              className="p-1.5 rounded-md hover:bg-white/5 shrink-0"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </button>
          </Link>

          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="font-bold text-sm truncate">{bot?.name ?? "Panel"}</span>
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}` }}
            >
              <LangIcon runtime={runtime} size={11} />
              {runtime === "python" ? "Python" : "Node.js"}
            </span>
          </div>

          <button
            onClick={() => action.mutate(isRunning ? "stop" : "start")}
            disabled={action.isPending || isSettingUp}
            className="flex items-center gap-1 h-8 px-2.5 rounded-md text-[11px] font-bold text-white disabled:opacity-50 shrink-0"
            style={{ background: isSettingUp ? C.yellow : isRunning ? C.red : C.green }}
          >
            {action.isPending ? <Loader2 size={11} className="animate-spin" /> : isSettingUp ? <Loader2 size={11} className="animate-spin" /> : isRunning ? <Square size={11} fill="white" /> : <Play size={11} fill="white" />}
            {action.isPending ? "Wait…" : isSettingUp ? "Deploying" : isRunning ? "Stop" : "Start"}
          </button>
          <button
            onClick={() => action.mutate("restart")}
            disabled={!isRunning || action.isPending}
            className="flex items-center gap-1 h-8 px-2.5 rounded-md text-[11px] font-bold text-black disabled:opacity-30 shrink-0"
            style={{ background: C.yellow }}
          >
            {action.isPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          </button>
        </header>

        {/* TABS */}
        <nav
          className="flex shrink-0 border-b"
          style={{ borderColor: C.border, background: C.surface }}
        >
          {(["console", "files", "startup", "config", "logs"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="flex-1 py-2.5 text-[11px] font-semibold capitalize relative transition-colors"
              style={{ color: tab === k ? C.text : C.mute }}
            >
              {k}
              {tab === k && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full"
                  style={{ background: C.accent }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* TAB BODY (fills remaining space, no page scroll) */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === "console" && <ConsoleTab botId={id!} bot={bot} logs={logs} streaming={streaming} isPending={action.isPending} onEchoLog={(text) => setLogs((p) => [...p.slice(-49), { text, isStderr: false }])} />}
          {tab === "files" && <FilesTab botId={id!} runtime={runtime} />}
          {tab === "startup" && <StartupTab botId={id!} bot={bot} />}
          {tab === "config" && <ConfigTab bot={bot} />}
          {tab === "logs" && <LogsTab botId={id!} bot={bot} />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BotDetailPage;

/* ════════════════════ CONSOLE TAB ════════════════════ */
interface LogLine { text: string; isStderr: boolean; }

const colorize = (l: LogLine) => {
  if (l.isStderr) return C.red;
  const t = l.text.toLowerCase();
  if (t.includes("error") || t.includes("fail") || t.includes("exception")) return C.red;
  if (t.includes("warn")) return C.yellow;
  if (t.includes("installing") || t.includes("dependencies")) return "#F59E0B";
  if (t.includes("[redon3]")) return "#F59E0B";
  if (t.includes("panel is offline")) return "#F59E0B";
  if (t.includes("panel is online") || t.includes("now running") || t.includes("dependencies installed") || t.includes("all dependencies present")) return C.green;
  if (t.includes("ready") || t.includes("listening") || t.includes("connected")) return C.green;
  if (t.startsWith("> ")) return C.cyan;
  return "#D1D5DB";
};

type ErrorTranslation = { pattern: RegExp; title: string; message: (m: RegExpMatchArray) => string };
const ERROR_TRANSLATIONS: ErrorTranslation[] = [
  { pattern: /cannot find module ['"](.+?)['"]/i, title: "Missing module", message: (m) => `The file or package "${m[1]}" was not found. Make sure it exists in your files or is listed in your dependency file.` },
  { pattern: /enoent.*stat.*['"](\/app\/.+?)['"]/i, title: "File not found", message: (m) => `The file "${m[1]}" does not exist. Check your startup file path in the Startup tab.` },
  { pattern: /modulenotfound|cannot find package/i, title: "Missing dependency", message: () => `A required npm/pip package is not installed. Make sure it's in package.json or requirements.txt. The system auto-installs on start.` },
  { pattern: /eaddrinuse|address already in use/i, title: "Port already in use", message: () => `Your panel tried to use a port that's already taken. Try a different port in your code.` },
  { pattern: /out of memory|oom/i, title: "Out of memory", message: () => `Your panel ran out of RAM. Upgrade to Pro for more memory, or optimize your code.` },
  { pattern: /syntax ?error/i, title: "Syntax error", message: () => `There's a syntax error in your code. Check the line mentioned in the error above.` },
  { pattern: /command not found/i, title: "Command not found", message: () => `A command your panel tried to run is not available. For Alpine containers, use 'apk add' to install system tools.` },
  { pattern: /npm err|pip.*error/i, title: "Install failed", message: () => `Package installation failed. The package name may be wrong or there's a network issue.` },
  { pattern: /exit code|exited with/i, title: "Panel crashed", message: () => `Your panel stopped unexpectedly. Check the errors above. The container restarts automatically.` },
];

const scanErrors = (logLines: LogLine[]) => {
  for (const line of logLines) {
    if (line.isStderr || /error|fail|exception/i.test(line.text)) {
      for (const t of ERROR_TRANSLATIONS) {
        const m = line.text.match(t.pattern);
        if (m) return { error: t, match: m };
      }
    }
  }
  return { error: null, match: null };
};

const ConsoleTab: React.FC<{ botId: string; bot: any; logs: LogLine[]; streaming: boolean; isPending: boolean; onEchoLog: (text: string) => void }> = ({ botId, bot, logs, streaming, isPending, onEchoLog }) => {
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<{ cpu: number; ram: number; restarts: number }>({
    cpu: 0, ram: 0, restarts: 0,
  });
  const [userScrolled, setUserScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) { el.scrollTop = el.scrollHeight; setUserScrolled(false); }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setUserScrolled(!atBottom);
  };

  useEffect(() => {
    if (!userScrolled) scrollToBottom();
  }, [logs]);

  // On mobile, scroll console into view when virtual keyboard opens
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const send = () => {
    if (!input.trim()) return;
    socket.emit("console-input", { botId, data: input + "\n" });
    onEchoLog(`> ${input}`);
    setInput("");
  };

  const isRunning = bot?.status === "running";
  const ramLimit = bot?.memoryLimitMb ?? 500;
  const memLimit = (bot?.plan === "pro" ? 1024 : 500);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const { error: detectedError, match: errorMatch } = scanErrors(logs);
  const errorMessage = detectedError && errorMatch ? detectedError.message(errorMatch) : "";

  const formatLogLine = (text: string): string => {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    return `${ts} ${text}`;
  };

  return (
    <div className="flex flex-col h-full p-2 gap-1.5">
      {/* Error banner */}
      {detectedError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg shrink-0 cursor-pointer"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          onClick={() => setShowErrorModal(true)}>
          <span className="text-xs font-semibold" style={{ color: C.red }}>{detectedError.title}</span>
          <span className="text-[11px] ml-auto" style={{ color: C.dim }}>Tap for help →</span>
        </div>
      )}

      {/* Console Header */}
      <div className="flex items-center justify-between shrink-0 px-2 py-1.5 rounded-t-lg"
        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderBottom: "none" }}>
        <div className="flex items-center gap-2">
          <Terminal size={12} style={{ color: C.mute }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.mute }}>Console</span>
          <span className="relative flex h-1.5 w-1.5">
            {streaming && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ background: C.green }} />}
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: streaming ? C.green : C.mute }} />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono" style={{ color: C.mute }}>{logs.length} lines</span>
          {logs.length > 0 && (
            <button onClick={() => setLogs([])} className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors" style={{ color: C.dim }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Console */}
      <div className="relative flex-1 min-h-0" style={{ minHeight: "80px", maxHeight: "280px" }}>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto rounded-b-lg p-2 font-mono text-[11px] leading-relaxed"
          style={{
            background: C.console,
            border: `1px solid ${C.border}`,
            borderTop: "none",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Terminal size={16} style={{ color: "rgba(255,255,255,0.08)" }} />
              <div style={{ color: C.mute }} className="text-[11px]">
                {isPending ? "Starting..." : streaming ? "Waiting for logs..." : "Panel is offline"}
              </div>
            </div>
          ) : logs.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap break-words leading-relaxed py-0.5 px-1 rounded" style={{ color: colorize(l), background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
              <span style={{ color: "#4B5563", marginRight: "8px" }}>{new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>
              {l.text}
            </div>
          ))}
        </div>
        {userScrolled && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10 shadow-lg"
            style={{ background: C.card, border: `1px solid ${C.borderStrong}` }}
            title="Scroll to latest"
          >
            <ChevronRight size={12} style={{ transform: "rotate(90deg)", color: C.dim }} />
          </button>
        )}
      </div>

      {/* stdin input — always visible */}
      <div className="flex items-center gap-0 shrink-0 rounded-lg overflow-hidden"
        style={{ background: C.console, border: `1px solid ${C.border}` }}>
        <span className="text-xs font-mono pl-2.5 select-none" style={{ color: C.green }}>→</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          onFocus={() => {
            setTimeout(() => {
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
              inputRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
            }, 300);
          }}
          placeholder="Input..."
          className="flex-1 bg-transparent outline-none text-[12px] font-mono py-1.5 px-1.5 text-white placeholder:text-white/15"
        />
      </div>

      {/* Storage + Restarts side by side */}
      <div className="grid grid-cols-2 gap-2 shrink-0" style={{ minHeight: "100px" }}>
        <StorageCard used={stats.ram || 0} limit={memLimit} />
        <RestartCard count={stats.restarts} />
      </div>

      {/* RAM — full width horizontal bar */}
      <RamBarCard used={stats.ram || bot?.memoryUsedMb || 0} limit={ramLimit} />

      {/* Error help modal */}
      {showErrorModal && detectedError && (
        <Modal title={detectedError.title} onClose={() => setShowErrorModal(false)}>
          <div className="text-sm leading-relaxed" style={{ color: C.dim }}>
            <p>{errorMessage}</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ─── Circular gauge ring ─── */
const RingGauge: React.FC<{ pct: number; color: string; size?: number; stroke?: number; children?: React.ReactNode }> = ({ pct, color, size = 56, stroke = 4, children }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

/* RAM — full-width premium bar */
const RamBarCard: React.FC<{ used: number; limit: number }> = ({ used, limit }) => {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const color = pct > 85 ? C.red : pct > 60 ? C.yellow : C.cyan;
  return (
    <div className="rounded-xl px-4 py-3 flex flex-col gap-2 shrink-0"
      style={{ background: `linear-gradient(135deg, ${color}06, ${C.card})`, border: `1px solid ${color}18` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}12` }}>
            <Cpu size={16} style={{ color }} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: C.mute }}>RAM</div>
            <div className="text-[11px] font-mono" style={{ color: C.dim }}>{used.toFixed(1)}<span style={{ color: C.mute }}>/{limit}MB</span></div>
          </div>
        </div>
        <span className="text-[18px] font-black font-mono" style={{ color }}>{Math.round(pct)}<span className="text-[11px]" style={{ color: C.mute }}>%</span></span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="h-full rounded-full" style={{
          width: `${Math.min(pct, 100)}%`,
          background: `linear-gradient(90deg, ${color}60, ${color})`,
          boxShadow: `0 0 8px ${color}25`,
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
};

/* Storage — half-width gauge card */
const StorageCard: React.FC<{ used: number; limit: number }> = ({ used, limit }) => {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const color = pct > 85 ? C.red : pct > 60 ? C.yellow : C.blue;
  const label = limit > 999 ? "1GB" : `${limit}MB`;
  return (
    <div className="rounded-xl px-3 py-3 flex flex-col items-center justify-between h-full gap-2"
      style={{ background: `linear-gradient(180deg, ${color}05, ${C.card})`, border: `1px solid ${color}15` }}>
      <div className="flex items-center gap-2 w-full">
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${color}10` }}>
          <HardDrive size={14} style={{ color }} />
        </div>
        <span className="text-[9px] uppercase tracking-[0.12em] font-bold" style={{ color: C.mute }}>Storage</span>
      </div>
      <RingGauge pct={pct} color={color} size={60} stroke={4}>
        <span className="text-[13px] font-black font-mono" style={{ color }}>{Math.round(pct)}<span className="text-[9px]" style={{ color: C.mute }}>%</span></span>
      </RingGauge>
      <div className="text-[11px] font-mono" style={{ color: C.dim }}>{used.toFixed(1)}<span style={{ color: C.mute }}>/{label}</span></div>
    </div>
  );
};

/* Restarts — half-width big number card */
const RestartCard: React.FC<{ count: number }> = ({ count }) => {
  const color = count > 5 ? C.red : count > 2 ? C.yellow : C.green;
  const label = count === 0 ? "Stable" : count <= 2 ? "Normal" : "Check logs";
  return (
    <div className="rounded-xl px-3 py-3 flex flex-col items-center justify-between h-full gap-2"
      style={{ background: `linear-gradient(180deg, ${color}05, ${C.card})`, border: `1px solid ${color}15` }}>
      <div className="flex items-center gap-2 w-full">
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${color}10` }}>
          <RotateCcw size={14} style={{ color }} />
        </div>
        <span className="text-[9px] uppercase tracking-[0.12em] font-bold" style={{ color: C.mute }}>Restarts</span>
      </div>
      <span className="text-[32px] font-black font-mono leading-none" style={{ color }}>{count}</span>
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          {count === 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: color }} />}
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: color }} />
        </span>
        <span className="text-[10px] font-medium" style={{ color: C.dim }}>{label}</span>
      </div>
    </div>
  );
};

/* ════════════════════ FILES TAB ════════════════════ */
const FilesTab: React.FC<{ botId: string; runtime?: string | null }> = ({ botId, runtime }) => {
  const [path, setPath] = useState("/");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState<"file" | "dir" | null>(null);
  const [createName, setCreateName] = useState("");
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [moveVal, setMoveVal] = useState("");
  const [editor, setEditor] = useState<{ path: string; content: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const t = useToast();

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const r = await api.get(`/bots/${botId}/files`, { params: { path: p } });
      const sorted = (r.data as FileEntry[]).sort((a, b) =>
        a.isDir !== b.isDir ? (a.isDir ? -1 : 1) : a.name.localeCompare(b.name)
      );
      setFiles(sorted);
    } catch { setFiles([]); }
    setLoading(false);
  }, [botId]);

  useEffect(() => { load(path); }, [path, load]);

  const openFile = async (name: string) => {
    const fp = joinPath(path, name);
    try {
      const r = await api.get(`/bots/${botId}/files/content`, { params: { path: fp } });
      setEditor({ path: fp, content: r.data.content ?? "" });
    } catch { t.error("Cannot open file"); }
  };

  const doCreate = async () => {
    if (!createName.trim() || !createModal) return;
    setCreatingLoading(true);
    const fp = joinPath(path, createName.trim());
    try {
      await api.post(`/bots/${botId}/files/create`, { path: fp, type: createModal });
      await load(path);
      const wasFile = createModal === "file";
      const newName = createName.trim();
      setCreateModal(null); setCreateName("");
      if (wasFile) await openFile(newName);
    } catch { t.error("Cannot create"); }
    setCreatingLoading(false);
  };

  const doDelete = async (name: string) => {
    try {
      await api.delete(`/bots/${botId}/files`, { data: { path: joinPath(path, name) } });
      load(path); t.success("Deleted", name);
    } catch { t.error("Cannot delete"); }
    setOpenMenu(null);
  };

  const doClone = async (name: string) => {
    try {
      await api.post(`/bots/${botId}/files/clone`, { path: joinPath(path, name) });
      load(path); t.success("Cloned");
    } catch { t.error("Cannot clone"); }
    setOpenMenu(null);
  };

  const doDownload = (name: string) => {
    const url = `/api/bots/${botId}/files/download?path=${encodeURIComponent(joinPath(path, name))}`;
    window.open(url, "_blank");
    setOpenMenu(null);
  };

  const doRename = async () => {
    if (!renameTarget || !renameVal.trim()) return setRenameTarget(null);
    try {
      await api.post(`/bots/${botId}/files/rename`, {
        from: joinPath(path, renameTarget),
        to: joinPath(path, renameVal.trim()),
      });
      load(path);
    } catch { t.error("Cannot rename"); }
    setRenameTarget(null); setRenameVal("");
  };

  const doMove = async () => {
    if (!moveTarget || !moveVal.trim()) return setMoveTarget(null);
    try {
      await api.post(`/bots/${botId}/files/rename`, {
        from: joinPath(path, moveTarget),
        to: joinPath(moveVal.trim(), moveTarget),
      });
      load(path);
    } catch { t.error("Cannot move"); }
    setMoveTarget(null); setMoveVal("");
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>, asFolder = false) => {
    const fs = Array.from(e.target.files ?? []);
    if (!fs.length) return;
    const form = new FormData();
    fs.forEach((f) => {
      form.append("files", f);
      form.append("relativePaths", asFolder ? ((f as any).webkitRelativePath || f.name) : f.name);
    });
    form.append("path", path);
    try {
      await api.post(`/bots/${botId}/files/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      load(path); t.success("Uploaded", `${fs.length} file(s)`);
    } catch { t.error("Upload failed"); }
    e.target.value = "";
  };

  const parts = path.split("/").filter(Boolean);

  if (editor) {
    return (
      <CodeEditor
        path={editor.path}
        initial={editor.content}
        onClose={() => setEditor(null)}
        onSave={async (content) => {
          await api.put(`/bots/${botId}/files/content`, { path: editor.path, content });
        }}
      />
    );
  }

  const actionBtns = [
    { icon: <Upload size={14} />, label: "File", onClick: () => fileRef.current?.click() },
    { icon: <FolderUp size={14} />, label: "Folder", onClick: () => folderRef.current?.click() },
    { icon: <FilePlus size={14} />, label: "New File", onClick: () => { setCreateModal("file"); setCreateName(""); } },
    { icon: <FolderPlus size={14} />, label: "New Dir", onClick: () => { setCreateModal("dir"); setCreateName(""); } },
  ];

  return (
    <div className="flex flex-col h-full" onClick={() => setOpenMenu(null)}>
      {/* Toolbar */}
      <div
        className="grid grid-cols-4 gap-1.5 p-2 shrink-0 border-b"
        style={{ borderColor: C.border, background: C.surface }}
      >
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => upload(e)} />
        <input
          ref={folderRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => upload(e, true)}
          {...({ webkitdirectory: "", directory: "" } as any)}
        />
        {actionBtns.map((b) => (
          <button
            key={b.label}
            onClick={b.onClick}
            className="flex flex-col items-center gap-0.5 py-1.5 rounded-md hover:bg-white/5 active:scale-95 transition"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.dim }}
          >
            <span style={{ color: C.accent }}>{b.icon}</span>
            <span className="text-[9px] font-semibold">{b.label}</span>
          </button>
        ))}
      </div>

      {/* Breadcrumb */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 border-b shrink-0 text-[10px] font-mono overflow-x-auto"
        style={{ borderColor: C.border, color: C.mute }}
      >
        <button onClick={() => setPath("/")} className="hover:text-white shrink-0">~</button>
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={9} />
            <button
              onClick={() => setPath("/" + parts.slice(0, i + 1).join("/"))}
              className="hover:text-white shrink-0"
            >
              {p}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {path !== "/" && (
          <button
            onClick={() => setPath("/" + parts.slice(0, -1).join("/"))}
            className="w-full flex items-center gap-2 px-3 py-2.5 border-b hover:bg-white/5 text-left"
            style={{ borderColor: C.border }}
          >
            <Folder size={14} style={{ color: C.mute }} />
            <span className="text-[11px] font-mono" style={{ color: C.mute }}>..</span>
          </button>
        )}
        {loading ? (
          <div className="p-6 flex justify-center"><Loader2 className="animate-spin" size={16} style={{ color: C.mute }} /></div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-[11px]" style={{ color: C.mute }}>
            Empty — upload or create a file
          </div>
        ) : (
          files.map((f) => (
            <div
              key={f.name}
              className="relative flex items-center gap-2 px-3 py-2.5 border-b hover:bg-white/5"
              style={{ borderColor: C.border }}
            >
              {renameTarget === f.name ? (
                <div className="flex-1 flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && doRename()}
                    className="flex-1 bg-transparent outline-none text-[11px] font-mono border-b"
                    style={{ borderColor: C.accent, color: C.text }}
                  />
                  <button onClick={doRename} className="text-[10px] px-2 py-0.5 rounded" style={{ background: C.accent, color: "white" }}>OK</button>
                  <button onClick={() => setRenameTarget(null)} className="text-[10px]" style={{ color: C.mute }}>✕</button>
                </div>
              ) : moveTarget === f.name ? (
                <div className="flex-1 flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={moveVal}
                    onChange={(e) => setMoveVal(e.target.value)}
                    placeholder="/target/dir"
                    onKeyDown={(e) => e.key === "Enter" && doMove()}
                    className="flex-1 bg-transparent outline-none text-[11px] font-mono border-b"
                    style={{ borderColor: C.accent, color: C.text }}
                  />
                  <button onClick={doMove} className="text-[10px] px-2 py-0.5 rounded" style={{ background: C.accent, color: "white" }}>Move</button>
                  <button onClick={() => setMoveTarget(null)} className="text-[10px]" style={{ color: C.mute }}>✕</button>
                </div>
              ) : (
                <>
                  <button
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                    onClick={() => f.isDir ? setPath(joinPath(path, f.name)) : openFile(f.name)}
                  >
                    {f.isDir
                      ? <FolderOpen size={14} style={{ color: C.yellow }} />
                      : <FileTypeIcon name={f.name} size={14} />
                    }
                    <span className="text-[11px] font-mono truncate" style={{ color: C.text }}>{f.name}</span>
                    {!f.isDir && <span className="text-[9px] ml-auto shrink-0" style={{ color: C.mute }}>{fmtBytes(f.size)}</span>}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === f.name ? null : f.name); }}
                    className="p-1 rounded hover:bg-white/10 shrink-0"
                  >
                    <MoreVertical size={13} style={{ color: C.mute }} />
                  </button>
                  {openMenu === f.name && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-2 top-9 z-20 py-1 rounded-lg shadow-xl min-w-[120px]"
                      style={{ background: C.card, border: `1px solid ${C.borderStrong}` }}
                    >
                      {[
                        { icon: <Pencil size={11} />, label: "Rename", on: () => { setRenameTarget(f.name); setRenameVal(f.name); setOpenMenu(null); } },
                        { icon: <Copy size={11} />, label: "Clone", on: () => doClone(f.name) },
                        { icon: <FolderInput size={11} />, label: "Move", on: () => { setMoveTarget(f.name); setMoveVal(path); setOpenMenu(null); } },
                        ...(!f.isDir ? [{ icon: <Download size={11} />, label: "Download", on: () => doDownload(f.name) }] : []),
                        { icon: <Trash2 size={11} />, label: "Delete", on: () => doDelete(f.name), danger: true },
                      ].map((m: any) => (
                        <button
                          key={m.label}
                          onClick={m.on}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/5 text-left"
                          style={{ color: m.danger ? C.red : C.text }}
                        >
                          {m.icon}{m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create modal */}
      {createModal && (
        <Modal onClose={() => setCreateModal(null)} title={createModal === "file" ? "Create file" : "Create folder"}>
          <input
            autoFocus
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doCreate()}
            placeholder={createModal === "file" ? (runtime === "python" ? "main.py" : "index.js") : "folder-name"}
            className="w-full bg-transparent outline-none text-sm font-mono px-3 py-2 rounded-md border"
            style={{ borderColor: C.border, background: C.console, color: C.text }}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setCreateModal(null)}
              className="flex-1 h-9 rounded-md text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.05)", color: C.dim, border: `1px solid ${C.border}` }}
            >
              Cancel
            </button>
            <button
              onClick={doCreate}
              disabled={!createName.trim() || creatingLoading}
              className="flex-1 h-9 rounded-md text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ background: C.accent }}
            >
              {creatingLoading ? <Loader2 size={12} className="animate-spin" /> : null}
              Create
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ════════════════════ CODE EDITOR (CodeMirror) ════════════════════ */
const CodeEditor: React.FC<{
  path: string;
  initial: string;
  onSave: (content: string) => Promise<void>;
  onClose: () => void;
}> = ({ path, initial, onSave, onClose }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileName = path.split("/").pop() || "file";
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  const langExt = useMemo(() => {
    if (ext === "py") return python();
    return javascript({ jsx: ext === "jsx" || ext === "tsx", typescript: ext === "ts" || ext === "tsx" });
  }, [ext]);

  // autosave (debounced)
  const saveTimer = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const triggerAutosave = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const content = viewRef.current?.state.doc.toString() ?? "";
      try { setSaving(true); await onSaveRef.current(content); setSavedAt(Date.now()); }
      finally { setSaving(false); }
    }, 800);
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const state = EditorState.create({
      doc: initial,
      extensions: [
        lineNumbers(),
        history(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        oneDark,
        langExt,
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => { if (u.docChanged) triggerAutosave(); }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "12px" },
          ".cm-scroller": { fontFamily: "'JetBrains Mono', monospace" },
        }),
      ],
    });
    const view = new EditorView({ state, parent: wrapRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const manualSave = async () => {
    const content = viewRef.current?.state.doc.toString() ?? "";
    setSaving(true);
    try { await onSave(content); setSavedAt(Date.now()); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <header
        className="flex items-center gap-1.5 px-2 py-2 border-b shrink-0"
        style={{ borderColor: C.border, background: C.surface }}
      >
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/5">
          <X size={16} />
        </button>
        <FileTypeIcon name={fileName} size={14} />
        <span className="text-xs font-mono truncate flex-1">{fileName}</span>
        <button onClick={() => viewRef.current && undo(viewRef.current)} className="p-1.5 rounded hover:bg-white/5">
          <Undo2 size={14} style={{ color: C.dim }} />
        </button>
        <button onClick={() => viewRef.current && redo(viewRef.current)} className="p-1.5 rounded hover:bg-white/5">
          <Redo2 size={14} style={{ color: C.dim }} />
        </button>
        <button
          onClick={manualSave}
          className="flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-bold"
          style={{ background: savedAt && !saving ? C.dim : C.accent, color: savedAt && !saving ? C.bg : "white" }}
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {savedAt && !saving ? "Saved" : "Save"}
        </button>
      </header>
      <div ref={wrapRef} className="flex-1 min-h-0 overflow-hidden" />
    </div>
  );
};

/* ════════════════════ STARTUP TAB ════════════════════ */
const StartupTab: React.FC<{ botId: string; bot: any }> = ({ botId, bot }) => {
  const [val, setVal] = useState<string>("");
  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const t = useToast();
  const qc = useQueryClient();
  const runtime = bot?.runtime ?? "nodejs";
  const isNode = runtime === "nodejs";
  const validExts = isNode ? [".js", ".mjs", ".cjs"] : [".py"];

  useEffect(() => {
    const initial = bot?.startFile ?? (isNode ? "index.js" : "main.py");
    setVal(initial);
  }, [bot?.startFile, bot?.runtime, isNode]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/bots/${botId}/files`, { params: { path: "/" } });
        const files = (r.data as FileEntry[])
          .filter((f) => !f.isDir)
          .map((f) => f.name)
          .filter((n) => validExts.some((ext) => n.endsWith(ext)));
        setAllFiles(files);
      } catch {}
    })();
  }, [botId, runtime]);

  const presets = isNode ? ["index.js", "app.js", "server.js", "bot.js", "main.js"] : ["main.py", "app.py", "bot.py", "run.py"];

  const save = async () => {
    if (!val.trim()) return;
    const ext = "." + (val.trim().split(".").pop() ?? "");
    if (!validExts.includes(ext)) {
      t.error(isNode ? "Must be a .js, .mjs, or .cjs file" : "Must be a .py file");
      return;
    }
    try {
      await api.patch(`/bots/${botId}`, { startFile: val.trim() });
      qc.invalidateQueries({ queryKey: ["bot", botId] });
      t.success("Saved", "Startup file updated");
    } catch { t.error("Failed to save"); }
  };

  const matches = val
    ? allFiles.filter((f) => f.toLowerCase().includes(val.toLowerCase()) && f !== val).slice(0, 5)
    : [];

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
      <div>
        <label className="text-[10px] uppercase font-bold tracking-wide" style={{ color: C.mute }}>
          Startup file
        </label>
        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: C.dim }}>
          The file your panel runs when started. Must exist in your files.
        </p>
      </div>

      <div className="relative">
        <div
          className="flex items-center gap-2 rounded-lg px-3"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          <FileTypeIcon name={val || "x"} size={14} />
          <input
            value={val}
            onChange={(e) => { setVal(e.target.value); setShowSuggest(true); }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
            placeholder={bot?.runtime === "python" ? "main.py" : "index.js"}
            className="flex-1 bg-transparent outline-none text-sm font-mono py-2.5 text-white"
          />
        </div>
        {showSuggest && matches.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-10"
            style={{ background: C.card, border: `1px solid ${C.borderStrong}` }}
          >
            {matches.map((m) => (
              <button
                key={m}
                onMouseDown={() => { setVal(m); setShowSuggest(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-mono hover:bg-white/5"
              >
                <FileTypeIcon name={m} size={12} />
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-[10px] uppercase font-bold mb-1.5" style={{ color: C.mute }}>Presets</div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setVal(p)}
              className="flex items-center gap-1 h-7 px-2 rounded-full text-[10px] font-mono"
              style={{
                background: val === p ? "rgba(249,115,22,0.15)" : C.card,
                border: `1px solid ${val === p ? C.accent : C.border}`,
                color: val === p ? C.accent : C.dim,
              }}
            >
              <FileTypeIcon name={p} size={10} />
              {p}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        className="h-10 rounded-md text-xs font-bold text-white"
        style={{ background: C.accent }}
      >
        Save startup file
      </button>
    </div>
  );
};

/* ════════════════════ CONFIG TAB ════════════════════ */
const ConfigTab: React.FC<{ bot: any }> = ({ bot }) => {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const t = useToast();

  const del = async () => {
    setDeleting(true);
    try {
      await api.delete(`/bots/${bot.id}`);
      t.success("Panel deleted");
      window.location.href = "/bots";
    } catch { t.error("Delete failed"); setDeleting(false); }
  };

  const rows = [
    { label: "Panel Name", value: bot?.name ?? "—" },
    { label: "Language", value: bot?.runtime ?? "—", icon: <LangIcon runtime={bot?.runtime} size={12} /> },
    { label: "Panel ID", value: bot?.id ?? "—", mono: true },
    { label: "Plan", value: (bot?.plan ?? "basic").toUpperCase() },
    { label: "Created", value: bot?.createdAt ? new Date(bot.createdAt).toLocaleDateString() : "—" },
  ];

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
      <div className="rounded-lg overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        {rows.map((r, i) => (
          <div
            key={r.label}
            className="flex items-center justify-between px-3 py-2.5"
            style={i < rows.length - 1 ? { borderBottom: `1px solid ${C.border}` } : undefined}
          >
            <span className="text-[10px] uppercase font-semibold tracking-wide" style={{ color: C.mute }}>
              {r.label}
            </span>
            <span className={`text-[11px] flex items-center gap-1.5 max-w-[60%] truncate ${r.mono ? "font-mono" : "font-semibold"}`} style={{ color: C.text }}>
              {r.icon}
              {r.value}
            </span>
          </div>
        ))}
      </div>

      <div
        className="rounded-lg p-3 mt-2"
        style={{ border: `1px solid rgba(239,68,68,0.4)`, background: "rgba(239,68,68,0.05)" }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <AlertTriangle size={12} style={{ color: C.red }} />
          <span className="text-[10px] uppercase font-bold tracking-wide" style={{ color: C.red }}>
            Danger Zone
          </span>
        </div>
        <p className="text-[11px] leading-relaxed mb-2" style={{ color: C.dim }}>
          Permanently delete this panel and all its files. This cannot be undone.
        </p>
        <button
          onClick={() => setConfirm(true)}
          className="h-9 px-3 rounded-md text-[11px] font-bold text-white w-full flex items-center justify-center gap-1.5"
          style={{ background: C.red }}
        >
          <Trash2 size={12} /> Delete Panel
        </button>
      </div>

      {confirm && (
        <Modal onClose={() => setConfirm(false)} title="Delete this panel?">
          <p className="text-[12px] leading-relaxed" style={{ color: C.dim }}>
            <strong style={{ color: C.text }}>{bot?.name}</strong> and all its files will be permanently destroyed.
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setConfirm(false)}
              className="flex-1 h-9 rounded-md text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.05)", color: C.dim, border: `1px solid ${C.border}` }}
            >
              Cancel
            </button>
            <button
              onClick={del}
              disabled={deleting}
              className="flex-1 h-9 rounded-md text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ background: C.red }}
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ════════════════════ LOGS TAB ════════════════════ */
const LogsTab: React.FC<{ botId: string; bot: any }> = ({ botId, bot }) => {
  const [errorLogs, setErrorLogs] = useState<LogLine[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onLog = (l: LogLine) => {
      if (l.isStderr || /error|fail|exception|traceback/i.test(l.text)) {
        setErrorLogs((p) => [...p.slice(-199), l]);
      }
    };

    const doSubscribe = () => {
      socket.on("console-log", onLog);
      socket.emit("logs:subscribe", { botId });
    };

    if (socket.connected) {
      doSubscribe();
    } else {
      socket.connect();
      socket.once("connect", doSubscribe);
    }

    return () => {
      socket.off("console-log", onLog);
    };
  }, [botId]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex flex-col h-full p-2 gap-2">
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => setErrorLogs([])} className="h-7 w-7 rounded-md flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}>
          <Eraser size={12} style={{ color: C.dim }} />
        </button>
        <span className="text-[10px] font-mono ml-auto" style={{ color: C.mute }}>{errorLogs.length} errors</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg p-2.5 font-mono text-[11px] leading-relaxed"
        style={{ background: C.console, border: `1px solid ${C.border}`, fontFamily: "'JetBrains Mono', monospace" }}>
        {errorLogs.length === 0 ? (
          <div style={{ color: C.mute }} className="text-center pt-4 text-[11px]">
            No errors yet
          </div>
        ) : errorLogs.map((l, i) => (
          <div key={i}
            className="flex items-start gap-2 py-0.5 cursor-pointer hover:bg-white/[0.02] rounded px-1 -mx-1 group"
            onClick={() => setSelected(l.text)}>
            <div className="flex-1 min-w-0">
              <div style={{ color: colorize(l) }} className="whitespace-pre-wrap break-words truncate">
                {l.text.split("\n")[0]}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); copy(l.text); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 shrink-0"
              title="Copy">
              <Copy size={11} style={{ color: C.mute }} />
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <Modal title="Error Details" onClose={() => setSelected(null)}>
          <div className="relative">
            <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words p-3 rounded-lg max-h-80 overflow-y-auto"
              style={{ background: C.console, border: `1px solid ${C.border}`, fontFamily: "'JetBrains Mono', monospace", color: C.red }}>
              {selected}
            </pre>
            <button
              onClick={() => copy(selected)}
              className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-white/10"
              style={{ background: "rgba(0,0,0,0.4)" }}>
              {copied ? <Check size={14} style={{ color: C.green }} /> : <Copy size={14} style={{ color: C.dim }} />}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ════════════════════ MODAL ════════════════════ */
const Modal: React.FC<{ title: string; children: React.ReactNode; onClose: () => void }> = ({ title, children, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-sm rounded-xl p-4"
      style={{ background: C.card, border: `1px solid ${C.borderStrong}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">{title}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/5"><X size={14} /></button>
      </div>
      {children}
    </div>
  </div>
);
