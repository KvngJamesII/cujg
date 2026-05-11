import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, RotateCw, Terminal as TerminalIcon, Folder, FileText, Cog, AlertTriangle, Send, Plus, Trash2, Copy, Edit2, Save, X, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import nodeIcon from '@/assets/nodejs.svg';
import pyIcon from '@/assets/python.svg';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Bot {
  id: string; name: string; language: 'nodejs' | 'python'; status: string;
  startupFile: string; ramMb: number; cpu: number; uptime: number; restarts: number;
  files: { path: string; type: 'file' | 'folder'; content: string }[];
  envVars: { key: string; value: string }[];
}

type Tab = 'console' | 'files' | 'startup' | 'config';

export default function BotDetailPage() {
  const params = useParams<{ id: string; tab?: string }>();
  const [, setLoc] = useLocation();
  const qc = useQueryClient();
  const id = params.id;
  const tab = (params.tab as Tab) ?? 'console';

  const { data: bot, isLoading } = useQuery<Bot>({
    queryKey: ['bot', id],
    queryFn: async () => (await api.get(`/bots/${id}`)).data as Bot,
    refetchInterval: 5000,
  });

  if (isLoading || !bot) {
    return <DashboardLayout fullHeight><div className="flex-1 flex items-center justify-center text-[--text-muted]">Loading panel...</div></DashboardLayout>;
  }

  const act = async (action: 'start' | 'stop' | 'restart') => {
    await api.post(`/bots/${id}/${action}`);
    toast.success(`Panel ${action}ed`);
    qc.invalidateQueries({ queryKey: ['bot', id] });
  };

  const tabs: { id: Tab; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
    { id: 'console', icon: TerminalIcon, label: 'Console' },
    { id: 'files', icon: Folder, label: 'Files' },
    { id: 'startup', icon: FileText, label: 'Startup' },
    { id: 'config', icon: Cog, label: 'Config' },
  ];

  return (
    <DashboardLayout fullHeight>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 md:px-6 pt-4 pb-3 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <button onClick={() => setLoc('/bots')} className="text-xs text-[--text-muted] hover:text-white mb-2 flex items-center gap-1.5">
            <ArrowLeft size={12} /> All panels
          </button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-tertiary)' }}>
                <img src={bot.language === 'nodejs' ? nodeIcon : pyIcon} alt="" className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-lg tracking-tight truncate">{bot.name}</h1>
                  <StatusPill status={bot.status} />
                </div>
                <div className="text-[11px] text-[--text-muted] mt-0.5">{bot.language === 'nodejs' ? 'Node.js' : 'Python'} · {bot.ramMb} MB · {(bot.cpu * 100).toFixed(0)}% CPU</div>
              </div>
            </div>
            <div className="flex gap-2">
              {bot.status === 'running' ? (
                <button onClick={() => act('stop')} className="px-3 py-2 rounded-lg text-xs font-bold border hover:bg-white/5 flex items-center gap-1.5" style={{ borderColor: 'var(--border)' }}>
                  <Pause size={12} /> Stop
                </button>
              ) : (
                <button onClick={() => act('start')} className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.30)' }}>
                  <Play size={12} /> Start
                </button>
              )}
              <button onClick={() => act('restart')} className="px-3 py-2 rounded-lg text-xs font-bold border hover:bg-white/5 flex items-center gap-1.5" style={{ borderColor: 'var(--border)' }}>
                <RotateCw size={12} /> Restart
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-3 flex gap-1 -mb-3">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setLoc(`/bots/${id}/${t.id}`)}
                className={`relative px-3 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition ${tab === t.id ? 'text-white' : 'text-[--text-muted] hover:text-white'}`}>
                <t.icon size={13} />{t.label}
                {tab === t.id && <motion.div layoutId="tab-line" className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'var(--accent-primary)' }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {tab === 'console' && <ConsoleTab bot={bot} />}
          {tab === 'files' && <FilesTab bot={bot} />}
          {tab === 'startup' && <StartupTab bot={bot} />}
          {tab === 'config' && <ConfigTab bot={bot} />}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    running: { bg: 'rgba(34,197,94,0.10)', color: 'var(--success)' },
    stopped: { bg: 'rgba(148,163,184,0.10)', color: 'var(--text-muted)' },
    crashed: { bg: 'rgba(239,68,68,0.10)', color: 'var(--danger)' },
  };
  const c = cfg[status] ?? cfg.stopped;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />{status}
    </span>
  );
}

