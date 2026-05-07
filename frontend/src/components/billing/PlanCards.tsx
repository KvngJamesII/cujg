import React from 'react';
import { Check, Lock, ArrowRight, Zap, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

const D = 'var(--app-font-display)';
const B = 'var(--border)';
const BG2 = 'var(--bg-secondary)';
const BG3 = 'var(--bg-tertiary)';

type Plan = {
  id: string;
  label: string;
  name: string;
  price: string;
  perDay: string;
  perDayNote: string;
  bots: string;
  description: string;
  features: string[];
  lockedFeatures?: string[];
  lockUpgradeLabel?: string;
  socialProof?: string;
  savingsNote?: string;
  cta: string;
  ctaSub: string;
  popular: boolean;
};

const plans: Plan[] = [
  {
    id: 'starter',
    label: 'For solo projects',
    name: 'Starter',
    price: '₦1,999',
    perDay: '₦67/day',
    perDayNote: '',
    bots: '1 panel instance',
    description: 'One panel that never sleeps. Great for your first project.',
    features: [
      '1 Panel Instance',
      '256MB RAM',
      '0.2 vCPU',
      'Web terminal access',
      'File manager',
      '99.9% uptime SLA',
    ],
    lockedFeatures: [
      'Telegram & Email crash alerts',
      'Auto-restart on crash',
      'Priority support',
    ],
    lockUpgradeLabel: 'Unlock all 3 on Developer',
    cta: 'Start with Starter',
    ctaSub: 'Cancel anytime',
    popular: false,
  },
  {
    id: 'developer',
    label: 'For serious developers',
    name: 'Developer',
    price: '₦4,999',
    perDay: '₦167/day',
    perDayNote: 'Less than a cup of coffee',
    bots: '3 bot instances',
    description: 'Three bots, everything unlocked. The plan most devs land on.',
    features: [
      '3 Bot Instances',
      '1GB RAM (shared)',
      '1.0 vCPU',
      'Web terminal access',
      'Telegram & Email alerts',
      'Auto-restart on crash',
      'Priority support',
      'Activity logs & analytics',
    ],
    socialProof: 'Chosen by most Redon3 developers',
    savingsNote: undefined,
    cta: 'Get Developer',
    ctaSub: 'Best value per panel',
    popular: true,
  },
  {
    id: 'pro',
    label: 'For teams & power users',
    name: 'Pro',
    price: '₦8,999',
    perDay: '₦300/day',
    perDayNote: '',
    bots: '8 bot instances',
    description: 'Run your whole operation. Eight bots, dedicated support, full analytics.',
    features: [
      '8 Bot Instances',
      '4GB RAM (shared)',
      '2.0 vCPU',
      'Everything in Developer',
      'Advanced analytics',
      'Dedicated support 24/7',
      'Priority queue',
    ],
    cta: 'Go Pro',
    ctaSub: 'Full team onboarding',
    popular: false,
  },
];

export const PlanCards: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto items-start">
    {plans.map((plan) => (
      <div
        key={plan.id}
        className="relative flex flex-col rounded-2xl border transition-all duration-200"
        style={{
          background: plan.popular
            ? 'linear-gradient(160deg, #16100a 0%, #0e1117 100%)'
            : BG2,
          borderColor: plan.popular ? 'rgba(249,115,22,0.5)' : B,
          boxShadow: plan.popular
            ? '0 0 60px rgba(249,115,22,0.14), 0 0 0 1px rgba(249,115,22,0.08)'
            : 'none',
          marginTop: plan.popular ? 0 : 16,
        }}
      >
        {/* Most Popular badge */}
        {plan.popular && (
          <div
            className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-white whitespace-nowrap"
            style={{ background: '#F97316', boxShadow: '0 0 20px rgba(249,115,22,0.5)' }}>
            <Zap size={10} fill="currentColor" />
            Most Popular
          </div>
        )}

        {/* Header */}
        <div className="p-7 pb-5 border-b" style={{ borderColor: plan.popular ? 'rgba(249,115,22,0.18)' : B }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4"
            style={{ color: plan.popular ? '#F97316' : 'var(--text-muted)' }}>
            {plan.label}
          </div>

          <h3 className="text-2xl font-extrabold text-white mb-1" style={{ fontFamily: D }}>{plan.name}</h3>
          <p className="text-xs font-medium mb-5" style={{ color: 'var(--text-muted)' }}>{plan.bots}</p>

          {/* Price block */}
          <div className="mb-2">
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-[48px] font-extrabold leading-none tracking-tight"
                style={{ fontFamily: D, color: plan.popular ? '#F97316' : 'white' }}>
                {plan.price}
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>/mo</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-bold" style={{ color: plan.popular ? 'rgba(249,115,22,0.8)' : 'var(--text-muted)' }}>
                {plan.perDay}
              </span>
              {plan.perDayNote && (
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>· {plan.perDayNote}</span>
              )}
            </div>
          </div>

          {/* Savings badge */}
          {plan.savingsNote && (
            <div className="flex items-center gap-1.5 mt-3 mb-1">
              <TrendingUp size={12} style={{ color: '#22C55E' }} />
              <span className="text-[11px] font-semibold" style={{ color: '#22C55E' }}>{plan.savingsNote}</span>
            </div>
          )}

          {/* Social proof */}
          {plan.socialProof && (
            <div className="flex items-center gap-1.5 mt-2">
              <Users size={11} style={{ color: 'var(--text-muted)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{plan.socialProof}</span>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="p-7 flex-grow">
          <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>

          <ul className="space-y-3">
            {plan.features.map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-sm">
                <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                  style={{ background: plan.popular ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.06)' }}>
                  <Check size={10} style={{ color: plan.popular ? '#F97316' : 'var(--text-muted)' }} />
                </span>
                <span style={{ color: plan.popular ? '#E2D5C8' : 'var(--text-secondary)' }}>{feat}</span>
              </li>
            ))}
          </ul>

          {/* Locked features — creates loss aversion on Starter */}
          {plan.lockedFeatures && plan.lockedFeatures.length > 0 && (
            <div className="mt-5 pt-4 border-t" style={{ borderColor: B }}>
              <ul className="space-y-3">
                {plan.lockedFeatures.map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-sm opacity-40">
                    <span className="flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <Lock size={9} style={{ color: 'var(--text-muted)' }} />
                    </span>
                    <span className="line-through" style={{ color: 'var(--text-muted)' }}>{feat}</span>
                  </li>
                ))}
              </ul>
              {plan.lockUpgradeLabel && (
                <p className="text-[11px] font-bold mt-3" style={{ color: '#F97316' }}>
                  ↑ {plan.lockUpgradeLabel}
                </p>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="p-7 pt-0">
          <Link href={`/checkout?plan=${plan.id}`}>
            <Button
              className="w-full h-12 font-bold text-sm flex items-center justify-center gap-2"
              style={plan.popular
                ? { background: '#F97316', color: 'white', boxShadow: '0 4px 24px rgba(249,115,22,0.35)' }
                : { background: BG3, color: 'var(--text-primary)', border: `1px solid ${B}` }
              }>
              {plan.cta}
              {plan.popular && <ArrowRight size={14} />}
            </Button>
          </Link>
          <p className="text-center text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
            {plan.ctaSub}
          </p>
        </div>
      </div>
    ))}
  </div>
);
