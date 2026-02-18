'use client';

import { useState, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams, useRouter } from 'next/navigation';

function BookRequestContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const initialTitle = searchParams.get('title') || '';
  const initialAuthor = searchParams.get('author') || '';
  const initialDescription = searchParams.get('description') || '';

  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState(initialAuthor);
  const [description, setDescription] = useState(initialDescription);
  const [email, setEmail] = useState(user?.email || '');
  const [error, setError] = useState('');

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!title.trim() && !author.trim()) {
      setError('Please provide at least a title or author');
      return;
    }

    if (!email.trim()) {
      setError('Please provide your email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/book-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          author,
          description,
          email,
          userType: isAuthenticated ? (user?.role || 'user') : 'guest',
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Failed to submit request. Please try again.');
        return;
      }

      setSucceeded(true);
    } catch (err) {
      setError('Failed to submit request. Please try again.');
      console.error('Request submission error:', err);
    } finally {
      setIsSubmitting(false);
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
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Request a Book</h1>
            <p className="text-lg text-gray-600 mb-6">
              Can{"'"}t find what you{"'"}re looking for? Submit your request and we will email the book if available.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg shadow-lg">
            <div className="px-4 py-6">
              {succeeded ? (
                <div className="text-center py-8">
                  <div className="text-green-600 text-lg font-medium mb-2">✅ Request Submitted Successfully!</div>
                  <p className="text-gray-700" >
                    Your request has been sent to the bot. If available, the book will be sent to your email.
                  </p>
                  <p className="text-gray-600" >Check your spam if you don&apos;t receive any email.</p>
                  <div className='flex justify-center gap-2 w-full'>
                    <button
                      type="button"
                      onClick={() => router.replace('/library')}
                      className="mt-4 inline-flex items-center px-4 py-2 shadow-lg border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-100 focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                    >
                      Back to Library
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSucceeded(false);
                        setTitle('');
                        setAuthor('');
                        setDescription('');
                        setError('');
                      }}
                      className="mt-4 inline-flex items-center px-4 py-2 shadow-lg border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-100 focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                    >
                      Request Again
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {error && (
                    <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Book Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setError('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="Enter the book title"
                    />
                  </div>

                  <div>
                    <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
                      Author <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="author"
                      name="author"
                      value={author}
                      onChange={(e) => {
                        setAuthor(e.target.value);
                        setError('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="Enter the author name"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Details (Optional)
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setError('');
                      }}
                      rows={4}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="Any additional information about the book (ISBN, publisher, year, etc.)"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setTitle('');
                        setAuthor('');
                        setDescription('');
                        setEmail('');
                        setError('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border-2 border-gray-400 bg-gray-200 hover:bg-gray-300 shadow-lg rounded-md transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                    >
                      Clear
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 text-sm font-medium text-white border-2 border-blue-600 bg-indigo-600 hover:bg-indigo-700 shadow-lg rounded-md transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Submitting...</span>
                        </div>
                      ) : (
                        'Submit Request'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookRequestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookRequestContent />
    </Suspense>
  );
}