function ConsoleTab({ bot }: { bot: Bot }) {
  const [lines, setLines] = useState<string[]>([
    `> Panel ${bot.name} initialized`,
    `> Runtime: ${bot.language === 'nodejs' ? 'Node.js 20.x' : 'Python 3.11'}`,
    `> Status: ${bot.status}`,
  ]);
  const [input, setInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bot.status !== 'running') return;
    const t = setInterval(() => {
      const msgs = ['[info] heartbeat ok', '[req] GET /health 200 4ms', '[info] cache hit ratio 89%', '[req] POST /api/v1/event 201 22ms'];
      setLines((l) => [...l.slice(-200), `${new Date().toLocaleTimeString()} ${msgs[Math.floor(Math.random() * msgs.length)]}`]);
    }, 2500);
    return () => clearInterval(t);
  }, [bot.status]);

  useEffect(() => { ref.current?.scrollTo(0, ref.current.scrollHeight); }, [lines]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;
    setLines((l) => [...l, `$ ${input}`, `> Command echoed (demo mode)`]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={ref} className="flex-1 overflow-y-auto font-mono text-[12px] leading-relaxed p-4 md:p-6"
        style={{ background: 'var(--bg-primary)', color: '#94e0a0' }}>
        {lines.map((l, i) => (
          <div key={i} className={l.startsWith('$') ? 'text-[--cyan]' : l.startsWith('>') ? 'text-[--text-secondary]' : ''}>{l}</div>
        ))}
      </div>
      <form onSubmit={send} className="border-t flex items-center gap-2 p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <span className="font-mono text-xs text-[--cyan]">$</span>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a command..." className="flex-1 bg-transparent text-sm font-mono outline-none placeholder:text-[--text-muted]" />
        <button type="submit" className="p-2 rounded-lg" style={{ background: 'var(--accent-gradient)' }}><Send size={13} className="text-white" /></button>
      </form>
    </div>
  );
}

