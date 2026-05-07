import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Bot, ChevronRight, Play, Square, RefreshCw, Layers, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";

const B   = "rgba(255,255,255,0.08)";
const S   = "rgba(255,255,255,0.04)";
const DIM = "rgba(255,255,255,0.45)";
const MUT = "rgba(255,255,255,0.25)";
const BL  = "#3b82f6";
const GR  = "#22c55e";
const OG  = "#F97316";
const RD  = "#ef4444";
const WH  = "#F8FAFC";

const STATUS_DOT: Record<string, string> = {
  running: GR, stopped: MUT, crashed: RD,
  suspended: "#f59e0b", setting_up: BL, not_created: "rgba(255,255,255,0.12)",
};

function fmtUp(s: number): string {
  if (!s || s < 1) return "—";
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
}

function fmtRam(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`;
  return `${mb}MB`;
}

function progressColor(pct: number): string {
  if (pct > 100) return RD;
  if (pct >= 80) return OG;
  if (pct >= 50) return BL;
  return GR;
}

interface Bot {
  id: string; name: string; runtime: string|null; plan?: string; status: string;
  memoryUsedMb: number; memoryLimitMb: number; cpuPercent: number; uptimeSeconds: number;
}

const ConfigurePanelModal = ({ bot, onClose }: { bot: Bot; onClose: () => void }) => {
  const [, setLocation] = useLocation();
  const [panelName, setPanelName] = useState(bot.name || "");
  const [language, setLanguage] = useState<"nodejs" | "python" | null>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { name: string; runtime: string }) => {
      await api.patch(`/bots/${bot.id}`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bots"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setLocation(`/bots/${bot.id}`);
    },
  });

  const handleSave = () => {
    if (panelName.trim() && language) {
      mutation.mutate({ name: panelName.trim(), runtime: language });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Configure Panel</DialogTitle>
          <DialogDescription>Choose a name and runtime language for your panel.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Panel name"
            value={panelName}
            onChange={(e) => setPanelName(e.target.value)}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Card
              className={`cursor-pointer transition-all ${language === "nodejs" ? "ring-2 ring-[#3b82f6]" : "hover:bg-white/[0.02]"}`}
              onClick={() => setLanguage("nodejs")}>
              <CardContent className="flex flex-col items-center justify-center p-4">
                <span className="text-xl mb-1">⬢</span>
                <span className="text-sm font-semibold text-white">Node.js</span>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${language === "python" ? "ring-2 ring-[#3b82f6]" : "hover:bg-white/[0.02]"}`}
              onClick={() => setLanguage("python")}>
              <CardContent className="flex flex-col items-center justify-center p-4">
                <span className="text-xl mb-1">🐍</span>
                <span className="text-sm font-semibold text-white">Python</span>
              </CardContent>
            </Card>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!panelName.trim() || !language || mutation.isPending} className="w-full">
            {mutation.isPending ? "Saving..." : "Save & Open"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DashboardPage: React.FC = () => {
  const qc = useQueryClient();
  const [configuringBot, setConfiguringBot] = useState<Bot | null>(null);

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const r = await api.get("/dashboard/summary");
      return r.data as {
        totalBots: number; runningBots: number; stoppedBots: number; crashedBots: number;
        planName: string; planId: string; botLimit: number; ramPerBotMb: number;
        storageGb: number; cpuPerBot: number; subscriptionStatus: string; daysUntilExpiry: number|null;
      };
    },
    refetchInterval: 30_000,
  });

  const { data: bots = [], isLoading } = useQuery({
    queryKey: ["bots"],
    queryFn: async () => {
      const r = await api.get("/bots");
      return r.data as Bot[];
    },
    refetchInterval: 15_000,
  });

  const act = async (id: string, action: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try { await api.post(`/bots/${id}/${action}`); qc.invalidateQueries({ queryKey: ["bots"] }); qc.invalidateQueries({ queryKey: ["dashboard-summary"] }); } catch {}
  };

  // Plan usage
  const planName  = summary?.planName ?? "Starter";
  const botLimit  = summary?.botLimit ?? 1;
  const totalBots = summary?.totalBots ?? 0;
  const usagePct  = botLimit > 0 ? Math.min(100, Math.round((totalBots / botLimit) * 100)) : 0;
  const barColor  = progressColor(usagePct);

  // Health bar segments
  const hasBots   = totalBots > 0;
  const runSeg    = hasBots ? (summary?.runningBots ?? 0) / totalBots : 0;
  const stopSeg   = hasBots ? (summary?.stoppedBots ?? 0) / totalBots : 0;
  const crashSeg  = hasBots ? (summary?.crashedBots ?? 0) / totalBots : 0;

  // Latest panel only
  const latestBot = bots.length > 0 ? bots[0] : null;

  // Is latest panel unconfigured?
  const isUnconfigured = latestBot && (!latestBot.runtime || latestBot.status === "not_created");

  return (
    <DashboardLayout>
      {/* Dashboard heading */}
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: OG }}>Dashboard</p>

      {/* --- Plan Usage Card --- */}
      <div className="rounded-xl p-4 mb-3" style={{ background: S, border: `1px solid ${B}` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-bold text-white">{planName} Plan</span>
          <div className="flex items-center gap-1.5">
            {summary?.subscriptionStatus === "grace" && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>Grace</span>
            )}
            {summary?.daysUntilExpiry != null && summary.daysUntilExpiry <= 7 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                background: summary.daysUntilExpiry <= 2 ? "rgba(239,68,68,0.1)" : "rgba(249,115,22,0.1)",
                color: summary.daysUntilExpiry <= 2 ? RD : OG,
              }}>
                {summary.daysUntilExpiry === 0 ? "Expires today" : `${summary.daysUntilExpiry}d left`}
              </span>
            )}
          </div>
        </div>

        {/* Usage bar */}
        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold tabular-nums" style={{ color: barColor }}>{totalBots}</span>
              <span className="text-sm font-medium" style={{ color: MUT }}>/ {botLimit}</span>
              <span className="text-[11px] ml-0.5" style={{ color: DIM }}>panels used</span>
            </div>
            <span className="text-xs font-extrabold tabular-nums" style={{ color: barColor }}>{usagePct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${usagePct}%`, background: barColor, boxShadow: `0 0 10px ${barColor}44` }}
            />
          </div>
        </div>

        {/* Resource specs */}
        <div className="flex items-center gap-2">
          {[
            { icon: MemoryStick, label: fmtRam(summary?.ramPerBotMb ?? 450), sub: "/panel" },
            { icon: HardDrive, label: `${summary?.storageGb ?? 1}GB`, sub: "" },
            { icon: Cpu, label: `${summary?.cpuPerBot ?? 0.3}`, sub: "vCPU" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-1" style={{ background: "rgba(255,255,255,0.03)" }}>
              <r.icon size={12} style={{ color: MUT }} />
              <div className="flex items-baseline gap-0.5 min-w-0">
                <span className="text-[11px] font-bold text-white tabular-nums truncate">{r.label}</span>
                {r.sub && <span className="text-[9px] shrink-0" style={{ color: MUT }}>{r.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Panel Health Overview --- */}
      <div className="rounded-xl p-4 mb-3" style={{ background: S, border: `1px solid ${B}` }}>
        <div className="flex items-center gap-2 mb-3">
          <Layers size={13} style={{ color: DIM }} />
          <span className="text-[13px] font-bold text-white">Panel Health</span>
        </div>

        {/* Segmented bar */}
        <div className="h-3 rounded-full overflow-hidden flex mb-3" style={{ background: "rgba(255,255,255,0.05)" }}>
          {hasBots ? (
            <>
              {runSeg > 0 && (
                <div className="h-full transition-all duration-500" style={{
                  width: `${runSeg * 100}%`, background: GR,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 0 6px ${GR}33`,
                  borderRadius: stopSeg === 0 && crashSeg === 0 ? "9999px" : "9999px 0 0 9999px",
                }} />
              )}
              {stopSeg > 0 && (
                <div className="h-full transition-all duration-500" style={{
                  width: `${stopSeg * 100}%`, background: MUT,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
                  borderRadius: crashSeg === 0 && runSeg === 0 ? "9999px 0 0 9999px" : crashSeg === 0 ? "0 9999px 9999px 0" : "0",
                }} />
              )}
              {crashSeg > 0 && (
                <div className="h-full transition-all duration-500" style={{
                  width: `${crashSeg * 100}%`, background: RD,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 6px ${RD}22`,
                  borderRadius: "0 9999px 9999px 0",
                }} />
              )}
            </>
          ) : (
            <div className="h-full w-full rounded-full" style={{ background: "rgba(255,255,255,0.03)" }} />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {[
            { color: GR, label: "Running", count: summary?.runningBots ?? 0 },
            { color: MUT, label: "Stopped", count: summary?.stoppedBots ?? 0 },
            { color: RD, label: "Errored", count: summary?.crashedBots ?? 0 },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color, boxShadow: `0 0 4px ${item.color}55` }} />
              <span className="text-[11px] font-medium" style={{ color: DIM }}>{item.label}</span>
              <span className="text-xs font-extrabold tabular-nums" style={{ color: item.color }}>{item.count}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11px] font-semibold" style={{ color: DIM }}>Total</span>
            <span className="text-xs font-extrabold text-white tabular-nums">{totalBots}</span>
          </div>
        </div>
      </div>

      {/* Latest panel */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-white">Latest Panel</span>
          {bots.length > 1 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: MUT }}>
              {bots.length} total
            </span>
          )}
        </div>
        <Link href="/bots">
          <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: BL }}>
            View all <ChevronRight size={12} />
          </span>
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-xl overflow-hidden" style={{ border:`1px solid ${B}` }}>
          <div className="h-14 animate-pulse" style={{ background:S }} />
        </div>
      ) : !latestBot ? (
        <div className="flex flex-col items-center justify-center py-8 rounded-xl text-center" style={{ background:S, border:`1px solid ${B}` }}>
          <Bot size={22} className="mb-2" style={{ color: MUT }} />
          <p className="text-sm font-bold text-white mb-0.5">No panels yet</p>
          <p className="text-[11px] mb-4" style={{ color: DIM }}>Deploy your first panel in under a minute.</p>
          <Link href="/bots/new">
            <button className="h-8 px-4 rounded-lg text-xs font-bold text-white" style={{ background: BL }}>Create Panel</button>
          </Link>
        </div>
      ) : isUnconfigured ? (
        <div className="rounded-xl overflow-hidden" style={{ border:`1px solid ${B}` }}>
          <div
            className="flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-white/[0.02]"
            style={{ borderLeft:`3px solid ${OG}` }}
            onClick={() => setConfiguringBot(latestBot)}>

            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
              background: STATUS_DOT[latestBot.status] ?? STATUS_DOT.not_created,
            }} />

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white">Tap to Configure</p>
            </div>

            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wide"
              style={(latestBot.plan ?? "basic") === "pro"
                ? { background: "rgba(59,130,246,0.1)", color: BL }
                : { background: "rgba(255,255,255,0.05)", color: MUT }
              }>
              {(latestBot.plan ?? "basic") === "pro" ? "Pro" : "Basic"}
            </span>

            <ChevronRight size={14} style={{ color: DIM }} />
          </div>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border:`1px solid ${B}` }}>
          <Link href={`/bots/${latestBot.id}`}>
            <div className="flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-white/[0.02]"
              style={{ borderLeft:`3px solid ${latestBot.status === "running" ? GR : "transparent"}` }}>

              {latestBot.runtime && (
                <div className="w-7 h-7 rounded flex items-center justify-center text-[9px] font-extrabold shrink-0"
                  style={{
                    background: latestBot.runtime.includes("py") ? "rgba(75,139,190,0.12)" : "rgba(104,160,99,0.1)",
                    border: `1px solid ${latestBot.runtime.includes("py") ? "rgba(75,139,190,0.2)" : "rgba(104,160,99,0.18)"}`,
                    color: latestBot.runtime.includes("py") ? "#60a5fa" : "#86efac",
                  }}>
                  {latestBot.runtime.includes("py") ? "PY" : "JS"}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{latestBot.name}</p>
                <p className="text-[10px] font-medium" style={{ color: DIM }}>
                  {latestBot.status === "running"
                    ? `Up ${fmtUp(latestBot.uptimeSeconds)}`
                    : latestBot.status === "crashed" ? "Errored" : "Stopped"}
                  {latestBot.status === "running" && (
                    <span className="ml-1.5" style={{ color: MUT }}>
                      {Math.round(latestBot.memoryUsedMb)}MB · {Math.round(latestBot.cpuPercent)}%
                    </span>
                  )}
                </p>
              </div>

              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wide"
                style={(latestBot.plan ?? "basic") === "pro"
                  ? { background: "rgba(59,130,246,0.1)", color: BL }
                  : { background: "rgba(255,255,255,0.05)", color: MUT }
                }>
                {(latestBot.plan ?? "basic") === "pro" ? "Pro" : "Basic"}
              </span>

              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                background: STATUS_DOT[latestBot.status] ?? STATUS_DOT.not_created,
                boxShadow: latestBot.status === "running" ? `0 0 5px rgba(34,197,94,0.5)` : "none",
              }} />

              <div className="flex gap-0.5 shrink-0">
                {["stopped","crashed","not_created"].includes(latestBot.status) && (
                  <button onClick={e=>act(latestBot.id,"start",e)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10" style={{ color:GR }}>
                    <Play size={11} fill="currentColor" />
                  </button>
                )}
                {latestBot.status === "running" && (
                  <button onClick={e=>act(latestBot.id,"stop",e)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10" style={{ color:RD }}>
                    <Square size={11} fill="currentColor" />
                  </button>
                )}
                <button onClick={e=>act(latestBot.id,"restart",e)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10" style={{ color:MUT }}>
                  <RefreshCw size={11} />
                </button>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Configure modal */}
      {configuringBot && (
        <ConfigurePanelModal bot={configuringBot} onClose={() => setConfiguringBot(null)} />
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
