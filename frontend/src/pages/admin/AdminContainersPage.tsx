import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { Loader2, Square, RefreshCw, Server } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/EmptyState';

interface Container {
  botId: string;
  botName: string;
  userEmail: string;
  status: string;
  cpuPercent: number;
  memoryUsedMb: number;
  uptimeSeconds: number;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

export const AdminContainersPage: React.FC = () => {
  const qc = useQueryClient();

  const { data: containers = [], isLoading } = useQuery({
    queryKey: ['admin-containers'],
    queryFn: () => api.get('/admin/containers').then(r => r.data as Container[]),
    refetchInterval: 10000,
  });

  const stopMutation = useMutation({
    mutationFn: (botId: string) => api.post(`/admin/containers/${botId}/force-stop`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-containers'] }); toast.success('Container stopped'); },
    onError: () => toast.error('Failed to stop container'),
  });

  const restartMutation = useMutation({
    mutationFn: (botId: string) => api.post(`/admin/containers/${botId}/force-restart`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-containers'] }); toast.success('Container restarted'); },
    onError: () => toast.error('Failed to restart container'),
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Containers</h1>
            <p className="text-[--text-secondary] font-medium mt-1">
              {containers.length} running container{containers.length !== 1 ? 's' : ''} — auto-refreshes every 10s
            </p>
          </div>
          <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-containers'] })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[--border] text-[--text-secondary] hover:bg-[--bg-tertiary] text-sm font-semibold transition-colors">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Running', value: containers.length, color: '#22C55E' },
            { label: 'Avg CPU', value: containers.length ? `${(containers.reduce((a, c) => a + c.cpuPercent, 0) / containers.length).toFixed(1)}%` : '0%', color: '#F97316' },
            { label: 'Avg RAM', value: containers.length ? `${Math.round(containers.reduce((a, c) => a + c.memoryUsedMb, 0) / containers.length)} MB` : '0 MB', color: '#3B82F6' },
          ].map(stat => (
            <div key={stat.label} className="bg-[--bg-secondary] rounded-2xl border border-[--border] p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[--text-muted] mb-1">{stat.label}</p>
              <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-[--bg-secondary] rounded-2xl border border-[--border] overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_90px_90px_100px_130px] gap-4 px-6 py-3 border-b border-[--border]">
            {['Panel Name', 'Owner', 'CPU', 'RAM (MB)', 'Uptime', 'Actions'].map(h => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-[--text-muted]">{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-[--text-muted]" />
            </div>
          ) : containers.length === 0 ? (
            <div className="py-8">
              <EmptyState icon={Server} title="No running containers" description="All containers are currently stopped" />
            </div>
          ) : (
            containers.map(c => (
              <div key={c.botId}>
                <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_90px_90px_100px_130px] gap-4 px-6 py-4 border-b border-[--border] last:border-0 items-center hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[--success] animate-pulse shrink-0" />
                    <span className="text-white font-semibold text-sm truncate">{c.botName}</span>
                  </div>
                  <span className="text-[--text-secondary] text-sm truncate">{c.userEmail}</span>
                  <span className="text-sm font-mono font-bold" style={{ color: c.cpuPercent > 80 ? '#EF4444' : c.cpuPercent > 50 ? '#F59E0B' : '#22C55E' }}>
                    {c.cpuPercent.toFixed(1)}%
                  </span>
                  <span className="text-[--text-secondary] text-sm font-mono">{Math.round(c.memoryUsedMb)}</span>
                  <span className="text-[--text-secondary] text-sm font-mono">{formatUptime(c.uptimeSeconds)}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => stopMutation.mutate(c.botId)} disabled={stopMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[--danger] bg-[--danger]/10 hover:bg-[--danger]/20 transition-colors disabled:opacity-50">
                      <Square size={10} fill="currentColor" />Stop
                    </button>
                    <button onClick={() => restartMutation.mutate(c.botId)} disabled={restartMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 transition-colors disabled:opacity-50">
                      <RefreshCw size={10} />Restart
                    </button>
                  </div>
                </div>
                {/* Mobile */}
                <div className="md:hidden p-5 border-b border-[--border] last:border-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[--success] animate-pulse" />
                      <span className="text-white font-bold text-sm">{c.botName}</span>
                    </div>
                    <span className="text-xs text-[--text-muted]">{formatUptime(c.uptimeSeconds)}</span>
                  </div>
                  <p className="text-[--text-muted] text-xs mb-3 truncate">{c.userEmail}</p>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-[--text-muted]">CPU: <strong className="text-white">{c.cpuPercent.toFixed(1)}%</strong></span>
                    <span className="text-xs text-[--text-muted]">RAM: <strong className="text-white">{Math.round(c.memoryUsedMb)} MB</strong></span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => stopMutation.mutate(c.botId)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-[--danger] bg-[--danger]/10">Stop</button>
                    <button onClick={() => restartMutation.mutate(c.botId)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 bg-amber-400/10">Restart</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminContainersPage;
