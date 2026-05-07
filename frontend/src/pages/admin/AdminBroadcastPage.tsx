import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { Mail, Bell, Loader2, CheckCircle2, Users, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Target = 'all' | 'active' | 'paid';
type NotifType = 'info' | 'warning' | 'critical';

const targetLabels: Record<Target, string> = {
  all: 'All Users',
  active: 'Active Users',
  paid: 'Paid Users',
};

const notifTypes: { value: NotifType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'info',     label: 'Info',     icon: Info,          color: '#3B82F6' },
  { value: 'warning',  label: 'Warning',  icon: AlertTriangle, color: '#F59E0B' },
  { value: 'critical', label: 'Critical', icon: Bell,          color: '#EF4444' },
];

export const AdminBroadcastPage: React.FC = () => {
  const [emailTarget, setEmailTarget]   = useState<Target>('all');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody]       = useState('');

  const [notifTarget, setNotifTarget]   = useState<Target>('all');
  const [notifMsg, setNotifMsg]         = useState('');
  const [notifType, setNotifType]       = useState<NotifType>('info');

  const emailMutation = useMutation({
    mutationFn: () => api.post('/admin/broadcast/email', { target: emailTarget, subject: emailSubject, body: emailBody }),
    onSuccess: () => {
      toast.success(`Email broadcast queued for ${targetLabels[emailTarget].toLowerCase()}`);
      setEmailSubject('');
      setEmailBody('');
    },
    onError: () => toast.error('Broadcast failed'),
  });

  const notifMutation = useMutation({
    mutationFn: () => api.post('/admin/broadcast/notification', { target: notifTarget, message: notifMsg, type: notifType }),
    onSuccess: () => {
      toast.success('Notification sent');
      setNotifMsg('');
    },
    onError: () => toast.error('Failed to send notification'),
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-black text-white">Broadcast</h1>
          <p className="text-[--text-secondary] font-medium mt-1">Send mass emails or in-app notifications</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Email Broadcast */}
          <div className="bg-[--bg-secondary] rounded-2xl border border-[--border] p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <Mail size={20} style={{ color: '#6366F1' }} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Email Broadcast</h2>
                <p className="text-[--text-muted] text-sm">Send via connected email provider</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Target Audience</label>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'active', 'paid'] as Target[]).map(t => (
                  <button key={t} onClick={() => setEmailTarget(t)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold transition-all"
                    style={emailTarget === t
                      ? { background: 'rgba(249,115,22,0.15)', borderColor: '#F97316', color: '#F97316' }
                      : { background: 'transparent', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                    }>
                    <Users size={13} />{targetLabels[t]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Subject</label>
              <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                placeholder="Important update from Redon3"
                className="h-11 bg-[--bg-tertiary] border-[--border] text-white" />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Body</label>
              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                rows={7}
                placeholder="Write your email content here. Markdown is supported."
                className="w-full px-4 py-3 rounded-xl border border-[--border] bg-[--bg-tertiary] text-white text-sm resize-none focus:outline-none focus:border-orange-500/50 placeholder:text-[--text-muted]"
              />
            </div>

            <Button
              className="h-12 text-white font-bold gap-2 w-full"
              style={{ background: '#6366F1' }}
              onClick={() => emailMutation.mutate()}
              disabled={emailMutation.isPending || !emailSubject.trim() || !emailBody.trim()}>
              {emailMutation.isPending
                ? <><Loader2 size={16} className="animate-spin" />Sending...</>
                : <><Mail size={16} />Send Email to {targetLabels[emailTarget]}</>
              }
            </Button>

            {emailMutation.isSuccess && (
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#22C55E' }}>
                <CheckCircle2 size={16} />Email broadcast queued successfully
              </div>
            )}
          </div>

          {/* In-App Notification */}
          <div className="bg-[--bg-secondary] rounded-2xl border border-[--border] p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}>
                <Bell size={20} style={{ color: '#F97316' }} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">In-App Notification</h2>
                <p className="text-[--text-muted] text-sm">Appears in user notification bell</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Target Audience</label>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'active', 'paid'] as Target[]).map(t => (
                  <button key={t} onClick={() => setNotifTarget(t)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold transition-all"
                    style={notifTarget === t
                      ? { background: 'rgba(249,115,22,0.15)', borderColor: '#F97316', color: '#F97316' }
                      : { background: 'transparent', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                    }>
                    <Users size={13} />{targetLabels[t]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Notification Type</label>
              <div className="flex gap-2">
                {notifTypes.map(nt => (
                  <button key={nt.value} onClick={() => setNotifType(nt.value)}
                    className="flex items-center gap-1.5 flex-1 justify-center px-3 py-2.5 rounded-xl border text-sm font-bold transition-all"
                    style={notifType === nt.value
                      ? { background: `${nt.color}22`, borderColor: nt.color, color: nt.color }
                      : { background: 'transparent', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
                    }>
                    <nt.icon size={14} />{nt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[--text-muted] block mb-2">Message</label>
              <textarea
                value={notifMsg}
                onChange={e => setNotifMsg(e.target.value)}
                rows={5}
                placeholder="We'll be down for maintenance on Friday from 2–4 AM UTC."
                className="w-full px-4 py-3 rounded-xl border border-[--border] bg-[--bg-tertiary] text-white text-sm resize-none focus:outline-none focus:border-orange-500/50 placeholder:text-[--text-muted]"
              />
              <p className="text-[--text-muted] text-xs mt-1.5">{notifMsg.length} / 500 characters</p>
            </div>

            <Button
              className="h-12 text-white font-bold gap-2 w-full"
              style={{ background: '#F97316' }}
              onClick={() => notifMutation.mutate()}
              disabled={notifMutation.isPending || !notifMsg.trim()}>
              {notifMutation.isPending
                ? <><Loader2 size={16} className="animate-spin" />Sending...</>
                : <><Bell size={16} />Send to {targetLabels[notifTarget]}</>
              }
            </Button>

            {notifMutation.isSuccess && (
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#22C55E' }}>
                <CheckCircle2 size={16} />Notification sent successfully
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminBroadcastPage;
