import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLoc] = useLocation();
  const [email, setEmail] = useState('demo@redon3.com');
  const [password, setPassword] = useState('demo1234');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { requiresTwoFa } = await login(email, password);
      toast.success('Welcome back');
      setLoc(requiresTwoFa ? '/login/2fa' : '/dashboard');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Login failed';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Pick up where you left off.">
      <form onSubmit={submit} className="space-y-4">
        <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <div>
          <Field icon={Lock} label="Password" type={show ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="Your password" right={
            <button type="button" onClick={() => setShow(!show)} className="text-[--text-muted] hover:text-white p-1">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          } />
          <div className="flex justify-end mt-2">
            <Link href="/forgot-password"><span className="text-xs text-[--text-muted] hover:text-[--accent-primary] cursor-pointer">Forgot password?</span></Link>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
          className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow-orange)' }}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <>Sign in <ArrowRight size={16} /></>}
        </motion.button>
        <div className="text-center text-xs text-[--text-muted]">
          Demo: <span className="text-white">demo@redon3.com</span> / <span className="text-white">demo1234</span><br />
          Admin: <span className="text-white">admin@redon3.com</span> / <span className="text-white">admin123</span>
        </div>
        <div className="text-center text-sm text-[--text-secondary] pt-2">
          No account? <Link href="/signup"><span className="text-[--accent-primary] font-semibold cursor-pointer">Sign up free</span></Link>
        </div>
      </form>
    </AuthShell>
  );
}

function Field({ icon: Icon, label, type, value, onChange, placeholder, right }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string; right?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[--text-secondary] mb-1.5">{label}</span>
      <div className="relative flex items-center rounded-xl border transition-all focus-within:border-[--accent-primary]"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
        <Icon size={15} className="absolute left-3.5 text-[--text-muted]" />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required
          className="w-full bg-transparent pl-10 pr-3 py-3 text-sm outline-none placeholder:text-[--text-muted]" />
        {right && <div className="pr-2">{right}</div>}
      </div>
    </label>
  );
}
