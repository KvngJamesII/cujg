import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

const AdminPlansPage = () => {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const res = await api.get("/billing/plans");
      return res.data as any[];
    }
  });

  if (isLoading) return <DashboardLayout><div className="p-8">Loading plans...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Manage Plans</h1>
        <div className="space-y-6">
          {plans.map(plan => (
            <PlanEditor key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

const PlanEditor = ({ plan }: { plan: any }) => {
  const [priceKobo, setPriceKobo] = useState(plan.priceKobo);
  const [ramPerBotMb, setRamPerBotMb] = useState(plan.ramPerBotMb);
  const [cpuPerBot, setCpuPerBot] = useState(plan.cpuPerBot);
  const [storageGb, setStorageGb] = useState(plan.storageGb);
  const [botLimit, setBotLimit] = useState(plan.botLimit);
  const { success: ok, error: err } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/admin/plans/${plan.id}`, {
        priceKobo: Number(priceKobo),
        ramPerBotMb: Number(ramPerBotMb),
        cpuPerBot: Number(cpuPerBot),
        storageGb: Number(storageGb),
        botLimit: Number(botLimit),
      });
    },
    onSuccess: () => {
      ok("Success", "Plan updated");
      qc.invalidateQueries({ queryKey: ["admin-plans"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: () => err("Error", "Could not update plan"),
  });

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 capitalize">{plan.name}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-xs text-white/50 block mb-1">Price (₦)</label>
          <Input type="number" value={priceKobo / 100} onChange={e => setPriceKobo(Number(e.target.value) * 100)} />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">RAM per panel (MB)</label>
          <Input type="number" value={ramPerBotMb} onChange={e => setRamPerBotMb(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">CPU per panel</label>
          <Input type="number" step="0.1" value={cpuPerBot} onChange={e => setCpuPerBot(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Storage (GB)</label>
          <Input type="number" value={storageGb} onChange={e => setStorageGb(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Max Panels</label>
          <Input type="number" value={botLimit} onChange={e => setBotLimit(e.target.value)} />
        </div>
      </div>
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Save Changes</Button>
    </div>
  );
};

export default AdminPlansPage;