function FilesTab({ bot }: { bot: Bot }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [content, setContent] = useState('');

  const openFile = async (path: string) => {
    const f = bot.files.find((x) => x.path === path);
    setEditing(path);
    setContent(f?.content ?? '');
  };
  const save = async () => {
    if (!editing) return;
    await api.put(`/bots/${bot.id}/files/content`, { path: editing, content });
    toast.success('Saved');
    setEditing(null);
    qc.invalidateQueries({ queryKey: ['bot', bot.id] });
  };
  const create = async () => {
    const name = prompt('File name?');
    if (!name) return;
    await api.post(`/bots/${bot.id}/files/create`, { path: name, type: 'file' });
    qc.invalidateQueries({ queryKey: ['bot', bot.id] });
  };
  const del = async (path: string) => {
    if (!confirm(`Delete ${path}?`)) return;
    await api.delete(`/bots/${bot.id}/files`, { data: { path } } as never);
    qc.invalidateQueries({ queryKey: ['bot', bot.id] });
  };

  if (editing) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2 text-xs font-mono">
            <FileText size={13} />{editing}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="p-1.5 rounded hover:bg-white/5"><X size={14} /></button>
            <button onClick={save} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5" style={{ background: 'var(--accent-gradient)' }}>
              <Save size={12} /> Save
            </button>
          </div>
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} spellCheck={false}
          className="flex-1 w-full font-mono text-[12px] outline-none resize-none p-4"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="text-xs font-semibold text-[--text-muted]">{bot.files.length} files</div>
        <button onClick={create} className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border" style={{ borderColor: 'var(--border)' }}>
          <Plus size={12} /> New file
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {bot.files.map((f) => (
          <div key={f.path} onClick={() => openFile(f.path)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer group">
            <FileIcon path={f.path} />
            <span className="font-mono text-sm flex-1 truncate">{f.path}</span>
            <button onClick={(e) => { e.stopPropagation(); del(f.path); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[--text-muted] hover:text-red-400">
              <Trash2 size={13} />
            </button>
            <ChevronRight size={13} className="text-[--text-muted]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FileIcon({ path }: { path: string }) {
  const ext = path.split('.').pop()?.toLowerCase();
  const colors: Record<string, string> = { js: '#F7DF1E', ts: '#3178C6', py: '#3B82F6', json: '#22D3EE', md: '#A78BFA' };
  return (
    <div className="w-7 h-7 rounded flex items-center justify-center font-mono text-[10px] font-bold uppercase"
      style={{ background: 'var(--bg-tertiary)', color: colors[ext ?? ''] ?? 'var(--text-muted)' }}>
      {ext?.slice(0, 3) ?? '?'}
    </div>
  );
}

function StartupTab({ bot }: { bot: Bot }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(bot.startupFile);
  const save = async () => {
    await api.patch(`/bots/${bot.id}`, { startupFile: value });
    toast.success('Startup file updated');
    qc.invalidateQueries({ queryKey: ['bot', bot.id] });
  };
  return (
    <div className="p-6 max-w-2xl">
      <h3 className="font-extrabold text-lg">Startup file</h3>
      <p className="text-sm text-[--text-secondary] mt-1">The file your panel runs on start.</p>

      <div className="mt-5">
        <input value={value} onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl border px-4 py-3 text-sm font-mono outline-none focus:border-[--accent-primary]"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }} />
        <div className="mt-3 flex flex-wrap gap-2">
          {bot.files.filter((f) => /\.(js|ts|py)$/.test(f.path)).map((f) => (
            <button key={f.path} onClick={() => setValue(f.path)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono border hover:bg-white/5"
              style={{ borderColor: 'var(--border)' }}>
              {f.path}
            </button>
          ))}
        </div>
        <button onClick={save} className="mt-5 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'var(--accent-gradient)' }}>
          Save
        </button>
      </div>
    </div>
  );
}

function ConfigTab({ bot }: { bot: Bot }) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [, setLoc] = useLocation();

  const remove = async () => {
    await api.delete(`/bots/${bot.id}`);
    toast.success('Panel deleted');
    qc.invalidateQueries({ queryKey: ['bots'] });
    setLoc('/bots');
  };

  return (
    <div className="p-6 max-w-2xl space-y-5 overflow-y-auto h-full">
      <Info label="Panel ID" value={bot.id} mono />
      <Info label="Runtime" value={bot.language === 'nodejs' ? 'Node.js 20.x' : 'Python 3.11'} />
      <Info label="Restarts" value={bot.restarts} />
      <Info label="Uptime" value={bot.uptime + 'h'} />

      <div className="pt-4 mt-5 border-t" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-extrabold text-base mb-1 flex items-center gap-2"><AlertTriangle size={15} style={{ color: 'var(--danger)' }} /> Danger zone</h3>
        <p className="text-sm text-[--text-muted]">Permanently delete this panel and all its files.</p>
        <button onClick={() => setConfirmOpen(true)} className="mt-3 px-4 py-2.5 rounded-xl text-xs font-bold border"
          style={{ background: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.30)', color: 'var(--danger)' }}>
          Delete this panel
        </button>
      </div>

      <AnimatePresence>
        {confirmOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setConfirmOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl p-6 border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <h3 className="font-extrabold text-lg">Delete {bot.name}?</h3>
              <p className="text-sm text-[--text-secondary] mt-2">This cannot be undone.</p>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setConfirmOpen(false)} className="flex-1 py-2.5 rounded-lg text-xs font-bold border" style={{ borderColor: 'var(--border)' }}>Cancel</button>
                <button onClick={remove} className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white" style={{ background: 'var(--danger)' }}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <span className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider">{label}</span>
      <span className={`text-sm ${mono ? 'font-mono' : 'font-semibold'}`}>{value}</span>
    </div>
  );
}
