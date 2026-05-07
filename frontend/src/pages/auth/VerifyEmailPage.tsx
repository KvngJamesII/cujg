import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { MailCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Link } from 'wouter';

const VerifyEmailPage: React.FC = () => {
  const [params] = useLocation();
  const email = new URLSearchParams(window.location.search).get('email');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setLoading(true);
    try {
      await api.post('/auth/resend-verification', { email });
      success('Verification email sent!', 'Please check your inbox again.');
      setCooldown(60);
    } catch (err: any) {
      error('Failed to resend', err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--bg-primary] px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-24 h-24 rounded-full bg-[--accent-glow] flex items-center justify-center text-[--accent-primary] mx-auto mb-8 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
          <MailCheck size={48} />
        </div>
        
        <h1 className="text-3xl font-black text-white mb-4">Check your email</h1>
        <p className="text-[--text-secondary] mb-10 leading-relaxed">
          We've sent a verification link to <span className="text-white font-bold">{email || 'your email address'}</span>. Please click the link to activate your account.
        </p>

        <div className="space-y-4">
          <Button
            onClick={handleResend}
            disabled={loading || cooldown > 0}
            variant="outline"
            className="w-full h-12 bg-[--bg-secondary] border-[--border] text-white font-bold hover:bg-[--bg-tertiary] transition-all"
          >
            {loading ? <RefreshCw className="animate-spin mr-2" /> : null}
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
          </Button>
          
          <Link href="/login">
            <span className="flex items-center justify-center gap-2 text-[--text-muted] text-sm font-bold hover:text-white cursor-pointer mt-6 transition-colors">
              <ArrowLeft size={16} /> Back to Login
            </span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;
