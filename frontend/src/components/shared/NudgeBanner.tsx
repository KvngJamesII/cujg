import React from 'react';
import { X } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

interface NudgeBannerProps {
  message: string;
  ctaText: string;
  ctaHref: string;
  onDismiss: () => void;
}

export const NudgeBanner: React.FC<NudgeBannerProps> = ({
  message,
  ctaText,
  ctaHref,
  onDismiss,
}) => {
  return (
    <div className="bg-[--accent-glow] border-b border-[--accent-primary]/20 py-2 px-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-1.5 w-1.5 rounded-full bg-[--accent-primary] animate-pulse shrink-0" />
        <p className="text-xs sm:text-sm font-medium text-[--text-primary] truncate">{message}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href={ctaHref}>
          <Button size="sm" className="h-7 px-3 text-xs bg-[--accent-primary] hover:bg-[--accent-hover] text-white">
            {ctaText}
          </Button>
        </Link>
        <button
          onClick={onDismiss}
          className="text-[--text-muted] hover:text-[--text-primary] transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
