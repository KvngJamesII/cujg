import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import nodeIcon from '@/assets/nodejs.svg';
import pyIcon from '@/assets/python.svg';
import { toast } from 'sonner';

export default function NewBotPage() {
  const [, setLoc] = useLocation();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'nodejs' | 'python'>('nodejs');
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!name) { toast.error('Pick a name'); return; }
    setLoading(true);
    try {
      const r = await api.post('/bots', { name, language });
      const bot = r.data as { id: string };
      toast.success('Panel created');
      setLoc(`/bots/${bot.id}`);
    } catch { toast.error('Could not create'); }
    finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      <button onClick={() => setLoc('/bots')} className="text-xs text-[--text-muted] hover:text-white mb-5 flex items-center gap-1.5">
        <ArrowLeft size={13} /> Back to panels
      </button>
      <h1 className="text-3xl font-extrabold tracking-tight">Create a new panel</h1>
      <p className="text-[--text-secondary] text-sm mt-1.5">Pick a runtime and you're seconds from deploying.</p>

      <div className="mt-8 max-w-xl space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[--text-muted] mb-2">Panel name</label>
          <input value={name} onChange={(e) => setName(e.target.value.replace(/[^a-z0-9-]/gi, '-').toLowerCase())}
            placeholder="my-awesome-bot"
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[--accent-primary] font-mono"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }} />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[--text-muted] mb-2">Runtime</label>
          <div className="grid grid-cols-2 gap-3">
            {([
              { id: 'nodejs', name: 'Node.js', desc: 'JavaScript / TypeScript', icon: nodeIcon, color: '#22C55E' },
              { id: 'python', name: 'Python', desc: 'Python 3.11', icon: pyIcon, color: '#3B82F6' },
            ] as const).map((r) => (
              <motion.button whileTap={{ scale: 0.98 }} key={r.id} onClick={() => setLanguage(r.id)}
                className="p-5 rounded-xl border text-left transition-all"
                style={{
                  background: language === r.id ? 'rgba(249,115,22,0.06)' : 'var(--bg-secondary)',
                  borderColor: language === r.id ? 'var(--accent-primary)' : 'var(--border)',
                }}>
                <img src={r.icon} alt={r.name} className="w-7 h-7 mb-3" />
                <div className="font-bold">{r.name}</div>
                <div className="text-xs text-[--text-muted] mt-0.5">{r.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>

        <button onClick={create} disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow-orange)' }}>
          {loading ? <Loader2 className="animate-spin" size={15} /> : <>Create panel <ArrowRight size={15} /></>}
        </button>
      </div>
    </DashboardLayout>
  );
}
