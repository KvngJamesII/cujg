import React from 'react';
import { Logo } from '@/components/ui/Logo';
import { NotificationBell } from '../dashboard/NotificationBell';

export const MobileTopBar: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-[--bg-primary]/80 backdrop-blur-md border-b border-[--border] flex items-center justify-between px-6 z-50">
      <Logo />
      <NotificationBell />
    </div>
  );
};
