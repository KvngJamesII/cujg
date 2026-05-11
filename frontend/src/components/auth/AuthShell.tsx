import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Zap, Shield, Activity } from 'lucide-react';

export const AuthShell: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen flex items-stretch text-[--text-primary]" style={{ background: 'var(--bg-primary)' }}>
      {/* Left visual panel */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'var(--bg-secondary)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-mesh)' }} />
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer relative z-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white" style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow-orange)' }}>R3</div>
            <span className="font-extrabold text-lg tracking-tight">Redon3</span>
          </div>
        </Link>

        <div className="relative z-10 space-y-7">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4"
              style={{ background: 'rgba(249,115,22,0.10)', color: 'var(--accent-primary)', border: '1px solid rgba(249,115,22,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[--accent-primary] animate-pulse" />
              Trusted by 1,400+ devs
            </div>
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
              Host bots that <span style={{ color: 'var(--accent-primary)' }}>never sleep.</span>
            </h2>
            <p className="text-[--text-secondary] mt-3 text-[15px] max-w-md">
              Deploy Node.js or Python panels in under a minute. We handle uptime, crashes, and the boring parts.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { i: Zap, t: '60-second deploys', d: 'Drag, drop, done.' },
              { i: Activity, t: 'Live monitoring', d: 'CPU, RAM, logs in real time.' },
              { i: Shield, t: 'Auto-restart on crash', d: 'You sleep, we restart.' },
            ].map((f, idx) => (
              <motion.div key={f.t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * idx }}
                className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.20)' }}>
                  <f.i size={16} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div>
                  <div className="font-bold text-sm">{f.t}</div>
                  <div className="text-xs text-[--text-muted]">{f.d}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-[--text-muted]">© Redon3 · Built for builders</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="w-full max-w-md">
          <Link href="/">
            <div className="lg:hidden flex items-center gap-2 cursor-pointer mb-8">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white" style={{ background: 'var(--accent-gradient)' }}>R3</div>
              <span className="font-extrabold text-lg">Redon3</span>
            </div>
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="text-[--text-secondary] mt-2 text-sm">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </motion.div>
      </div>
    </div>
  );
};
