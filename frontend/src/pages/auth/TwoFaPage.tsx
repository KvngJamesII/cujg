import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Link } from 'wouter';

const TwoFaPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { error } = useToast();
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();

  const handleVerify = async (val: string) => {
    if (val.length !== 6) return;
    setLoading(true);
    try {
      await api.post('/auth/2fa/verify', { code: val });
      await refreshUser();
      setLocation('/dashboard');
    } catch (err: any) {
      error('Verification failed', err.response?.data?.message || 'Invalid code');
      setCode('');
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
        <div className="w-20 h-20 rounded-full bg-[--accent-glow] flex items-center justify-center text-[--accent-primary] mx-auto mb-8">
          <ShieldCheck size={40} />
        </div>
        
        <h1 className="text-3xl font-black text-white mb-4">Two-Factor Authentication</h1>
        <p className="text-[--text-secondary] mb-10 leading-relaxed">
          Enter the 6-digit verification code from your authenticator app to continue.
        </p>

        <div className="flex justify-center mb-10">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(val) => {
              setCode(val);
              if (val.length === 6) handleVerify(val);
            }}
            disabled={loading}
          >
            <InputOTPGroup className="gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot 
                  key={i} 
                  index={i} 
                  className="w-12 h-14 bg-[--bg-secondary] border-[--border] text-white text-xl font-bold rounded-lg focus:ring-[--accent-primary] transition-all"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => handleVerify(code)}
            disabled={loading || code.length !== 6}
            className="w-full h-12 bg-[--accent-primary] hover:bg-[--accent-hover] text-white font-bold transition-all shadow-lg shadow-[--accent-primary]/20"
          >
            {loading ? <RefreshCw className="animate-spin mr-2" /> : null}
            Verify & Continue
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

export default TwoFaPage;
