import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(v => v === true, { message: 'You must accept the terms to continue' }),
  honeypot: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupForm = z.infer<typeof signupSchema>;

const D = 'var(--app-font-display)';

const SignupPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();
  const { refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [passwordStrength, setPasswordStrength] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const password = watch('password', '');
  const confirmPassword = watch('confirmPassword', '');

  React.useEffect(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    setPasswordStrength(s);
  }, [password]);

  const strengthColor = ['', '#EF4444', '#F97316', '#EAB308', '#22C55E'][passwordStrength] || 'var(--bg-tertiary)';

  const onSubmit = async (data: SignupForm) => {
    if (data.honeypot) return;
    setLoading(true);
    try {
      await api.post('/auth/register', data);
      await refreshUser();
      success('Welcome to Redon3!', 'Your account is ready. Let\'s deploy your first bot.');
      setLocation('/dashboard');
    } catch (err: any) {
      error('Signup failed', err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[--bg-primary]" style={{ fontFamily: 'var(--app-font-sans)' }}>

      {/* ── Left branding panel ────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden"
        style={{ background: '#060709' }}>

        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.12) 0%, transparent 65%)', filter: 'blur(50px)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] pointer-events-none opacity-5"
          style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 70%)', filter: 'blur(80px)' }} />

        {/* Logo */}
        <div className="relative z-10 p-10">
          <Link href="/"><Logo className="cursor-pointer" /></Link>
        </div>

        {/* Editorial headline */}
        <div className="relative z-10 px-12 pb-20">
          <p className="text-sm font-bold uppercase tracking-[0.18em] mb-8"
            style={{ color: '#F97316' }}>
            Free 7-Day Trial
          </p>
          <h2 className="leading-[0.9] font-extrabold mb-10"
            style={{ fontFamily: D, fontSize: 'clamp(52px, 5vw, 76px)' }}>
            <span className="text-white block">Your panels</span>
            <span className="text-white block">deserve</span>
            <span style={{
              display: 'block',
              fontStyle: 'italic',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.88em',
              letterSpacing: '-0.01em',
            }}>
              better
            </span>
            <span style={{ color: '#F97316', display: 'block' }}>uptime.</span>
          </h2>
          <p className="text-base leading-relaxed max-w-xs"
            style={{ color: 'var(--text-muted)' }}>
            One-click deploy. Auto-restart on crash. Live logs and terminal access.
          </p>
        </div>

        {/* Bottom */}
        <div className="relative z-10 px-12 pb-10">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            No credit card required · Cancel anytime
          </p>
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen"
        style={{ background: 'var(--bg-primary)' }}>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-between px-6 pt-8 pb-4">
          <Link href="/"><Logo /></Link>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 py-10 md:px-16 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-sm w-full mx-auto"
          >
            {/* Heading */}
            <div className="mb-8">
              <h1 className="font-extrabold mb-2 leading-tight"
                style={{ fontFamily: D, fontSize: 'clamp(32px, 4vw, 44px)' }}>
                <span className="text-white block">Get</span>
                <span style={{
                  display: 'block',
                  fontStyle: 'italic',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: '0.88em',
                }}>started.</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                Already have an account?{' '}
                <Link href="/login">
                  <span className="font-bold cursor-pointer hover:underline" style={{ color: '#F97316' }}>
                    Sign in →
                  </span>
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="hidden">
                <input {...register('honeypot')} />
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    size={16} style={{ color: 'var(--text-muted)' }} />
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    className="pl-10 h-12 rounded-xl border text-white text-base"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                    {...register('fullName')}
                  />
                </div>
                {errors.fullName && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{errors.fullName.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    size={16} style={{ color: 'var(--text-muted)' }} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10 h-12 rounded-xl border text-white text-base"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    size={16} style={{ color: 'var(--text-muted)' }} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-11 h-12 rounded-xl border text-white text-base"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all"
                        style={{ background: passwordStrength >= i ? strengthColor : 'var(--bg-tertiary)' }} />
                    ))}
                  </div>
                )}

                <div className="flex gap-4 text-[10px] font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                  <span className={cn(password.length >= 8 && 'text-green-500')}>8+ chars</span>
                  <span className={cn(/[A-Z]/.test(password) && 'text-green-500')}>Uppercase</span>
                  <span className={cn(/[0-9]/.test(password) && 'text-green-500')}>Number</span>
                </div>

                {errors.password && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    size={16} style={{ color: 'var(--text-muted)' }} />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn(
                      'pl-10 pr-11 h-12 rounded-xl border text-white text-base',
                      confirmPassword && password === confirmPassword && 'border-green-500/50'
                    )}
                    style={{ background: 'var(--bg-secondary)', borderColor: confirmPassword && password === confirmPassword ? 'rgba(34,197,94,0.5)' : 'var(--border)' }}
                    {...register('confirmPassword')}
                  />
                  {confirmPassword && password === confirmPassword && (
                    <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-500" size={16} />
                  )}
                </div>
                {errors.confirmPassword && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{errors.confirmPassword.message}</p>}
              </div>

              {/* Terms checkbox */}
              <div className="space-y-1">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only"
                      {...register('acceptTerms')}
                    />
                    <div className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                      'border-[var(--border)] bg-[var(--bg-secondary)]',
                      'group-hover:border-[#F97316]/60'
                    )}
                      style={{ borderColor: 'var(--border)' }}>
                      <CheckCircle size={12} className="text-[#F97316] opacity-0 group-has-[:checked]:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    I agree to the{' '}
                    <Link href="/terms"><span className="underline cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Terms of Service</span></Link>
                    {' '}and{' '}
                    <Link href="/privacy"><span className="underline cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Privacy Policy</span></Link>
                  </span>
                </label>
                {errors.acceptTerms && (
                  <p className="text-xs font-medium pl-8" style={{ color: 'var(--danger)' }}>
                    {errors.acceptTerms.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 font-bold text-white text-base rounded-xl mt-1 flex items-center justify-center gap-2 transition-all"
                style={{
                  background: '#F97316',
                  boxShadow: loading ? 'none' : '0 0 24px rgba(249,115,22,0.28)',
                }}
              >
                {loading ? 'Creating Account...' : (
                  <><span>Get Started</span><ArrowRight size={16} /></>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
