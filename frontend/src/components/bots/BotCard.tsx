import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Play, Square, RefreshCw, Cpu, MemoryStick, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const D = "var(--app-font-display)";

interface BotCardProps {
  bot: {
    id: string;
    name: string;
    runtime: string | null;
    status: "running" | "stopped" | "crashed" | "suspended" | "setting_up" | "not_created";
    memoryUsedMb: number;
    memoryLimitMb: number;
    cpuPercent: number;
    uptimeSeconds: number;
  };
}

function formatUptime(s: number): string {
  if (!s || s < 1) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

const STATUS_COLOR: Record<string, string> = {
  running: "#22C55E",
  stopped: "#6B7280",
  crashed: "#EF4444",
  suspended: "#F59E0B",
  setting_up: "#3B82F6",
  not_created: "#6B7280",
};

export const BotCard: React.FC<BotCardProps> = ({ bot }) => {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const color = STATUS_COLOR[bot.status] ?? "#6B7280";
  const ramPct = bot.memoryLimitMb > 0 ? Math.min(100, (bot.memoryUsedMb / bot.memoryLimitMb) * 100) : 0;

  const action = async (e: React.MouseEvent, endpoint: string) => {
    e.stopPropagation();
    try {
      await api.post(`/bots/${bot.id}/${endpoint}`);
      qc.invalidateQueries({ queryKey: ["bots"] });
      qc.invalidateQueries({ queryKey: ["bots-list"] });
      qc.invalidateQueries({ queryKey: ["bot", bot.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    } catch {}
  };

  const isRunning = bot.status === "running";
  const isStopped = bot.status === "stopped" || bot.status === "crashed";

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }} onClick={() => setLocation(`/bots/${bot.id}`)} className="cursor-pointer">
      <div
        className="relative overflow-hidden rounded-2xl border transition-all duration-200"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        {/* accent top stripe */}
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
        {/* subtle glow */}
        <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none" style={{ background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, filter: "blur(20px)" }} />

        <div className="relative z-10 p-5">
          {/* header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 mr-3">
              <h3 className="font-extrabold text-white truncate mb-1.5" style={{ fontFamily: D, fontSize: "1.05rem" }}>{bot.name}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {bot.runtime && (
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md border" style={{ color: "#F97316", borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.08)" }}>
                    {bot.runtime}
                  </span>
                )}
                <StatusBadge status={bot.status as any} />
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {isStopped && (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" style={{ color: "#22C55E" }} onClick={(e) => action(e, "start")}>
                  <Play size={14} fill="currentColor" />
                </Button>
              )}
              {isRunning && (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" style={{ color: "#EF4444" }} onClick={(e) => action(e, "stop")}>
                  <Square size={14} fill="currentColor" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" style={{ color: "var(--text-muted)" }} onClick={(e) => action(e, "restart")}>
                <RefreshCw size={14} />
              </Button>
            </div>
          </div>

          {/* RAM bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1"><MemoryStick size={10} /> RAM</span>
              <span style={{ color: ramPct > 80 ? "#EF4444" : "var(--text-secondary)" }}>{bot.memoryUsedMb}MB / {bot.memoryLimitMb}MB</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${ramPct}%`, background: ramPct > 80 ? "#EF4444" : "#F97316" }} />
            </div>
          </div>

          {/* stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(249,115,22,0.1)" }}>
                <Cpu size={13} style={{ color: "#F97316" }} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.1em]" style={{ color: "var(--text-muted)" }}>CPU</p>
                <p className="text-sm font-black text-white leading-none">{bot.cpuPercent.toFixed(1)}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.1)" }}>
                <Clock size={13} style={{ color: "#22C55E" }} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.1em]" style={{ color: "var(--text-muted)" }}>UPTIME</p>
                <p className="text-sm font-black text-white leading-none">{formatUptime(bot.uptimeSeconds)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
