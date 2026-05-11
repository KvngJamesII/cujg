import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Plus, Play, Pause, RotateCw, Trash2, MoreVertical, Search, Filter, Activity } from 'lucide-react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import nodeIcon from '@/assets/nodejs.svg';
import pyIcon from '@/assets/python.svg';
import { toast } from 'sonner';

interface Bot { id: string; name: string; language: 'nodejs' | 'python'; status: string; ramMb: number; cpu: number; uptime: number; restarts: number }

export default function BotsListPage() {
  const qc = useQueryClient();
  const [, setLoc] = useLocation();
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'running' | 'stopped' | 'crashed'>('all');

  const { data: bots = [], isLoading } = useQuery<Bot[]>({
    queryKey: ['bots'],
    queryFn: async () => (await api.get('/bots')).data as Bot[],
  });

  const filtered = bots.filter((b) =>
    (filter === 'all' || b.status === filter) &&
    b.name.toLowerCase().includes(q.toLowerCase())
  );

  const act = async (id: string, action: 'start' | 'stop' | 'restart') => {
    await api.post(`/bots/${id}/${action}`);
    toast.success(`Panel ${action}ed`);
    qc.invalidateQueries({ queryKey: ['bots'] });
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this panel permanently?')) return;
    await api.delete(`/bots/${id}`);
    toast.success('Panel deleted');
    qc.invalidateQueries({ queryKey: ['bots'] });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your panels</h1>
          <p className="text-[--text-secondary] text-sm mt-1">{bots.length} total · {bots.filter((b) => b.status === 'running').length} running</p>
        </div>
        <Link href="/bots/new">
          <button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow-orange)' }}>
            <Plus size={16} /> New panel
          </button>
        </Link>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 flex items-center rounded-xl border px-3" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <Search size={14} className="text-[--text-muted]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search panels..."
            className="flex-1 bg-transparent px-2.5 py-2.5 text-sm outline-none placeholder:text-[--text-muted]" />
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          {(['all', 'running', 'stopped', 'crashed'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${filter === f ? 'text-white' : 'text-[--text-muted] hover:text-white'}`}
              style={filter === f ? { background: 'var(--accent-gradient)' } : {}}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(249,115,22,0.10)' }}>
            <Activity size={24} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h3 className="font-extrabold text-lg">No panels yet</h3>
          <p className="text-sm text-[--text-secondary] mt-1.5 mb-5">Deploy your first bot in under a minute.</p>
          <Link href="/bots/new">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'var(--accent-gradient)' }}>
              <Plus size={14} /> Create panel
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="group p-5 rounded-2xl border transition-all hover:border-[--accent-primary] cursor-pointer relative"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              onClick={() => setLoc(`/bots/${b.id}`)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                    <img src={b.language === 'nodejs' ? nodeIcon : pyIcon} alt={b.language} className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold tracking-tight">{b.name}</div>
                    <StatusPill status={b.status} />
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); remove(b.id); }}
                  className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg hover:bg-white/5 text-[--text-muted] hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <Metric label="RAM" value={`${b.ramMb} MB`} />
                <Metric label="CPU" value={`${(b.cpu * 100).toFixed(0)}%`} />
                <Metric label="Uptime" value={fmtUptime(b.uptime)} />
                <Metric label="Restarts" value={b.restarts} />
              </div>

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {b.status === 'running' ? (
                  <button onClick={() => act(b.id, 'stop')} className="flex-1 py-2 rounded-lg text-xs font-bold border hover:bg-white/5"
                    style={{ borderColor: 'var(--border)' }}>
                    <Pause size={12} className="inline mr-1" /> Stop
                  </button>
                ) : (
                  <button onClick={() => act(b.id, 'start')} className="flex-1 py-2 rounded-lg text-xs font-bold text-white"
                    style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <Play size={12} className="inline mr-1" /> Start
                  </button>
                )}
                <button onClick={() => act(b.id, 'restart')} className="px-3 py-2 rounded-lg text-xs font-bold border hover:bg-white/5"
                  style={{ borderColor: 'var(--border)' }}>
                  <RotateCw size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; dot: string }> = {
    running: { bg: 'rgba(34,197,94,0.10)', color: 'var(--success)', dot: 'var(--success)' },
    stopped: { bg: 'rgba(148,163,184,0.10)', color: 'var(--text-muted)', dot: 'var(--text-muted)' },
    crashed: { bg: 'rgba(239,68,68,0.10)', color: 'var(--danger)', dot: 'var(--danger)' },
    starting: { bg: 'rgba(234,179,8,0.10)', color: 'var(--warning)', dot: 'var(--warning)' },
  };
  const c = cfg[status] ?? cfg.stopped;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase mt-1" style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot, animation: status === 'running' ? 'pulse 2s infinite' : undefined }} />
      {status}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="text-[10px] text-[--text-muted] font-semibold uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
    </div>
  );
}

function fmtUptime(h: number) {
  if (h === 0) return '—';
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
