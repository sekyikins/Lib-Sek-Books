'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Book } from '@/types/books';
import { FiArrowLeft } from 'react-icons/fi';

export default function BookDetailsPage() {
  const searchParams = useSearchParams();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Parse book data from URL parameters
  useEffect(() => {
    try {
      const bookData = searchParams.get('book');
      if (bookData) {
        const parsedBook = JSON.parse(decodeURIComponent(bookData));
        setBook(parsedBook);
      } else {
        setError('Book not found');
      }
    } catch (err) {
      setError('Failed to load book details');
      console.error('Error parsing book data:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center">
        <div className="text-lg text-blue-600">Loading book details...</div>
        <div className="border-b-3 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error || 'Book not found'}</div>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm shadow-lg font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
          >
            <FiArrowLeft className="mr-2" />
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 shadow-lg border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors"
            >
              <FiArrowLeft className="mr-2" />
              Back to Library
            </button>
          </div>

          {/* Book Details Card */}
          <div className="bg-blue-50 shadow-lg rounded-lg overflow-hidden">
            <div className="md:flex">
              {/* Book Cover */}
              <div className="md:w-1/3 bg-gray-200 relative h-96 md:h-auto shadow-lg">
                {book.coverUrl ? (
                  <Image 
                    src={book.coverUrl}
                    alt={book.title}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <span className="text-6xl">📚</span>
                    <p className="mt-2">No cover available</p>
                  </div>
                </div>
              </div>

              {/* Book Information */}
              <div className="md:w-2/3 p-8">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h1>
                  <p className="text-xl text-gray-600 mb-4">By {book.author}</p>
                  
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {book.language && (
                      <span className="inline-block px-3 py-1 text-sm font-bold bg-gray-100 text-gray-700 rounded-2xl">
                        🌐 {book.language}
                      </span>
                    )}
                    {book.publishedDate && (
                      <span className="inline-block px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-2xl">
                        📅 {new Date(book.publishedDate).getFullYear()}
                      </span>
                    )}
                    {book.isbn && (
                      <span className="inline-block px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-2xl">
                        ISBN: {book.isbn}
                      </span>
                    )}
                    {book.genre && (
                      <span className="flex gap-1 px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-2xl">
                        📚 <span>{book.genre}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {book.description && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
                    <p className="text-gray-700 leading-relaxed">{book.description}</p>
                  </div>
                )}

                {/* Availability */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Availability</h2>
                  <div className="text-sm text-gray-600">
                    <p>📖 Digital Book - Unlimited Access</p>
                    {book.totalCopies !== undefined && (
                      <p className="mt-1">
                        {book.available ? '✅ Available' : '❌ Currently Unavailable'}
                        {book.totalCopies > 0 && ` (${book.totalCopies - (book.borrowedCopies || 0)}/${book.totalCopies} copies)`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      const params = new URLSearchParams({
                        title: book.title,
                        author: book.author,
                        description: book.description || ''
                      });
                      window.location.href = `/book-request?${params.toString()}`;
                    }}
                    className="flex-1 py-3 px-6 rounded-md text-sm border-2 border-green-600 shadow-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    📥 Request This Book
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Book Details</h3>
              <dl className="space-y-2">
                {book.id && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">ID:</dt>
                    <dd className="text-sm text-gray-900">{book.id}</dd>
                  </div>
                )}
                {book.publishedDate && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Published:</dt>
                    <dd className="text-sm text-gray-900">{new Date(book.publishedDate).toLocaleDateString()}</dd>
                  </div>
                )}
                {book.language && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Language:</dt>
                    <dd className="text-sm text-gray-900">{book.language}</dd>
                  </div>
                )}
                {book.genre && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Genre:</dt>
                    <dd className="text-sm text-gray-900">{book.genre}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Library Information</h3>
              <dl className="space-y-2">
                {book.createdAt && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Added to Library:</dt>
                    <dd className="text-sm text-gray-900">{new Date(book.createdAt).toLocaleDateString()}</dd>
                  </div>
                )}
                {book.totalCopies !== undefined && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Total Copies:</dt>
                    <dd className="text-sm text-gray-900">{book.totalCopies}</dd>
                  </div>
                )}
                {book.borrowedCopies !== undefined && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Borrowed Copies:</dt>
                    <dd className="text-sm text-gray-900">{book.borrowedCopies}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
