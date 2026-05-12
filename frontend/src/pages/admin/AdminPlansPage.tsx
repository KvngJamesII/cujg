import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { toast } from "sonner";
import { Loader2, Save, Cpu, HardDrive, MemoryStick, Boxes, DollarSign } from "lucide-react";
import api from "@/lib/api";

interface Plan {
  id: string;
  name: string;
  priceKobo: number;
  ramPerBotMb: number;
  cpuPerBot: number;
  storageGb: number;
  botLimit: number;
}

const planAccent: Record<string, string> = {
  basic: "var(--cyan)",
  pro: "var(--accent-primary)",
  premium: "var(--violet)",
  ultra: "var(--success)",
};

const AdminPlansPage = () => {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => (await api.get("/billing/plans")).data as Plan[],
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ background: "rgba(167,139,250,0.10)", color: "var(--violet)" }}>Admin</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Manage plans</h1>
          <p className="text-[--text-secondary] text-sm mt-1.5">Tune pricing, resource caps and quotas across all tiers</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[--text-muted]" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((p) => <PlanEditor key={p.id} plan={p} />)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const PlanEditor = ({ plan }: { plan: Plan }) => {
  const [priceNgn, setPriceNgn] = useState((plan.priceKobo / 100).toString());
  const [ram, setRam] = useState(plan.ramPerBotMb.toString());
  const [cpu, setCpu] = useState(plan.cpuPerBot.toString());
  const [storage, setStorage] = useState(plan.storageGb.toString());
  const [limit, setLimit] = useState(plan.botLimit.toString());
  const qc = useQueryClient();
  const accent = planAccent[plan.name.toLowerCase()] ?? "var(--accent-primary)";

  const mutation = useMutation({
    mutationFn: () => api.patch(`/admin/plans/${plan.id}`, {
      priceKobo: Math.round(Number(priceNgn) * 100),
      ramPerBotMb: Number(ram),
      cpuPerBot: Number(cpu),
      storageGb: Number(storage),
      botLimit: Number(limit),
    }),
    onSuccess: () => {
      toast.success(`${plan.name} plan updated`);
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: () => toast.error("Could not update plan"),
  });

  const fields: { label: string; value: string; set: (v: string) => void; icon: React.ElementType; suffix?: string; step?: string }[] = [
    { label: "Price", value: priceNgn, set: setPriceNgn, icon: DollarSign, suffix: "₦" },
    { label: "RAM / panel", value: ram, set: setRam, icon: MemoryStick, suffix: "MB" },
    { label: "CPU / panel", value: cpu, set: setCpu, icon: Cpu, suffix: "vCPU", step: "0.1" },
    { label: "Storage", value: storage, set: setStorage, icon: HardDrive, suffix: "GB" },
    { label: "Max panels", value: limit, set: setLimit, icon: Boxes },
  ];

  return (
    <div className="rounded-2xl border p-5 flex flex-col gap-4 transition-colors hover:border-[--border-strong]"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-sm uppercase"
            style={{ background: `color-mix(in oklab, ${accent} 15%, transparent)`, color: accent }}>
            {plan.name[0]}
          </div>
          <div>
            <div className="font-extrabold capitalize text-base leading-tight">{plan.name}</div>
            <div className="text-[11px] text-[--text-muted]">₦{(plan.priceKobo / 100).toLocaleString()} / month</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {fields.map((f) => (
          <label key={f.label} className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[--text-muted] flex items-center gap-1 mb-1">
              <f.icon size={10} />{f.label}
            </span>
            <div className="relative">
              <input
                type="number" step={f.step ?? "1"} min={0}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className="w-full h-10 px-3 pr-12 rounded-lg border bg-[--bg-tertiary] border-[--border] text-white text-sm font-semibold focus:outline-none focus:border-[--accent-primary] transition"
              />
              {f.suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[--text-muted] uppercase">{f.suffix}</span>
              )}
            </div>
          </label>
        ))}
      </div>

      <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
        className="h-10 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-transform active:scale-[0.98]"
        style={{ background: accent, boxShadow: `0 8px 24px -10px ${accent}` }}>
        {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save changes
      </button>
    </div>
  );
};

export default AdminPlansPage;
