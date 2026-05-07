import React from 'react';
import { MarketingNav } from '@/components/layout/MarketingNav';
import { motion } from 'framer-motion';

const D = 'var(--app-font-display)';

const Section: React.FC<{ n: string; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <div className="py-8 border-b" style={{ borderColor: 'var(--border)' }}>
    <div className="flex items-start gap-5">
      <span className="text-xs font-black uppercase tracking-[0.2em] pt-1 shrink-0 w-6"
        style={{ color: '#F97316' }}>{n}</span>
      <div className="flex-1">
        <h2 className="text-lg font-extrabold text-white mb-3" style={{ fontFamily: D }}>{title}</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>{children}</p>
      </div>
    </div>
  </div>
);

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', fontFamily: 'var(--app-font-sans)' }}>
      <MarketingNav />
      <div className="h-16" />

      {/* Header */}
      <div className="relative overflow-hidden py-20 px-6 border-b" style={{ borderColor: 'var(--border)', background: '#060709' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(249,115,22,0.07) 0%, transparent 65%)' }} />
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="max-w-3xl mx-auto relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#F97316' }}>Legal</p>
          <h1 className="font-extrabold leading-tight mb-4"
            style={{ fontFamily: D, fontSize: 'clamp(40px, 5vw, 64px)', color: 'white' }}>
            Terms of
            <span style={{ display: 'block', fontStyle: 'italic', fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontSize: '0.9em' }}>
              Service.
            </span>
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Last updated: May 2025</p>
        </motion.div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 pb-24">
        <Section n="01" title="Acceptance of Terms">
          By accessing or using Redon3, you agree to be bound by these Terms of Service. If you do not agree, please discontinue use immediately. Continued use of the platform constitutes acceptance of any updates to these terms.
        </Section>
        <Section n="02" title="Prohibited Content">
          You may not host panels that perform malicious activities including but not limited to: DDoS attacks, phishing, spamming, credential harvesting, or distributing malware. Violations result in immediate account termination without refund and may be reported to relevant authorities.
        </Section>
        <Section n="03" title="Resource Usage">
          While we offer shared infrastructure, excessive resource usage that negatively impacts other customers may result in temporary throttling, suspension, or a request to upgrade your plan. We monitor resource consumption continuously and enforce fair-use policies.
        </Section>
        <Section n="04" title="Payments & Billing">
          All payments are processed in Nigerian Naira (₦) via Paystack. Subscriptions renew automatically on your billing date unless cancelled at least 24 hours before renewal. You are responsible for keeping your payment method current.
        </Section>
        <Section n="05" title="Refunds">
          Due to the nature of hosting services, refunds are not issued once a billing cycle has begun. If you experience a documented service outage exceeding 99.9% SLA, contact support within 72 hours for a credit review.
        </Section>
        <Section n="06" title="Termination">
          We reserve the right to terminate service for any user who violates these terms, without prior notice. Upon termination, your data will be deleted within 30 days. You may also terminate your account at any time from the settings panel.
        </Section>
        <Section n="07" title="Limitation of Liability">
          Redon3 is not liable for any indirect, incidental, special, or consequential damages resulting from use or inability to use the service. Our maximum liability to you for any claim shall not exceed the amount you paid us in the 30 days preceding the claim.
        </Section>
        <Section n="08" title="Changes to Terms">
          We may update these terms periodically. Significant changes will be communicated via email or an in-app notification. Your continued use after the effective date constitutes acceptance.
        </Section>

        <div className="pt-10">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Questions? Contact us at{' '}
            <a href="mailto:support@redon3.com" className="underline" style={{ color: '#F97316' }}>support@redon3.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
