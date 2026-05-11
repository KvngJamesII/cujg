import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { CreditCard, Download, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface Payment { id: string; amount: number; status: string; plan: string; createdAt: string; reference: string }
interface Sub { plan: { name: string; priceKobo: number; botLimit: number; ramPerBotMb: number }; status: string; renewsAt: string }

export default function BillingPage() {
  const { data: sub } = useQuery<Sub | null>({ queryKey: ['sub'], queryFn: async () => (await api.get('/billing/subscription')).data as Sub | null });
  const { data: payments = [] } = useQuery<Payment[]>({ queryKey: ['payments'], queryFn: async () => (await api.get('/billing/payments?limit=20')).data as Payment[] });

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-extrabold tracking-tight">Billing</h1>
      <p className="text-[--text-secondary] text-sm mt-1.5">Manage your plan and invoices.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-7">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 p-6 rounded-2xl border relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, rgba(249,115,22,0.10), rgba(167,139,250,0.05))', borderColor: 'rgba(249,115,22,0.25)' }}>
          <div className="absolute -top-16 -right-10 w-44 h-44 rounded-full opacity-20" style={{ background: 'var(--accent-primary)', filter: 'blur(60px)' }} />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[--accent-primary]">Current plan</div>
            <div className="flex items-end gap-3 mt-2">
              <h2 className="text-4xl font-extrabold tracking-tight">{sub?.plan?.name ?? 'No plan'}</h2>
              {sub && <span className="text-xs px-2 py-1 rounded font-bold uppercase mb-2" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}>{sub.status}</span>}
            </div>
            {sub && (
              <>
                <div className="mt-3 text-sm text-[--text-secondary]">
                  ₦{(sub.plan.priceKobo / 100).toLocaleString()}/month · {sub.plan.botLimit} panel{sub.plan.botLimit > 1 ? 's' : ''} · {sub.plan.ramPerBotMb} MB RAM
                </div>
                <div className="text-xs text-[--text-muted] mt-1">Renews {new Date(sub.renewsAt).toLocaleDateString()}</div>
              </>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/pricing">
                <button className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: 'var(--accent-gradient)' }}>
                  <Sparkles size={12} /> {sub ? 'Change plan' : 'Choose plan'}
                </button>
              </Link>
              {sub && <button className="px-4 py-2.5 rounded-xl text-xs font-bold border hover:bg-white/5" style={{ borderColor: 'var(--border)' }}>Cancel</button>}
            </div>
          </div>
        </motion.div>

        <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={15} className="text-[--text-muted]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[--text-muted]">Payment method</span>
          </div>
          <div className="text-sm">No card on file</div>
          <div className="text-xs text-[--text-muted] mt-0.5">Pay-as-you-go through Paystack</div>
          <button className="mt-4 w-full py-2.5 rounded-lg text-xs font-bold border hover:bg-white/5" style={{ borderColor: 'var(--border)' }}>Add card</button>
        </div>
      </div>

      {/* Invoices */}
      <div className="mt-8 p-5 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <h2 className="font-extrabold tracking-tight mb-4">Invoices</h2>
        {payments.length === 0 ? (
          <div className="py-8 text-center text-sm text-[--text-muted]">No invoices yet.</div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.10)' }}>
                    <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{p.plan} plan</div>
                    <div className="text-[11px] text-[--text-muted]">{new Date(p.createdAt).toLocaleDateString()} · {p.reference}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold">₦{(p.amount / 100).toLocaleString()}</span>
                  <button className="p-1.5 rounded hover:bg-white/5 text-[--text-muted] hover:text-white"><Download size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
