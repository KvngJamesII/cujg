import React from 'react';
import { cn } from '@/lib/utils';

interface PlanBadgeProps {
  plan: 'free_trial' | 'starter' | 'developer' | 'pro';
  className?: string;
}

const planConfig = {
  free_trial: { label: 'Free Trial', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  starter: { label: 'Starter', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  developer: { label: 'Developer', color: 'bg-[--accent-primary]/10 text-[--accent-primary] border-[--accent-primary]/20' },
  pro: { label: 'Pro', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
};

export const PlanBadge: React.FC<PlanBadgeProps> = ({ plan, className }) => {
  const config = planConfig[plan] || planConfig.free_trial;

  return (
    <span className={cn(
      'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
      config.color,
      className
    )}>
      {config.label}
    </span>
  );
};
