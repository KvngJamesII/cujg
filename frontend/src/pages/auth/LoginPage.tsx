import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/ui/Logo';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const D = 'var(--app-font-display)';

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { error } = useToast();
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const result = await login(data.email, data.password);
      if (result.requiresTwoFa) {
        setLocation('/login/2fa');
      } else {
        setLocation('/dashboard');
      }
    } catch (err: any) {
      error('Login failed', err.response?.data?.message || 'Invalid email or password');
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
        <div className="absolute bottom-0 left-0 w-[600px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 0% 100%, rgba(249,115,22,0.14) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] pointer-events-none opacity-5"
          style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 70%)', filter: 'blur(60px)' }} />

        {/* Logo */}
        <div className="relative z-10 p-10">
          <Link href="/"><Logo className="cursor-pointer" /></Link>
        </div>

        {/* Editorial headline */}
        <div className="relative z-10 px-12 pb-20">
          <p className="text-sm font-bold uppercase tracking-[0.18em] mb-8"
            style={{ color: '#F97316' }}>
            Bot Hosting Panel
          </p>
          <h2 className="leading-[0.9] font-extrabold mb-10"
            style={{ fontFamily: D, fontSize: 'clamp(52px, 5vw, 76px)' }}>
            <span className="text-white block">Welcome</span>
            <span className="text-white block">back to</span>
            <span style={{
              display: 'block',
              fontStyle: 'italic',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.88em',
              letterSpacing: '-0.01em',
            }}>
              the control
            </span>
            <span style={{ color: '#F97316', display: 'block' }}>panel.</span>
          </h2>
          <p className="text-base leading-relaxed max-w-xs"
            style={{ color: 'var(--text-muted)' }}>
            Your panels are running. Sign in to monitor, control, and scale.
          </p>
        </div>

        {/* Bottom note */}
        <div className="relative z-10 px-12 pb-10">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            End-to-end encrypted · Zero-trust auth
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

        <div className="flex-1 flex flex-col justify-center px-6 py-12 md:px-16 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-sm w-full mx-auto"
          >
            {/* Heading */}
            <div className="mb-10">
              <h1 className="font-extrabold mb-2 leading-tight"
                style={{ fontFamily: D, fontSize: 'clamp(32px, 4vw, 44px)' }}>
                <span className="text-white block">Sign</span>
                <span style={{
                  display: 'block',
                  fontStyle: 'italic',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: '0.88em',
                }}>in.</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                Don't have an account?{' '}
                <Link href="/signup">
                  <span className="font-bold cursor-pointer hover:underline" style={{ color: '#F97316' }}>
                    Sign up free →
                  </span>
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                    className="pl-10 h-12 rounded-xl border text-white text-base transition-all"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border)',
                    }}
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>Password</Label>
                  <Link href="/forgot-password">
                    <span className="text-xs font-bold cursor-pointer hover:underline" style={{ color: '#F97316' }}>
                      Forgot?
                    </span>
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    size={16} style={{ color: 'var(--text-muted)' }} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-11 h-12 rounded-xl border text-white text-base transition-all"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border)',
                    }}
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
                {errors.password && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{errors.password.message}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 font-bold text-white text-base rounded-xl mt-2 flex items-center justify-center gap-2 transition-all"
                style={{
                  background: '#F97316',
                  boxShadow: loading ? 'none' : '0 0 24px rgba(249,115,22,0.28)',
                }}
              >
                {loading ? 'Signing in...' : (
                  <><span>Sign In</span><ArrowRight size={16} /></>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
