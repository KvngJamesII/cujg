import React, { useState } from 'react';
import { Link } from 'wouter';
import { AuthShell } from '@/components/auth/AuthShell';
import { Mail, ArrowRight, Loader2, Check } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await api.post('/auth/forgot-password', { email }); setSent(true); }
    finally { setLoading(false); }
  };

  if (sent) return (
    <AuthShell title="Check your inbox" subtitle="If an account exists, a reset link is on its way.">
      <div className="flex flex-col items-center text-center py-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(34,197,94,0.15)' }}>
          <Check size={28} style={{ color: 'var(--success)' }} />
        </div>
        <p className="text-sm text-[--text-secondary]">Open the link in your email to set a new password.</p>
        <Link href="/login"><span className="mt-6 text-[--accent-primary] font-semibold text-sm cursor-pointer">← Back to sign in</span></Link>
      </div>
    </AuthShell>
  );

  return (
    <AuthShell title="Forgot password" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={submit} className="space-y-4">
        <div className="relative flex items-center rounded-xl border focus-within:border-[--accent-primary]"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
          <Mail size={15} className="absolute left-3.5 text-[--text-muted]" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            className="w-full bg-transparent pl-10 pr-3 py-3 text-sm outline-none placeholder:text-[--text-muted]" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: 'var(--accent-gradient)' }}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <>Send reset link <ArrowRight size={16} /></>}
        </button>
        <Link href="/login"><div className="text-center text-sm text-[--text-muted] hover:text-white cursor-pointer">← Back to sign in</div></Link>
      </form>
    </AuthShell>
  );
}
