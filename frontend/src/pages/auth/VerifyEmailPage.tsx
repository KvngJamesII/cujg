import React, { useState } from 'react';
import { Link } from 'wouter';
import { AuthShell } from '@/components/auth/AuthShell';
import { MailCheck, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false);
  const resend = async () => {
    setLoading(true);
    try { await api.post('/auth/resend-verification'); toast.success('Verification email sent'); }
    catch { toast.error('Could not send'); }
    finally { setLoading(false); }
  };
  return (
    <AuthShell title="Verify your email" subtitle="We've sent a link to your inbox. Click it to activate your account.">
      <div className="flex flex-col items-center text-center py-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
          <MailCheck size={32} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <p className="text-sm text-[--text-secondary] max-w-sm">Didn't get it? Check your spam folder or resend.</p>
        <button onClick={resend} disabled={loading} className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border hover:bg-white/5" style={{ borderColor: 'var(--border)' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Resend email
        </button>
        <Link href="/login"><span className="mt-4 text-xs text-[--text-muted] hover:text-white cursor-pointer">Back to sign in</span></Link>
      </div>
    </AuthShell>
  );
}
