import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Rocket } from "lucide-react";
import { SiNodedotjs, SiPython } from "react-icons/si";
import { Link } from "wouter";
import api from "@/lib/api";

const B   = "rgba(255,255,255,0.08)";
const S   = "rgba(255,255,255,0.04)";
const MUT = "rgba(255,255,255,0.28)";
const BL  = "#3b82f6";

const RUNTIMES = [
  {
    id: "nodejs",
    name: "Node.js",
    versions: "v18 · v20 · v22",
    Icon: SiNodedotjs,
    color: "#68A063",
    bg: "rgba(104,160,99,0.1)",
    border: "rgba(104,160,99,0.3)",
  },
  {
    id: "python",
    name: "Python",
    versions: "v3.9 · v3.10 · v3.11",
    Icon: SiPython,
    color: "#4B8BBE",
    bg: "rgba(75,139,190,0.1)",
    border: "rgba(75,139,190,0.3)",
  },
];

const NewBotPage: React.FC = () => {
  const [name, setName]       = useState("");
  const [runtime, setRuntime] = useState<"nodejs" | "python">("nodejs");
  const [loading, setLoading] = useState(false);
  const { error: toastErr }   = useToast();
  const [, setLocation]       = useLocation();
  const qc                    = useQueryClient();

  const create = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const { data: bot } = await api.post("/bots", { name: name.trim(), runtime });
      qc.invalidateQueries({ queryKey: ["bots"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setLocation(`/bots/${bot.id}`);
    } catch (e: any) {
      const msg = e.response?.data?.error ?? "Failed to create bot. Please try again.";
      toastErr("Error", msg);
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <Link href="/bots">
            <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 shrink-0" style={{ color: MUT }}>
              <ChevronLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">New Bot</h1>
            <p className="text-xs mt-0.5" style={{ color: MUT }}>Name your bot and pick a runtime to get started</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">

          {/* Panel name */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: MUT }}>
              Panel Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. MusicBot, TradeBot…"
              autoFocus
              disabled={loading}
              className="w-full h-11 px-3.5 rounded-xl text-sm font-medium text-white outline-none disabled:opacity-50"
              style={{ background: S, border: `1.5px solid ${name.trim() ? BL : B}` }}
              onKeyDown={e => e.key === "Enter" && name.trim() && create()}
            />
            <p className="text-[11px] mt-1.5" style={{ color: MUT }}>
              Used as your panel display name.
            </p>
          </div>

          {/* Runtime */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: MUT }}>
              Runtime
            </label>
            <div className="grid grid-cols-2 gap-3">
              {RUNTIMES.map(rt => {
                const sel = runtime === rt.id;
                return (
                  <button
                    key={rt.id}
                    onClick={() => setRuntime(rt.id as "nodejs" | "python")}
                    disabled={loading}
                    className="flex flex-col items-start p-4 rounded-xl transition-all text-left disabled:opacity-50"
                    style={{
                      background: sel ? rt.bg : S,
                      border: `1.5px solid ${sel ? rt.border : B}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      style={{ background: sel ? `${rt.color}20` : "rgba(255,255,255,0.05)" }}
                    >
                      <rt.Icon size={22} style={{ color: sel ? rt.color : MUT }} />
                    </div>
                    <p className="text-sm font-bold text-white mb-0.5">{rt.name}</p>
                    <p className="text-[11px] font-mono" style={{ color: sel ? rt.color : MUT }}>
                      {rt.versions}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create button */}
          <button
            onClick={create}
            disabled={!name.trim() || loading}
            className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
            style={{ background: BL }}
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin" /> Creating…</>
            ) : (
              <><Rocket size={15} /> Create Panel</>
            )}
          </button>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewBotPage;
