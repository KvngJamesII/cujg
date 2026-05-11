import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Boxes, CreditCard, Settings, Shield, Bell, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bots', label: 'Panels', icon: Boxes },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function Brand() {
  return (
    <Link href="/dashboard">
      <div className="flex items-center gap-2 cursor-pointer group">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-white text-sm"
          style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow-orange)' }}>R3</div>
        <span className="font-extrabold tracking-tight text-[15px]">Redon3</span>
      </div>
    </Link>
  );
}

function NavLink({ to, label, icon: Icon, active, onClick }: { to: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; active: boolean; onClick?: () => void }) {
  return (
    <Link href={to}>
      <div onClick={onClick} className="relative cursor-pointer">
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'text-white' : 'text-[--text-secondary] hover:text-white'}`}
          style={active ? { background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.20)' } : { border: '1px solid transparent' }}>
          <Icon size={17} className={active ? 'text-[--accent-primary]' : ''} />
          <span>{label}</span>
          {active && <motion.div layoutId="nav-dot" className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-primary)' }} />}
        </div>
      </div>
    </Link>
  );
}

export const DashboardLayout: React.FC<{ children: React.ReactNode; fullHeight?: boolean }> = ({ children, fullHeight }) => {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = React.useState(false);

  const sidebarContent = (
    <>
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <Brand />
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((n) => (
          <NavLink key={n.to} {...n} active={location.startsWith(n.to)} onClick={() => setOpen(false)} />
        ))}
        {user?.role === 'admin' && (
          <>
            <div className="pt-4 pb-2 px-3 text-[10px] uppercase tracking-widest text-[--text-muted] font-bold">Admin</div>
            <NavLink to="/admin" label="Console" icon={Shield} active={location.startsWith('/admin') && location === '/admin'} onClick={() => setOpen(false)} />
            <NavLink to="/admin/users" label="Users" icon={Boxes} active={location === '/admin/users'} onClick={() => setOpen(false)} />
            <NavLink to="/admin/payments" label="Payments" icon={CreditCard} active={location === '/admin/payments'} onClick={() => setOpen(false)} />
            <NavLink to="/admin/broadcast" label="Broadcast" icon={Bell} active={location === '/admin/broadcast'} onClick={() => setOpen(false)} />
          </>
        )}
      </nav>
      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--accent-gradient)' }}>
            {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{user?.fullName}</div>
            <div className="text-[11px] text-[--text-muted] truncate">{user?.plan ? user.plan.toUpperCase() + ' plan' : 'No plan'}</div>
          </div>
          <button onClick={() => logout()} className="p-1.5 rounded-md hover:bg-white/5 text-[--text-muted] hover:text-white transition" aria-label="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden text-[--text-primary]"
      style={{ background: 'var(--bg-primary)' }}>
      {/* desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        {sidebarContent}
      </aside>

      {/* mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <Brand />
        <button onClick={() => setOpen(true)} className="p-2 rounded-md hover:bg-white/5" aria-label="Menu">
          <Menu size={20} />
        </button>
      </div>

      {/* mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col"
              style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
              <button onClick={() => setOpen(false)} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-white/5 z-10" aria-label="Close">
                <X size={18} />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className={`flex-1 overflow-hidden flex flex-col ${fullHeight ? '' : 'overflow-y-auto'}`}>
        {fullHeight ? children : (
          <AnimatePresence mode="wait">
            <motion.div key={location}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="p-4 md:p-8 max-w-7xl w-full mx-auto">
              {children}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
};
