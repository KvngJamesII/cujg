import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { success, error } = useToast();
  const [, setLocation] = useLocation();
  
  const token = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword || passwordStrength < 2 || !token) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      success('Password reset!', 'You can now login with your new password.');
      setLocation('/login');
    } catch (err: any) {
      error('Reset failed', err.response?.data?.message || 'Token may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg-primary]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Reset Token</h1>
          <Link href="/login"><Button>Back to Login</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--bg-primary] px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-white mb-2">New Password</h1>
          <p className="text-[--text-secondary]">Create a strong password to secure your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" size={18} />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pl-10 pr-10 h-12 bg-[--bg-secondary] border-[--border] text-white focus:border-[--accent-primary] transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all",
                    passwordStrength >= i 
                      ? i === 1 ? 'bg-red-500' : i === 2 ? 'bg-orange-500' : i === 3 ? 'bg-yellow-500' : 'bg-green-500'
                      : 'bg-[--bg-tertiary]'
                  )}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" size={18} />
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={cn(
                  "pl-10 h-12 bg-[--bg-secondary] border-[--border] text-white focus:border-[--accent-primary] transition-all",
                  confirmPassword && password === confirmPassword && "border-green-500/50"
                )}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && password === confirmPassword && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={18} />
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || password !== confirmPassword || passwordStrength < 2}
            className="w-full h-12 bg-[--accent-primary] hover:bg-[--accent-hover] text-white font-bold transition-all shadow-lg shadow-[--accent-primary]/20"
          >
            {loading ? <RefreshCw className="animate-spin mr-2" /> : null}
            Reset Password
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
