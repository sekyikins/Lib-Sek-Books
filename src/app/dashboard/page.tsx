'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  FiBook, 
  FiUsers, 
  FiClock, 
  FiTrendingUp, 
  FiPlus, 
  FiArrowRight, 
  FiBookOpen,
  FiActivity
} from 'react-icons/fi';

// Quick Action Component
interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'default';
}

const QuickAction: React.FC<QuickActionProps> = ({ 
  title, 
  description, 
  icon, 
  onClick, 
  variant = 'default' 
}) => (
  <Card hoverable className="h-full border-none shadow-lg shadow-black/5" onClick={onClick}>
    <CardContent className="p-6 flex flex-col h-full">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
        variant === 'primary' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
      }`}>
        {icon}
      </div>
      <h4 className="font-bold text-lg mb-2">{title}</h4>
      <p className="text-sm text-secondary-foreground mb-6 flex-1">{description}</p>
      <Button variant={variant === 'primary' ? 'primary' : 'outline'} size="sm" className="w-fit">
        Get Started <FiArrowRight className="ml-2" />
      </Button>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center bg-background">
        <div className="text-lg font-medium text-primary animate-pulse">Initializing Lib-Sek...</div>
        <div className="relative border-4 border-primary/20 border-t-primary rounded-full w-16 h-16 animate-spin">
          <div className="absolute inset-0 border-4 border-transparent border-b-primary/40 rounded-full animate-spin-slow"></div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Hero Welcome Section */}
      <section className="relative overflow-hidden rounded-3xl bg-primary px-8 py-12 text-primary-foreground shadow-2xl shadow-primary/20 ring-1 ring-white/10 mt-2">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">
            Welcome back, <span className="text-white/90">{user?.name || 'Researcher'}</span>!
          </h1>
          <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed">
            Your personal digital library is ready. Explore over <span className="text-white font-bold">12,000+</span> titles, 
            manage your collections, and track your reading journey with Lib-Sek Books.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button variant="secondary" onClick={() => router.push('/library')} className="font-bold">
              <FiBookOpen className="mr-2" /> Browse Library
            </Button>
            {isAdmin && (
              <Button variant="success" onClick={() => router.push('/add-books')} className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold">
                <FiPlus className="mr-2" /> Add New Book
              </Button>
            )}
          </div>
        </div>
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 -ml-20 -mb-20 w-64 h-64 bg-black/10 rounded-full blur-2xl"></div>
        <FiBook className="absolute -bottom-10 right-10 text-[20rem] text-white/5 -rotate-12 pointer-events-none" />
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Collections" 
          value="12,456" 
          icon={<FiBook />} 
          trend={{ value: 12, isUp: true }}
          description="Available for borrowing"
        />
        <StatCard 
          title="Active Members" 
          value="1,280" 
          icon={<FiUsers />} 
          trend={{ value: 5, isUp: true }}
          description="Registered researchers"
        />
        <StatCard 
          title="Borrowed Books" 
          value="432" 
          icon={<FiClock />} 
          description="Currently in circulation"
        />
        <StatCard 
          title="Weekly Growth" 
          value="14.2%" 
          icon={<FiTrendingUp />} 
          trend={{ value: 2.1, isUp: true }}
          description="User engagement rate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center">
                <FiActivity className="mr-2 text-primary" /> Quick Actions
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <QuickAction 
                title="Browse Library" 
                description="Explore our vast collection of digital books and research materials across all genres."
                icon={<FiBookOpen className="text-2xl" />}
                variant="primary"
                onClick={() => router.push('/library')}
              />
              <QuickAction 
                title="Borrow History" 
                description="View your past and current borrowings, return dates, and reading progress."
                icon={<FiClock className="text-2xl" />}
                onClick={() => router.push('/borrow-history')}
              />
            </div>
          </section>

          {/* Recent Activity Mockup */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="font-bold text-lg">System Updates</h3>
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { type: 'Update', info: 'Open Library sync completed', time: '2 hours ago', icon: <FiTrendingUp className="text-green-500" /> },
                { type: 'Security', info: 'All accounts migrated to v2 auth', time: 'Yesterday', icon: <FiActivity className="text-blue-500" /> },
                { type: 'Inventory', info: 'Added 120 new technical books', time: '2 days ago', icon: <FiPlus className="text-purple-500" /> }
              ].map((activity, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className="p-2 bg-muted rounded-lg">{activity.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{activity.info}</p>
                    <p className="text-xs text-secondary-foreground mt-1">{activity.type} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar/Notifications */}
        <div className="space-y-8">
          <Card variant="glass" className="bg-primary/5 border-primary/10">
            <CardHeader>
              <h3 className="font-bold">Librarian&apos;s Note</h3>
            </CardHeader>
            <CardContent>
              <div className="bg-background/50 rounded-xl p-4 border border-primary/10 mb-4 italic text-sm text-balance">
                &quot;Welcome to the new Lib-Sek experience. We&apos;ve enhanced the library to be more interactive and easier to navigate. Happy reading!&quot;
              </div>
              <p className="text-xs text-secondary-foreground font-medium">- Mr. Sekyi, Lead Librarian</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-bold">Member Privileges</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                'Unlimited Digital Downloads',
                'Advanced Search Filters',
                'Book Request Management',
                'Reading Progress Tracking'
              ].map((item, i) => (
                <div key={i} className="flex items-center text-sm font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-3"></div>
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
