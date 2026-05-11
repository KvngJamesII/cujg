import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Boxes, CreditCard, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Link } from 'wouter';

export default function AdminDashboardPage() {
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: async () => (await api.get('/admin/users?page=1&limit=20')).data });
  const { data: containers } = useQuery({ queryKey: ['admin-containers'], queryFn: async () => (await api.get('/admin/containers')).data });
  const { data: payments } = useQuery({ queryKey: ['admin-payments'], queryFn: async () => (await api.get('/admin/payments?page=1&limit=20')).data });

  const stats = [
    { label: 'Total users', value: (users as { total?: number })?.total ?? 0, icon: Users, color: 'orange' },
    { label: 'Active panels', value: ((containers as unknown[])?.length ?? 0), icon: Boxes, color: 'cyan' },
    { label: 'Payments', value: (payments as { total?: number })?.total ?? 0, icon: CreditCard, color: 'violet' },
    { label: 'Revenue', value: '₦' + (((payments as { payments?: { amount: number }[] })?.payments ?? []).reduce((s: number, p: { amount: number }) => s + p.amount, 0) / 100).toLocaleString(), icon: TrendingUp, color: 'success' },
  ] as const;

  const colors: Record<string, string> = { orange: 'var(--accent-primary)', cyan: 'var(--cyan)', violet: 'var(--violet)', success: 'var(--success)' };
  const bgs: Record<string, string> = { orange: 'rgba(249,115,22,0.10)', cyan: 'rgba(34,211,238,0.10)', violet: 'rgba(167,139,250,0.10)', success: 'rgba(34,197,94,0.10)' };

  const adminLinks = [
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/containers', label: 'Containers' },
    { to: '/admin/plans', label: 'Plans' },
    { to: '/admin/coupons', label: 'Coupons' },
    { to: '/admin/trial-codes', label: 'Trial codes' },
    { to: '/admin/broadcast', label: 'Broadcast' },
    { to: '/admin/payments', label: 'Payments' },
    { to: '/admin/audit-log', label: 'Audit log' },
    { to: '/admin/debug-logs', label: 'Debug logs' },
  ];

  return (
    <DashboardLayout>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3"
        style={{ background: 'rgba(167,139,250,0.10)', color: 'var(--violet)', border: '1px solid rgba(167,139,250,0.25)' }}>
        Admin console
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">Operations</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="p-4 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: bgs[s.color] }}>
              <s.icon size={15} style={{ color: colors[s.color] }} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[--text-muted]">{s.label}</div>
            <div className="text-2xl font-extrabold mt-0.5">{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
        {adminLinks.map((l) => (
          <Link key={l.to} href={l.to}>
            <div className="p-5 rounded-xl border cursor-pointer hover:border-[--accent-primary] transition" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <div className="font-bold">{l.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}
