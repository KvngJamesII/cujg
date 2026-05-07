import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/ui/Logo";
import { ChevronLeft, Check, Tag, Lock, ShieldCheck } from "lucide-react";
import api from "@/lib/api";

const B   = "rgba(255,255,255,0.08)";
const S   = "rgba(255,255,255,0.04)";
const DIM = "rgba(255,255,255,0.5)";
const MUT = "rgba(255,255,255,0.25)";
const BL  = "#3b82f6";
const GR  = "#22c55e";

function fmtN(kobo: number): string {
  return "₦" + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 });
}

const CheckoutPage: React.FC = () => {
  const [search] = useLocation();
  const params = new URLSearchParams(typeof search === "string" ? search.split("?")[1] ?? "" : "");
  const planName = params.get("plan") ?? "Basic";
  const planPrice = parseInt(params.get("price") ?? "1400", 10);

  const [coupon, setCoupon] = useState("");
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discountPct: number; msg: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const { success: ok, error: err } = useToast();

  const basePrice = planPrice * 100; // Convert to kobo
  let finalPrice = basePrice;

  // Coupon on top
  let couponSaving = 0;
  if (couponResult?.valid) {
    couponSaving = Math.floor(finalPrice * couponResult.discountPct / 100);
    finalPrice = Math.max(0, finalPrice - couponSaving);
  }

  const isFree = finalPrice === 0;

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setApplying(true);
    try {
      const r = await api.post("/billing/coupon/validate", { code: coupon.toUpperCase(), planId: planName });
      const d = r.data as { valid: boolean; discountPercent: number; error: string | null };
      if (d.valid) setCouponResult({ valid: true, discountPct: d.discountPercent, msg: `${d.discountPercent}% off applied!` });
      else setCouponResult({ valid: false, discountPct: 0, msg: d.error ?? "Invalid code" });
    } catch { setCouponResult({ valid: false, discountPct: 0, msg: "Could not validate coupon" }); }
    setApplying(false);
  };

  const checkout = useMutation({
    mutationFn: async () => {
      const r = await api.post("/billing/checkout", {
        planId: planName,
        couponCode: couponResult?.valid ? coupon : undefined,
        callbackUrl: window.location.origin + "/dashboard",
      });
      return r.data as { checkoutUrl: string | null; free: boolean; message: string };
    },
    onSuccess: (d) => {
      if (d.free) { ok("Activated!", d.message); setTimeout(() => window.location.href = "/dashboard", 1200); }
      else if (d.checkoutUrl) window.location.href = d.checkoutUrl;
      else err("Error", d.message ?? "Payment not configured");
    },
    onError: () => err("Failed", "Please try again"),
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Nav */}
      <nav className="h-16 border-b flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 backdrop-blur-md"
        style={{ borderColor: B, background: "rgba(8,9,13,0.8)" }}>
        <Logo />
        <Link href="/pricing">
          <button className="flex items-center gap-1.5 text-xs font-bold" style={{ color: DIM }}>
            <ChevronLeft size={14} /> Back
          </button>
        </Link>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-black text-white">Checkout</h1>
          <p className="text-sm mt-0.5" style={{ color: DIM }}>One panel, one subscription. Renews monthly.</p>
        </div>

        {/* Order summary */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${B}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: B, background: S }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: MUT }}>Order Summary</p>
          </div>

          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-base font-black text-white">{planName.charAt(0).toUpperCase() + planName.slice(1)} Panel</p>
                <p className="text-xs mt-1" style={{ color: MUT }}>Monthly subscription · renews on same date</p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-2xl font-black text-white">{fmtN(basePrice)}</p>
                <p className="text-xs" style={{ color: MUT }}>/mo</p>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="border-t pt-4 flex flex-col gap-2" style={{ borderColor: B }}>
              {couponSaving > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: DIM }}>Coupon ({couponResult?.discountPct}%)</span>
                  <span style={{ color: GR }}>−{fmtN(couponSaving)}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-bold text-white">Total</span>
                <span className="text-xl font-black" style={{ color: BL }}>{fmtN(finalPrice)}<span className="text-xs font-normal" style={{ color: MUT }}>/mo</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Coupon */}
        <div className="rounded-xl p-4" style={{ background: S, border: `1px solid ${B}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Tag size={13} style={{ color: MUT }} />
            <p className="text-xs font-bold text-white">Promo Code</p>
          </div>
          <div className="flex gap-2">
            <input value={coupon} onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponResult(null); }}
              onKeyDown={e => e.key === "Enter" && applyCoupon()}
              placeholder="ENTER CODE"
              className="flex-1 h-9 px-3 rounded-lg text-xs font-mono font-bold text-white uppercase outline-none"
              style={{ background: "var(--bg-primary)", border: `1px solid ${couponResult?.valid ? "rgba(34,197,94,0.3)" : B}` }} />
            <button onClick={applyCoupon} disabled={!coupon.trim() || applying}
              className="h-9 px-4 rounded-lg text-xs font-bold text-white shrink-0 disabled:opacity-40"
              style={{ background: BL }}>
              {applying ? "…" : "Apply"}
            </button>
          </div>
          {couponResult && (
            <p className="text-xs mt-1.5" style={{ color: couponResult.valid ? GR : "#ef4444" }}>{couponResult.msg}</p>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <button onClick={() => checkout.mutate()} disabled={checkout.isPending}
            className="w-full h-12 rounded-xl font-black text-base text-white disabled:opacity-50"
            style={{ background: isFree ? GR : BL, boxShadow: `0 0 24px ${isFree ? "rgba(34,197,94,0.2)" : "rgba(59,130,246,0.25)"}` }}>
            {checkout.isPending ? "Processing…" : isFree ? "Claim Free Bot" : `Pay ${fmtN(finalPrice)}`}
          </button>
          <div className="flex items-center justify-center gap-2 text-[10px]" style={{ color: MUT }}>
            <ShieldCheck size={12} />
            <span>Secured by Paystack · 256-bit SSL</span>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.1)" }}>
          <Lock size={14} className="mt-0.5 shrink-0" style={{ color: BL }} />
          <p className="text-xs" style={{ color: DIM }}>
            Payments processed securely via <strong className="text-white">Paystack</strong>. Redon3 never stores your card details. Your panel is activated immediately after payment confirmation.
          </p>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPage;
