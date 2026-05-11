import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export const AdminPageShell: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }> = ({ title, subtitle, children, action }) => (
  <DashboardLayout>
    <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest mb-2" style={{ background: 'rgba(167,139,250,0.10)', color: 'var(--violet)' }}>Admin</div>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-[--text-secondary] text-sm mt-1.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </DashboardLayout>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`rounded-2xl border p-5 ${className ?? ''}`} style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
    {children}
  </div>
);

export const Table: React.FC<{ headers: string[]; rows: React.ReactNode[][] }> = ({ headers, rows }) => (
  <div className="rounded-2xl border overflow-x-auto" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
    <table className="w-full text-sm">
      <thead>
        <tr style={{ background: 'var(--bg-tertiary)' }}>
          {headers.map((h) => <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest text-[--text-muted] px-4 py-3">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={headers.length} className="text-center py-12 text-sm text-[--text-muted]">No data</td></tr>
        ) : rows.map((r, i) => (
          <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
            {r.map((c, j) => <td key={j} className="px-4 py-3">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
