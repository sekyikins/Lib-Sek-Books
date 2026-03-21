'use client';

import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Book } from '@/types/books';
import { OpenLibraryAPI } from '@/services/openlibrary';
import { FiSearch } from 'react-icons/fi';
import Image from 'next/image';

// Utility function to truncate text at word boundaries
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  
  // Find the last space before maxLength to avoid cutting words
  const lastSpaceIndex = text.lastIndexOf(' ', maxLength - 3);
  if (lastSpaceIndex > maxLength * 0.6) { // Only truncate at word boundary if it's not too early
    return text.substring(0, lastSpaceIndex) + '...';
  }
  
  // Fallback: truncate at character level
  return text.substring(0, maxLength - 3) + '...';
};

export default function LibraryPage() {
  const { isAuthenticated, isLoading, hasRolePermission } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [pageInput, setPageInput] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle scroll to show/hide back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const fetchBooks = useCallback(async (query: string = '', page: number = 0) => {
    console.log('fetchBooks called with:', { query, page });
    setLoading(true);
    setError('');
    
    try {
      console.log('Making API call to Open Library...');
      // For random books, use different approach only on initial load
      let searchQuery = query;
      if (!query && page === 0) {
        // Use random terms for variety only on initial load
        const randomTerms = [
          'classic','literature', 'fiction', 'adventure',
          'mystery', 'romance', 'history', 'science', 'philosophy',
          'poetry', 'english', 'tales', 'fairy', 'fantasy',
          'engineering', 'biography', 'comics', 'cookbooks',
          'health', 'self-help', 'travel', 'young adult', 'math',
          'finance', 'law', 'success', 'sci-fi', 
        ];
        searchQuery = randomTerms[Math.floor(Math.random() * randomTerms.length)];
        setCurrentSearchQuery(searchQuery);
      } else if (!query && currentSearchQuery) {
        // Use the same search query for pagination
        searchQuery = currentSearchQuery;
      }
      
      const response = await OpenLibraryAPI.searchBooks(searchQuery, page, 20);
      console.log('API response:', response);
      
      // Fetch detailed information for each book to get genres and descriptions
      const booksWithDetails = await Promise.all(
        response.docs.map(async (book) => {
          try {
            const workId = book.key.split('/').pop() || book.key;
            const details = await OpenLibraryAPI.getBookDetails(workId);
            return OpenLibraryAPI.convertToBookWithDetails(book, details);
          } catch (error) {
            console.warn('Failed to fetch details for book:', book.title, error);
            // Fallback to basic conversion if details fetch fails
            return OpenLibraryAPI.convertToBook(book);
          }
        })
      );
      
      console.log('Converted books with details:', booksWithDetails);
      setBooks(booksWithDetails);
      setTotalPages(Math.ceil(response.numFound / 20));
      setTotalResults(response.numFound);
    } catch (err) {
      console.error('API Error:', err);
      setError('Failed to fetch books. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentSearchQuery]);

  useEffect(() => {
    // Fetch on initial load or when currentPage changes
    if (currentPage === 0 || currentSearchQuery) {
      console.log('Fetching books with query:', currentSearchQuery || 'random (default)');
      fetchBooks(currentSearchQuery || '', currentPage);
    }
  }, [currentPage, fetchBooks, currentSearchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    setCurrentSearchQuery(searchTerm);
    fetchBooks(searchTerm, 0);
  };

  const debouncedSearch = useCallback((query: string) => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(0);
      setCurrentSearchQuery(query);
      fetchBooks(query, 0);
    }, 500);
  }, [fetchBooks]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setError('');
    
    // Trigger debounced search for any input (including empty)
      debouncedSearch(value);
  };

  const handleDownload = async (book: Book) => {
    try {
      await OpenLibraryAPI.downloadBook(book.id);
    } catch (err) {
      setError('Failed to download book');
      console.error('Download Error:', err);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      setPageInput('');
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNumber = parseInt(pageInput);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      handlePageChange(pageNumber - 1); // Convert to 0-based index
    } else {
      setError(`Please enter a valid page number between 1 and ${totalPages}`);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
    setError(''); // Clear error when user starts typing
  };

  const handleBorrow = (bookId: string) => {
    if (!isAuthenticated) {
      setError('Please sign in to borrow books');
      return;
    }
    
    if (!hasRolePermission('borrow', 'books')) {
      setError('You do not have permission to borrow books');
      return;
    }

    // For digital books, borrowing means downloading
    const book = books.find(b => b.id === bookId);
    if (book) {
      handleDownload(book);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center">
        <div className="text-lg text-blue-600">Loading...</div>
        <div className="border-4 border-blue-500 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            <div className="flex justify-start gap-5 items-start">
            <div className="mb-8 w-full">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Lib-Sek <span className="hidden md:inline">Books</span></h1>
              <div className="text-lg text-gray-600">
                <div className="flex items-center gap-3">
                    <span className="hidden md:inline text-blue-600 font-medium"> ({totalResults} books found)</span>
                  <button
                    title='Request a book'
                    onClick={() => router.push('/book-request')}
                    className="inline-flex items-center p-2 text-sm font-medium shadow-lg border border-indigo-600 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                  >
                    📝 
                    <span className="">Request a Book</span>
                  </button>
                </div>
              </div>
            </div>
            {/* Search Bar */}
            <div className="w-[130%] flex flex-col items-end">
              <form onSubmit={handleSearch} title='Search for your prefered book' className="w-full flex items-center gap-2 px-3 py-2 mb-2 bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                <FiSearch className="text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search books by title, author, or genre..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full bg-transparent outline-none text-gray-800 placeholder-gray-400"
                />
              </form>

              <span className="text-sm md:px-2 text-gray-700">
                Discover your next favorite book
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Books Grid */}
          {loading ? (
            <div className="flex flex-col gap-2 justify-center items-center h-64">
              <div className="text-lg text-blue-600">Loading books...</div>
              <div className="border-4 border-blue-500 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => (
                <div 
                  key={book.id} 
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    const bookData = encodeURIComponent(JSON.stringify(book));
                    router.push(`/book/${book.id}?book=${bookData}`);
                  }}
                  title='View book details'
                >
                  <div className="h-48 bg-gray-200 relative">
                    {book.coverUrl ? (
                      <Image 
                        src={book.coverUrl} 
                        alt={book.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover shadow-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span>📚 No cover available</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{book.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{truncateText(`By ${book.author}`, 30)}</p>
                    
                    {/* Language and Genre Info on same line */}
                    <div className="text-sm text-gray-600 mb-2">
                      {book.language && book.genre ? (
                        <span>🌐 {book.language} • 📚 {truncateText(book.genre, 20)}</span>
                      ) : book.language ? (
                        <span>🌐 {book.language}</span>
                      ) : book.genre ? (
                        <span>📚 {truncateText(book.genre, 30)}</span>
                      ) : null}
                    </div>
                    
                    {/* Book Description - 3 lines max */}
                    {book.description && (
                      <div className="text-sm text-gray-700 mb-3">
                        <p className="overflow-hidden" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical'
                        }}>{truncateText(book.description, 120)}</p>
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-500 mb-3">
                      <p>📖 Digital Book - Unlimited Access</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const params = new URLSearchParams({
                            title: book.title,
                            author: book.author,
                            description: book.description || ''
                          });
                          router.push(`/book-request?${params.toString()}`);
                        }}
                        title='Request this book'
                        className="flex-1 py-2 px-4 rounded-md text-sm shadow-lg font-medium bg-green-500 border-2 border-green-600 text-white hover:bg-green-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        📥 Request
                      </button>
                      {isAuthenticated && hasRolePermission('borrow', 'books') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBorrow(book.id);
                          }}
                          title='Borrow this book'
                          className="flex-1 py-2 px-4 rounded-md text-sm shadow-lg font-medium bg-blue-500 border-2 border-blue-600 text-white hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                        >
                          📚 Borrow
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-3 py-1 rounded-md bg-white border shadow-lg border-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
              >
                Prev.
              </button>
              
              <form onSubmit={handlePageInputSubmit} className="flex items-center space-x-1">
                <input
                  type="text"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  onFocus={() => setPageInput((currentPage + 1).toString())}
                  placeholder={String(currentPage + 1)}
                  className="w-12 p-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center"
                />
                <span className="text-sm text-gray-600">of {totalPages}</span>
              </form>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="px-3 py-1 rounded-md bg-white border shadow-lg border-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
              >
                Next
              </button>
            </div>
          )}

          {books.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">No books found matching your search.</p>
              {currentSearchQuery && (
                <div className="mt-4">
                  <p className="text-gray-600 mb-4">Ask for it to be sent to you.</p>
                  <button 
                    title='Request a book'
                    onClick={() => router.push('/book-request')}
                    className="inline-flex items-center p-3 text-sm font-medium border border-indigo-600 text-indigo-600 shadow-lg bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                  >
                    📝 Request a Book
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-16 right-10 p-3 border-2 border-indigo-600 bg-indigo-300 text-indigo-600 rounded-full shadow-lg hover:bg-indigo-400 hover:scale-105 transition-all duration-300 z-50 flex items-center justify-center focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
          aria-label="Back to top"
          title='Back to top'
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </>
  );
}
