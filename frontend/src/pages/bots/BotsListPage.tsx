
import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Bot, Plus, Search, Play, Square, RefreshCw, ChevronRight } from "lucide-react";
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

const STATUS_DOT: Record<string, string> = {
  running: "#10B981",
  stopped: "rgba(255,255,255,0.18)",
  crashed: "#EF4444",
  suspended: "#F59E0B",
  setting_up: "#3B82F6",
  not_created: "rgba(255,255,255,0.12)",
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

  const act = async (id: string, action: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/bots/${id}/${action}`);
      qc.invalidateQueries({ queryKey: ["bots-list"] });
    } catch {}
  };

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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-white">My Panels</h1>
      </div>

      {/* filter tabs — bleed to edge of content area */}
      <div
        className="flex border-b overflow-x-auto scrollbar-none -mx-4 md:-mx-8 px-4 md:px-8 mb-3"
        style={{ borderColor: B }}>
        {(["all", "online", "stopped", "errored"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k === "online" ? "running" : k === "errored" ? "crashed" : k)}
            className="shrink-0 px-3 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap capitalize"
            style={filter === (k === "online" ? "running" : k === "errored" ? "crashed" : k) ? { color: OG, borderColor: OG } : { color: DIM, borderColor: "transparent" }}>
            {k}
          </button>
        ))}
      </div>

      {/* search */}
      <div className="relative mb-3">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: MUT }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search panels…"
          className="w-full h-9 pl-8 pr-3 rounded-lg text-sm text-white outline-none"
          style={{ background: S, border: `1px solid ${B}` }}
        />
      </div>

      {/* list */}
      {isLoading ? (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${B}` }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse border-b last:border-0"
              style={{ background: S, borderColor: B }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-14 rounded-xl text-center"
          style={{ background: S, border: `1px solid ${B}` }}>
          <Bot size={22} className="mb-2" style={{ color: MUT }} />
          <p className="text-base font-semibold text-white mb-1">
            {search || filter !== "all" ? "No matches" : "No panels yet"}
          </p>
          <p className="text-xs mb-4" style={{ color: DIM }}>
            {search || filter !== "all" ? "Try a different filter." : ""}
          </p>
          {!search && filter === "all" && (
            <Link href="/billing">
              <button
                className="h-8 px-4 rounded-lg text-xs font-bold text-white"
                style={{ background: OG }}>
                Deploy a Panel
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${B}` }}>
          {filtered.map((bot) => {
            const dot = STATUS_DOT[bot.status] ?? STATUS_DOT.not_created;
            const rp = bot.memoryLimitMb > 0 ? Math.min(100, (bot.memoryUsedMb / bot.memoryLimitMb) * 100) : 0;
            const run = bot.status === "running";
            const stopped = ["stopped", "crashed", "not_created"].includes(bot.status);

            if (bot.status === "not_created" || !bot.runtime) {
              return (
                <div
                  key={bot.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.025] transition-colors border-b last:border-0"
                  style={{ borderColor: B }}
                  onClick={() => setConfiguringBot(bot)}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[15px] font-medium text-white truncate">Tap to Configure</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ color: DIM }}>
                    <ChevronRight size={16} />
                  </div>
                </div>
              );
            }

            return (
              <Link key={bot.id} href={`/bots/${bot.id}`}>
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.025] transition-colors border-b last:border-0"
                  style={{ borderColor: B }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-medium text-white truncate">{bot.name}</span>
                      {bot.runtime && (
                        <span
                          className="text-[13px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.06)", color: DIM }}>
                          {bot.runtime}
                        </span>
                      )}
                    </div>
                    {run && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div
                          className="w-20 h-0.5 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${rp}%`, background: rp > 80 ? "#EF4444" : OG }}
                          />
                        </div>
                        <span className="text-[13px] font-mono" style={{ color: MUT }}>
                          {bot.memoryUsedMb}/{bot.memoryLimitMb}MB · {bot.cpuPercent.toFixed(0)}% CPU
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-[13px] font-semibold" style={{ color: run ? "#10B981" : DIM }}>
                      {run ? "Online" : (bot.status === "crashed" ? "Errored" : "Stopped")}
                    </span>
                    {run && (
                      <span className="text-xs" style={{ color: MUT }}>
                        {fmtUp(bot.uptimeSeconds)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {stopped && (
                      <button
                        onClick={(e) => act(bot.id, "start", e)}
                        className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10"
                        style={{ color: "#10B981" }}>
                        <Play size={12} fill="currentColor" />
                      </button>
                    )}
                    {run && (
                      <button
                        onClick={(e) => act(bot.id, "stop", e)}
                        className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10"
                        style={{ color: "#EF4444" }}>
                        <Square size={12} fill="currentColor" />
                      </button>
                    )}
                    <button
                      onClick={(e) => act(bot.id, "restart", e)}
                      className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10"
                      style={{ color: MUT }}>
                      <RefreshCw size={12} />
                    </button>
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
