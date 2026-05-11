import React, { useState, useEffect } from 'react';
import { MarketingNav } from '@/components/layout/MarketingNav';
import { motion } from 'framer-motion';
import { Check, Lock, Zap, TrendingUp, Users, Sparkles, Shield, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';

const plans = [
  {
    id: 'starter', name: 'Starter', tagline: 'For your first bot',
    price: 1999, perDay: 67, bots: 1, ram: '256 MB',
    blurb: 'One panel that never sleeps. Perfect first step.',
    features: ['1 panel instance', '256 MB RAM', '0.2 vCPU', 'Web terminal', 'File manager', '99.9% uptime SLA'],
    locked: ['Telegram crash alerts', 'Auto-restart on crash', 'Priority support'],
    popular: false,
  },
  {
    id: 'developer', name: 'Developer', tagline: 'Where 70% of devs land',
    price: 4999, perDay: 167, bots: 3, ram: '1 GB',
    blurb: 'Three panels, every feature unlocked. The sweet spot.',
    features: ['3 panels', '1 GB RAM (shared)', '1.0 vCPU', 'Web terminal', 'Telegram + Email alerts', 'Auto-restart on crash', 'Priority support', 'Activity analytics'],
    locked: [],
    popular: true,
  },
  {
    id: 'pro', name: 'Pro', tagline: 'Teams & power users',
    price: 8999, perDay: 300, bots: 8, ram: '4 GB',
    blurb: 'Run your whole operation. Dedicated support.',
    features: ['8 panels', '4 GB RAM (shared)', '2.0 vCPU', 'Everything in Developer', 'Advanced analytics', '24/7 dedicated support', 'Priority deploy queue'],
    locked: [],
    popular: false,
  },
];

const faq = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel in 2 clicks. No questions, no fees.' },
  { q: 'What happens if my bot crashes?', a: 'On Developer and Pro, we auto-restart in seconds and ping your Telegram. Starter requires manual restart.' },
  { q: 'Can I upgrade later?', a: 'Yes. Switch plans anytime; we prorate the difference.' },
  { q: 'Is there a free trial?', a: '7-day free trial on all plans. No card required.' },
];

