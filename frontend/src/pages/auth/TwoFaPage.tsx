import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { AuthShell } from '@/components/auth/AuthShell';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function TwoFaPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setLoc] = useLocation();
  const { refreshUser } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await api.post('/auth/2fa/verify', { code }); await refreshUser(); toast.success('Verified'); setLoc('/dashboard'); }
    catch { toast.error('Invalid code'); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell title="Two-factor code" subtitle="Enter the 6-digit code from your authenticator app.">
      <form onSubmit={submit} className="space-y-4">
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000"
          className="w-full h-16 rounded-xl border text-center text-3xl font-bold tracking-[0.5em] outline-none focus:border-[--accent-primary]"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }} />
        <button type="submit" disabled={loading || code.length < 6}
          className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'var(--accent-gradient)' }}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <>Verify <ArrowRight size={16} /></>}
        </button>
      </form>
    </AuthShell>
  );
}
