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

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', fontFamily: 'var(--app-font-sans)' }}>
      <MarketingNav />
      <div className="h-16" />

      {/* Header */}
      <div className="relative overflow-hidden py-20 px-6 border-b" style={{ borderColor: 'var(--border)', background: '#060709' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(249,115,22,0.07) 0%, transparent 65%)' }} />
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="max-w-3xl mx-auto relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#F97316' }}>Legal</p>
          <h1 className="font-extrabold leading-tight mb-4"
            style={{ fontFamily: D, fontSize: 'clamp(40px, 5vw, 64px)', color: 'white' }}>
            Privacy
            <span style={{ display: 'block', fontStyle: 'italic', fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontSize: '0.9em' }}>
              Policy.
            </span>
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Last updated: May 2025</p>
        </motion.div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 pb-24">
        <Section n="01" title="Information We Collect">
          We collect your full name, email address, and billing information during registration. We also collect bot activity logs, server metrics, and usage statistics strictly for diagnostics and service delivery. We do not collect more than is necessary.
        </Section>
        <Section n="02" title="How We Use Your Information">
          Your data is used exclusively for account management, payment processing, platform security, crash diagnostics, and improving the Redon3 service. We do not sell, rent, or trade your personal data to any third parties under any circumstances.
        </Section>
        <Section n="03" title="Data Retention">
          Account data is retained for as long as your account remains active. Bot execution logs are retained for 30 rolling days. Billing records are retained for 7 years as required by law. You may request deletion of your account and associated data at any time by contacting support.
        </Section>
        <Section n="04" title="Data Security">
          All data is encrypted in transit using TLS 1.3 and at rest using AES-256. Authentication tokens are stored exclusively in httpOnly, SameSite=Lax cookies to prevent client-side access. Bot environment variables are encrypted at rest using a server-side key.
        </Section>
        <Section n="05" title="Cookies">
          We use cookies only for authentication, session management, CSRF protection, and abuse prevention. No advertising cookies, tracking pixels, or analytics third-party SDKs are loaded on the platform. Marketing pages may load basic analytics.
        </Section>
        <Section n="06" title="Third-Party Services">
          We use Paystack for payment processing. Their privacy policy governs how they handle your billing data — we do not store raw card numbers or CVVs. Our infrastructure runs on dedicated VPS servers without any cloud-based AI processing of your bot data.
        </Section>
        <Section n="07" title="Your Rights">
          You have the right to access, correct, port, or delete your personal data. To exercise any of these rights, contact us at support@redon3.com. We will respond within 10 business days. You also have the right to lodge a complaint with your local data protection authority.
        </Section>
        <Section n="08" title="Changes to This Policy">
          We will notify you of significant changes to this policy by email and via an in-app banner at least 7 days before the changes take effect. Continued use of the platform after the effective date constitutes acceptance.
        </Section>

        <div className="pt-10">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Privacy questions? Contact us at{' '}
            <a href="mailto:support@redon3.com" className="underline" style={{ color: '#F97316' }}>support@redon3.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
