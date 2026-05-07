import React, { useEffect, useRef, useState } from 'react';
import { MarketingNav } from '@/components/layout/MarketingNav';
import { PlanCards } from '@/components/billing/PlanCards';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion } from 'framer-motion';
import { ArrowRight, Activity, Terminal, BellRing, RefreshCw, FolderOpen, Shield, Zap, ChevronLeft, ChevronRight, Gift } from 'lucide-react';
import { Link } from 'wouter';
import useEmblaCarousel from 'embla-carousel-react';
import api from '@/lib/api';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const D = 'var(--app-font-display)';
const B = 'var(--border)';
const BG2 = 'var(--bg-secondary)';
const BG3 = 'var(--bg-tertiary)';

const features = [
  { icon: Activity, title: 'Live Monitoring', desc: 'CPU, RAM, and uptime in real time. You see problems before your users do.', color: '#22D3EE' },
  { icon: Terminal, title: 'Web Terminal', desc: 'Full shell access from any browser. No SSH clients, no setup.', color: '#22C55E' },
  { icon: BellRing, title: 'Crash Alerts', desc: 'Telegram or Email alerts the instant your bot goes down. Know in seconds, not hours.', color: '#F97316' },
  { icon: RefreshCw, title: 'Auto-Restart', desc: 'Bots restart automatically when they crash. No manual intervention, no lost uptime.', color: '#A78BFA' },
  { icon: FolderOpen, title: 'File Manager', desc: 'Upload, edit, and manage files through the browser. No SFTP needed.', color: '#38BDF8' },
  { icon: Shield, title: 'DDoS Protection', desc: 'Network-level filtering absorbs attack traffic. Your bot stays online no matter what.', color: '#F43F5E' },
];

const testimonials = [
  { name: 'Tunde A.', role: 'Bot Dev · Lagos', quote: 'My bot has been running for 53 days straight since I moved here. I forgot what a crash alert looks like.', plan: 'Developer' },
  { name: 'Chidi M.', role: 'Server Owner · Abuja', quote: 'The crash alert hit my Telegram before I even noticed. Bot was back online in under 10 seconds. Impressive.', plan: 'Pro' },
  { name: 'Adaeze O.', role: 'Freelance Dev · Port Harcourt', quote: 'Cleanest hosting panel I\'ve used. Worth every naira — and I\'ve tried all the alternatives.', plan: 'Starter' },
  { name: 'Emeka B.', role: 'Bot Creator · Enugu', quote: 'Finally a Nigerian hosting service that actually delivers. 99.9% uptime isn\'t a marketing lie here.', plan: 'Developer' },
  { name: 'Fatima K.', role: 'Community Admin · Kano', quote: 'I manage three bots for my community. The Developer plan is exactly what I needed at a price I can justify.', plan: 'Developer' },
  { name: 'Seun T.', role: 'Node.js Dev · Ibadan', quote: 'The file manager and web terminal alone are worth the price. No more SSHing just to fix a typo.', plan: 'Pro' },
  { name: 'Kelechi N.', role: 'Bot Developer · Onitsha', quote: 'Setup took 4 minutes. Seriously. Zipped my project, uploaded it, and it was running. That\'s it.', plan: 'Starter' },
  { name: 'Bola R.', role: 'Server Manager · Ikeja', quote: 'I\'ve been on the Developer plan for 4 months. Auto-restart has saved me at least 20 times. Zero downtime complaints from members.', plan: 'Developer' },
];

