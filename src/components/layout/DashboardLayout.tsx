'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const mainEl = document.getElementById('main-scroll-container');
    if (!mainEl) return;
    // Lock scrolling on the main container only when mobile sidebar is open
    if (isSidebarOpen && window.innerWidth < 1024) {
      mainEl.style.overflowY = 'hidden';
    } else {
      mainEl.style.overflowY = 'auto';
    }
    return () => {
      mainEl.style.overflowY = 'auto';
    };
  }, [isSidebarOpen]);

  return (
    <div className="h-dvh w-full bg-background overflow-hidden flex relative">
      {/* Sidebar - Drawer on Mobile, Fixed on Desktop */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-45 lg:hidden animate-in fade-in duration-300 overscroll-contain touch-none"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`flex flex-col flex-1 h-dvh min-w-0 transition-all duration-500 ${isSidebarOpen ? 'lg:pl-64' : 'lg:pl-64'}`}>
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main id="main-scroll-container" className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
        <footer className="shrink-0 p-2 md:p-4 border-t border-border">
          <p className="text-center text-[10px] md:text-xs text-secondary-foreground uppercase tracking-widest leading-loose">
            &copy; {new Date().getFullYear()} <span className="text-primary font-black">Lib-Sek Books</span>. 
            Digital Excellence in Library Management.
          </p>
        </footer>
      </div>
    </div>
  );
};
