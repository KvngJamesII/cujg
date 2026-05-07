import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import {
  Play, Square, RefreshCw, ChevronLeft, Trash2, X, Save, Undo2, Redo2,
  Upload, FolderUp, FilePlus, FolderPlus, MoreVertical, Pencil, Copy,
  Download, FolderInput, Folder, FolderOpen, ChevronRight, Loader2, Send,
  Eraser, AlertTriangle,
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
  const [tab, setTab] = useState<"console" | "files" | "startup" | "config">("console");
  const qc = useQueryClient();
  const t = useToast();

  const { data: bot } = useQuery<any>({
    queryKey: ["bot", id],
    queryFn: async () => (await api.get(`/bots/${id}`)).data,
    refetchInterval: 5000,
  });

  const action = useMutation({
    mutationFn: async (a: "start" | "stop" | "restart") =>
      (await api.post(`/bots/${id}/${a}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bot", id] }),
    onError: (e: any) => t.error("Action failed", e?.response?.data?.error ?? "Try again"),
  });

  const isRunning = bot?.status === "running";
  const runtime = bot?.runtime;

  return (
    <DashboardLayout fullHeight>
      <div className="flex flex-col h-full" style={{ background: C.bg, color: C.text }}>
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
            disabled={action.isPending}
            className="flex items-center gap-1 h-8 px-2.5 rounded-md text-[11px] font-bold text-white disabled:opacity-50 shrink-0"
            style={{ background: isRunning ? C.red : C.green }}
          >
            {isRunning ? <Square size={11} fill="white" /> : <Play size={11} fill="white" />}
            {isRunning ? "Stop" : "Start"}
          </button>
          <button
            onClick={() => action.mutate("restart")}
            disabled={!isRunning || action.isPending}
            className="flex items-center gap-1 h-8 px-2.5 rounded-md text-[11px] font-bold text-black disabled:opacity-30 shrink-0"
            style={{ background: C.yellow }}
          >
            <RefreshCw size={11} />
          </button>
        </header>

        {/* TABS */}
        <nav
          className="flex shrink-0 border-b"
          style={{ borderColor: C.border, background: C.surface }}
        >
          {(["console", "files", "startup", "config"] as const).map((k) => (
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
          {tab === "console" && <ConsoleTab botId={id!} bot={bot} />}
          {tab === "files" && <FilesTab botId={id!} runtime={runtime} />}
          {tab === "startup" && <StartupTab botId={id!} bot={bot} />}
          {tab === "config" && <ConfigTab bot={bot} />}
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
  if (t.includes("error")) return C.red;
  if (t.includes("warn")) return C.yellow;
  if (t.includes("ready") || t.includes("listening") || t.includes("connected")) return C.green;
  if (t.startsWith("> ")) return C.cyan;
  return "#D1D5DB";
};

const ConsoleTab: React.FC<{ botId: string; bot: any }> = ({ botId, bot }) => {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<{ cpu: number; ram: number; restarts: number }>({
    cpu: 0, ram: 0, restarts: 0,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const stopped = useRef(false);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const onLog = (l: LogLine) => { if (!stopped.current) setLogs((p) => [...p.slice(-499), l]); };
    const onStats = (s: any) => setStats((prev) => ({
      cpu: s?.cpuPercent ?? prev.cpu,
      ram: s?.memoryUsedMb ?? prev.ram,
      restarts: s?.restarts ?? prev.restarts,
    }));
    socket.on("console-log", onLog);
    socket.on("container-stats", onStats);
    socket.emit("logs:subscribe", { botId });
    return () => {
      socket.off("console-log", onLog);
      socket.off("container-stats", onStats);
      socket.emit("logs:unsubscribe", { botId });
    };
  }, [botId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [logs]);

  const send = () => {
    if (!input.trim()) return;
    socket.emit("console-input", { botId, data: input });
    setLogs((p) => [...p, { text: `> ${input}`, isStderr: false }]);
    setInput("");
  };

  const ramLimit = bot?.memoryLimitMb ?? 500;
  const memLimit = (bot?.plan === "pro" ? 1024 : 500);

  return (
    <div className="flex flex-col h-full p-2 gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => { stopped.current = !stopped.current; }}
          className="h-7 px-2.5 rounded-md text-[10px] font-semibold flex items-center gap-1"
          style={{ background: "rgba(239,68,68,0.12)", color: C.red, border: `1px solid rgba(239,68,68,0.25)` }}
        >
          <Square size={10} /> Stop stream
        </button>
        <button
          onClick={() => setLogs([])}
          className="h-7 px-2.5 rounded-md text-[10px] font-semibold flex items-center gap-1"
          style={{ background: "rgba(255,255,255,0.04)", color: C.dim, border: `1px solid ${C.border}` }}
        >
          <Eraser size={10} /> Clear
        </button>
        <span className="ml-auto text-[10px]" style={{ color: C.mute }}>
          {logs.length} lines
        </span>
      </div>

      {/* Console */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto rounded-lg p-2.5 font-mono text-[11px] leading-relaxed"
        style={{
          background: C.console,
          border: `1px solid ${C.border}`,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: C.mute }} className="text-center pt-4 text-[11px]">
            Waiting for output…
          </div>
        ) : logs.map((l, i) => (
          <div key={i} style={{ color: colorize(l) }} className="whitespace-pre-wrap break-words">
            {l.text}
          </div>
        ))}
      </div>

      {/* stdin input */}
      <div
        className="flex items-center gap-1.5 shrink-0 rounded-lg px-2"
        style={{ background: C.console, border: `1px solid ${C.border}` }}
      >
        <span className="text-xs font-mono" style={{ color: C.green }}>$</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type input…"
          className="flex-1 bg-transparent outline-none text-[12px] font-mono py-2 text-white placeholder:text-white/20"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="p-1.5 rounded-md disabled:opacity-30"
          style={{ color: C.accent }}
        >
          <Send size={14} />
        </button>
      </div>

      {/* 3 mini stat cards */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <StatCard label="RAM" value={`${stats.ram || bot?.memoryUsedMb || 0}/${ramLimit}MB`} color={C.cyan} />
        <StatCard label="MEM" value={`${stats.ram || 0}/${memLimit > 999 ? "1GB" : `${memLimit}MB`}`} color={C.blue} />
        <StatCard label="Restarts" value={`${stats.restarts}`} color={C.accent} />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div
    className="rounded-lg px-2 py-1.5"
    style={{ background: C.card, border: `1px solid ${C.border}` }}
  >
    <div className="text-[9px] uppercase tracking-wide" style={{ color: C.mute }}>{label}</div>
    <div className="text-[11px] font-bold font-mono truncate" style={{ color }}>{value}</div>
  </div>
);

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
  const triggerAutosave = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const content = viewRef.current?.state.doc.toString() ?? "";
      try { setSaving(true); await onSave(content); setSavedAt(Date.now()); }
      finally { setSaving(false); }
    }, 800);
  }, [onSave]);

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
  }, [initial, langExt, triggerAutosave]);

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
          className="flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-bold text-white"
          style={{ background: C.accent }}
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

  useEffect(() => {
    const initial = bot?.startFile ?? (bot?.runtime === "python" ? "main.py" : "index.js");
    setVal(initial);
  }, [bot?.startFile, bot?.runtime]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/bots/${botId}/files`, { params: { path: "/" } });
        setAllFiles((r.data as FileEntry[]).filter((f) => !f.isDir).map((f) => f.name));
      } catch {}
    })();
  }, [botId]);

  const presets = ["app.js", "index.js", "server.js", "bot.js", "main.js", "main.py"];

  const save = async () => {
    if (!val.trim()) return;
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
        className="rounded-lg p-3 mt-auto"
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
