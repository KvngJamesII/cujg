import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Check, AlertCircle, Tag, History, ArrowRight, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";

const B = "rgba(255,255,255,0.07)";
const S = "rgba(255,255,255,0.04)";
const DIM = "rgba(255,255,255,0.45)";
const MUT = "rgba(255,255,255,0.25)";
const OG = "#F97316";

interface Plan { id:string; name:string; priceKobo:number; botLimit:number; ramPerBotMb:number; storageGb:number; features:Record<string,any>; }
interface Sub { planId:string; planName:string; status:string; expiryDate:string|null; startDate:string; priceKobo:number; botLimit:number; ramPerBotMb:number; }
interface Payment { id:string; reference:string; amountKobo:number; status:string; planName:string; paidAt:string|null; createdAt:string; }

function fmtN(k:number){ return "₦"+(k/100).toLocaleString("en-NG"); }
function fmtD(s:string|null){ if(!s) return "—"; return new Date(s).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
function dLeft(s:string|null){ if(!s) return null; return Math.max(0,Math.ceil((new Date(s).getTime()-Date.now())/86400000)); }

const FEATS: Record<string,string[]> = {
  starter:  ["1 Panel","512MB RAM","3GB Storage","Live Logs","Auto Restart"],
  developer:["3 Panels","768MB RAM","10GB Storage","Terminal","Priority Queue"],
  pro:      ["8 Panels","1GB RAM","25GB Storage","Analytics","Multi-Env Profiles"],
};

const BillingPage: React.FC = () => {
  const { error:toastErr } = useToast();
  const [coupon, setCoupon] = useState("");
  const [msg, setMsg] = useState<{t:"ok"|"err";s:string}|null>(null);

  const { data: sub, isLoading: subLoad } = useQuery<Sub>({
    queryKey:["subscription"],
    queryFn: async () => { const r=await api.get("/billing/subscription"); return r.data; },
    retry: false,
  });

  const { data: rawPlans } = useQuery<Plan[] | Record<string, Plan[]>>({
    queryKey:["plans"],
    queryFn: async () => { const r=await api.get("/billing/plans"); return r.data; },
  });
  const plans = Array.isArray(rawPlans) ? rawPlans : Array.isArray((rawPlans as any)?.plans) ? (rawPlans as any).plans : [];

  const { data: paymentsData } = useQuery<{payments:Payment[];total:number}>({
    queryKey:["payments"],
    queryFn: async () => { const r=await api.get("/billing/payments?limit=20"); return r.data; },
  });

  const applyCoupon = useMutation({
    mutationFn: async () => { const r=await api.post("/billing/coupon/validate",{code:coupon,planId:sub?.planId??"starter"}); return r.data; },
    onSuccess: (d:any) => setMsg({t:"ok",s:`Valid! ${d.discountPercent??0}% off your next payment.`}),
    onError: () => setMsg({t:"err",s:"Invalid or expired code."}),
  });

  const upgrade = useMutation({
    mutationFn: async (planId:string) => { const r=await api.post("/billing/checkout",{planId,callbackUrl:window.location.origin+"/billing"}); return r.data; },
    onSuccess: (d:any) => { if(d.authorizationUrl) window.location.href=d.authorizationUrl; },
    onError: () => toastErr("Failed","Please try again."),
  });

  const days = dLeft(sub?.expiryDate??null);
  const paidPlans = plans.filter((p: any)=>p.id!=="free_trial" && ["basic", "pro"].includes(p.id));
  const payments = paymentsData?.payments ?? [];

  return (
    <DashboardLayout>
      {/* header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-white">Billing</h1>
      </div>

      {/* expiry nudge */}
      {days!=null && days<=7 && (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg mb-4 text-xs" style={{ background:"rgba(249,115,22,0.07)",border:"1px solid rgba(249,115,22,0.18)" }}>
          <span style={{ color:"rgba(255,255,255,0.7)" }}>Plan expires in <span style={{ color:OG,fontWeight:700 }}>{days===0?"today":`${days}d`}</span></span>
          <span style={{ color:OG,fontWeight:600 }}>Renew below ↓</span>
        </div>
      )}

      {/* current plan */}
      <div className="rounded-xl p-4 mb-5" style={{ background:S,border:`1px solid ${B}` }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:MUT }}>Current Plan</p>
        {subLoad ? (
          <div className="h-10 animate-pulse rounded-lg" style={{ background:"rgba(255,255,255,0.06)" }} />
        ) : sub ? (
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-black text-white">{sub.planName}</span>
                <span className="text-[13px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={sub.status==="active"?{background:"rgba(16,185,129,0.12)",color:"#10B981",border:"1px solid rgba(16,185,129,0.2)"}:{background:"rgba(239,68,68,0.1)",color:"#EF4444",border:"1px solid rgba(239,68,68,0.2)"}}>{sub.status}</span>
              </div>
              <p className="text-2xl font-black text-white">{fmtN(sub.priceKobo)}<span className="text-xs font-normal ml-1" style={{ color:DIM }}>/mo</span></p>
              <p className="text-[13px] mt-1" style={{ color:DIM }}>{sub.botLimit} bot{sub.botLimit!==1?"s":""} · {sub.ramPerBotMb}MB RAM · Expires {fmtD(sub.expiryDate)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Zap size={16} style={{ color:OG }} />
            <span className="text-sm font-semibold text-white">No active plan — choose one below.</span>
          </div>
        )}
      </div>

      {/* plans */}
      {paidPlans.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:MUT }}>Available Plans</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paidPlans.map((plan: any) => {
              const isCurrent = sub?.planId===plan.id;
              const isPopular = plan.id === "pro";
              const feats = [
                `${plan.ramPerBotMb >= 1024 ? plan.ramPerBotMb / 1024 + 'GB' : plan.ramPerBotMb + 'MB'} RAM`,
                `${plan.storageGb}GB Storage`,
                `${plan.cpuPerBot} vCPU`,
                `${plan.botLimit} Active Process${plan.botLimit !== 1 ? 'es' : ''}`
              ];
              return (
                <div key={plan.id} className="relative flex flex-col rounded-xl p-5 transition-colors" style={{ background:S, border:`1px solid ${isCurrent?"rgba(249,115,22,0.35)":isPopular?"rgba(249,115,22,0.18)":B}` }}>
                  {isCurrent && <span className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color:OG }}>● Current Plan</span>}
                  {!isCurrent && isPopular && <span className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color:OG }}>★ Most Popular</span>}
                  <p className="text-base font-black text-white mb-1">{plan.name}</p>
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: DIM, minHeight: '34px' }}>
                    {plan.id === 'basic' ? 'Perfect for lightweight panels and scripts with low resource demands.' : 'Built for resource-intensive panels, scrapers, and high-performance scripts.'}
                  </p>
                  <p className="text-2xl font-black text-white mb-1">{fmtN(plan.priceKobo)}<span className="text-xs font-normal ml-1" style={{ color:DIM }}>/mo</span></p>
                  <p className="text-[11px] mb-4" style={{ color:MUT }}>{fmtN(Math.round(plan.priceKobo/30))}<span style={{ color:MUT }}>/day</span></p>
                  <ul className="flex flex-col gap-2 mb-5 flex-1">
                    {feats.map((f,i) => (
                      <li key={i} className="flex items-center gap-2 text-[13px]" style={{ color:DIM }}>
                        <Check size={12} style={{ color:"#10B981", flexShrink:0 }} />{f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => upgrade.mutate(plan.id)} disabled={isCurrent||upgrade.isPending} className="w-full h-9 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90" style={isCurrent?{background:"rgba(255,255,255,0.06)",color:DIM,cursor:"default"}:isPopular?{background:OG}:{background:"rgba(255,255,255,0.08)",border:`1px solid ${B}`}}>
                    {isCurrent ? "Current" : <><ArrowRight size={12}/>Upgrade</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* coupon */}
      <div className="rounded-xl p-4 mb-5" style={{ background:S,border:`1px solid ${B}` }}>
        <div className="flex items-center gap-2 mb-3">
          <Tag size={13} style={{ color:OG }} />
          <p className="text-xs font-bold text-white">Promo Code</p>
        </div>
        <div className="flex gap-2">
          <input value={coupon} onChange={e=>{setCoupon(e.target.value.toUpperCase());setMsg(null);}} placeholder="ENTER CODE" className="flex-1 h-9 px-3 rounded-lg text-xs font-mono font-bold text-white uppercase outline-none" style={{ background:"var(--bg-primary)",border:`1px solid ${B}` }} />
          <button onClick={() => applyCoupon.mutate()} disabled={!coupon||applyCoupon.isPending} className="h-9 px-4 rounded-lg text-xs font-bold text-white shrink-0" style={{ background:OG }}>Apply</button>
        </div>
        {msg && <p className="text-[13px] mt-1.5" style={{ color:msg.t==="ok"?"#10B981":"#EF4444" }}>{msg.s}</p>}
      </div>

      {/* payment history */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:MUT }}>Payment History</p>
        {payments.length === 0 ? (
          <div className="rounded-xl py-8 text-center" style={{ background:S,border:`1px solid ${B}` }}>
            <History size={20} className="mx-auto mb-2" style={{ color:MUT }} />
            <p className="text-xs font-semibold text-white mb-0.5">No payments yet</p>
            <p className="text-xs" style={{ color:DIM }}>Transactions will appear here after you subscribe.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border:`1px solid ${B}` }}>
            {/* desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom:`1px solid ${B}`,background:S }}>
                    {["Reference","Plan","Date","Amount","Status"].map(h=>(
                      <th key={h} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color:MUT }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p,i)=>(
                    <tr key={p.id} style={{ borderTop:i>0?`1px solid ${B}`:"none" }}>
                      <td className="px-4 py-2.5 text-[13px] font-mono text-white">{(p.reference??"").slice(0,14)}…</td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-white capitalize">{p.planName}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color:DIM }}>{fmtD(p.paidAt??p.createdAt)}</td>
                      <td className="px-4 py-2.5 text-xs font-black text-white">{fmtN(p.amountKobo)}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[13px] font-bold uppercase px-2 py-0.5 rounded-full" style={p.status==="success"?{background:"rgba(16,185,129,0.1)",color:"#10B981",border:"1px solid rgba(16,185,129,0.2)"}:{background:"rgba(239,68,68,0.1)",color:"#EF4444",border:"1px solid rgba(239,68,68,0.2)"}}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* mobile */}
            <div className="sm:hidden divide-y" style={{ borderColor:B }}>
              {payments.map(p=>(
                <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold text-white capitalize">{p.planName}</p>
                    <p className="text-xs" style={{ color:MUT }}>{fmtD(p.paidAt??p.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">{fmtN(p.amountKobo)}</p>
                    <span className="text-[13px] font-bold uppercase" style={{ color:p.status==="success"?"#10B981":"#EF4444" }}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BillingPage;
