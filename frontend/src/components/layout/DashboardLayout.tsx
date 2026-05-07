import React from 'react';
import { useLocation } from 'wouter';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MobileTopBar } from './MobileTopBar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';

interface Props { children: React.ReactNode; fullHeight?: boolean; }

export const DashboardLayout: React.FC<Props> = ({ children, fullHeight }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [location] = useLocation();

  if (fullHeight) {
    return (
      <div className="h-screen bg-[--bg-primary] text-[--text-primary] flex flex-col md:flex-row overflow-hidden">
        {!isMobile && <Sidebar />}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {isMobile && <MobileTopBar />}
          <main className={`flex-1 flex flex-col overflow-hidden min-h-0 ${isMobile ? 'pt-20 pb-24' : ''}`}>
            {children}
          </main>
          {isMobile && <BottomNav />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--bg-primary] text-[--text-primary] flex flex-col md:flex-row">
      {!isMobile && <Sidebar />}
      <div className="flex-1 flex flex-col min-h-screen relative">
        {isMobile && <MobileTopBar />}
        <main className={`flex-1 p-4 md:p-8 ${isMobile ? 'pb-24 pt-20' : ''} max-w-7xl mx-auto w-full`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        {isMobile && <BottomNav />}
      </div>
    </div>
  );
};
