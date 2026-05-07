import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { EmptyState } from '@/components/shared/EmptyState';
import api from '@/lib/api';
import { Plus, Trash2, Tag, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  applicablePlans: string[];
  maxUses: number;
  usesCount: number;
  expiresAt: string | null;
  createdAt: string;
}

const PLANS = ['starter', 'developer', 'pro'];

function CouponModal({ initial, onSave, onClose, saving }: {
  initial?: Partial<Coupon>;
  onSave: (v: Omit<Coupon, 'id' | 'usesCount' | 'createdAt'>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [code, setCode]         = useState(initial?.code ?? '');
  const [discount, setDiscount] = useState(initial?.discountPercent ?? 10);
  const [plans, setPlans]       = useState<string[]>(initial?.applicablePlans ?? []);
  const [maxUses, setMaxUses]   = useState(initial?.maxUses ?? 100);
  const [expires, setExpires]   = useState(initial?.expiresAt ? initial.expiresAt.substring(0, 10) : '');

  const togglePlan = (p: string) =>
    setPlans(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const submit = () => {
    if (!code.trim()) { toast.error('Code is required'); return; }
    if (discount < 1 || discount > 100) { toast.error('Discount must be 1–100%'); return; }
    if (plans.length === 0) { toast.error('Select at least one plan'); return; }
    onSave({ code, discountPercent: discount, applicablePlans: plans, maxUses, expiresAt: expires || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[--bg-secondary] border border-[--border] rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-white">{initial?.id ? 'Edit Coupon' : 'Create Coupon'}</h3>
          <button onClick={onClose} className="text-[--text-muted] hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Code</label>
            <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="LAUNCH50"
              className="h-11 bg-[--bg-tertiary] border-[--border] text-white font-mono tracking-widest" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Discount %</label>
              <Input type="number" min={1} max={100} value={discount}
                onChange={e => setDiscount(parseInt(e.target.value) || 1)}
                className="h-11 bg-[--bg-tertiary] border-[--border] text-white" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Max Uses</label>
              <Input type="number" min={1} value={maxUses}
                onChange={e => setMaxUses(parseInt(e.target.value) || 1)}
                className="h-11 bg-[--bg-tertiary] border-[--border] text-white" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Applicable Plans</label>
            <div className="flex gap-2 flex-wrap">
              {PLANS.map(p => (
                <button key={p} onClick={() => togglePlan(p)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all capitalize"
                  style={plans.includes(p)
                    ? { background: 'rgba(249,115,22,0.15)', borderColor: '#F97316', color: '#F97316' }
                    : { background: 'transparent', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                  }>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Expires (optional)</label>
            <Input type="date" value={expires} onChange={e => setExpires(e.target.value)}
              className="h-11 bg-[--bg-tertiary] border-[--border] text-white" />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <Button variant="ghost" className="flex-1 h-11 text-[--text-secondary]" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 h-11 text-white font-bold" style={{ background: '#F97316' }}
            onClick={submit} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : (initial?.id ? 'Save Changes' : 'Create Coupon')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const AdminCouponsPage: React.FC = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const qc = useQueryClient();

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => api.get('/admin/coupons').then(r => r.data as Coupon[]),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/admin/coupons', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); toast.success('Coupon created'); setShowCreate(false); },
    onError: () => toast.error('Failed to create coupon'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/coupons/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); toast.success('Coupon deleted'); setDeleteTarget(null); },
    onError: () => toast.error('Failed to delete coupon'),
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Coupons</h1>
            <p className="text-[--text-secondary] font-medium mt-1">Manage discount codes</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="h-11 px-6 text-white font-bold gap-2" style={{ background: '#F97316' }}>
            <Plus size={18} />Create Coupon
          </Button>
        </div>

        <div className="bg-[--bg-secondary] rounded-2xl border border-[--border] overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_80px_1fr_100px_120px_80px] gap-4 px-6 py-3 border-b border-[--border]">
            {['Code', 'Discount', 'Plans', 'Uses', 'Expires', ''].map(h => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-[--text-muted]">{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-[--text-muted]" /></div>
          ) : coupons.length === 0 ? (
            <div className="py-8"><EmptyState icon={Tag} title="No coupons" description="Create your first discount coupon" /></div>
          ) : (
            coupons.map(c => (
              <div key={c.id} className="hidden md:grid grid-cols-[1fr_80px_1fr_100px_120px_80px] gap-4 px-6 py-4 border-b border-[--border] last:border-0 items-center hover:bg-white/[0.02] transition-colors">
                <span className="text-white font-mono font-bold tracking-widest text-sm">{c.code}</span>
                <span className="font-bold text-sm" style={{ color: '#22C55E' }}>{c.discountPercent}%</span>
                <div className="flex gap-1 flex-wrap">
                  {(c.applicablePlans as string[]).map(p => (
                    <span key={p} className="px-2 py-0.5 rounded-md bg-[--bg-tertiary] text-[--text-secondary] text-[10px] font-bold capitalize">{p}</span>
                  ))}
                </div>
                <span className="text-[--text-secondary] text-sm">{c.usesCount} / {c.maxUses}</span>
                <span className="text-[--text-muted] text-sm">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</span>
                <button onClick={() => setDeleteTarget(c)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-[--danger] hover:bg-[--danger]/10 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}

          {/* Mobile cards */}
          {!isLoading && coupons.map(c => (
            <div key={c.id + '-m'} className="md:hidden p-5 border-b border-[--border] last:border-0">
              <div className="flex items-start justify-between mb-2">
                <span className="text-white font-mono font-black tracking-widest">{c.code}</span>
                <button onClick={() => setDeleteTarget(c)} className="text-[--danger] p-1"><Trash2 size={15} /></button>
              </div>
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <span style={{ color: '#22C55E' }} className="font-bold">{c.discountPercent}% off</span>
                <span className="text-[--text-muted]">{c.usesCount}/{c.maxUses} uses</span>
                {c.expiresAt && <span className="text-[--text-muted]">Expires {new Date(c.expiresAt).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && (
        <CouponModal
          onSave={v => createMutation.mutate(v)}
          onClose={() => setShowCreate(false)}
          saving={createMutation.isPending}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Delete Coupon"
          message={`Delete coupon "${deleteTarget.code}"? This cannot be undone.`}
          confirmText="Delete"
          confirmVariant="destructive"
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default AdminCouponsPage;
