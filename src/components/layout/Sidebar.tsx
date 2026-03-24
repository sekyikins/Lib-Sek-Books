'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  FiHome, 
  FiBook, 
  FiBookOpen, 
  FiClock, 
  FiSettings, 
  FiLogOut,
  FiPlusSquare,
  FiLayers,
  FiX
} from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ href, icon, label, active, onClick }) => (
  <Link
    href={href}
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/30 border-primary' 
        : 'bg-ring/5 text-secondary-foreground hover:bg-ring/20 shadow-md hover:shadow-black/20 border-transparent'
    } border`}
  >
    <span className={`text-xl transition-transform duration-300 group-hover:scale-110 ${active ? '' : 'text-primary/80 group-hover:text-primary'}`}>
      {icon}
    </span>
    <span className="font-medium">{label}</span>
  </Link>
);

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isAuthenticated } = useAuth();

  const menuItems = [
    { href: '/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { href: '/library', icon: <FiBook />, label: 'Library' },
    { href: '/borrow-history', icon: <FiClock />, label: 'My History' },
  ];

  const adminItems = [
    { href: '/book-management', icon: <FiLayers />, label: 'Inventories' },
    { href: '/add-books', icon: <FiPlusSquare />, label: 'Add Books' },
    { href: '/admin', icon: <FiSettings />, label: 'Admin Panel' },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-dvh w-64 bg-accent border-r border-ring flex flex-col z-50 transition-transform duration-500 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-start justify-between px-4 py-3 md:py-5 border-b border-ring">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <FiBookOpen className="text-2xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Lib-Sek</h1>
            <p className="text-[10px] font-semibold text-primary uppercase tracking-widest -mt-1">Books Manager</p>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        <Button 
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="lg:hidden rounded-xl"
        >
          <FiX className="text-xl" />
        </Button>
      </div>

      <nav className="flex-1 space-y-2 px-4 mt-8 overflow-y-auto">
        <div className="text-[10px] font-bold text-secondary-foreground uppercase tracking-[0.2em] px-4 mb-4">
          Main Menu
        </div>
        {menuItems.map((item) => (
          <SidebarItem 
            key={item.href} 
            {...item} 
            active={pathname === item.href} 
            onClick={onClose}
          />
        ))}

        {isAuthenticated && isAdmin && (
          <>
            <div className="text-[10px] font-bold text-secondary-foreground uppercase tracking-[0.2em] px-4 mt-8 mb-4">
              Admin Only
            </div>
            {adminItems.map((item) => (
              <SidebarItem 
                key={item.href} 
                {...item} 
                active={pathname === item.href} 
                onClick={onClose}
              />
            ))}
          </>
        )}
      </nav>

      <div className="mt-auto p-4 border-t border-border">
        {isAuthenticated ? (
          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="w-full justify-start px-4 h-12 space-x-3 text-secondary-foreground hover:bg-destructive/10 hover:text-destructive group rounded-xl"
          >
            <FiLogOut className="text-xl rotate-180 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Sign Out</span>
          </Button>
        ) : (
          <Button
            onClick={() => router.push('/auth/signin')}
            className="w-full justify-start px-4 h-12 space-x-3 rounded-xl"
          >
            <FiLogOut className="text-xl" />
            <span className="font-medium">Sign In</span>
          </Button>
        )}
      </div>
    </aside>
  );
};
