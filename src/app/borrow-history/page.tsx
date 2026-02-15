'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BorrowRecord } from '@/types/books';
import { Role } from '@/types/auth';

export default function BorrowHistoryPage() {
  const { isAuthenticated, isLoading, user, hasRolePermission } = useAuth();
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
    alert('Book returned successfully!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'returned':
        return 'bg-green-100 text-green-800';
      case 'borrowed':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center">
        <div className="text-lg text-blue-600">Loading...</div>
        <div className="border-b-3 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole={Role.USER}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Borrow History</h1>
              <p className="text-lg text-gray-600">View your borrowing records and manage returns</p>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="text-lg text-gray-600">Loading borrow history...</div>
                  </div>
                ) : borrowRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No borrow records found.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Book ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Borrow Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Due Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Return Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fine
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {borrowRecords.map((record) => (
                          <tr key={record.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #{record.bookId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.borrowDate.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.dueDate.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.returnDate ? record.returnDate.toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.fine ? `$${record.fine.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {record.status === 'borrowed' && hasRolePermission('return', 'books') && (
                                <button
                                  onClick={() => handleReturn(record.id)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  Return Book
                                </button>
                              )}
                              {record.status === 'overdue' && (
                                <span className="text-red-600 text-xs">Please return book</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
