'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useForm, ValidationError } from '@formspree/react';

export default function BookRequestPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const searchParams = useSearchParams();
  const [state, handleSubmit] = useForm("mpqjdnoz");
  
  // Get initial values from URL parameters
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
    
    // Clear previous errors
    setError('');
    
    // Client-side validation
    if (!title.trim() && !author.trim()) {
      setError('Please provide at least a title or author');
      return;
    }

    if (!email.trim()) {
      setError('Please provide your email address');
      return;
    }

    // Formspree will handle the actual submission
    const formData = new FormData();
    formData.append('title', title);
    formData.append('author', author);
    formData.append('description', description);
    formData.append('email', email);
    formData.append('userType', isAuthenticated ? (user?.role || 'user') : 'guest');
    
    // Submit to Formspree
    try {
      await handleSubmit(e);
    } catch (err) {
      setError('Failed to submit request. Please try again.');
      console.error('Request submission error:', err);
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
        <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Request a Book</h1>
              <p className="text-lg text-gray-600 mb-6">
                Can{"'"}t find what you{"'"}re looking for? Let us know and we{"'"}ll try to add it to our collection!
              </p>
              {!isAuthenticated && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800 text-sm">
                    <strong>Not signed in?</strong> You can still request a book! Just provide your email address so we can contact you when it{"'"}s available.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 shadow rounded-lg">
              <div className="px-4 py-6 sm:p-6">
                {state.succeeded ? (
                  <div className="text-center py-8">
                    <div className="text-green-600 text-lg font-medium mb-2">✅ Request Submitted Successfully!</div>
                    <p className="text-gray-600">
                      Thank you for your book request! We{"'"}ll review it and let you know when it{"'"}s available in our library.
                    </p>
                    <button
                      type="button"
                      onClick={() => window.location.href = '/library'}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Back to Library
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    {error && (
                      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {error}
                      </div>
                    )}
                    
                    {state.errors && state.errors.length > 0 && (
                      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {state.errors.map((error, index) => (
                          <p key={index}>{error.message}</p>
                        ))}
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
                          setError(''); // Clear error when user starts typing
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Enter the email address to receive the book"
                      />
                      <ValidationError 
                        prefix="Email" 
                        field="email"
                        errors={state.errors}
                      />
                    </div>

                    {/* Hidden field for user type */}
                    <input type="hidden" name="userType" value={isAuthenticated ? (user?.role || 'user') : 'guest'} />

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
                          setError(''); // Clear error when user starts typing
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Enter the book title"
                      />
                      <ValidationError 
                        prefix="Title" 
                        field="title"
                        errors={state.errors}
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
                          setError(''); // Clear error when user starts typing
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Enter the author name"
                      />
                      <ValidationError 
                        prefix="Author" 
                        field="author"
                        errors={state.errors}
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
                          setError(''); // Clear error when user starts typing
                        }}
                        rows={4}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Any additional information about the book (ISBN, publisher, year, etc.)"
                      />
                      <ValidationError 
                        prefix="Description" 
                        field="description"
                        errors={state.errors}
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
                        className="px-4 py-2 text-sm font-medium text-gray-700 border-2 border-gray-400 bg-gray-200 hover:bg-gray-300 shadow-lg rounded-md transition-colors"
                      >
                        Clear
                      </button>
                      
                      <button
                        type="submit"
                        disabled={state.submitting}
                        className="px-6 py-2 text-sm font-medium text-white border-2 border-blue-600 bg-indigo-600 hover:bg-indigo-700 shadow-lg rounded-md transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {state.submitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Submitting...</span>
                          </div>
                        ) : (
                          "Submit Request"
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
