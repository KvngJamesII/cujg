import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Bot, 
  CreditCard, 
  UserCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const BottomNav: React.FC = () => {
  const [location] = useLocation();

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Panels', href: '/bots', icon: Bot },
    { label: 'Billing', href: '/billing', icon: CreditCard },
    { label: 'Account', href: '/settings', icon: UserCircle },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-[--bg-secondary]/80 backdrop-blur-xl border-t border-[--border] flex items-center justify-around px-2 z-50">
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}>
            <div className={cn(
              "flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer",
              isActive ? "text-[--accent-primary]" : "text-[--text-muted]"
            )}>
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
};
