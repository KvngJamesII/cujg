import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, EyeOff, AlertTriangle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";

const B = "rgba(255,255,255,0.07)";
const S = "rgba(255,255,255,0.04)";
const DIM = "rgba(255,255,255,0.45)";
const MUT = "rgba(255,255,255,0.25)";
const OG = "#F97316";

const SETTING_TABS = ["Profile","Security","Notifications","Danger"];

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color:MUT }}>{label}</label>
      {children}
    </div>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement> & { prefixIcon?: React.ReactNode }) {
  const { prefixIcon, ...rest } = props;
  return (
    <div className="relative">
      {prefixIcon && <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color:MUT }}>{prefixIcon}</span>}
      <input {...rest} className={`w-full h-9 ${prefixIcon?"pl-8":"pl-3"} pr-3 rounded-lg text-sm text-white outline-none disabled:opacity-40 ${props.className??""}`} style={{ background:"var(--bg-primary)", border:`1px solid ${B}`, ...props.style }} />
    </div>
  );
}

const SettingsPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const { success:ok, error:toastErr } = useToast();
  const [activeTab, setActiveTab] = useState("Profile");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [curPass, setCurPass] = useState(""); const [newPass, setNewPass] = useState(""); const [confPass, setConfPass] = useState("");
  const [showCur, setShowCur] = useState(false); const [showNew, setShowNew] = useState(false);
  const [delText, setDelText] = useState(""); const [showDel, setShowDel] = useState(false);

  const saveProfile = useMutation({
    mutationFn: async () => { await api.patch("/account/profile",{fullName:fullName.trim()}); },
    onSuccess: () => { ok("Saved","Profile updated."); refreshUser(); },
    onError: () => toastErr("Failed","Could not update profile."),
  });

  const changePass = useMutation({
    mutationFn: async () => {
      if(newPass!==confPass) throw new Error("Passwords do not match");
      if(newPass.length<8) throw new Error("Minimum 8 characters");
      await api.post("/auth/change-password",{currentPassword:curPass,newPassword:newPass});
    },
    onSuccess: () => { ok("Updated","Use your new password next login."); setCurPass("");setNewPass("");setConfPass(""); },
    onError: (e:any) => toastErr("Failed", e.message ?? e.response?.data?.error ?? "Check your current password."),
  });

  const NOTIFS = [
    { key:"bots", label:"Panel Status Alerts", desc:"When your panels stop or crash." },
    { key:"billing", label:"Billing Updates", desc:"Invoices and renewal reminders." },
    { key:"security", label:"Security Alerts", desc:"Logins and account changes." },
    { key:"news", label:"Newsletter", desc:"New features and updates." },
  ];

  return (
    <DashboardLayout>
      {/* header */}
      <div className="mb-4">
        <h1 className="text-lg font-bold text-white">Settings</h1>
        <p className="text-xs mt-0.5" style={{ color:DIM }}>Manage your account preferences.</p>
      </div>

      {/* tabs — full-width bleed */}
      <div className="flex border-b overflow-x-auto scrollbar-none -mx-4 md:-mx-8 px-4 md:px-8 mb-5" style={{ borderColor:B }}>
        {SETTING_TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className="shrink-0 px-3 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap" style={activeTab===t ? { color:OG, borderColor:OG } : { color:DIM, borderColor:"transparent" }}>
            {t}
          </button>
        ))}
      </div>

      {/* PROFILE */}
      {activeTab==="Profile" && (
        <div className="rounded-xl p-4" style={{ background:S, border:`1px solid ${B}` }}>
          <div className="flex flex-col gap-4">
            <Field label="Full Name">
              <StyledInput value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your name" />
            </Field>
            <Field label="Email Address">
              <StyledInput value={user?.email??""} disabled placeholder="email" />
              <p className="text-xs mt-1" style={{ color:MUT }}>Contact support to change your email.</p>
            </Field>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background:user?.emailVerified?"#10B981":"#EF4444" }} />
                <span className="text-xs" style={{ color:DIM }}>{user?.emailVerified?"Email verified":"Email not verified"}</span>
              </div>
              <button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending||!fullName.trim()||fullName.trim()===user?.fullName} className="h-8 px-4 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-40" style={{ background:OG }}>
                <Save size={11}/>{saveProfile.isPending?"Saving…":"Save"}
              </button>
            </div>
            <div className="border-t pt-4 mt-2" style={{ borderColor:B }}>
              <button onClick={logout} className="h-8 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ background:"rgba(239,68,68,0.1)",color:"#EF4444",border:"1px solid rgba(239,68,68,0.2)" }}>
                <LogOut size={12}/> Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY */}
      {activeTab==="Security" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl p-4" style={{ background:S, border:`1px solid ${B}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white mb-0.5">Two-Factor Authentication</p>
                <p className="text-[13px]" style={{ color:DIM }}>{user?.totpEnabled ? "Active — your account is protected." : "Add an extra layer of security."}</p>
              </div>
              <Switch checked={!!user?.totpEnabled} />
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background:S, border:`1px solid ${B}` }}>
            <p className="text-xs font-semibold text-white mb-3">Change Password</p>
            <div className="flex flex-col gap-3">
              <Field label="Current Password">
                <div className="relative">
                  <StyledInput type={showCur?"text":"password"} value={curPass} onChange={e=>setCurPass(e.target.value)} placeholder="••••••••" />
                  <button onClick={()=>setShowCur(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:MUT }}>{showCur?<EyeOff size={13}/>:<Eye size={13}/>}</button>
                </div>
              </Field>
              <Field label="New Password">
                <div className="relative">
                  <StyledInput type={showNew?"text":"password"} value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Min. 8 characters" />
                  <button onClick={()=>setShowNew(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:MUT }}>{showNew?<EyeOff size={13}/>:<Eye size={13}/>}</button>
                </div>
              </Field>
              <Field label="Confirm New Password">
                <StyledInput type="password" value={confPass} onChange={e=>setConfPass(e.target.value)} placeholder="Repeat password" />
              </Field>
              <button onClick={() => changePass.mutate()} disabled={changePass.isPending||!curPass||!newPass||!confPass} className="self-start h-8 px-4 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background:OG }}>
                {changePass.isPending?"Updating…":"Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {activeTab==="Notifications" && (
        <div className="rounded-xl overflow-hidden" style={{ border:`1px solid ${B}` }}>
          {NOTIFS.map((n,i) => (
            <div key={n.key} className="flex items-center justify-between gap-4 px-4 py-3.5 border-b last:border-0" style={{ borderColor:B }}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{n.label}</p>
                <p className="text-[13px]" style={{ color:DIM }}>{n.desc}</p>
              </div>
              <Switch defaultChecked={i<3} />
            </div>
          ))}
        </div>
      )}

      {/* DANGER */}
      {activeTab==="Danger" && (
        <div className="rounded-xl p-4" style={{ background:S, border:"1px solid rgba(239,68,68,0.15)" }}>
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color:"#EF4444" }} />
            <div>
              <p className="text-sm font-bold text-white mb-1">Delete Account</p>
              <p className="text-[13px] leading-relaxed" style={{ color:DIM }}>Permanently deletes your account, all bots, files, and billing history. This action <span className="font-semibold text-red-400">cannot be undone</span>.</p>
            </div>
          </div>
          {!showDel ? (
            <button onClick={()=>setShowDel(true)} className="h-8 px-4 rounded-lg text-xs font-bold" style={{ background:"rgba(239,68,68,0.1)",color:"#EF4444",border:"1px solid rgba(239,68,68,0.2)" }}>
              Delete Account
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Field label="Type DELETE to confirm">
                <StyledInput value={delText} onChange={e=>setDelText(e.target.value)} placeholder="DELETE" style={{ letterSpacing:"0.1em" }} />
              </Field>
              <div className="flex gap-2">
                <button disabled={delText!=="DELETE"} onClick={() => toastErr("Contact support","Email support@redon3.com to delete your account.")} className="h-8 px-4 rounded-lg text-xs font-black disabled:opacity-40" style={{ background:"#EF4444",color:"white" }}>
                  Confirm Delete
                </button>
                <button onClick={()=>setShowDel(false)} className="h-8 px-3 rounded-lg text-xs" style={{ color:DIM }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SettingsPage;
