import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'running' | 'stopped' | 'crashed' | 'suspended' | 'setting_up' | 'not_created';
  className?: string;
}

interface StatusConfig {
  label: string;
  color: string;
  pulse: boolean;
  spin?: boolean;
}

const statusConfig: Record<string, StatusConfig> = {
  running: { label: 'Running', color: 'bg-[--success]', pulse: true },
  stopped: { label: 'Stopped', color: 'bg-[--text-muted]', pulse: false },
  crashed: { label: 'Crashed', color: 'bg-[--danger]', pulse: false },
  suspended: { label: 'Suspended', color: 'bg-amber-500', pulse: false },
  setting_up: { label: 'Setting up...', color: 'bg-blue-500', pulse: false, spin: true },
  not_created: { label: 'Not created', color: 'bg-[--text-muted]', pulse: false },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status] ?? statusConfig.not_created;

  return (
    <div className={cn('flex items-center gap-2 px-2.5 py-1 rounded-full bg-[--bg-tertiary] border border-[--border] text-xs font-medium', className)}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-dot {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .animate-pulse-dot {
          animation: pulse-dot 2s infinite;
        }
      `}} />
      <span className={cn(
        'h-2 w-2 rounded-full',
        config.color,
        config.pulse && 'animate-pulse-dot',
        config.spin && 'animate-spin'
      )} />
      <span className="text-[--text-primary]">{config.label}</span>
    </div>
  );
};
