import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShell } from '@/components/auth/AuthShell';

export default function SignupPage() {
  const { refreshUser } = useAuth();
  const [, setLoc] = useLocation();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = (() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strLabel = ['Too short', 'Weak', 'OK', 'Strong', 'Excellent'][strength];
  const strColor = ['#475569', '#EF4444', '#EAB308', '#22D3EE', '#22C55E'][strength];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Use at least 8 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      await refreshUser();
      toast.success('Account created');
      setLoc('/dashboard');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Signup failed';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Create your account" subtitle="Start a 7-day free trial. No card.">
      <form onSubmit={submit} className="space-y-4">
        <Field icon={User} label="Full name" type="text" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} placeholder="Jane Developer" />
        <Field icon={Mail} label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@example.com" />
        <div>
          <Field icon={Lock} label="Password" type={show ? 'text' : 'password'} value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="8+ characters" right={
            <button type="button" onClick={() => setShow(!show)} className="text-[--text-muted] hover:text-white p-1">{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>
          } />
          {form.password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/5">
                <div className="h-full transition-all" style={{ width: `${(strength / 4) * 100}%`, background: strColor }} />
              </div>
              <span className="text-[11px] font-semibold" style={{ color: strColor }}>{strLabel}</span>
            </div>
          )}
        </div>

        <ul className="text-[11px] text-[--text-muted] grid grid-cols-2 gap-1 pt-1">
          {['8+ characters', 'One number', 'One uppercase', 'One symbol'].map((t, i) => (
            <li key={t} className="flex items-center gap-1.5">
              <Check size={11} style={{ color: i < strength ? 'var(--success)' : 'var(--text-muted)' }} />{t}
            </li>
          ))}
        </ul>

        <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
          className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow-orange)' }}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <>Create account <ArrowRight size={16} /></>}
        </motion.button>

        <div className="text-center text-sm text-[--text-secondary] pt-1">
          Already have one? <Link href="/login"><span className="text-[--accent-primary] font-semibold cursor-pointer">Sign in</span></Link>
        </div>
        <p className="text-[11px] text-center text-[--text-muted] leading-relaxed">
          By signing up you agree to our <Link href="/terms"><span className="underline cursor-pointer">Terms</span></Link> and <Link href="/privacy"><span className="underline cursor-pointer">Privacy</span></Link>.
        </p>
      </form>
    </AuthShell>
  );
}

function Field({ icon: Icon, label, type, value, onChange, placeholder, right }: { icon: React.ComponentType<{ size?: number }>; label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; right?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[--text-secondary] mb-1.5">{label}</span>
      <div className="relative flex items-center rounded-xl border transition-all focus-within:border-[--accent-primary]"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
        <Icon size={15} />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required
          className="w-full bg-transparent pl-2 pr-3 py-3 text-sm outline-none placeholder:text-[--text-muted]" />
        {right && <div className="pr-2">{right}</div>}
      </div>
    </label>
  );
}
