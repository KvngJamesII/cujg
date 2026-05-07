import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Server, Tag, CreditCard, Activity, BarChart3, Mail, ShieldAlert, Gift, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const AdminDashboardPage: React.FC = () => {
  const stats = [
    { label: 'Total Users', value: '1,240', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Panels', value: '3,842', icon: Server, color: 'text-[--success]', bg: 'bg-[--success]/10' },
    { label: 'Revenue (MTD)', value: '₦4.2M', icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'System Load', value: '24%', icon: Activity, color: 'text-[--accent-primary]', bg: 'bg-[--accent-primary]/10' },
  ];

  const [trialEnabled, setTrialEnabled] = useState<boolean | null>(null);
  const [trialDays, setTrialDays] = useState(7);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialSaved, setTrialSaved] = useState(false);

  useEffect(() => {
    api.get('/settings/free-trial')
      .then((r) => {
        const d = r.data as { enabled: boolean; days: number };
        setTrialEnabled(d.enabled);
        setTrialDays(d.days);
      })
      .catch(() => { setTrialEnabled(true); setTrialDays(7); });
  }, []);

  const saveTrialSettings = async (enabled: boolean) => {
    setTrialLoading(true);
    setTrialSaved(false);
    try {
      await api.put('/settings/free-trial', { enabled, days: trialDays });
      setTrialEnabled(enabled);
      setTrialSaved(true);
      setTimeout(() => setTrialSaved(false), 2500);
    } catch {
      // silent
    } finally {
      setTrialLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Admin Dashboard</h1>
          <p className="text-[--text-secondary] font-medium">Global system overview and administrative controls.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[--bg-secondary] border border-[--border] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[--text-muted] mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-white">{stat.value}</p>
              </div>
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                <stat.icon size={24} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 bg-[--bg-secondary] border-[--border] p-8 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-6">System Health</h2>
            <div className="h-64 flex items-center justify-center text-[--text-muted] bg-black/20 rounded-xl border border-dashed border-[--border]">
              <BarChart3 size={48} className="opacity-20" />
              <span className="ml-4 font-bold uppercase tracking-widest">Real-time Metrics Coming Soon</span>
            </div>
          </Card>

          <Card className="bg-[--bg-secondary] border-[--border] p-8 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="space-y-4">
              {[
                { label: 'Broadcast Notification', icon: Mail, color: 'bg-[--accent-primary]' },
                { label: 'Global Maintenance', icon: ShieldAlert, color: 'bg-[--danger]' },
                { label: 'Manage Coupons', icon: Tag, color: 'bg-amber-500' },
              ].map((action, i) => (
                <Button key={i} className={cn("w-full h-12 justify-start px-6 gap-3 text-white font-bold", action.color)}>
                  <action.icon size={18} /> {action.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Free Trial Settings */}
        <Card className="bg-[--bg-secondary] border-[--border] p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Gift size={20} style={{ color: '#F97316' }} />
            <h2 className="text-xl font-bold text-white">Free Trial Settings</h2>
          </div>
          <p className="text-sm text-[--text-secondary] mb-8">
            When enabled, every new signup automatically gets a free Starter plan for the set number of days. Disabling this removes the offer from the landing page and stops granting it to new signups.
          </p>

          {trialEnabled === null ? (
            <div className="flex items-center gap-2 text-[--text-muted]">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading settings...</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-end gap-6">
              {/* Duration input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted]">Trial Duration (days)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={trialDays}
                  onChange={(e) => setTrialDays(Math.max(1, parseInt(e.target.value) || 7))}
                  className="w-28 h-11 px-4 rounded-xl border text-white text-sm font-semibold bg-[--bg-tertiary] border-[--border] focus:outline-none focus:border-orange-500/50"
                />
              </div>

              {/* Toggle buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => saveTrialSettings(true)}
                  disabled={trialLoading}
                  className={cn(
                    'h-11 px-6 rounded-xl text-sm font-bold transition-all border',
                    trialEnabled
                      ? 'text-white border-transparent'
                      : 'text-[--text-secondary] border-[--border] bg-transparent'
                  )}
                  style={trialEnabled ? { background: '#F97316', boxShadow: '0 0 16px rgba(249,115,22,0.3)' } : {}}>
                  {trialLoading && trialEnabled === false ? <Loader2 size={14} className="animate-spin" /> : 'Enabled'}
                </button>
                <button
                  onClick={() => saveTrialSettings(false)}
                  disabled={trialLoading}
                  className={cn(
                    'h-11 px-6 rounded-xl text-sm font-bold transition-all border',
                    !trialEnabled
                      ? 'text-white border-transparent bg-[--danger]'
                      : 'text-[--text-secondary] border-[--border] bg-transparent'
                  )}>
                  {trialLoading && trialEnabled === true ? <Loader2 size={14} className="animate-spin" /> : 'Disabled'}
                </button>
              </div>

              {trialSaved && (
                <span className="text-sm font-semibold" style={{ color: '#22C55E' }}>Saved.</span>
              )}
            </div>
          )}

          {/* Status summary */}
          {trialEnabled !== null && (
            <div className="mt-6 pt-6 border-t border-[--border]">
              <p className="text-xs text-[--text-muted]">
                Status:{' '}
                <span className="font-bold" style={{ color: trialEnabled ? '#22C55E' : '#EF4444' }}>
                  {trialEnabled ? `Active — new signups get ${trialDays} days free` : 'Disabled — no free trial granted on signup'}
                </span>
              </p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};


export default AdminDashboardPage;
