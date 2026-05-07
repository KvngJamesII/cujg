import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { PlanBadge } from '@/components/shared/PlanBadge';
import {
  LayoutDashboard,
  Bot,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Users,
  Server,
  Tag,
  Gift,
  Megaphone,
  Receipt,
  ScrollText,
  ChevronDown,
  Bug,
  Shield,
  Ticket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const adminLinks = [
  { label: 'Overview',    href: '/admin',              icon: ShieldCheck },
  { label: 'Users',       href: '/admin/users',         icon: Users },
  { label: 'Panels',   href: '/admin/containers', icon: Server },
  { label: 'Plans',      href: '/admin/plans',      icon: Shield },
  { label: 'Coupons',    href: '/admin/coupons',    icon: Ticket },
  { label: 'Trial Codes', href: '/admin/trial-codes',   icon: Gift },
  { label: 'Broadcast',   href: '/admin/broadcast',     icon: Megaphone },
  { label: 'Payments',    href: '/admin/payments',      icon: Receipt },
  { label: 'Audit Log',   href: '/admin/audit-log',     icon: ScrollText },
  { label: 'Debug Logs', href: '/admin/debug-logs',    icon: Bug },
];

export const Sidebar: React.FC = () => {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const onAdminPage = location.startsWith('/admin');
  const [adminExpanded, setAdminExpanded] = useState(onAdminPage);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Panels',   href: '/bots',       icon: Bot },
    { label: 'Billing',   href: '/billing',     icon: CreditCard },
    { label: 'Settings',  href: '/settings',    icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen bg-[--bg-secondary] border-r border-[--border] flex flex-col sticky top-0 overflow-y-auto">
      <div className="p-8 shrink-0">
        <Link href="/dashboard">
          <Logo className="cursor-pointer" />
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map(item => {
          const isActive = location === item.href ||
            (item.href !== '/dashboard' && location.startsWith(item.href) && !location.startsWith('/admin'));
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer group relative',
                isActive
                  ? 'bg-[--accent-glow] text-[--accent-primary]'
                  : 'text-[--text-secondary] hover:bg-[--bg-tertiary] hover:text-[--text-primary]'
              )}>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[--accent-primary] rounded-r-full" />
                )}
                <item.icon size={20} className={cn(isActive ? 'text-[--accent-primary]' : 'group-hover:text-[--text-primary]')} />
                <span className="font-bold text-sm">{item.label}</span>
                {isActive && <ChevronRight size={16} className="ml-auto opacity-50" />}
              </div>
            </Link>
          );
        })}

        {/* Admin section */}
        {isAdmin && (
          <div className="pt-2">
            <button
              onClick={() => setAdminExpanded(v => !v)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative',
                onAdminPage
                  ? 'text-orange-400 bg-orange-400/10'
                  : 'text-[--text-secondary] hover:bg-[--bg-tertiary] hover:text-[--text-primary]'
              )}>
              <ShieldCheck size={20} />
              <span className="font-bold text-sm flex-1 text-left">Admin</span>
              <ChevronDown size={15} className={cn('opacity-50 transition-transform', adminExpanded && 'rotate-180')} />
            </button>

            {adminExpanded && (
              <div className="ml-3 mt-1 pl-3 border-l border-[--border] space-y-0.5">
                {adminLinks.map(item => {
                  const isActive = location === item.href ||
                    (item.href !== '/admin' && location.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-sm',
                        isActive
                          ? 'text-orange-400 bg-orange-400/10 font-bold'
                          : 'text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-tertiary] font-medium'
                      )}>
                        <item.icon size={15} />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-[--border] shrink-0">
        <div className="p-4 rounded-2xl bg-[--bg-tertiary]/50 border border-[--border] mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[--accent-glow] flex items-center justify-center text-[--accent-primary] font-bold text-sm shrink-0">
              {user?.fullName.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate">{user?.fullName}</span>
              <span className="text-[10px] text-[--text-muted] truncate">{user?.email}</span>
            </div>
          </div>
          <PlanBadge plan={(user?.plan as 'free_trial' | 'starter' | 'developer' | 'pro') ?? 'free_trial'} className="w-full text-center py-1" />
        </div>

        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start gap-3 px-4 py-3 h-auto rounded-xl text-[--danger] hover:bg-[--danger]/10 hover:text-[--danger]">
          <LogOut size={20} />
          <span className="font-bold text-sm">Logout</span>
        </Button>
      </div>
    </aside>
  );
};
