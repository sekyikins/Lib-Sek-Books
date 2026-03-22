'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Drawer on Mobile, Fixed on Desktop */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`flex flex-col min-h-screen transition-all duration-500 ${isSidebarOpen ? 'lg:pl-64' : 'lg:pl-64'}`}>
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
        <footer className="p-2 md:p-4 border-t border-border mt-auto">
          <p className="text-center text-[10px] md:text-xs text-secondary-foreground uppercase tracking-widest leading-loose">
            &copy; {new Date().getFullYear()} <span className="text-primary font-black">Lib-Sek Books</span>. 
            Digital Excellence in Library Management.
          </p>
        </footer>
      </div>
    </div>
  );
};
