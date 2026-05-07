import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import api from '@/lib/api';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  plan: string | null;
  botCount: number;
  createdAt: string;
}

const statusColors: Record<string, { text: string; bg: string }> = {
  active:    { text: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  suspended: { text: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  banned:    { text: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
};

export const AdminUsersPage: React.FC = () => {
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [confirmAction, setConfirmAction] = useState<{ type: 'suspend' | 'ban'; user: AdminUser } | null>(null);
  const [extendTarget, setExtendTarget]   = useState<AdminUser | null>(null);
  const [extendDays, setExtendDays]       = useState(7);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () =>
      api.get(`/admin/users?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`)
         .then(r => r.data as { users: AdminUser[]; total: number; page: number }),
    placeholderData: prev => prev,
  });

  const actionMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: 'suspend' | 'ban' }) =>
      api.post(`/admin/users/${userId}/${action}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated');
      setConfirmAction(null);
    },
    onError: () => toast.error('Action failed'),
  });

  const extendMutation = useMutation({
    mutationFn: ({ userId, days }: { userId: string; days: number }) =>
      api.post(`/admin/users/${userId}/extend-plan`, { days }),
    onSuccess: () => {
      toast.success(`Plan extended by ${extendDays} days`);
      setExtendTarget(null);
    },
    onError: () => toast.error('Failed to extend plan'),
  });

  const users = data?.users ?? [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Users</h1>
            <p className="text-[--text-secondary] font-medium mt-1">Manage all registered accounts</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[--text-muted]" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by email..."
              className="pl-10 h-11 bg-[--bg-secondary] border-[--border] text-white placeholder:text-[--text-muted]"
            />
          </div>
        </div>

        <div className="bg-[--bg-secondary] rounded-2xl border border-[--border] overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_80px_70px_110px_160px] gap-4 px-6 py-3 border-b border-[--border]">
            {['Name', 'Email', 'Role', 'Panels', 'Status', 'Actions'].map(h => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-[--text-muted]">{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-[--text-muted]" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 text-[--text-muted] font-semibold">
              {search ? `No users matching "${search}"` : 'No users yet'}
            </div>
          ) : (
            users.map(user => (
              <div key={user.id}>
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_80px_70px_110px_160px] gap-4 px-6 py-4 border-b border-[--border] last:border-0 items-center hover:bg-white/[0.02] transition-colors">
                  <span className="text-white font-semibold text-sm truncate">{user.fullName}</span>
                  <span className="text-[--text-secondary] text-sm truncate">{user.email}</span>
                  <span className={cn('text-xs font-bold', user.role === 'admin' ? 'text-orange-400' : 'text-[--text-muted]')}>
                    {user.role}
                  </span>
                  <span className="text-[--text-secondary] text-sm text-center">{user.botCount}</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold capitalize w-fit"
                    style={{ color: statusColors[user.status]?.text, background: statusColors[user.status]?.bg }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[user.status]?.text }} />
                    {user.status}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setConfirmAction({ type: 'suspend', user })}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 transition-colors">
                      Suspend
                    </button>
                    <button onClick={() => setConfirmAction({ type: 'ban', user })}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[--danger] bg-[--danger]/10 hover:bg-[--danger]/20 transition-colors">
                      Ban
                    </button>
                    <button onClick={() => { setExtendTarget(user); setExtendDays(7); }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[--accent-primary] bg-[--accent-primary]/10 hover:bg-[--accent-primary]/20 transition-colors">
                      +Days
                    </button>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="md:hidden p-5 border-b border-[--border] last:border-0">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">{user.fullName}</p>
                      <p className="text-[--text-muted] text-xs truncate mt-0.5">{user.email}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize shrink-0"
                      style={{ color: statusColors[user.status]?.text, background: statusColors[user.status]?.bg }}>
                      {user.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setConfirmAction({ type: 'suspend', user })}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 bg-amber-400/10">Suspend</button>
                    <button onClick={() => setConfirmAction({ type: 'ban', user })}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-[--danger] bg-[--danger]/10">Ban</button>
                    <button onClick={() => { setExtendTarget(user); setExtendDays(7); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-[--accent-primary] bg-[--accent-primary]/10">+Days</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[--text-muted]">{users.length} of {data?.total ?? 0} users</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-9 h-9 rounded-xl border border-[--border] flex items-center justify-center text-[--text-secondary] hover:bg-[--bg-tertiary] disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-white font-bold px-3">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={users.length < 20}
              className="w-9 h-9 rounded-xl border border-[--border] flex items-center justify-center text-[--text-secondary] hover:bg-[--bg-tertiary] disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {confirmAction && (
        <ConfirmModal
          isOpen={true}
          title={confirmAction.type === 'suspend' ? 'Suspend User' : 'Ban User'}
          message={`Are you sure you want to ${confirmAction.type} ${confirmAction.user.email}? This will prevent them from accessing Redon3.`}
          confirmText={confirmAction.type === 'suspend' ? 'Suspend' : 'Ban User'}
          confirmVariant="destructive"
          onConfirm={() => actionMutation.mutate({ userId: confirmAction.user.id, action: confirmAction.type })}
          onClose={() => setConfirmAction(null)}
        />
      )}

      {extendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setExtendTarget(null)}>
          <div className="bg-[--bg-secondary] border border-[--border] rounded-2xl p-8 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-white mb-1">Extend Plan</h3>
            <p className="text-sm text-[--text-secondary] mb-6 truncate">{extendTarget.email}</p>
            <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Extra Days</label>
            <Input
              type="number" min={1} max={365}
              value={extendDays}
              onChange={e => setExtendDays(parseInt(e.target.value) || 1)}
              className="h-11 bg-[--bg-tertiary] border-[--border] text-white mb-6"
            />
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-11 text-[--text-secondary]" onClick={() => setExtendTarget(null)}>
                Cancel
              </Button>
              <Button className="flex-1 h-11 text-white font-bold" style={{ background: '#F97316' }}
                onClick={() => extendMutation.mutate({ userId: extendTarget.id, days: extendDays })}
                disabled={extendMutation.isPending}>
                {extendMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : `+${extendDays} Days`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminUsersPage;
