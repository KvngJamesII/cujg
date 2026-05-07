import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import api from '@/lib/api';
import { CreditCard, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface Payment {
  id: string;
  planName: string;
  amountKobo: number;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'new' | 'renewal' | 'upgrade' | 'coupon_free';
  paystackReference: string | null;
  paidAt: string | null;
  createdAt: string;
}

const statusStyles: Record<string, { color: string; bg: string }> = {
  confirmed:   { color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  pending:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  failed:      { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
};

const typeLabels: Record<string, string> = {
  new: 'New',
  renewal: 'Renewal',
  upgrade: 'Upgrade',
  coupon_free: 'Coupon (Free)',
};

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
}

export const AdminPaymentsPage: React.FC = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', page],
    queryFn: () => api.get(`/admin/payments?page=${page}&limit=20`).then(r => r.data as {
      payments: Payment[];
      total: number;
      page: number;
    }),
    placeholderData: prev => prev,
  });

  const payments = data?.payments ?? [];

  const totalRevenue = payments
    .filter(p => p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amountKobo, 0);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-black text-white">Payments</h1>
          <p className="text-[--text-secondary] font-medium mt-1">All payment transactions</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total on Page', value: formatNaira(totalRevenue), color: '#22C55E' },
            { label: 'Confirmed', value: payments.filter(p => p.status === 'confirmed').length, color: '#22C55E' },
            { label: 'Failed / Pending', value: payments.filter(p => p.status !== 'confirmed').length, color: '#EF4444' },
          ].map(s => (
            <div key={s.label} className="bg-[--bg-secondary] rounded-2xl border border-[--border] p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[--text-muted] mb-1">{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[--bg-secondary] rounded-2xl border border-[--border] overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.5fr_90px_110px_100px_120px_130px] gap-4 px-6 py-3 border-b border-[--border]">
            {['Plan', 'Amount', 'Type', 'Status', 'Paid At', 'Reference'].map(h => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-[--text-muted]">{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-[--text-muted]" />
            </div>
          ) : payments.length === 0 ? (
            <div className="py-8">
              <EmptyState icon={CreditCard} title="No payments yet" description="Payment history will appear here" />
            </div>
          ) : (
            payments.map(p => (
              <div key={p.id}>
                {/* Desktop */}
                <div className="hidden md:grid grid-cols-[1.5fr_90px_110px_100px_120px_130px] gap-4 px-6 py-4 border-b border-[--border] last:border-0 items-center hover:bg-white/[0.02] transition-colors">
                  <span className="text-white font-semibold text-sm capitalize">{p.planName}</span>
                  <span className="text-white font-bold text-sm font-mono">{formatNaira(p.amountKobo)}</span>
                  <span className="text-[--text-secondary] text-sm">{typeLabels[p.type] ?? p.type}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold capitalize w-fit"
                    style={{ color: statusStyles[p.status]?.color, background: statusStyles[p.status]?.bg }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusStyles[p.status]?.color }} />
                    {p.status}
                  </span>
                  <span className="text-[--text-muted] text-xs">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                  </span>
                  <span className="text-[--text-muted] text-xs font-mono truncate">
                    {p.paystackReference ?? '—'}
                  </span>
                </div>

                {/* Mobile */}
                <div className="md:hidden p-5 border-b border-[--border] last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold capitalize">{p.planName}</span>
                    <span className="text-white font-bold font-mono text-sm">{formatNaira(p.amountKobo)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize"
                      style={{ color: statusStyles[p.status]?.color, background: statusStyles[p.status]?.bg }}>
                      {p.status}
                    </span>
                    <span className="text-[--text-muted] text-xs">{typeLabels[p.type]}</span>
                    {p.paidAt && <span className="text-[--text-muted] text-xs">{new Date(p.paidAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[--text-muted]">{payments.length} of {data?.total ?? 0} payments</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-9 h-9 rounded-xl border border-[--border] flex items-center justify-center text-[--text-secondary] hover:bg-[--bg-tertiary] disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-white font-bold px-3">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={payments.length < 20}
              className="w-9 h-9 rounded-xl border border-[--border] flex items-center justify-center text-[--text-secondary] hover:bg-[--bg-tertiary] disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminPaymentsPage;
