import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Activity, Boxes, Cpu, MemoryStick, Plus, ArrowRight, TrendingUp, Zap, Bell } from 'lucide-react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

interface Summary {
  totalBots: number;
  runningBots: number;
  crashedBots: number;
  totalRamMb: number;
  uptimePercent: number;
  plan: { name: string; botLimit: number; ramPerBotMb: number } | null;
  recentActivity: { id: string; title: string; message: string; createdAt: string; read: boolean; type: string }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<Summary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/dashboard/summary')).data as Summary,
  });

  return (
    <DashboardLayout>
      {/* Greeting */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
        <div>
          <div className="text-xs text-[--text-muted] font-semibold uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1">
            Welcome back, <span style={{ color: 'var(--accent-primary)' }}>{user?.fullName?.split(' ')[0] ?? 'there'}</span>
          </h1>
          <p className="text-[--text-secondary] text-sm mt-1.5">Your panels are humming. Here's what's happening.</p>
        </div>
        <Link href="/bots/new">
          <button className="self-start md:self-auto inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow-orange)' }}>
            <Plus size={16} /> New panel
          </button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-7">
        <Stat icon={Boxes} label="Total panels" value={data?.totalBots ?? 0} accent="orange" loading={isLoading} />
        <Stat icon={Activity} label="Running" value={data?.runningBots ?? 0} accent="success" loading={isLoading} sub={`${data?.crashedBots ?? 0} need attention`} />
        <Stat icon={MemoryStick} label="RAM usage" value={`${data?.totalRamMb ?? 0} MB`} accent="cyan" loading={isLoading} sub={data?.plan ? `of ${data.plan.ramPerBotMb} MB` : undefined} />
        <Stat icon={TrendingUp} label="Uptime" value={`${data?.uptimePercent ?? 0}%`} accent="violet" loading={isLoading} sub="last 30 days" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Activity */}
        <div className="lg:col-span-2 p-5 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-extrabold tracking-tight">Recent activity</h2>
            <Link href="/bots"><span className="text-xs text-[--accent-primary] font-semibold cursor-pointer flex items-center gap-1">View all <ArrowRight size={11} /></span></Link>
          </div>
          {!data?.recentActivity?.length ? (
            <div className="py-10 text-center text-sm text-[--text-muted]">No activity yet. Deploy your first panel.</div>
          ) : (
            <ul className="space-y-2.5">
              {data.recentActivity.map((n, i) => (
                <motion.li key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: n.type === 'warning' ? 'rgba(234,179,8,0.12)' : 'rgba(34,211,238,0.12)' }}>
                    <Bell size={14} style={{ color: n.type === 'warning' ? 'var(--warning)' : 'var(--cyan)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{n.title}</div>
                    <div className="text-xs text-[--text-muted] truncate">{n.message}</div>
                  </div>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[--accent-primary] mt-2" />}
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        {/* Plan card */}
        <div className="p-5 rounded-2xl border relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, rgba(249,115,22,0.10), rgba(167,139,250,0.05))', borderColor: 'rgba(249,115,22,0.30)' }}>
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30" style={{ background: 'var(--accent-primary)', filter: 'blur(60px)' }} />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[--accent-primary] mb-2">Current plan</div>
            <h3 className="text-3xl font-extrabold">{data?.plan?.name ?? 'Free trial'}</h3>
            <div className="mt-2 text-sm text-[--text-secondary]">
              {data?.plan ? `${data.plan.botLimit} panel${data.plan.botLimit > 1 ? 's' : ''} · ${data.plan.ramPerBotMb} MB RAM` : 'Pick a plan to unlock everything.'}
            </div>
            <Link href="/billing">
              <button className="mt-5 w-full px-4 py-2.5 rounded-xl text-xs font-bold border hover:bg-white/5 flex items-center justify-center gap-2"
                style={{ borderColor: 'rgba(249,115,22,0.4)', color: 'var(--accent-primary)' }}>
                <Zap size={13} /> {data?.plan ? 'Manage' : 'Upgrade'} plan
              </button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Stat({ icon: Icon, label, value, sub, accent, loading }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string | number; sub?: string; accent: 'orange' | 'success' | 'cyan' | 'violet'; loading?: boolean }) {
  const colors: Record<string, string> = { orange: 'var(--accent-primary)', success: 'var(--success)', cyan: 'var(--cyan)', violet: 'var(--violet)' };
  const bgs: Record<string, string> = { orange: 'rgba(249,115,22,0.10)', success: 'rgba(34,197,94,0.10)', cyan: 'rgba(34,211,238,0.10)', violet: 'rgba(167,139,250,0.10)' };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bgs[accent] }}>
          <Icon size={15} />
        </div>
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">{label}</div>
      <div className="text-2xl font-extrabold mt-0.5 tracking-tight" style={{ color: colors[accent] }}>
        {loading ? '—' : value}
      </div>
      {sub && <div className="text-[10px] text-[--text-muted] mt-1">{sub}</div>}
    </motion.div>
  );
}
