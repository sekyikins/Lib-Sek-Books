'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Role } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { FiPlus } from 'react-icons/fi';

type ManagedBook = {
  id: number;
  title: string;
  author: string;
  file_link: string;
  added_at?: string;
};


export default function BookManagementPage() {
  const { isLoading } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<ManagedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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


  const handleDelete = async (bookId: number) => {
    if (!confirm('Are you sure you want to delete this book?')) {
      return;
    }

    setError('');
    try {
      const response = await fetch(`/api/books-admin/${bookId}`, {
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


  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center">
        <div className="text-lg text-blue-600">Loading...</div>
        <div className="border-b-3 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole={Role.ADMIN}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-4 md:p-8">
              <div className="flex justify-between flex-col md:flex-row items-center mb-6 gap-2">
                <h1 className="text-3xl font-bold text-gray-900">Book Management</h1>
                <div className="flex justify-around space-x-4">
                  <button
                    title='Add Books'
                    onClick={() => router.push('/add-books')}
                    className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-blue-600 text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                  >
                    <FiPlus className="mr-2" />
                    Add Books
                  </button>
                  <button
                    title='Back to Dashboard'
                    onClick={() => router.replace('/dashboard')}
                    className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-gray-600 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
                  >
                    <span className='hidden md:inline'>Back to</span>&nbsp; Dashboard
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-6 rounded-md border border-red-300 bg-red-50 p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}


                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Lib-Sek Books Inventory ({books.length} Books)
                  </h3>

                  {loading ? (
                    <div className="text-center py-12">
                      <div className="text-lg text-blue-500">Loading books...</div>
                      <div className="border-b-3 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
                    </div>
                  ) : (
                    <div className="overflow-y-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Title
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Author
                            </th>
                            <th className="w-[10%] py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              File Link
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Added At
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {books.map((book) => (
                            <tr key={book.id}>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900 align-top">
                                {book.title}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 align-top">
                                {book.author}
                              </td>
                              <td className="py-4 text-sm text-gray-500 align-top break-all">
                                <a
                                  href={book.file_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 underline"
                                >
                                  Open link
                                </a>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                                {book.added_at ? new Date(book.added_at).toLocaleString() : '-'}
                              </td>
                              <td className="flex justify-around py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button
                                  title='Edit Book'
                                  onClick={() => router.push(`/add-books?edit=${book.id}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author)}&link=${encodeURIComponent(book.file_link)}`)}
                                  className="text-indigo-600 hover:text-indigo-900 hover:cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  title='Delete From Library'
                                  onClick={() => handleDelete(book.id)}
                                  className="text-red-600 hover:text-red-900 hover:cursor-pointer"
                                >
                                  Delete
                                </button>
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

