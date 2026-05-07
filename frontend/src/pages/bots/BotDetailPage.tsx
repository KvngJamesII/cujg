
import React, { useState, useRef, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Play, Square, RefreshCw, Send, HardDrive, Cpu, MemoryStick, Timer, File, Folder, Upload, FolderUp, FilePlus, FolderPlus, MoreVertical, Download, Copy, Pencil, Undo2, Redo2, X, Save, Bell, Hash, Lock, Eye, EyeOff, Trash2, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { io } from "socket.io-client";

const B = "rgba(255,255,255,0.07)";
const S = "rgba(255,255,255,0.04)";
const DIM = "rgba(255,255,255,0.45)";
const MUT = "rgba(255,255,255,0.25)";
const OG = "#F97316";
const RD = "#EF4444";
const YL = "#EAB308";
const GR = "#10B981";
const BL = "#3B82F6";

const socket = io(window.location.origin, { path: "/api/socket.io", autoConnect: false });


function logColor(text: string, isStderr: boolean): string {
    if (isStderr) return RD;
    const l = text.toLowerCase();
    if (l.includes("error")) return RD;
    if (l.includes("warn")) return YL;
    if (l.includes("success") || l.includes("ready") || l.includes("connected")) return GR;
    if (l.includes("[info]")) return BL;
    return DIM;
  }

const ConsoleTab: React.FC<{ botId: string; onLog: (log: { text: string; isStderr: boolean }) => void }> = ({ botId, onLog }) => {
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
  
    const send = () => {
      if (!input.trim()) return;
      socket.emit("console-input", { botId, data: input });
      onLog({ text: `> ${input}`, isStderr: false });
      setInput("");
      inputRef.current?.focus();
    };
  
    return (
      <div className="flex items-center p-2 border-t" style={{ borderColor: B }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a command..."
          className="flex-1 bg-transparent outline-none text-sm font-mono text-white placeholder:text-white/20"
        />
        <Button size="sm" onClick={send} disabled={!input.trim()}>
          <Send size={14} />
        </Button>
      </div>
    );
  };

const BotDetailPage: React.FC = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("Console");
  const [logs, setLogs] = useState<{ text: string; isStderr: boolean }[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { success: ok, error: err } = useToast();

  const { data: bot, isLoading } = useQuery<any>({
    queryKey: ["bot", id],
    queryFn: async () => {
      const r = await api.get(`/bots/${id}`);
      return r.data;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleLog = (log: { text: string; isStderr: boolean }) => {
        setLogs((prev) => [...prev, log]);
      };

    socket.on("console-log", handleLog);
    socket.emit("logs:subscribe", { botId: id });

    return () => {
      socket.off("console-log", handleLog);
      socket.emit("logs:unsubscribe", { botId: id });
    };
  }, [id]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const doAction = useMutation({
    mutationFn: async (action: string) => {
      await api.post(`/bots/${id}/${action}`);
    },
    onSuccess: (_, action) => {
      ok("Done", `Panel ${action} triggered.`);
      qc.invalidateQueries({ queryKey: ["bot", id] });
    },
    onError: (e: any) => err("Failed", e.response?.data?.error ?? "Action failed"),
  });

  const isRunning = bot?.status === "running";
  const isStopped = !isRunning;

  return (
    <DashboardLayout>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
            <Link href="/bots">
                <Button variant="ghost" size="sm">
                    <ChevronLeft size={16} className="mr-2" />
                    Back
                </Button>
            </Link>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={isStopped || doAction.isPending} onClick={() => doAction.mutate("restart")} style={{ color: YL }}>
                    <RefreshCw size={14} className="mr-2" />
                    Restart
                </Button>
                {isStopped ? (
                    <Button variant="outline" size="sm" disabled={doAction.isPending} onClick={() => doAction.mutate("start")} style={{ color: GR }}>
                        <Play size={14} className="mr-2" />
                        Start
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" disabled={doAction.isPending} onClick={() => doAction.mutate("stop")} style={{ color: RD }}>
                        <Square size={14} className="mr-2" />
                        Stop
                    </Button>
                )}
            </div>
        </div>

        <h1 className="text-2xl font-bold mb-4">{bot?.name}</h1>

        <div className="border rounded-lg overflow-hidden" style={{ borderColor: B }}>
          <div className="flex border-b" style={{ borderColor: B }}>
            {["Console", "Files", "Settings", "Stats"].map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 text-sm font-medium ${activeTab === tab ? "bg-white/5 text-white" : "text-gray-400"}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Console" && (
            <div className="flex flex-col h-[500px]">
              <div ref={logContainerRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs" style={{ backgroundColor: S }}>
                {logs.map((log, i) => (
                  <div key={i} style={{ color: logColor(log.text, log.isStderr) }}>
                    {log.text}
                  </div>
                ))}
              </div>
              <ConsoleTab botId={id!} onLog={(log) => setLogs((prev) => [...prev, log])} />
            </div>
          )}
          {activeTab === "Files" && <FilesTab botId={id!} />}
          {activeTab === "Settings" && <SettingsTab bot={bot} />}
          {activeTab === "Stats" && <StatsTab bot={bot} />}
        </div>

        {activeTab === "Console" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center">
                        <MemoryStick size={24} className="mr-4" style={{ color: DIM }} />
                        <div>
                            <div className="text-sm text-gray-400">RAM</div>
                            <div className="text-lg font-bold">{bot?.stats?.ram || 0} / {bot?.plan?.ram || 0} MB</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center">
                        <Cpu size={24} className="mr-4" style={{ color: DIM }} />
                        <div>
                            <div className="text-sm text-gray-400">CPU</div>
                            <div className="text-lg font-bold">{bot?.stats?.cpu || 0}%</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center">
                        <HardDrive size={24} className="mr-4" style={{ color: DIM }} />
                        <div>
                            <div className="text-sm text-gray-400">Storage</div>
                            <div className="text-lg font-bold">{bot?.stats?.storage || 0} / {bot?.plan?.storage || 0} MB</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center">
                        <Timer size={24} className="mr-4" style={{ color: DIM }} />
                        <div>
                            <div className="text-sm text-gray-400">Uptime</div>
                            <div className="text-lg font-bold">{bot?.stats?.uptime || "N/A"}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// ── Files Tab ─────────────────────────────────────────────────────────────────
interface FileEntry { name: string; isDir: boolean; size: number; modified: string; }

const FilesTab: React.FC<{ botId: string }> = ({ botId }) => {
  const [path, setPath]         = useState("/");
  const [files, setFiles]       = useState<FileEntry[]>([]);
  const [loading, setLoading]   = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [creating, setCreating] = useState<"file"|"dir"|null>(null);
  const [newName, setNewName]   = useState("");
  const [editing, setEditing]   = useState<{ path: string; content: string } | null>(null);
  const [saving, setSaving]     = useState(false);
  const fileRef   = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const { success: ok, error: err } = useToast();

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try { const r = await api.get(`/bots/${botId}/files`, { params: { path: p } }); setFiles(r.data); }
    catch { setFiles([]); }
    setLoading(false);
  }, [botId]);

  useEffect(() => { load(path); }, [path, load]);

  const openFile = async (name: string) => {
    const fp = [path, name].join("/").replace(/\/+/g, "/");
    try {
      const r = await api.get(`/bots/${botId}/files/content`, { params: { path: fp } });
      setEditing({ path: fp, content: r.data.content });
    } catch { err("Error", "Cannot open file"); }
  };

  const saveFile = async (content: string) => {
    if (!editing) return;
    setSaving(true);
    try { await api.put(`/bots/${botId}/files/content`, { path: editing.path, content }); ok("Saved", editing.path.split("/").pop()!); }
    catch { err("Error", "Cannot save"); }
    setSaving(false);
  };

  const del = async (name: string) => {
    const fp = [path, name].join("/").replace(/\/+/g, "/");
    try { await api.delete(`/bots/${botId}/files`, { data: { path: fp } }); if (editing?.path === fp) setEditing(null); load(path); ok("Deleted", name); }
    catch { err("Error", "Cannot delete"); }
    setOpenMenu(null);
  };

  const clone = async (name: string) => {
    const fp = [path, name].join("/").replace(/\/+/g, "/");
    try { const r = await api.post(`/bots/${botId}/files/clone`, { path: fp }); load(path); ok("Cloned", r.data.cloneName); }
    catch { err("Error", "Cannot clone"); }
    setOpenMenu(null);
  };

  const confirmRename = async () => {
    if (!renaming || !renameVal.trim() || renameVal === renaming) { setRenaming(null); return; }
    const from = [path, renaming].join("/").replace(/\/+/g, "/");
    const to   = [path, renameVal.trim()].join("/").replace(/\/+/g, "/");
    try { await api.post(`/bots/${botId}/files/rename`, { from, to }); if (editing?.path === from) setEditing(null); load(path); }
    catch { err("Error", "Cannot rename"); }
    setRenaming(null);
  };

  const createItem = async () => {
    if (!newName.trim() || !creating) return;
    const fp = [path, newName.trim()].join("/").replace(/\/+/g, "/");
    try { await api.post(`/bots/${botId}/files/create`, { path: fp, type: creating }); load(path); if (creating === "file") openFile(newName.trim()); }
    catch { err("Error", "Cannot create"); }
    setCreating(null); setNewName("");
  };

  const uploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files ?? []);
    if (!fs.length) return;
    const form = new FormData();
    fs.forEach(f => { form.append("files", f); form.append("relativePaths", f.name); });
    form.append("path", path);
    try { await api.post(`/bots/${botId}/files/upload`, form, { headers: { "Content-Type": "multipart/form-data" } }); load(path); ok("Uploaded", `${fs.length} file(s)`); }
    catch { err("Error", "Upload failed"); }
    e.target.value = "";
  };

  const uploadFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files ?? []);
    if (!fs.length) return;
    const form = new FormData();
    fs.forEach(f => { form.append("files", f); form.append("relativePaths", (f as any).webkitRelativePath || f.name); });
    form.append("path", path);
    try { await api.post(`/bots/${botId}/files/upload`, form, { headers: { "Content-Type": "multipart/form-data" } }); load(path); ok("Uploaded", `${fs.length} file(s)`); }
    catch { err("Error", "Upload failed"); }
    e.target.value = "";
  };

  const parts = path.split("/").filter(Boolean);
  const fmtSize = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(0)}K` : `${(b/1048576).toFixed(1)}M`;

  if (editing) {
    return (
      <div></div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0" onClick={() => setOpenMenu(null)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b shrink-0 flex-wrap" style={{ borderColor: B }}>
        <input ref={fileRef}   type="file" multiple className="hidden" onChange={uploadFiles} />
        <input ref={folderRef} type="file" multiple className="hidden" onChange={uploadFolder} {...{ webkitdirectory:"", directory:"" } as any} />
        {[
          { icon:<Upload size={11}/>, label:"Upload", cb:() => fileRef.current?.click() },
          { icon:<FolderUp size={11}/>, label:"Folder", cb:() => folderRef.current?.click() },
          { icon:<FilePlus size={11}/>, label:"File", cb:() => { setCreating("file"); setNewName(""); } },
          { icon:<FolderPlus size={11}/>, label:"Dir", cb:() => { setCreating("dir"); setNewName(""); } },
        ].map(b => (
          <button key={b.label} onClick={b.cb}
            className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold hover:bg-white/5"
            style={{ background: S, border: `1px solid ${B}`, color: DIM }}>
            {b.icon}{b.label}
          </button>
        ))}
      </div>

      {/* New item form */}
      {creating && (
        <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0" style={{ borderColor: B }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if(e.key==="Enter") createItem(); if(e.key==="Escape") setCreating(null); }}
            placeholder={creating === "file" ? "filename.py" : "folder-name"}
            className="flex-1 bg-transparent outline-none text-sm font-mono text-white" />
          <button onClick={createItem} className="h-6 px-2.5 rounded text-[11px] font-bold text-white" style={{ background: BL }}>Create</button>
          <button onClick={() => setCreating(null)} className="text-[11px]" style={{ color: MUT }}>✕</button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b shrink-0 text-[11px] font-mono overflow-x-auto scrollbar-none" style={{ borderColor: B, color: MUT }}>
        <button onClick={() => setPath("/")} className="hover:text-white shrink-0">/</button>
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={10} className="shrink-0" />
            <button onClick={() => setPath("/" + parts.slice(0,i+1).join("/"))} className="hover:text-white shrink-0">{p}</button>
          </React.Fragment>
        ))}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {path !== "/" && (
          <button onClick={() => { const p = parts.slice(0,-1); setPath("/" + p.join("/")); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.02] border-b text-left" style={{ borderColor: B }}>
            <Folder size={13} style={{ color: MUT }} />
            <span className="text-xs font-mono" style={{ color: MUT }}>..</span>
          </button>
        )}
        {loading
          ? [1,2,3].map(i => <div key={i} className="h-10 animate-pulse border-b" style={{ background: S, borderColor: B }} />)
          : files.length === 0
            ? <div className="py-10 text-center text-xs" style={{ color: MUT }}>Empty — upload or create files</div>
            : files.map(f => (
              <div key={f.name} className="relative flex items-center gap-2.5 px-4 py-2.5 border-b hover:bg-white/[0.02] cursor-pointer group" style={{ borderColor: B }}>
                {renaming === f.name ? (
                  <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => { if(e.key==="Enter") confirmRename(); if(e.key==="Escape") setRenaming(null); }}
                      className="flex-1 bg-transparent border-b outline-none text-sm font-mono text-white" style={{ borderColor: BL }} />
                    <button onClick={confirmRename} className="text-[11px] font-bold" style={{ color: BL }}>OK</button>
                    <button onClick={() => setRenaming(null)} className="text-[11px]" style={{ color: MUT }}>✕</button>
                  </div>
                ) : (
                  <>
                    <File size={13} style={{ color: MUT }} />
                    <span className="flex-1 text-sm font-mono truncate text-white"
                      onClick={() => f.isDir ? setPath([path,f.name].join("/").replace(/\/+/g,"/")) : openFile(f.name)}>
                      {f.name}
                    </span>
                    {!f.isDir && <span className="text-[10px] tabular-nums shrink-0" style={{ color: MUT }}>{fmtSize(f.size)}</span>}
                    <button onClick={e => { e.stopPropagation(); setOpenMenu(openMenu===f.name?null:f.name); }}
                      className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 shrink-0" style={{ color: MUT }}>
                      <MoreVertical size={12}/>
                    </button>
                    {openMenu === f.name && (
                      <div className="absolute right-3 top-8 z-20 rounded-xl overflow-hidden py-1 min-w-[140px]"
                        style={{ background:"#111520", border:`1px solid ${B}`, boxShadow:"0 8px 32px rgba(0,0,0,0.6)" }}
                        onClick={e => e.stopPropagation()}>
                        {[
                          { icon:<Pencil size={10}/>,   label:"Rename",   action:() => { setRenaming(f.name); setRenameVal(f.name); setOpenMenu(null); } },
                          ...(!f.isDir ? [
                            { icon:<Copy size={10}/>,     label:"Clone",    action:() => clone(f.name) },
                            { icon:<Download size={10}/>, label:"Download", action:() => { window.open(`/api/bots/${botId}/files/download?path=${encodeURIComponent([path,f.name].join("/").replace(/\/+/g,"/"))}`,"_blank"); setOpenMenu(null); } },
                          ] : []),
                          { icon:<Trash2 size={10}/>,   label:"Delete",   action:() => del(f.name), danger:true },
                        ].map(item => (
                          <button key={item.label} onClick={item.action}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/5"
                            style={{ color: (item as any).danger?"#ef4444":DIM }}>
                            {item.icon}{item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
        }
      </div>
    </div>
  );
};


// ── Settings Tab ──────────────────────────────────────────────────────────────
const SettingsTab: React.FC<{ bot: any }> = ({ bot }) => {
  const [name, setName]       = useState(bot.name);
  const [nameSaved, setNameSaved] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [delInput, setDelInput] = useState("");
  const [showDel, setShowDel] = useState(false);
  const { success: ok, error: err } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const isPro = (bot.plan ?? "basic") === "pro";

  const saveName = useMutation({
    mutationFn: async () => { await api.patch(`/bots/${bot.id}`, { name: name.trim() }); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:["bot",bot.id] });
      qc.invalidateQueries({ queryKey:["bots"] });
      setNameSaved(true); setTimeout(() => setNameSaved(false), 2500);
      ok("Saved","Panel renamed");
    },
    onError: (e:any) => err("Failed", e.response?.data?.error ?? "Could not save"),
  });

  const destroy = useMutation({
    mutationFn: async () => { await api.delete(`/bots/${bot.id}`); },
    onSuccess: () => { ok("Deleted","Panel removed. Slot freed."); setLocation("/bots"); },
    onError: () => err("Failed","Could not delete panel"),
  });

  const copyId = () => {
    navigator.clipboard.writeText(bot.id).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-4">

      {/* Panel name */}
      <div className="rounded-xl p-4" style={{ background: S, border: `1px solid ${B}` }}>
        <p className="text-xs font-bold text-white mb-3">Panel Name</p>
        <div className="flex gap-2">
          <input value={name} onChange={e=>{setName(e.target.value);setNameSaved(false);}}
            onKeyDown={e=>e.key==="Enter"&&saveName.mutate()}
            className="flex-1 h-9 px-3 rounded-lg text-sm text-white outline-none"
            style={{ background:"var(--bg-primary)", border:`1px solid ${B}` }}/>
          <button onClick={()=>saveName.mutate()} disabled={saveName.isPending||!name.trim()}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold text-white disabled:opacity-40 transition-all"
            style={{ background: nameSaved ? GR : BL }}>
            {nameSaved ? <><Check size={12}/> Saved</> : <><Save size={12}/> Save</>}
          </button>
        </div>
      </div>

      {/* Panel ID */}
      <div className="rounded-xl p-4" style={{ background: S, border: `1px solid ${B}` }}>
        <p className="text-xs font-bold text-white mb-1">Panel ID</p>
        <p className="text-xs mb-3" style={{ color: MUT }}>Reference this panel in scripts or API calls.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg min-w-0" style={{ background:"var(--bg-primary)", border:`1px solid ${B}` }}>
            <Hash size={11} className="shrink-0" style={{ color: MUT }}/>
            <span className="text-xs font-mono text-white truncate flex-1">{bot.id}</span>
          </div>
          <button onClick={copyId}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold shrink-0 transition-all"
            style={{ background: copied?"rgba(34,197,94,0.12)":S, color: copied?GR:DIM, border:`1px solid ${copied?"rgba(34,197,94,0.2)":B}` }}>
            {copied ? <><Check size={11}/>Copied</> : <><Copy size={11}/>Copy</>}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl p-4" style={{ background: S, border:"1px solid rgba(239,68,68,0.15)" }}>
        <p className="text-xs font-bold mb-1" style={{ color:"#ef4444" }}>Danger Zone</p>
        <p className="text-xs mb-3" style={{ color: DIM }}>Permanently deletes this panel, all files, logs and variables. <strong className="text-white">Cannot be undone.</strong> One slot will be freed.</p>
        {!showDel ? (
          <button onClick={()=>setShowDel(true)} className="h-8 px-4 rounded-lg text-xs font-bold"
            style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.2)" }}>
            Delete Panel
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <input value={delInput} onChange={e=>setDelInput(e.target.value)} placeholder={`Type "${bot.name}" to confirm`}
              className="w-full h-9 px-3 rounded-lg text-sm text-white outline-none"
              style={{ background:"var(--bg-primary)", border:"1px solid rgba(239,68,68,0.3)" }}/>
            <div className="flex gap-2">
              <button onClick={()=>destroy.mutate()} disabled={delInput!==bot.name||destroy.isPending}
                className="h-8 px-4 rounded-lg text-xs font-black text-white disabled:opacity-40"
                style={{ background:"#ef4444" }}>
                {destroy.isPending?"Deleting…":"Confirm Delete"}
              </button>
              <button onClick={()=>setShowDel(false)} className="h-8 px-3 rounded-lg text-xs" style={{ color: DIM }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// ── Stats Tab ─────────────────────────────────────────────────────────────────
const StatsTab: React.FC<{ bot: any }> = ({ bot }) => {
    return (
        <div className="p-4">
        <h2 className="text-lg font-bold mb-4">Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-400">RAM Usage</div>
              <div className="text-2xl font-bold">{bot?.stats?.ram || 0} MB</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-400">CPU Usage</div>
              <div className="text-2xl font-bold">{bot?.stats?.cpu || 0}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-400">Storage Usage</div>
              <div className="text-2xl font-bold">{bot?.stats?.storage || 0} MB</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-400">Uptime</div>
              <div className="text-2xl font-bold">{bot?.stats?.uptime || "N/A"}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
}


export default BotDetailPage;
