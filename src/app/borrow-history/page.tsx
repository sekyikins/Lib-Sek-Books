'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BorrowRecord } from '@/types/books';
import { Role } from '@/types/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FiClock, FiCheckCircle, FiAlertCircle, FiBookOpen, FiCalendar, FiDollarSign, FiCornerUpLeft, FiArrowLeft } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

export default function BorrowHistoryPage() {
  const { isAuthenticated, isLoading, user, hasRolePermission } = useAuth();
  const router = useRouter();
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock borrow records
  const mockBorrowRecords = useMemo((): BorrowRecord[] => [
    {
      id: '1',
      userId: user?.id || 'user1',
      bookId: '1',
      borrowDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      returnDate: new Date('2024-02-10'),
      status: 'returned',
      createdAt: new Date(),
    },
    {
      id: '2',
      userId: user?.id || 'user1',
      bookId: '2',
      borrowDate: new Date('2024-02-01'),
      dueDate: new Date('2024-03-01'),
      status: 'borrowed',
      createdAt: new Date(),
    },
    {
      id: '3',
      userId: user?.id || 'user1',
      bookId: '3',
      borrowDate: new Date('2023-12-01'),
      dueDate: new Date('2024-01-01'),
      returnDate: undefined,
      status: 'overdue',
      fine: 5.00,
      createdAt: new Date(),
    }
  ], [user?.id]);

  useEffect(() => {
    const fetchBorrowHistory = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      try {
        // In a real app, fetch from API
        setTimeout(() => {
          setBorrowRecords(mockBorrowRecords);
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Error fetching borrow history:', err);
        setLoading(false);
      }
    };

    fetchBorrowHistory();
  }, [isAuthenticated, mockBorrowRecords]);

  const handleReturn = (recordId: string) => {
    setBorrowRecords(prev => 
      prev.map(record => 
        record.id === recordId 
          ? { ...record, status: 'returned' as const, returnDate: new Date() }
          : record
      )
    );
    // In a real app, this would be a toast notification
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'returned':
        return { 
          color: 'bg-green-500/10 text-green-600 border-green-500/20', 
          icon: <FiCheckCircle className="mr-1.5" />,
          label: 'Returned'
        };
      case 'borrowed':
        return { 
          color: 'bg-primary/10 text-primary border-primary/20', 
          icon: <FiBookOpen className="mr-1.5" />,
          label: 'Active'
        };
      case 'overdue':
        return { 
          color: 'bg-destructive/10 text-destructive border-destructive/20', 
          icon: <FiAlertCircle className="mr-1.5" />,
          label: 'Overdue'
        };
      default:
        return { 
          color: 'bg-muted/10 text-secondary-foreground border-muted/20', 
          icon: <FiClock className="mr-1.5" />,
          label: status 
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex flex-col gap-5 items-center justify-center bg-background">
        <div className="text-lg font-medium text-primary animate-pulse">Retrieving History...</div>
        <div className="border-4 border-primary/20 border-t-primary rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole={Role.USER}>
      <DashboardLayout>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-2">
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
              Borrow <span className="text-primary">History</span>
            </h1>
            <p className="text-secondary-foreground font-medium">
              Track your reading journey and manage active digital loans.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.replace('/library')} className="rounded-xl">
            <FiArrowLeft className="mr-2" /> Back to Library
          </Button>
        </div>

        <Card className="border-none shadow-xl shadow-black/5 overflow-hidden">
          <CardHeader className="p-6 bg-muted/20 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <FiClock className="text-primary" /> Loan Records
            </h3>
            <span className="text-xs font-bold px-2.5 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">
              {borrowRecords.length} TOTAL RECORDS
            </span>
          </CardHeader>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-secondary-foreground font-medium">Loading history...</p>
            </div>
          ) : borrowRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center text-secondary-foreground mb-4">
                <FiBookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">No Records Found</h3>
              <p className="text-secondary-foreground max-w-xs mx-auto">
                You haven&apos;t borrowed any books yet. Explore our collection to start reading!
              </p>
              <Button variant="primary" onClick={() => router.push('/library')} className="mt-6 rounded-xl">
                Browse Library
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-6 py-4 text-xs font-bold text-secondary-foreground uppercase tracking-wider">Book Identity</th>
                    <th className="px-6 py-4 text-xs font-bold text-secondary-foreground uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-4 text-xs font-bold text-secondary-foreground uppercase tracking-wider">Loan Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-secondary-foreground uppercase tracking-wider">Fines</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-secondary-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {borrowRecords.map((record) => {
                    const status = getStatusConfig(record.status);
                    return (
                      <tr key={record.id} className="group hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-secondary-foreground font-bold text-xs">
                              ID
                            </div>
                            <span className="font-bold text-foreground">#{record.bookId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center text-xs font-medium text-secondary-foreground">
                              <FiCalendar className="mr-1.5 w-3 h-3" /> Borrowed: {record.borrowDate.toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-xs font-bold text-foreground">
                              <FiClock className="mr-1.5 w-3 h-3 text-primary" /> Due: {record.dueDate.toLocaleDateString()}
                            </div>
                            {record.returnDate && (
                              <div className="flex items-center text-xs font-medium text-green-600">
                                <FiCheckCircle className="mr-1.5 w-3 h-3" /> Returned: {record.returnDate.toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-all ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-mono text-sm">
                          {record.fine ? (
                            <span className="text-destructive font-bold flex items-center">
                              <FiDollarSign className="mr-0.5" />{record.fine.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-secondary-foreground">None</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          {record.status === 'borrowed' && hasRolePermission('return', 'books') ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleReturn(record.id)}
                              className="rounded-lg hover:bg-primary/10 hover:text-primary text-xs font-bold"
                            >
                              <FiCornerUpLeft className="mr-1.5" /> Return Now
                            </Button>
                          ) : record.status === 'overdue' ? (
                            <span className="text-destructive text-xs font-black uppercase tracking-tighter animate-pulse">Return Immediately</span>
                          ) : (
                            <span className="text-secondary-foreground text-xs font-bold uppercase tracking-widest">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