const LandingPage: React.FC = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    dragFree: true,
  });
  const [freeTrial, setFreeTrial] = useState<{ enabled: boolean; days: number } | null>(null);

  useEffect(() => {
    api.get('/settings/free-trial')
      .then((r) => setFreeTrial(r.data as { enabled: boolean; days: number }))
      .catch(() => setFreeTrial(null));
  }, []);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return (
    <div style={{ background: 'var(--bg-primary)', fontFamily: 'var(--app-font-sans)' }} className="min-h-screen text-[--text-primary] overflow-x-hidden selection:bg-orange-500/20">
      <MarketingNav />

      {/* Nav spacer — pushes all content below the fixed nav */}
      <div className="h-16" />

      {/* ── FREE TRIAL BANNER ────────────────────────────── */}
      {freeTrial?.enabled && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold flex-wrap"
          style={{ background: '#F97316' }}>
          <span className="text-white text-center leading-snug">
            {freeTrial.days}-day free trial — no card required.
          </span>
          <Link href="/signup">
            <span className="underline underline-offset-2 text-white font-bold cursor-pointer whitespace-nowrap">
              Sign Up →
            </span>
          </Link>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative pt-20 pb-20 md:pt-28 md:pb-28 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-[0.07]"
            style={{ background: 'radial-gradient(ellipse, #F97316 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute top-1/3 right-0 w-[400px] h-[400px] opacity-[0.04]"
            style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)', filter: 'blur(80px)' }} />
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-5xl mx-auto text-center relative z-10">
          {/* Tech stack chips */}
          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-2 mb-6">
              {([
                {
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 1.85c-.27 0-.55.07-.77.2l-7.44 4.3c-.48.27-.78.78-.78 1.3v8.7c0 .52.3 1.03.78 1.3l7.44 4.3c.46.26 1.05.26 1.52 0l7.44-4.3c.48-.27.78-.75.78-1.3v-8.7c0-.52-.3-1.03-.78-1.3L12.77 2.05c-.22-.13-.5-.2-.77-.2z" fill="#539E43"/>
                      <text x="12" y="16.2" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="bold" fontFamily="system-ui,sans-serif">N</text>
                    </svg>
                  ),
                  label: 'Node.js', color: '#539E43', bg: 'rgba(83,158,67,0.13)',
                },
                {
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.914 0C5.82 0 6.2 2.656 6.2 2.656l.007 2.752h5.814v.826H3.9S0 5.789 0 11.969c0 6.18 3.403 5.96 3.403 5.96h2.031v-2.867s-.109-3.402 3.35-3.402h5.766s3.24.052 3.24-3.13V3.327S18.28 0 11.914 0zm-3.22 1.924a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1z" fill="#3776AB"/>
                      <path d="M12.086 24c6.094 0 5.714-2.656 5.714-2.656l-.007-2.752h-5.814v-.826h8.121S24 18.211 24 12.031c0-6.18-3.403-5.96-3.403-5.96h-2.031v2.867s.109 3.402-3.35 3.402H9.45s-3.24-.052-3.24 3.13v5.203S5.72 24 12.086 24zm3.22-1.924a1.05 1.05 0 1 1 0-2.1 1.05 1.05 0 0 1 0 2.1z" fill="#FFD43B"/>
                    </svg>
                  ),
                  label: 'Python', color: '#4B8BBE', bg: 'rgba(55,118,171,0.13)',
                },
                {
                  icon: <Activity size={13} />,
                  label: '99.9% SLA', color: '#22C55E', bg: 'rgba(34,197,94,0.13)',
                },
              ] as { icon: React.ReactNode; label: string; color: string; bg: string }[]).map((chip, i) => (
                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold whitespace-nowrap"
                  style={{ background: chip.bg, color: chip.color }}>
                  {chip.icon}
                  {chip.label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* headline */}
          <motion.h1 variants={fadeUp}
            className="text-[52px] sm:text-[72px] md:text-[88px] leading-[0.95] font-extrabold tracking-tight mb-8"
            style={{ fontFamily: D }}>
            <span className="text-white">Host Bots and<br />Run Scripts</span>
            <br />
            <span style={{ color: '#F97316' }}>24/7</span>
            <br />
            <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.8)', fontSize: '0.86em', fontWeight: 600, letterSpacing: '-0.01em' }}>Zero Interruption.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Deploy Telegram, WhatsApp, or any bot on infrastructure that keeps them online. Starting from <strong className="text-white font-semibold">₦1,999/mo.</strong>
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link href="/signup">
              <Button className="h-14 px-10 text-base font-bold text-white"
                style={{ background: '#F97316', boxShadow: '0 0 28px rgba(249,115,22,0.35)' }}>
                Deploy Your First Bot <ArrowRight size={17} className="ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="h-14 px-10 text-base font-semibold text-white"
                style={{ borderColor: B, background: 'transparent' }}>
                View Pricing
              </Button>
            </Link>
          </motion.div>

          {/* Trust signals */}
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {['99.9% uptime SLA', '< 50ms log latency', 'Telegram crash alerts', 'Cancel anytime'].map((t) => (
              <span key={t} className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <span className="w-1 h-1 rounded-full" style={{ background: 'var(--text-muted)' }} />
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────── */}
      <section className="py-14 border-y" style={{ borderColor: B, background: 'rgba(14,17,23,0.7)' }}>
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-center divide-y md:divide-y-0 md:divide-x" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
          {[
            { val: '99.9%', label: 'Uptime SLA — guaranteed', color: '#22C55E' },
            { val: '< 50ms', label: 'Log delivery latency', color: '#F97316' },
            { val: '24 / 7', label: 'Human support team', color: '#22D3EE' },
          ].map((s, i) => (
            <div key={i} className="py-6 md:py-0">
              <div className="text-4xl font-extrabold mb-1.5" style={{ fontFamily: D, color: s.color }}>{s.val}</div>
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 max-w-xl">
            <div className="text-xs font-bold uppercase tracking-[0.15em] mb-4" style={{ color: '#F97316' }}>Platform</div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight" style={{ fontFamily: D }}>
              Everything you need.<br />
              <span style={{ fontStyle: 'italic', fontWeight: 600, color: 'rgba(255,255,255,0.45)', fontSize: '0.88em', letterSpacing: '-0.01em' }}>Nothing you don't.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: B }}>
            {features.map((f, i) => (
              <motion.div key={i} whileHover={{ background: BG3 }}
                className="p-8 flex flex-col gap-5 transition-colors"
                style={{ background: BG2 }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${f.color}14` }}>
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS CAROUSEL ────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'rgba(14,17,23,0.5)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.15em] mb-4" style={{ color: '#F97316' }}>What Developers Say</div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight" style={{ fontFamily: D }}>
                Built for devs.<br />
                <span style={{ fontStyle: 'italic', fontWeight: 600, color: 'rgba(255,255,255,0.45)', fontSize: '0.88em', letterSpacing: '-0.01em' }}>Trusted by devs.</span>
              </h2>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button onClick={scrollPrev}
                className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors hover:border-orange-500/50 hover:text-white"
                style={{ borderColor: B, color: 'var(--text-muted)', background: BG2 }}>
                <ChevronLeft size={18} />
              </button>
              <button onClick={scrollNext}
                className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors hover:border-orange-500/50 hover:text-white"
                style={{ borderColor: B, color: 'var(--text-muted)', background: BG2 }}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Embla carousel */}
          <div className="overflow-hidden" ref={emblaRef} style={{ cursor: 'grab' }}>
            <div className="flex gap-4" style={{ touchAction: 'pan-y' }}>
              {testimonials.map((t, i) => (
                <div key={i} className="flex-none w-[85vw] sm:w-[340px] min-w-0">
                  <div className="h-full p-7 rounded-xl border flex flex-col gap-5"
                    style={{ background: BG2, borderColor: B }}>
                    <p className="text-sm leading-relaxed flex-grow" style={{ color: 'var(--text-primary)' }}>
                      "{t.quote}"
                    </p>
                    <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: B }}>
                      <div>
                        <div className="text-sm font-bold text-white">{t.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.role}</div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
                        style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>
                        {t.plan}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile nav dots */}
          <div className="flex md:hidden items-center justify-center gap-2 mt-6">
            <button onClick={scrollPrev}
              className="w-10 h-10 rounded-full border flex items-center justify-center"
              style={{ borderColor: B, color: 'var(--text-muted)', background: BG2 }}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={scrollNext}
              className="w-10 h-10 rounded-full border flex items-center justify-center"
              style={{ borderColor: B, color: 'var(--text-muted)', background: BG2 }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-[0.15em] mb-4" style={{ color: '#F97316' }}>Pricing</div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight" style={{ fontFamily: D }}>
              Simple, flat pricing.<br />
              <span style={{ fontStyle: 'italic', fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontSize: '0.82em', letterSpacing: '-0.01em' }}>No surprises.</span>
            </h2>
            {freeTrial?.enabled && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mt-2"
                style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)', color: '#22C55E' }}>
                <Gift size={14} />
                <span className="text-sm font-semibold">
                  Every new account gets a free {freeTrial.days}-day Starter plan — no card required.
                </span>
              </div>
            )}
          </div>
          <PlanCards />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'rgba(14,17,23,0.5)' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-extrabold text-white mb-14 text-center" style={{ fontFamily: D }}>Common Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {[
              { q: 'How do I get started?', a: 'Sign up, upload your bot zip file, and it\'s running. The whole process takes under 5 minutes. New accounts get a 7-day free Starter plan automatically.' },
              { q: 'What runtimes are supported?', a: 'Node.js v18, v20, v22 and Python v3.9–3.11. Bun support is on the roadmap.' },
              { q: 'What counts as a "bot instance"?', a: 'One running process. Most Telegram bots use exactly one instance. Running a dashboard alongside your bot counts as two.' },
              { q: 'Can I upgrade or cancel anytime?', a: 'Yes. Upgrades are instant and prorated. Cancellations take effect at the end of your billing period.' },
            ].map((f, i) => (
              <AccordionItem key={i} value={`f${i}`} className="border rounded-xl px-6" style={{ background: BG2, borderColor: B }}>
                <AccordionTrigger className="text-left font-bold text-white hover:no-underline py-5 text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm pb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="py-16 px-6 border-t" style={{ borderColor: B, background: '#060709' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 mb-14">
          <div>
            <div className="text-xl font-extrabold mb-4" style={{ fontFamily: D }}>
              <span className="text-white">Redon</span><span style={{ color: '#F97316' }}>3</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: 220 }}>
              Panel hosting for developers worldwide. Fast, reliable, affordable.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] mb-5 text-white">Product</h4>
            <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/signup" className="hover:text-white transition-colors">Get Started</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] mb-5 text-white">Legal</h4>
            <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-3" style={{ borderColor: B }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>© {new Date().getFullYear()} Redon3 Panel Hosting. All rights reserved.</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>99.9% Uptime SLA · Powered by Edge Infrastructure</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
