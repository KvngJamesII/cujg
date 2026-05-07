import React, { useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

const B = "rgba(255,255,255,0.07)";
const S = "rgba(255,255,255,0.04)";
const DIM = "rgba(255,255,255,0.45)";
const MUT = "rgba(255,255,255,0.25)";
const OG = "#F97316";

interface Notification { id:string; type:string; title:string; message:string; read:boolean; createdAt:string; }

function timeAgo(s: string): string {
  const d = Date.now() - new Date(s).getTime();
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}

const TYPE_COLOR: Record<string,string> = {
  bot_crashed: "#EF4444", bot_stopped: "#F59E0B", bot_started: "#10B981",
  subscription: OG, security: "#3B82F6", welcome: OG,
};

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: notifs = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => { try { const r = await api.get("/notifications"); return Array.isArray(r.data) ? r.data : (r.data.notifications ?? []); } catch { return []; } },
    refetchInterval: open ? 15000 : 60000,
  });

  const markAll = useMutation({
    mutationFn: async () => { await api.post("/notifications/mark-all-read"); },
    onSuccess: () => qc.invalidateQueries({ queryKey:["notifications"] }),
  });

  const markOne = useMutation({
    mutationFn: async (id:string) => { await api.patch(`/notifications/${id}/read`); },
    onSuccess: () => qc.invalidateQueries({ queryKey:["notifications"] }),
  });

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: open ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", border:`1px solid ${B}` }}>
        <Bell size={16} style={{ color: open ? "white" : DIM }} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[13px] font-black text-white px-0.5" style={{ background:"#EF4444" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* panel */}
          <div className="absolute right-0 top-11 w-80 max-h-[420px] rounded-xl overflow-hidden shadow-2xl z-50 flex flex-col" style={{ background:"#0E1117", border:`1px solid ${B}` }}>
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor:B }}>
              <div className="flex items-center gap-2">
                <Bell size={13} style={{ color:OG }} />
                <span className="text-xs font-bold text-white">Notifications</span>
                {unread > 0 && <span className="text-[13px] font-black px-1.5 py-0.5 rounded-full" style={{ background:"rgba(249,115,22,0.15)", color:OG }}>{unread} new</span>}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && <button onClick={() => markAll.mutate()} className="text-xs font-semibold" style={{ color:OG }}>Mark all read</button>}
                <button onClick={() => setOpen(false)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10" style={{ color:MUT }}><X size={12}/></button>
              </div>
            </div>

            {/* list */}
            <div className="overflow-y-auto flex-1">
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell size={20} className="mb-2" style={{ color:MUT }} />
                  <p className="text-xs font-semibold text-white mb-0.5">All caught up</p>
                  <p className="text-xs" style={{ color:MUT }}>No notifications yet.</p>
                </div>
              ) : (
                notifs.map((n, i) => {
                  const tc = TYPE_COLOR[n.type] ?? OG;
                  return (
                    <div key={n.id} onClick={() => !n.read && markOne.mutate(n.id)} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.025] transition-colors border-b last:border-0" style={{ borderColor:B, background: n.read ? "transparent" : "rgba(255,255,255,0.01)" }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: n.read ? "transparent" : tc }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-white leading-tight">{n.title}</p>
                          <span className="text-[13px] shrink-0 mt-0.5" style={{ color:MUT }}>{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color:DIM }}>{n.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
