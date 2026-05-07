import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Menu, X, LayoutDashboard, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export const MarketingNav: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navLinks = [
    { name: 'Pricing', href: '/pricing' },
    { name: 'Terms', href: '/terms' },
    { name: 'Privacy', href: '/privacy' },
  ];

  return (
    <>
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 h-16 flex items-center justify-between',
        scrolled || mobileOpen
          ? 'border-b backdrop-blur-xl'
          : 'bg-transparent'
      )}
        style={scrolled || mobileOpen
          ? { background: 'rgba(8,9,13,0.92)', borderColor: 'var(--border)' }
          : {}}>

        <Link href="/">
          <Logo className="cursor-pointer" />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <span className={cn(
                'text-sm font-medium transition-colors cursor-pointer',
                location === link.href ? 'text-white' : 'hover:text-white'
              )} style={{ color: location === link.href ? 'white' : 'var(--text-secondary)' }}>
                {link.name}
              </span>
            </Link>
          ))}
          <div className="flex items-center gap-3 ml-4">
            {!loading && (
              user ? (
                <Link href="/dashboard">
                  <Button className="font-bold text-white text-sm px-5 h-9"
                    style={{ background: '#F97316', boxShadow: '0 0 16px rgba(249,115,22,0.25)' }}>
                    <LayoutDashboard size={14} className="mr-2" /> Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="font-semibold text-sm"
                      style={{ color: 'var(--text-secondary)' }}>
                      Log In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button className="font-bold text-white text-sm px-5 h-9"
                      style={{ background: '#F97316', boxShadow: '0 0 16px rgba(249,115,22,0.25)' }}>
                      Sign Up
                    </Button>
                  </Link>
                </>
              )
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
          style={{ color: 'var(--text-primary)', background: mobileOpen ? 'var(--bg-tertiary)' : 'transparent' }}
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile fullscreen drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed inset-0 z-40 flex flex-col"
            style={{ background: 'var(--bg-primary)', paddingTop: '4rem' }}
          >
            {/* Orange glow */}
            <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-10"
              style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 70%)', filter: 'blur(60px)' }} />

            <div className="flex-1 flex flex-col px-8 pt-12 pb-10 relative z-10">
              {/* Nav links */}
              <nav className="flex flex-col gap-2 mb-auto">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.2 }}
                  >
                    <Link href={link.href}>
                      <div className={cn(
                        'flex items-center justify-between py-4 border-b text-2xl font-extrabold tracking-tight cursor-pointer transition-colors',
                        location === link.href ? 'text-white' : 'hover:text-white'
                      )}
                        style={{
                          borderColor: 'var(--border)',
                          color: location === link.href ? 'white' : 'var(--text-secondary)',
                          fontFamily: 'var(--app-font-display)',
                        }}>
                        {link.name}
                        <ArrowRight size={20} className="opacity-30" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* Auth buttons at bottom */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.2 }}
                className="flex flex-col gap-3 pt-10"
              >
                {!loading && (
                  user ? (
                    <Link href="/dashboard">
                      <Button className="w-full h-14 font-bold text-white text-base rounded-2xl"
                        style={{ background: '#F97316', boxShadow: '0 0 24px rgba(249,115,22,0.25)' }}>
                        <LayoutDashboard size={18} className="mr-2" /> Go to Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/signup">
                        <Button className="w-full h-14 font-bold text-white text-base rounded-2xl"
                          style={{ background: '#F97316', boxShadow: '0 0 24px rgba(249,115,22,0.25)' }}>
                          Sign Up Free
                        </Button>
                      </Link>
                      <Link href="/login">
                        <Button variant="outline" className="w-full h-14 font-bold text-base rounded-2xl border-2"
                          style={{
                            background: 'transparent',
                            borderColor: 'var(--border)',
                            color: 'var(--text-primary)',
                          }}>
                          Log In
                        </Button>
                      </Link>
                    </>
                  )
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
