import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[--border] bg-[--bg-secondary]/50', className)}>
      <div className="p-4 rounded-full bg-[--bg-tertiary] text-[--text-muted] mb-4">
        <Icon size={32} />
      </div>
      <h3 className="text-lg font-semibold text-[--text-primary] mb-1">{title}</h3>
      <p className="text-sm text-[--text-secondary] max-w-xs mb-6">{description}</p>
      {action}
    </div>
  );
};
