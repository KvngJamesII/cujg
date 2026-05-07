import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import api from '@/lib/api';
import { ShieldAlert, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface AuditEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function actionColor(action: string): string {
  if (action.includes('ban') || action.includes('delete') || action.includes('force')) return '#EF4444';
  if (action.includes('suspend') || action.includes('warn')) return '#F59E0B';
  if (action.includes('created') || action.includes('login') || action.includes('started')) return '#22C55E';
  return '#9CA3AF';
}

function actionLabel(action: string): string {
  return action.replace(/\./g, ' › ').replace(/-/g, ' ');
}

export const AdminAuditLogPage: React.FC = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-log', page],
    queryFn: () =>
      api.get(`/admin/audit-log?page=${page}&limit=25`)
         .then(r => r.data as { entries: AuditEntry[]; total: number; page: number }),
    placeholderData: prev => prev,
    refetchInterval: 30000,
  });

  const entries = data?.entries ?? [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Audit Log</h1>
            <p className="text-[--text-secondary] font-medium mt-1">All admin and system actions — auto-refreshes every 30s</p>
          </div>
        </div>

        <div className="bg-[--bg-secondary] rounded-2xl border border-[--border] overflow-hidden">
          <div className="hidden md:grid grid-cols-[180px_1fr_1fr_120px_160px] gap-4 px-6 py-3 border-b border-[--border]">
            {['Time', 'Action', 'Actor', 'IP Address', 'Metadata'].map(h => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-[--text-muted]">{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-[--text-muted]" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-8">
              <EmptyState icon={ShieldAlert} title="No audit entries" description="Admin and system actions will appear here" />
            </div>
          ) : (
            entries.map(e => (
              <div key={e.id}>
                {/* Desktop */}
                <div className="hidden md:grid grid-cols-[180px_1fr_1fr_120px_160px] gap-4 px-6 py-3.5 border-b border-[--border] last:border-0 items-start hover:bg-white/[0.02] transition-colors">
                  <span className="text-[--text-muted] text-xs font-mono whitespace-nowrap pt-0.5">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                  <span className="text-sm font-bold capitalize" style={{ color: actionColor(e.action) }}>
                    {actionLabel(e.action)}
                  </span>
                  <span className="text-[--text-secondary] text-sm truncate">
                    {e.userEmail ?? e.userId ?? 'system'}
                  </span>
                  <span className="text-[--text-muted] text-xs font-mono">
                    {e.ipAddress ?? '—'}
                  </span>
                  <span className="text-[--text-muted] text-[11px] font-mono truncate" title={JSON.stringify(e.metadata)}>
                    {Object.keys(e.metadata).length > 0
                      ? Object.entries(e.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')
                      : '—'
                    }
                  </span>
                </div>

                {/* Mobile */}
                <div className="md:hidden px-5 py-4 border-b border-[--border] last:border-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-bold capitalize" style={{ color: actionColor(e.action) }}>
                      {actionLabel(e.action)}
                    </span>
                    <span className="text-[--text-muted] text-[10px] font-mono whitespace-nowrap shrink-0">
                      {new Date(e.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[--text-muted] text-xs">{e.userEmail ?? e.userId ?? 'system'}</p>
                  {Object.keys(e.metadata).length > 0 && (
                    <p className="text-[--text-muted] text-[10px] font-mono mt-1 truncate">
                      {Object.entries(e.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[--text-muted]">{entries.length} of {data?.total ?? 0} entries</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-9 h-9 rounded-xl border border-[--border] flex items-center justify-center text-[--text-secondary] hover:bg-[--bg-tertiary] disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-white font-bold px-3">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={entries.length < 25}
              className="w-9 h-9 rounded-xl border border-[--border] flex items-center justify-center text-[--text-secondary] hover:bg-[--bg-tertiary] disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminAuditLogPage;
