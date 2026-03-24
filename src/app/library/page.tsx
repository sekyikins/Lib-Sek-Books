'use client';

import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Book } from '@/types/books';
import { OpenLibraryAPI } from '@/services/openlibrary';
import { FiArrowUp, FiSearch, FiBook, FiDownload, FiArrowRight, FiArrowLeft, FiPlus } from 'react-icons/fi';
import Image from 'next/image';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Utility function to truncate text at word boundaries
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  const lastSpaceIndex = text.lastIndexOf(' ', maxLength - 3);
  if (lastSpaceIndex > maxLength * 0.6) {
    return text.substring(0, lastSpaceIndex) + '...';
  }
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

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchBooks = useCallback(async (query: string = '', page: number = 0) => {
    setLoading(true);
    setError('');
    
    try {
      let searchQuery = query;
      if (!query && page === 0) {
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
        searchQuery = currentSearchQuery;
      }
      
      const response = await OpenLibraryAPI.searchBooks(searchQuery, page, 20);
      
      const booksWithDetails = await Promise.all(
        response.docs.map(async (book) => {
          try {
            const workId = book.key.split('/').pop() || book.key;
            const details = await OpenLibraryAPI.getBookDetails(workId);
            return OpenLibraryAPI.convertToBookWithDetails(book, details);
          } catch (error) {
            console.warn('Failed to fetch details for book:', book.title, error);
            return OpenLibraryAPI.convertToBook(book);
          }
        })
      );
      
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
    if (currentPage === 0 || currentSearchQuery) {
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
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
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
    debouncedSearch(value);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      setPageInput('');
      scrollToTop();
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNumber = parseInt(pageInput);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      handlePageChange(pageNumber - 1);
    } else {
      setError(`Please enter a valid page number between 1 and ${totalPages}`);
      setTimeout(() => setError(''), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex flex-col gap-5 items-center justify-center bg-background">
        <div className="text-lg font-medium text-primary animate-pulse">Loading Library...</div>
        <div className="border-4 border-primary/20 border-t-primary rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 mt-2">
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
            Library <span className="text-primary">Catalog</span>
          </h1>
          <p className="text-secondary-foreground font-medium">
            Explore <span className="text-foreground font-bold">{totalResults.toLocaleString()}</span> books in our shared collection.
          </p>
        </div>

        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
          <form onSubmit={handleSearch} className="w-full md:w-96 relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by title, author, or genre..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-lg shadow-black/5"
            />
          </form>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => router.push('/book-request')} className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50">
              <FiPlus className="mr-2" /> Request a Book
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Card className="bg-destructive/10 border-destructive/20 mb-8">
          <CardContent className="p-4 text-destructive font-medium flex items-center">
            <span className="mr-2">⚠️</span> {error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-4">
              <div className="aspect-3/4 bg-muted rounded-2xl"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {books.map((book) => (
              <Card 
                key={book.id} 
                hoverable 
                className="group border border-border bg-card/90 backdrop-blur-md shadow-2xl shadow-black/5"
                onClick={() => {
                  const bookData = encodeURIComponent(JSON.stringify(book));
                  router.push(`/book/${book.id}?book=${bookData}`);
                }}
              >
                <div className="aspect-3/4 relative overflow-hidden bg-muted/30">
                  {book.coverUrl ? (
                    <Image 
                      src={book.coverUrl} 
                      alt={book.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-secondary-foreground p-8 text-center opacity-50">
                      <FiBook className="text-4xl mb-2" />
                      <span className="text-sm font-medium">No cover image</span>
                    </div>
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px] flex items-center justify-center">
                    <Button variant="secondary" size="sm" className="shadow-2xl font-bold">
                      View Details
                    </Button>
                  </div>
                </div>
                
                <CardContent className="p-5">
                  <h3 className="font-bold text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs text-secondary-foreground font-medium mb-3">
                    By {truncateText(book.author, 30)}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {book.genre && (
                      <span className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider">
                        {truncateText(book.genre.split(',')[0], 15)}
                      </span>
                    )}
                    {book.language && (
                      <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-bold rounded-lg uppercase tracking-wider">
                        {book.language}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="flex-1 rounded-xl h-10 text-xs font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        const params = new URLSearchParams({
                          title: book.title,
                          author: book.author,
                          description: book.description || ''
                        });
                        router.push(`/book-request?${params.toString()}`);
                      }}
                    >
                      Request
                    </Button>
                    {isAuthenticated && hasRolePermission('borrow', 'books') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl h-10 w-10 p-0 flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          OpenLibraryAPI.downloadBook(book.id);
                        }}
                      >
                        <FiDownload />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="rounded-xl px-4"
              >
                <FiArrowLeft className="mr-2" /> Prev
              </Button>
              
              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder={String(currentPage + 1)}
                  className="w-14 h-9 text-center bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-bold"
                />
                <span className="text-sm text-secondary-foreground font-medium">of {totalPages}</span>
              </form>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="rounded-xl px-4"
              >
                Next <FiArrowRight className="ml-2" />
              </Button>
            </div>
          )}

          {books.length === 0 && (
            <Card className="max-w-md mx-auto mt-12 py-12 text-center border-dashed bg-transparent">
              <FiSearch className="text-5xl text-secondary-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No matching books</h3>
              <p className="text-secondary-foreground mb-8">We couldn&apos;t find any titles matching your search. Would you like to request one?</p>
              <Button onClick={() => router.push('/book-request')} variant="primary">
                Make a Request
              </Button>
            </Card>
          )}
        </>
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          variant="primary"
          size="icon"
          onClick={scrollToTop}
          className="fixed bottom-10 right-10 w-12 h-12 rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 z-50 ring-4 ring-primary/20"
          aria-label="Back to top"
        >
          <FiArrowUp className="text-2xl" />
        </Button>
      )}
    </DashboardLayout>
  );
}