const trust = [
  { i: ShieldCheck, t: '7-day money back' },
  { i: Clock, t: '99.9% uptime SLA' },
  { i: Users, t: '1,400+ active devs' },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [seats, setSeats] = useState(847);
  useEffect(() => {
    const t = setInterval(() => setSeats((s) => Math.max(50, s - Math.floor(Math.random() * 2))), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen text-[--text-primary]" style={{ background: 'var(--bg-primary)', fontFamily: 'var(--app-font-sans)' }}>
      <MarketingNav />
      <div className="h-16" />

      {/* Header */}
      <section className="relative pt-12 pb-8 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-mesh)' }} />
        <div className="relative max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-5"
            style={{ background: 'rgba(249,115,22,0.10)', color: 'var(--accent-primary)', border: '1px solid rgba(249,115,22,0.25)' }}>
            <Sparkles size={11} /> Limited launch pricing
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Simple pricing. <span style={{ background: 'linear-gradient(135deg,#F97316,#FB923C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Serious uptime.</span>
          </h1>
          <p className="mt-4 text-[--text-secondary] text-base md:text-lg">No setup fees. No hidden costs. Cancel anytime.</p>

          {/* Annual toggle (psychological — anchors 2 months free) */}
          <div className="mt-6 inline-flex items-center gap-3 p-1 rounded-full border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
            <button onClick={() => setAnnual(false)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${!annual ? 'text-white' : 'text-[--text-muted]'}`}
              style={!annual ? { background: 'var(--accent-gradient)' } : {}}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${annual ? 'text-white' : 'text-[--text-muted]'}`}
              style={annual ? { background: 'var(--accent-gradient)' } : {}}>
              Annual
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}>−17%</span>
            </button>
          </div>

          {/* Scarcity / social */}
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }}
            className="mt-5 inline-flex items-center gap-2 text-xs text-[--text-muted]">
            <span className="w-1.5 h-1.5 rounded-full bg-[--success] animate-pulse" />
            <span><span className="text-white font-bold">{seats}</span> launch slots left at this price</span>
          </motion.div>
        </div>
      </section>

      {/* Cards */}
      <section className="px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto items-start">
          {plans.map((p, i) => (
            <motion.div key={p.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="relative flex flex-col rounded-2xl border"
              style={{
                background: p.popular ? 'linear-gradient(160deg, #1a1208 0%, #0e1117 100%)' : 'var(--bg-secondary)',
                borderColor: p.popular ? 'rgba(249,115,22,0.5)' : 'var(--border)',
                boxShadow: p.popular ? '0 0 60px rgba(249,115,22,0.14)' : 'none',
                marginTop: p.popular ? 0 : 16,
              }}>
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white whitespace-nowrap"
                  style={{ background: 'var(--accent-gradient)', boxShadow: '0 0 20px rgba(249,115,22,0.5)' }}>
                  <Zap size={9} fill="currentColor" /> Most popular
                </div>
              )}

              <div className="p-6 pb-4 border-b" style={{ borderColor: p.popular ? 'rgba(249,115,22,0.18)' : 'var(--border)' }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: p.popular ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{p.tagline}</div>
                <h3 className="text-2xl font-extrabold mb-0.5">{p.name}</h3>
                <p className="text-xs text-[--text-muted] mb-5">{p.bots} panel{p.bots !== 1 ? 's' : ''} · {p.ram} RAM</p>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-[44px] font-extrabold leading-none tracking-tight" style={{ color: p.popular ? 'var(--accent-primary)' : 'white' }}>
                    ₦{annual ? Math.round(p.price * 10).toLocaleString() : p.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-[--text-muted] font-medium">/{annual ? 'yr' : 'mo'}</span>
                </div>
                <div className="text-[11px] text-[--text-muted] mt-1.5">
                  {annual ? `${(p.price * 12 - p.price * 10).toLocaleString()} saved · 2 months free` : `Just ₦${p.perDay}/day`}
                </div>
                {p.popular && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--success)' }}>
                    <Users size={11} /> Chosen by 7/10 devs
                  </div>
                )}
              </div>

              <div className="p-6 flex-grow">
                <p className="text-sm text-[--text-secondary] mb-4 leading-relaxed">{p.blurb}</p>
                <ul className="space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: p.popular ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.06)' }}>
                        <Check size={10} style={{ color: p.popular ? 'var(--accent-primary)' : 'var(--text-secondary)' }} />
                      </span>
                      <span className="text-[--text-secondary]">{f}</span>
                    </li>
                  ))}
                </ul>
                {p.locked.length > 0 && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <ul className="space-y-2.5 opacity-50">
                      {p.locked.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center"><Lock size={9} className="text-[--text-muted]" /></span>
                          <span className="line-through text-[--text-muted]">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] font-bold mt-3" style={{ color: 'var(--accent-primary)' }}>↑ Unlock on Developer</p>
                  </div>
                )}
              </div>

              <div className="p-6 pt-0">
                <Link href={`/checkout?plan=${p.id}`}>
                  <button className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98]"
                    style={p.popular ? { background: 'var(--accent-gradient)', color: 'white', boxShadow: 'var(--shadow-glow-orange)' } : { background: 'var(--bg-tertiary)', color: 'white', border: '1px solid var(--border)' }}>
                    Start free trial <ArrowRight size={14} />
                  </button>
                </Link>
                <p className="text-center text-[11px] mt-2 text-[--text-muted]">7-day free · cancel anytime</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust row */}
      <section className="px-4 pb-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {trust.map((t) => (
            <div key={t.t} className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.10)' }}>
                <t.i size={18} style={{ color: 'var(--cyan)' }} />
              </div>
              <span className="text-sm font-semibold">{t.t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-8">Questions everyone asks</h2>
          <div className="space-y-3">
            {faq.map((f) => (
              <details key={f.q} className="group p-5 rounded-xl border cursor-pointer" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <summary className="flex items-center justify-between font-semibold text-sm list-none">
                  {f.q}
                  <span className="text-[--accent-primary] group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm text-[--text-secondary] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final push */}
      <section className="px-4 pb-20">
        <div className="max-w-3xl mx-auto rounded-2xl p-8 md:p-12 text-center border" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(167,139,250,0.05))', borderColor: 'rgba(249,115,22,0.25)' }}>
          <Shield size={32} style={{ color: 'var(--accent-primary)' }} className="mx-auto mb-4" />
          <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">Still on the fence?</h3>
          <p className="text-[--text-secondary] mt-3 max-w-lg mx-auto">Try free for 7 days. If you don't see why everyone's switching, we refund every kobo.</p>
          <Link href="/signup">
            <button className="mt-6 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white text-sm" style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow-orange)' }}>
              Start free trial <ArrowRight size={15} />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
