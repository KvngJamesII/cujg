import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import api from '@/lib/api';
import { Plus, Gift, Loader2, X, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface TrialCode {
  id: string;
  code: string;
  durationDays: number;
  maxAccounts: number;
  accountsUsed: number;
  codeExpiresAt: string | null;
  createdAt: string;
}

function CreateModal({ onSave, onClose, saving }: {
  onSave: (v: { code: string; durationDays: number; maxAccounts: number; codeExpiresAt?: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [code, setCde]         = useState('');
  const [days, setDays]         = useState(7);
  const [maxAcc, setMaxAcc]     = useState(50);
  const [expires, setExpires]   = useState('');

  const randomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    setCde(Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''));
  };

  const submit = () => {
    if (!code.trim()) { toast.error('Code is required'); return; }
    onSave({ code, durationDays: days, maxAccounts: maxAcc, codeExpiresAt: expires || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[--bg-secondary] border border-[--border] rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-white">Create Trial Code</h3>
          <button onClick={onClose} className="text-[--text-muted] hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Code</label>
            <div className="flex gap-2">
              <Input value={code} onChange={e => setCde(e.target.value.toUpperCase())}
                placeholder="BETA2025"
                className="h-11 bg-[--bg-tertiary] border-[--border] text-white font-mono tracking-widest flex-1" />
              <button onClick={randomCode}
                className="px-4 h-11 rounded-xl border border-[--border] text-[--text-secondary] hover:bg-[--bg-tertiary] text-xs font-bold transition-colors whitespace-nowrap">
                Random
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Duration (days)</label>
              <Input type="number" min={1} max={365} value={days}
                onChange={e => setDays(parseInt(e.target.value) || 1)}
                className="h-11 bg-[--bg-tertiary] border-[--border] text-white" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Max Accounts</label>
              <Input type="number" min={1} value={maxAcc}
                onChange={e => setMaxAcc(parseInt(e.target.value) || 1)}
                className="h-11 bg-[--bg-tertiary] border-[--border] text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Code Expires (optional)</label>
            <Input type="date" value={expires} onChange={e => setExpires(e.target.value)}
              className="h-11 bg-[--bg-tertiary] border-[--border] text-white" />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <Button variant="ghost" className="flex-1 h-11 text-[--text-secondary]" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 h-11 text-white font-bold" style={{ background: '#F97316' }}
            onClick={submit} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Create Code'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const AdminTrialCodesPage: React.FC = () => {
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['admin-trial-codes'],
    queryFn: () => api.get('/admin/trial-codes').then(r => r.data as TrialCode[]),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/admin/trial-codes', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-trial-codes'] });
      toast.success('Trial code created');
      setShowCreate(false);
    },
    onError: () => toast.error('Failed to create trial code'),
  });

  const copy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success('Copied!'));
  };

  const usagePercent = (c: TrialCode) =>
    c.maxAccounts > 0 ? Math.round((c.accountsUsed / c.maxAccounts) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Trial Codes</h1>
            <p className="text-[--text-secondary] font-medium mt-1">Generate private invite codes for beta testers</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="h-11 px-6 text-white font-bold gap-2" style={{ background: '#F97316' }}>
            <Plus size={18} />New Code
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-[--text-muted]" /></div>
        ) : codes.length === 0 ? (
          <EmptyState icon={Gift} title="No trial codes" description="Create invite codes for early access users" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {codes.map(c => {
              const used = usagePercent(c);
              const expired = c.codeExpiresAt && new Date(c.codeExpiresAt) < new Date();
              return (
                <div key={c.id} className="bg-[--bg-secondary] rounded-2xl border border-[--border] p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-mono font-black tracking-widest text-lg">{c.code}</span>
                        <button onClick={() => copy(c.code)}
                          className="text-[--text-muted] hover:text-[--accent-primary] transition-colors">
                          <Copy size={14} />
                        </button>
                      </div>
                      <span className="text-[--text-muted] text-xs">{c.durationDays} days trial</span>
                    </div>
                    {expired ? (
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[--danger]/10 text-[--danger]">Expired</span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[--success]/10 text-[--success]">Active</span>
                    )}
                  </div>

                  {/* Usage bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[--text-muted]">Usage</span>
                      <span className="text-xs font-bold text-white">{c.accountsUsed} / {c.maxAccounts}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[--bg-tertiary] overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, used)}%`,
                          background: used >= 90 ? '#EF4444' : used >= 70 ? '#F59E0B' : '#F97316',
                        }} />
                    </div>
                  </div>

                  {c.codeExpiresAt && (
                    <p className="text-[--text-muted] text-xs">
                      Expires {new Date(c.codeExpiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onSave={v => createMutation.mutate(v)}
          onClose={() => setShowCreate(false)}
          saving={createMutation.isPending}
        />
      )}
    </DashboardLayout>
  );
};

export default AdminTrialCodesPage;
