import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Link } from 'wouter';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState(false);
  const { error } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccessState(true);
    } catch (err: any) {
      // Security best practice: always show success even if email not found
      setSuccessState(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--bg-primary] px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        {!successState ? (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-black text-white mb-2">Reset Password</h1>
              <p className="text-[--text-secondary]">Enter your email and we'll send you a link to reset your password.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" size={18} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-[--bg-secondary] border-[--border] text-white focus:border-[--accent-primary] transition-all"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full h-12 bg-[--accent-primary] hover:bg-[--accent-hover] text-white font-bold transition-all"
              >
                {loading ? <RefreshCw className="animate-spin mr-2" /> : null}
                Send Reset Link
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mx-auto mb-8">
              <CheckCircle size={40} />
            </div>
            <h1 className="text-3xl font-black text-white mb-4">Email Sent!</h1>
            <p className="text-[--text-secondary] mb-10 leading-relaxed">
              If an account exists for <span className="text-white font-bold">{email}</span>, you will receive a password reset link shortly.
            </p>
          </div>
        )}

        <Link href="/login">
          <span className="flex items-center justify-center gap-2 text-[--text-muted] text-sm font-bold hover:text-white cursor-pointer mt-8 transition-colors">
            <ArrowLeft size={16} /> Back to Login
          </span>
        </Link>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
