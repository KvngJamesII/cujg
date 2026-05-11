
import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Bot, Plus, Search, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

// @ts-ignore
import NodeJSIcon from "@/assets/nodejs.svg?react";
// @ts-ignore
import PythonIcon from "@/assets/python.svg?react";

const B = "rgba(255,255,255,0.07)";
const S = "rgba(255,255,255,0.04)";
const DIM = "rgba(255,255,255,0.45)";
const MUT = "rgba(255,255,255,0.25)";
const OG = "#F97316";

const STATUS_CFG: Record<string, { color: string; label: string; glow: string }> = {
  running:    { color: "#22C55E", label: "Online",  glow: "rgba(34,197,94,0.15)" },
  stopped:    { color: "#64748B", label: "Stopped", glow: "rgba(100,116,139,0.08)" },
  crashed:    { color: "#EF4444", label: "Errored", glow: "rgba(239,68,68,0.12)" },
  suspended:  { color: "#F59E0B", label: "Suspended", glow: "rgba(245,158,11,0.10)" },
  setting_up: { color: "#3B82F6", label: "Deploying", glow: "rgba(59,130,246,0.12)" },
  not_created:{ color: "#475569", label: "New", glow: "rgba(71,85,105,0.06)" },
};

function fmtUp(s: number): string {
  if (!s || s < 1) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

interface Bot {
  id: string;
  name: string;
  runtime: string | null;
  status: string;
  memoryUsedMb: number;
  memoryLimitMb: number;
  cpuPercent: number;
  uptimeSeconds: number;
}

const RuntimeIcon: React.FC<{ runtime: string | null; size?: number }> = ({ runtime, size = 20 }) => {
  if (runtime === "nodejs") return <NodeJSIcon style={{ width: size, height: size }} />;
  if (runtime === "python") return <PythonIcon style={{ width: size, height: size }} />;
  return <Bot size={size} style={{ color: MUT }} />;
};

const ConfigurePanelModal = ({ bot, onClose }: { bot: Bot; onClose: () => void }) => {
  const [, setLocation] = useLocation();
  const [panelName, setPanelName] = useState(bot.name);
  const [language, setLanguage] = useState<"nodejs" | "python" | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { name: string; runtime: string }) => {
      await api.patch(`/bots/${bot.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots-list"] });
      setLocation(`/bots/${bot.id}`);
    },
  });

  const handleSave = () => {
    if (panelName && language) {
      mutation.mutate({ name: panelName, runtime: language });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Panel</DialogTitle>
          <DialogDescription>Choose a name and language for your panel. This cannot be changed later.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Panel Name"
            value={panelName}
            onChange={(e) => setPanelName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Card
              className={`cursor-pointer ${language === "nodejs" ? "border-primary" : ""}`}
              onClick={() => setLanguage("nodejs")}>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <NodeJSIcon className="w-16 h-16 mb-2" />
                <span className="font-semibold">Node.js</span>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer ${language === "python" ? "border-primary" : ""}`}
              onClick={() => setLanguage("python")}>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <PythonIcon className="w-16 h-16 mb-2" />
                <span className="font-semibold">Python</span>
              </CardContent>
            </Card>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!panelName || !language || mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save & Open"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const BotsListPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [configuringBot, setConfiguringBot] = useState<Bot | null>(null);
  const qc = useQueryClient();

  const { data: bots = [], isLoading } = useQuery<Bot[]>({
    queryKey: ["bots-list"],
    queryFn: async () => {
      const r = await api.get("/bots");
      return r.data;
    },
    refetchInterval: 15_000,
  });

  const counts = {
    all: bots.length,
    running: bots.filter((b) => b.status === "running").length,
    stopped: bots.filter((b) => ["stopped", "not_created", "suspended"].includes(b.status)).length,
    crashed: bots.filter((b) => b.status === "crashed").length,
  };

  const filtered = bots.filter((b) => {
    const ms =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.runtime ?? "").toLowerCase().includes(search.toLowerCase());
    const mf =
      filter === "all" ||
      b.status === filter ||
      (filter === "stopped" && ["stopped", "not_created", "suspended"].includes(b.status));
    return ms && mf;
  });

  return (
    <DashboardLayout>
      {/* header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">My Panels</h1>
          <p className="text-xs mt-0.5" style={{ color: MUT }}>{counts.running} online · {counts.stopped} offline · {counts.crashed} errored</p>
        </div>
        <Link href="/billing">
          <button className="h-8 px-3 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 hover:opacity-90 transition-opacity" style={{ background: OG }}>
            <Plus size={14} /> Deploy
          </button>
        </Link>
      </div>

      {/* filter tabs */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {(["all", "online", "stopped", "errored"] as const).map((k) => {
          const active = filter === (k === "online" ? "running" : k === "errored" ? "crashed" : k);
          const count = k === "all" ? counts.all : k === "online" ? counts.running : k === "stopped" ? counts.stopped : counts.crashed;
          return (
            <button
              key={k}
              onClick={() => setFilter(k === "online" ? "running" : k === "errored" ? "crashed" : k)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={active ? { background: `${OG}18`, color: OG, border: `1px solid ${OG}30` } : { color: DIM, border: `1px solid ${B}` }}>
              <span className="capitalize">{k}</span>
              <span className="ml-1 px-1 py-0.5 rounded text-[10px]" style={{ background: active ? `${OG}15` : S, color: active ? OG : MUT }}>{count}</span>
            </button>
          );
        })}
        <div className="flex-1 min-w-[20px]" />
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: MUT }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 w-32 pl-7 pr-2.5 rounded-lg text-xs text-white outline-none"
            style={{ background: S, border: `1px solid ${B}` }}
          />
        </div>
      </div>

      {/* grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl" style={{ background: S }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl text-center" style={{ background: S, border: `1px solid ${B}` }}>
          <Bot size={28} className="mb-3" style={{ color: MUT }} />
          <p className="text-base font-semibold text-white mb-1">{search || filter !== "all" ? "No matches" : "No panels yet"}</p>
          <p className="text-xs mb-5" style={{ color: DIM }}>{search || filter !== "all" ? "Try a different filter." : "Deploy your first panel to get started."}</p>
          {!search && filter === "all" && (
            <Link href="/billing">
              <button className="h-9 px-5 rounded-lg text-xs font-bold text-white" style={{ background: OG }}>Deploy a Panel</button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {filtered.map((bot) => {
            const cfg = STATUS_CFG[bot.status] ?? STATUS_CFG.not_created;
            const run = bot.status === "running";
            const memPct = bot.memoryLimitMb > 0 ? Math.min(100, (bot.memoryUsedMb / bot.memoryLimitMb) * 100) : 0;

            if (bot.status === "not_created" || !bot.runtime) {
              return (
                <div
                  key={bot.id}
                  onClick={() => setConfiguringBot(bot)}
                  className="group flex items-center gap-3 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ background: `linear-gradient(135deg, ${cfg.glow}, rgba(255,255,255,0.02))`, border: `1px solid ${cfg.color}20` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <Bot size={18} style={{ color: MUT }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-white">New Panel</div>
                    <div className="text-[11px]" style={{ color: DIM }}>Tap to configure</div>
                  </div>
                  <ChevronRight size={16} style={{ color: MUT }} />
                </div>
              );
            }

            return (
              <Link key={bot.id} href={`/bots/${bot.id}`}>
                <div
                  className="group flex items-center gap-3 p-3 rounded-xl cursor-pointer active:scale-[0.98] transition-transform"
                  style={{
                    background: `linear-gradient(135deg, ${cfg.glow}, rgba(255,255,255,0.02))`,
                    border: `1px solid ${cfg.color}18`,
                  }}>
                  {/* left accent bar */}
                  <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: cfg.color }} />

                  {/* icon */}
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cfg.color}10` }}>
                    <RuntimeIcon runtime={bot.runtime} size={20} />
                  </div>

                  {/* content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-semibold text-white truncate">{bot.name}</span>
                    </div>
                    {run ? (
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono" style={{ color: cfg.color }}>{bot.cpuPercent.toFixed(0)}% CPU</span>
                        <span className="text-[11px] font-mono" style={{ color: DIM }}>{fmtUp(bot.uptimeSeconds)}</span>
                      </div>
                    ) : (
                      <span className="text-[11px]" style={{ color: DIM }}>{cfg.label}</span>
                    )}
                  </div>

                  {/* right status */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="relative flex h-2 w-2">
                      {run && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ background: cfg.color }} />}
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: cfg.color }} />
                    </span>
                    {run && (
                      <span className="text-[10px] font-mono" style={{ color: DIM }}>{Math.round(memPct)}%</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {configuringBot && <ConfigurePanelModal bot={configuringBot} onClose={() => setConfiguringBot(null)} />}
    </DashboardLayout>
  );
};

export default BotsListPage;
