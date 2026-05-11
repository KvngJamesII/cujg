import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { AuthShell } from '@/components/auth/AuthShell';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setLoc] = useLocation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd !== confirm) { toast.error("Passwords don't match"); return; }
    if (pwd.length < 8) { toast.error('Use at least 8 characters'); return; }
    setLoading(true);
    try { await api.post('/auth/reset-password', { password: pwd }); toast.success('Password updated'); setLoc('/login'); }
    catch { toast.error('Could not reset password'); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell title="Set a new password" subtitle="Make it strong — your bots are counting on you.">
      <form onSubmit={submit} className="space-y-4">
        <Input label="New password" value={pwd} onChange={setPwd} />
        <Input label="Confirm password" value={confirm} onChange={setConfirm} />
        <button type="submit" disabled={loading}
          className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: 'var(--accent-gradient)' }}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <>Update password <ArrowRight size={16} /></>}
        </button>
      </form>
    </AuthShell>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[--text-secondary] mb-1.5">{label}</span>
      <div className="relative flex items-center rounded-xl border focus-within:border-[--accent-primary]" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
        <Lock size={15} className="absolute left-3.5 text-[--text-muted]" />
        <input type="password" required value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent pl-10 pr-3 py-3 text-sm outline-none" />
      </div>
    </label>
  );
}
