import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Trash2, Download, Search, X, Circle } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const D = 'var(--app-font-display)';

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  error:               { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444', label: 'ERROR' },
  global_error:        { bg: 'rgba(239,68,68,0.15)',   text: '#EF4444', label: 'JS ERR' },
  unhandled_rejection: { bg: 'rgba(239,68,68,0.12)',   text: '#F87171', label: 'REJECT' },
  warn:                { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B', label: 'WARN' },
  network:             { bg: 'rgba(249,115,22,0.12)',  text: '#F97316', label: 'NET' },
  click:               { bg: 'rgba(99,102,241,0.10)',  text: '#818CF8', label: 'CLICK' },
  route:               { bg: 'rgba(34,197,94,0.10)',   text: '#22C55E', label: 'ROUTE' },
  log:                 { bg: 'rgba(255,255,255,0.04)', text: '#9CA3AF', label: 'LOG' },
  info:                { bg: 'rgba(34,211,238,0.08)',  text: '#22D3EE', label: 'INFO' },
};

const TYPE_OPTIONS = ['all', 'error', 'global_error', 'unhandled_rejection', 'warn', 'network', 'click', 'route', 'log', 'info'];

interface LogEntry {
  ts: string;
  type: string;
  msg: string;
  url: string;
  sid: string;
  stack?: string;
  extra?: Record<string, unknown>;
  _ip?: string;
  _uid?: string;
}

export const AdminDebugLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [lines, setLines] = useState(300);
  const [expanded, setExpanded] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { success, error: toastError } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ lines: String(lines) });
      if (search) params.set('search', search);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await api.get(`/debug/logs?${params}`);
      setLogs(res.data.lines);
      setTotal(res.data.total);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [search, typeFilter, lines]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) intervalRef.current = setInterval(fetchLogs, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchLogs]);

  const clearLogs = async () => {
    if (!confirm('Clear all debug logs?')) return;
    try {
      await api.delete('/debug/logs');
      setLogs([]);
      setTotal(0);
      success('Logs cleared');
    } catch { toastError('Failed to clear logs'); }
  };

  const download = () => {
    const blob = new Blob([logs.map(l => JSON.stringify(l)).join('\n')], { type: 'application/jsonl' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `redon3-debug-${Date.now()}.jsonl`;
    a.click();
  };

  const typeStyle = (t: string) => TYPE_COLORS[t] ?? { bg: 'rgba(255,255,255,0.04)', text: '#9CA3AF', label: t.toUpperCase().slice(0,6) };

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    catch { return iso; }
  };

  const errorCount = logs.filter(l => l.type === 'error' || l.type === 'global_error' || l.type === 'unhandled_rejection').length;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl px-7 py-7"
          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.07) 0%, var(--bg-secondary) 60%)' }}>
          <div className="absolute top-0 right-0 w-72 h-72 pointer-events-none opacity-20"
            style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 65%)', filter: 'blur(70px)' }} />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] mb-2" style={{ color: '#F97316' }}>Admin</p>
              <h1 className="font-extrabold leading-tight" style={{ fontFamily: D, fontSize: 'clamp(26px, 3vw, 36px)' }}>
                <span className="text-white">Debug</span>{' '}
                <span style={{ fontStyle: 'italic', fontWeight: 600, color: 'rgba(255,255,255,0.45)', fontSize: '0.88em' }}>Logs.</span>
              </h1>
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                {total} total entries · {errorCount > 0 ? <span style={{ color: '#EF4444' }}>{errorCount} errors</span> : 'no errors'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => setAutoRefresh(v => !v)}
                className="h-8 gap-1.5 text-xs font-bold"
                style={{
                  background: autoRefresh ? 'rgba(34,197,94,0.15)' : 'var(--bg-tertiary)',
                  color: autoRefresh ? '#22C55E' : 'var(--text-muted)',
                  border: `1px solid ${autoRefresh ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                }}>
                <Circle size={7} fill={autoRefresh ? '#22C55E' : 'transparent'} />
                {autoRefresh ? 'Live' : 'Paused'}
              </Button>
              <Button size="sm" onClick={fetchLogs} disabled={loading}
                className="h-8 text-xs font-bold border"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </Button>
              <Button size="sm" onClick={download}
                className="h-8 text-xs font-bold border"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                <Download size={13} />
              </Button>
              <Button size="sm" onClick={clearLogs}
                className="h-8 text-xs font-bold border"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', borderColor: 'rgba(239,68,68,0.25)' }}>
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages, URLs, sessions…"
              className="pl-9 h-9 text-xs rounded-xl border"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {TYPE_OPTIONS.map(t => {
              const s = t === 'all' ? { bg: 'rgba(249,115,22,0.12)', text: '#F97316' } : (TYPE_COLORS[t] ?? { bg: 'rgba(255,255,255,0.06)', text: '#9CA3AF' });
              return (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className="h-8 px-3 rounded-lg text-[11px] font-bold border transition-all"
                  style={{
                    background: typeFilter === t ? s.bg : 'var(--bg-secondary)',
                    color: typeFilter === t ? s.text : 'var(--text-muted)',
                    borderColor: typeFilter === t ? s.text + '44' : 'var(--border)',
                  }}>
                  {t === 'all' ? 'All' : (TYPE_COLORS[t]?.label ?? t)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Log entries */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: '#060709', borderColor: 'var(--border)' }}>
          {/* Table header */}
          <div className="grid gap-3 px-4 py-2.5 border-b text-[10px] font-black uppercase tracking-widest"
            style={{ gridTemplateColumns: '80px 64px 1fr 120px', borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
            <span>Time</span>
            <span>Type</span>
            <span>Message</span>
            <span className="hidden sm:block">Page</span>
          </div>

          {logs.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {loading ? 'Loading…' : 'No log entries yet. Navigate the site to start capturing.'}
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {logs.map((log, i) => {
                const style = typeStyle(log.type);
                const isExpanded = expanded === i;
                return (
                  <div key={i}
                    className="cursor-pointer transition-colors"
                    style={{ background: isExpanded ? style.bg : 'transparent' }}
                    onClick={() => setExpanded(isExpanded ? null : i)}>
                    <div className="grid gap-3 px-4 py-2.5 items-center"
                      style={{ gridTemplateColumns: '80px 64px 1fr 120px' }}>
                      <span className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(log.ts)}
                      </span>
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-black"
                        style={{ background: style.bg, color: style.text }}>
                        {style.label}
                      </span>
                      <span className="text-[12px] font-mono truncate" style={{ color: log.type.includes('error') ? '#FCA5A5' : 'var(--text-primary)' }}>
                        {log.msg}
                      </span>
                      <span className="hidden sm:block text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                        {log.url?.replace(/^https?:\/\/[^/]+/, '') || '—'}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2 text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 pb-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                          <div><span style={{ color: 'var(--text-muted)' }}>Session</span><br /><span className="text-white">{log.sid}</span></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>User</span><br /><span className="text-white">{log._uid ?? '—'}</span></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>IP</span><br /><span className="text-white">{log._ip ?? '—'}</span></div>
                          <div><span style={{ color: 'var(--text-muted)' }}>Time</span><br /><span className="text-white">{log.ts}</span></div>
                        </div>
                        <div className="break-all" style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>URL: </span>{log.url}
                        </div>
                        {log.stack && (
                          <pre className="text-[10px] p-3 rounded-lg overflow-x-auto"
                            style={{ background: 'rgba(239,68,68,0.08)', color: '#FCA5A5', whiteSpace: 'pre-wrap' }}>
                            {log.stack}
                          </pre>
                        )}
                        {log.extra && (
                          <pre className="text-[10px] p-3 rounded-lg overflow-x-auto"
                            style={{ background: 'rgba(255,255,255,0.04)', color: '#9CA3AF', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(log.extra, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Showing last {lines} entries · refreshes every 5s when Live ·{' '}
          <button onClick={() => setLines(l => l + 300)} className="underline" style={{ color: '#F97316' }}>
            load more
          </button>
        </p>
      </div>
    </DashboardLayout>
  );
};

export default AdminDebugLogsPage;
