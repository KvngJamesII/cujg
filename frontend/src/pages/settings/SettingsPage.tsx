import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Shield, Loader2, Check } from 'lucide-react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [name, setName] = useState(user?.fullName ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try { await api.patch('/account/profile', { fullName: name }); await refreshUser(); toast.success('Profile updated'); }
    catch { toast.error('Failed'); }
    finally { setSavingProfile(false); }
  };
  const changePw = async () => {
    setSavingPw(true);
    try { await api.post('/auth/change-password', { currentPassword: pw.current, newPassword: pw.next }); toast.success('Password changed'); setPw({ current: '', next: '' }); }
    catch { toast.error('Could not change password'); }
    finally { setSavingPw(false); }
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
      <p className="text-[--text-secondary] text-sm mt-1.5">Manage your account.</p>

      <div className="mt-7 grid grid-cols-1 md:grid-cols-[200px,1fr] gap-6">
        {/* Tabs */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {[
            { id: 'profile' as const, icon: User, label: 'Profile' },
            { id: 'security' as const, icon: Shield, label: 'Security' },
            { id: 'notifications' as const, icon: Bell, label: 'Notifications' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition ${tab === t.id ? 'text-white' : 'text-[--text-muted] hover:text-white'}`}
              style={tab === t.id ? { background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.25)' } : { border: '1px solid transparent' }}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          {tab === 'profile' && (
            <div className="space-y-5">
              <h2 className="font-extrabold">Profile</h2>
              <Field label="Full name" value={name} onChange={setName} />
              <Field label="Email" value={user?.email ?? ''} onChange={() => {}} readOnly />
              <button onClick={saveProfile} disabled={savingProfile}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center gap-2" style={{ background: 'var(--accent-gradient)' }}>
                {savingProfile ? <Loader2 className="animate-spin" size={13} /> : <Check size={13} />} Save
              </button>
            </div>
          )}
          {tab === 'security' && (
            <div className="space-y-5">
              <h2 className="font-extrabold">Security</h2>
              <Field label="Current password" type="password" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} />
              <Field label="New password" type="password" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} />
              <button onClick={changePw} disabled={savingPw || !pw.current || !pw.next}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center gap-2" style={{ background: 'var(--accent-gradient)' }}>
                {savingPw ? <Loader2 className="animate-spin" size={13} /> : <Lock size={13} />} Change password
              </button>
              <div className="border-t pt-5" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-bold text-sm">Two-factor authentication</h3>
                <p className="text-xs text-[--text-muted] mt-1">Currently {user?.totpEnabled ? 'enabled' : 'disabled'}.</p>
                <button className="mt-3 px-4 py-2 rounded-lg text-xs font-bold border" style={{ borderColor: 'var(--border)' }}>
                  {user?.totpEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </button>
              </div>
            </div>
          )}
          {tab === 'notifications' && (
            <div className="space-y-5">
              <h2 className="font-extrabold">Notifications</h2>
              {[
                { t: 'Crash alerts', d: 'Get notified the instant a panel crashes.' },
                { t: 'Weekly digest', d: 'Summary of your panel health every Monday.' },
                { t: 'Billing emails', d: 'Receipts, invoices, plan changes.' },
              ].map((n) => (
                <div key={n.t} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                  <div>
                    <div className="font-semibold text-sm">{n.t}</div>
                    <div className="text-xs text-[--text-muted]">{n.d}</div>
                  </div>
                  <Toggle defaultChecked />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, value, onChange, type = 'text', readOnly }: { label: string; value: string; onChange: (v: string) => void; type?: string; readOnly?: boolean }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[--text-secondary] mb-1.5">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} readOnly={readOnly}
        className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-[--accent-primary] read-only:opacity-60"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }} />
    </label>
  );
}

function Toggle({ defaultChecked }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <button onClick={() => setOn(!on)} className="relative w-11 h-6 rounded-full transition" style={{ background: on ? 'var(--accent-primary)' : 'var(--bg-elevated)' }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: on ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  );
}
