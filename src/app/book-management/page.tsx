'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Role } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { FiPlus, FiEdit2, FiTrash2, FiExternalLink, FiLayers, FiSearch } from 'react-icons/fi';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';

type ManagedBook = {
  id: string;
  title: string;
  author: string;
  file_link: string;
  added_at?: string;
  isbn?: string;
  description?: string;
  published_date?: string;
  language?: string;
  genre?: string;
};

export default function BookManagementPage() {
  const { isLoading } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<ManagedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBooks = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/books-admin', { method: 'GET' });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Failed to load books.');
        return;
      }
      setBooks(Array.isArray(result.books) ? result.books : []);
    } catch {
      setError('Failed to load books.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleDelete = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book?')) {
      return;
    }

    setError('');
    try {
      const response = await fetch(`/api/books-admin?id=${bookId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Failed to delete book.');
        return;
      }
      await fetchBooks();
    } catch {
      setError('Failed to delete book.');
    }
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center bg-background">
        <div className="text-lg font-medium text-primary animate-pulse">Accessing Inventories...</div>
        <div className="border-4 border-primary/20 border-t-primary rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole={Role.ADMIN}>
      <DashboardLayout>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-2">
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
              Book <span className="text-primary">Management</span>
            </h1>
            <p className="text-secondary-foreground font-medium">
              Maintain the Lib-Sek digital archives and manage local inventory.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={() => router.push('/add-books')} variant="primary" className="rounded-xl shadow-lg">
              <FiPlus className="mr-2" /> Add New Book
            </Button>
          </div>
        </div>

        {/* Inventory Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Total Books" 
            value={books.length} 
            icon={<FiLayers />} 
            description="Stored in local database"
          />
          <StatCard 
            title="Recent Additions" 
            value={books.filter(b => b.added_at && new Date(b.added_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} 
            icon={<FiPlus className="text-green-500" />} 
            description="Added in the last 7 days"
          />
          <StatCard 
            title="Access Rate" 
            value="High" 
            icon={<FiSearch className="text-blue-500" />} 
            description="System-wide visibility"
          />
        </div>

        <Card className="border-none shadow-xl shadow-black/5 overflow-visible">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-muted/20">
            <h3 className="text-lg font-bold">Local Inventory</h3>
            <div className="relative w-full md:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-foreground" />
              <input 
                type="text" 
                placeholder="Filter by title or author..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {error && (
              <div className="m-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="border-4 border-primary/20 border-t-primary rounded-full w-10 h-10 animate-spin"></div>
                <p className="text-sm font-medium text-secondary-foreground">Syncing inventory...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/10">
                      <th className="px-6 py-4 text-xs font-bold text-secondary-foreground uppercase tracking-wider">Book Information</th>
                      <th className="px-6 py-4 text-xs font-bold text-secondary-foreground uppercase tracking-wider">Genre & Language</th>
                      <th className="px-6 py-4 text-xs font-bold text-secondary-foreground uppercase tracking-wider">Storage Link</th>
                      <th className="px-6 py-4 text-xs font-bold text-secondary-foreground uppercase tracking-wider">Managed At</th>
                      <th className="px-6 py-4 text-xs font-bold text-secondary-foreground uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredBooks.map((book) => (
                      <tr key={book.id} className="hover:bg-muted/5 transition-colors group">
                        <td className="px-6 py-5">
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors">{book.title}</p>
                          <p className="text-xs text-secondary-foreground mt-0.5">By {book.author}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-1.5">
                            {book.genre && (
                              <span className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-lg border border-primary/10">
                                {book.genre}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-bold rounded-lg">
                              {book.language || 'English'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <a
                            href={book.file_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-xs font-bold text-primary hover:underline"
                          >
                            <FiExternalLink className="mr-1" /> Open File
                          </a>
                        </td>
                        <td className="px-6 py-5 text-xs text-secondary-foreground font-medium">
                          {book.added_at ? new Date(book.added_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-9 h-9 p-0 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                              onClick={() => {
                                const params = new URLSearchParams({
                                  edit: book.id,
                                  title: book.title,
                                  author: book.author,
                                  link: book.file_link,
                                  isbn: book.isbn || '',
                                  description: book.description || '',
                                  published_date: book.published_date || '',
                                  language: book.language || 'English',
                                  genre: book.genre || ''
                                });
                                router.push(`/add-books?${params.toString()}`);
                              }}
                            >
                              <FiEdit2 className="text-sm" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-9 h-9 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                              onClick={() => handleDelete(book.id)}
                            >
                              <FiTrash2 className="text-sm" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredBooks.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-secondary-foreground text-sm font-medium italic">
                          No books found in inventory matching your filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

