import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Check, Lock, ArrowRight, Loader2, Shield, Tag } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Plan { id: string; name: string; priceKobo: number; botLimit: number; ramPerBotMb: number; cpuPerBot: number }

export default function CheckoutPage() {
  const { user, refreshUser } = useAuth();
  const [, setLoc] = useLocation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('plan') ?? 'developer';
    api.get('/billing/plans').then((r) => {
      const list = r.data as Plan[];
      setPlans(list);
      setSelectedId(planId);
    });
    if (!user) setLoc('/login');
  }, [user, setLoc]);

  const selected = plans.find((p) => p.id === selectedId);
  const total = selected ? Math.max(0, selected.priceKobo - Math.round(selected.priceKobo * discount / 100)) : 0;

  const applyCoupon = async () => {
    if (!coupon) return;
    setCouponLoading(true);
    try { const r = await api.post('/billing/coupon/validate', { code: coupon }); setDiscount((r.data as { discount: number }).discount); toast.success(`${(r.data as { discount: number }).discount}% off applied`); }
    catch { toast.error('Invalid coupon'); setDiscount(0); }
    finally { setCouponLoading(false); }
  };

  const checkout = async () => {
    setLoading(true);
    try {
      await api.post('/billing/checkout', { planId: selectedId, couponCode: coupon || null, callbackUrl: '/dashboard' });
      await refreshUser();
      toast.success('Plan activated');
      setLoc('/dashboard');
    } catch { toast.error('Checkout failed'); }
    finally { setLoading(false); }
  };

  if (!selected) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen text-[--text-primary] p-4 md:p-10" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => setLoc('/pricing')} className="text-xs text-[--text-muted] hover:text-white mb-6">← Back to pricing</button>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Complete your purchase</h1>
        <p className="text-[--text-secondary] mt-2 text-sm">You're seconds away from never thinking about uptime again.</p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr,420px] gap-6 mt-8">
          {/* Plan picker */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[--text-muted]">Choose your plan</h2>
            {plans.map((p) => (
              <motion.button whileTap={{ scale: 0.99 }} key={p.id} onClick={() => setSelectedId(p.id)}
                className="w-full text-left p-5 rounded-xl border transition-all"
                style={{
                  background: selectedId === p.id ? 'rgba(249,115,22,0.06)' : 'var(--bg-secondary)',
                  borderColor: selectedId === p.id ? 'var(--accent-primary)' : 'var(--border)',
                }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-lg">{p.name}</div>
                    <div className="text-xs text-[--text-muted] mt-1">{p.botLimit} panel{p.botLimit > 1 ? 's' : ''} · {p.ramPerBotMb >= 1024 ? p.ramPerBotMb / 1024 + ' GB' : p.ramPerBotMb + ' MB'} RAM · {p.cpuPerBot} vCPU</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold" style={{ color: selectedId === p.id ? 'var(--accent-primary)' : 'white' }}>₦{(p.priceKobo / 100).toLocaleString()}</div>
                    <div className="text-[11px] text-[--text-muted]">/month</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 ml-3 flex items-center justify-center ${selectedId === p.id ? 'border-[--accent-primary]' : 'border-[--border-strong]'}`}>
                    {selectedId === p.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent-primary)' }} />}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[--text-muted] mb-4">Order summary</h3>
              <div className="flex justify-between text-sm mb-2">
                <span>{selected.name} plan</span>
                <span>₦{(selected.priceKobo / 100).toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--success)' }}>
                  <span>Coupon ({discount}% off)</span>
                  <span>−₦{Math.round(selected.priceKobo * discount / 100 / 100).toLocaleString()}</span>
                </div>
              )}
              <div className="border-t my-3" style={{ borderColor: 'var(--border)' }} />
              <div className="flex justify-between text-base font-extrabold mb-4">
                <span>Total</span>
                <span style={{ color: 'var(--accent-primary)' }}>₦{(total / 100).toLocaleString()}</span>
              </div>

              {/* Coupon */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 flex items-center rounded-lg border px-3" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
                  <Tag size={13} className="text-[--text-muted]" />
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code"
                    className="bg-transparent w-full text-sm px-2 py-2.5 outline-none placeholder:text-[--text-muted]" />
                </div>
                <button onClick={applyCoupon} disabled={!coupon || couponLoading}
                  className="px-4 rounded-lg text-xs font-bold border hover:bg-white/5"
                  style={{ borderColor: 'var(--border)' }}>
                  {couponLoading ? <Loader2 className="animate-spin" size={13} /> : 'Apply'}
                </button>
              </div>

              <button onClick={checkout} disabled={loading}
                className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow-orange)' }}>
                {loading ? <Loader2 className="animate-spin" size={16} /> : <>Pay ₦{(total / 100).toLocaleString()} <ArrowRight size={15} /></>}
              </button>
              <p className="text-[10px] text-[--text-muted] text-center mt-3 leading-relaxed">
                Demo mode — no real charge. Press pay and you're on the plan.
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <Shield size={18} style={{ color: 'var(--success)' }} />
              <div className="text-xs text-[--text-secondary]">
                <strong className="text-white">7-day money back.</strong> Cancel anytime in two clicks.
              </div>
            </div>

            <ul className="space-y-2 text-xs text-[--text-muted]">
              {['Instant activation', 'No setup fee', 'Cancel anytime'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check size={12} style={{ color: 'var(--success)' }} />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
