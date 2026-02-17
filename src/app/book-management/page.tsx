'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Role } from '@/types/auth';

type ManagedBook = {
  id: number;
  title: string;
  author: string;
  file_link: string;
  added_at?: string;
};

type BookPayload = {
  title: string;
  author: string;
  file_link: string;
};

export default function BookManagementPage() {
  const { isLoading } = useAuth();
  const [books, setBooks] = useState<ManagedBook[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingBook, setEditingBook] = useState<ManagedBook | null>(null);
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

  const handleCreate = () => {
    setIsCreating(true);
    setEditingBook(null);
    setError('');
  };

  const handleEdit = (book: ManagedBook) => {
    setEditingBook(book);
    setIsCreating(false);
    setError('');
  };

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

  const handleSave = async (bookData: BookPayload) => {
    setError('');

    try {
      if (isCreating) {
        const response = await fetch('/api/books-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookData),
        });

        const result = await response.json();
        if (!response.ok) {
          setError(result.error || 'Failed to create book.');
          return;
        }
      } else if (editingBook) {
        const response = await fetch(`/api/books-admin/${editingBook.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookData),
        });

        const result = await response.json();
        if (!response.ok) {
          setError(result.error || 'Failed to update book.');
          return;
        }
      }

      setIsCreating(false);
      setEditingBook(null);
      await fetchBooks();
    } catch {
      setError('Failed to save book.');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingBook(null);
    setError('');
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
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Book Management</h1>
                <div className="space-x-4">
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-green-600 text-sm font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-offset-2 focus:ring-green-600"
                  >
                    Add New Book
                  </button>
                  <a
                    href="/dashboard"
                    className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-gray-600 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
                  >
                    Back to Dashboard
                  </a>
                </div>
              </div>

              {error && (
                <div className="mb-6 rounded-md border border-red-300 bg-red-50 p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {(isCreating || editingBook) && (
                <div className="bg-white p-6 rounded-lg shadow mb-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {isCreating ? 'Add New Book' : 'Edit Book'}
                  </h2>
                  <BookForm
                    book={editingBook}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                </div>
              )}

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Lib-Sek Books Inventory ({} Books)
                  </h3>

                  {loading ? (
                    <div className="text-center py-12">
                      <div className="text-lg text-gray-600">Loading books...</div>
                      <div className="border-b-3 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
                    </div>
                  ) : (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Title
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Author
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                              <td className="px-6 py-4 text-sm text-gray-500 align-top break-all">
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 align-top">
                                <button
                                  onClick={() => handleEdit(book)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(book.id)}
                                  className="text-red-600 hover:text-red-900"
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
      </div>
    </ProtectedRoute>
  );
}

interface BookFormProps {
  book?: ManagedBook | null;
  onSave: (bookData: BookPayload) => void;
  onCancel: () => void;
}

function BookForm({ book, onSave, onCancel }: BookFormProps) {
  const [formData, setFormData] = useState<BookPayload>({
    title: book?.title || '',
    author: book?.author || '',
    file_link: book?.file_link || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Author *</label>
          <input
            type="text"
            required
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">File Link *</label>
        <input
          type="url"
          required
          value={formData.file_link}
          onChange={(e) => setFormData({ ...formData, file_link: e.target.value })}
          placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="flex space-x-4">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-indigo-700 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-gray-600 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
