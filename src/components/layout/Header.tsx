import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  FiSearch, FiBell, FiUser, FiMoon, FiSun, FiHome, FiBook, 
  FiClock, FiPlusSquare, FiLayers, FiSettings, FiSend, FiArrowRight,
  FiMenu
} from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';

const APP_FEATURES = [
  { name: 'Dashboard', path: '/dashboard', description: 'Overview and stats', icon: <FiHome /> },
  { name: 'Library', path: '/library', description: 'Browse all books', icon: <FiBook /> },
  { name: 'My History', path: '/borrow-history', description: 'View your loan history', icon: <FiClock /> },
  { name: 'Add Books', path: '/add-books', description: 'Catalog new digital titles', icon: <FiPlusSquare /> },
  { name: 'Inventories', path: '/book-management', description: 'Manage total collection', icon: <FiLayers /> },
  { name: 'Admin Panel', path: '/admin', description: 'System & user settings', icon: <FiSettings /> },
  { name: 'Book Request', path: '/book-request', description: 'Request new titles', icon: <FiSend /> },
];

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Simple breadcrumb logic
  const pageTitle = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';
  const capitalizedTitle = pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1);

  const filteredFeatures = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return APP_FEATURES.filter(f => 
      f.name.toLowerCase().includes(query) || 
      f.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setIsMobileSearchOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowResults(false);
        setIsMobileSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    // Lock scrolling on the main container behind the header when search is open
    const isSearchActive = isMobileSearchOpen || (showResults && searchQuery.trim().length > 0);
    const mainEl = document.getElementById('main-scroll-container');
    
    if (mainEl) {
      if (isSearchActive && window.innerWidth < 768) {
        mainEl.style.overflowY = 'hidden';
      } else {
        mainEl.style.overflowY = 'auto';
      }
    }
    
    return () => {
      if (mainEl) {
        mainEl.style.overflowY = 'auto';
      }
    };
  }, [isMobileSearchOpen, showResults, searchQuery]);

  return (
    <>
      <header className="h-16 md:h-20 border-b border-ring px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 backdrop-blur-lg">
      <div className="flex items-center gap-4 min-w-0">
        {/* Mobile Menu Toggle */}
        <Button 
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden rounded-xl shrink-0"
        >
          <FiMenu className="text-xl" />
        </Button>

        <div className="hidden sm:block text-left min-w-0">
          <h2 className="text-sm md:text-lg font-bold text-foreground capitalize truncate">
            {capitalizedTitle}
          </h2>
          <div className="flex items-center text-[10px] md:text-xs text-secondary-foreground uppercase tracking-widest truncate">
            <span>Home</span>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-primary font-black truncate">{capitalizedTitle}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end space-x-3 md:space-x-6 min-w-0 ml-4">
        <div ref={searchRef} className="relative group block w-8 md:w-full md:max-w-72 lg:max-w-96 min-w-0">
          <div className="relative">
            <Button 
              variant="ghost"
              size="icon"
              className="md:hidden rounded-xl"
              onClick={() => {
                setIsMobileSearchOpen(!isMobileSearchOpen);
                if (!isMobileSearchOpen) {
                  setTimeout(() => searchRef.current?.querySelector('input')?.focus(), 50);
                }
              }}
            >
              <FiSearch className="text-xl" />
            </Button>
            <div className="hidden md:block">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-secondary-foreground group-focus-within:text-primary z-10" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder="Search resources, books, users..." 
                className="w-full bg-card backdrop-blur-md border border-ring shadow-2xl rounded-xl pl-11 pr-6 py-2.5 text-sm font-medium outline-none transition-all duration-300 placeholder:text-muted-foreground/50 hover:border-primary/50 hover:bg-card/80 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 focus:shadow-xl focus:shadow-black/5"
              />
            </div>
          </div>

          {/* Search Results & Mobile Search Dropdown */}
          {(isMobileSearchOpen || (showResults && searchQuery.trim())) && (
            <div className="fixed top-[70px] left-4 right-4 md:absolute md:top-14 md:left-0 md:right-auto md:w-full glass border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
              
              {/* Mobile Search Input */}
              {isMobileSearchOpen && (
                <div className="md:hidden p-3 border-b border-border/50 bg-card/50">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ring z-50" />
                    <input 
                      autoFocus
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowResults(true);
                      }}
                      placeholder="Search resources, books, users..." 
                      className="w-full bg-background backdrop-blur-md border border-ring shadow-sm rounded-xl pl-10 pr-4 py-3 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchQuery.trim() && (
                <>
                  <div className="p-2 border-b border-border/50 bg-muted/20">
                    <span className="text-[10px] font-bold text-secondary-foreground uppercase tracking-widest pl-2">App Features</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 bg-card/50 backdrop-blur-md">
                    {filteredFeatures.length > 0 ? (
                      filteredFeatures.map((feature) => (
                        <Button
                          key={feature.path}
                          variant="ghost"
                          onClick={() => {
                            router.push(feature.path);
                            setShowResults(false);
                            setIsMobileSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full justify-between! p-3 rounded-xl hover:bg-primary/10 transition-all group border-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {feature.icon}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-foreground leading-none">{feature.name}</p>
                              <p className="text-[10px] text-secondary-foreground mt-1 font-medium">{feature.description}</p>
                            </div>
                          </div>
                          <FiArrowRight className="text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </Button>
                      ))
                    ) : (
                      <div className="p-8 text-center bg-card/50 backdrop-blur-md">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 text-secondary-foreground/30">
                          <FiSearch className="text-2xl" />
                        </div>
                        <p className="text-xs font-bold text-secondary-foreground">No matches found for &quot;{searchQuery}&quot;</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 md:space-x-4 border-l border-border pl-4 md:pl-6 shrink-0">
          {/* Theme Toggle Button */}
          <Button 
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-xl"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <FiMoon className="text-lg md:text-xl" /> : <FiSun className="text-lg md:text-xl" />}
          </Button>

          <Button 
            variant="ghost"
            size="icon"
            className="relative rounded-xl group"
          >
            <FiBell className="text-lg md:text-xl group-hover:text-primary transition-colors" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full border-2 border-background animate-pulse"></span>
          </Button>
          
          <div className="flex items-center space-x-2 md:space-x-3 p-1 md:p-1.5 pr-2 md:pr-3 rounded-xl hover:bg-accent transition-all duration-200 cursor-pointer">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/20">
              {user?.name?.[0] || <FiUser />}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[10px] md:text-xs font-bold leading-none">{user?.name || 'Guest'}</p>
              <p className="text-[8px] md:text-[10px] text-secondary-foreground font-medium mt-1 uppercase tracking-tighter">
                {user?.role || 'Visitor'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>

      {/* Mobile Search Backdrop Overlay */}
      {isMobileSearchOpen && (
        <div 
          className="fixed inset-0 top-16 bg-black/50 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-300 overscroll-contain touch-none"
          onClick={() => {
            setIsMobileSearchOpen(false);
            setShowResults(false);
          }}
        />
      )}
    </>
  );
};
