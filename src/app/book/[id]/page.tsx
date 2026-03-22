'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Book } from '@/types/books';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FiArrowLeft, FiBook, FiUser, FiCalendar, FiGlobe, FiLayers, FiInfo, FiCheckCircle, FiXCircle, FiDownload } from 'react-icons/fi';

function BookDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
        setError('Book not found in archives');
      }
    } catch (err) {
      setError('Failed to extract book metadata');
      console.error('Error parsing book data:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center bg-background">
        <div className="text-lg font-medium text-primary animate-pulse">Consulting the Librarian...</div>
        <div className="border-4 border-primary/20 border-t-primary rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Card className="max-w-md w-full border-destructive/20 shadow-2xl shadow-destructive/5 text-center p-8">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive mb-6">
            <FiXCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Record Not Found</h2>
          <p className="text-secondary-foreground mb-8">
            {error || 'The requested book detail could not be retrieved from our archives.'}
          </p>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="w-full rounded-xl"
          >
            <FiArrowLeft className="mr-2" /> Back to Library
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto pt-4 pb-12">
        {/* Back Button */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="rounded-xl hover:bg-muted font-bold text-secondary-foreground hover:text-foreground transition-all"
          >
            <FiArrowLeft className="mr-2" /> Back to Archive
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Book Cover */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
            <Card className="overflow-hidden border-none shadow-2xl shadow-black/10 aspect-[3/4.5] relative rounded-2xl group">
              {book.coverUrl ? (
                <Image 
                  src={book.coverUrl}
                  alt={book.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`absolute inset-0 bg-muted flex items-center justify-center ${book.coverUrl ? 'hidden' : ''}`}>
                <div className="text-center">
                  <FiBook className="w-16 h-16 text-secondary-foreground/30 mx-auto mb-4" />
                  <p className="text-secondary-foreground/50 font-bold uppercase tracking-widest text-xs">No Cover Image</p>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-6 pt-20">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tighter bg-primary text-primary-foreground mb-2">
                  DIGITAL EDITION
                </span>
                <p className="text-white/60 text-xs font-medium uppercase tracking-widest leading-none">Catalog ID: {book.id?.split('-')[0] || 'N/A'}</p>
              </div>
            </Card>
          </div>

          {/* Right Column: Information */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                {book.title}
              </h1>
              <div className="flex items-center gap-2 group cursor-pointer w-fit">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <FiUser className="w-4 h-4" />
                </div>
                <p className="text-xl font-bold text-secondary-foreground group-hover:text-primary transition-colors">
                  {book.author}
                </p>
              </div>

              {/* Metadata Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                {book.language && (
                  <span className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold bg-muted/50 text-foreground rounded-xl border border-border">
                    <FiGlobe className="mr-2 h-3.5 w-3.5 text-primary" /> {book.language}
                  </span>
                )}
                {book.publishedDate && (
                  <span className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold bg-primary/10 text-primary rounded-xl border border-primary/20">
                    <FiCalendar className="mr-2 h-3.5 w-3.5" /> {new Date(book.publishedDate).getFullYear()}
                  </span>
                )}
                {book.isbn && (
                  <span className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold bg-muted/50 text-foreground rounded-xl border border-border">
                    <FiLayers className="mr-2 h-3.5 w-3.5 text-primary" /> ISBN: {book.isbn}
                  </span>
                )}
                {book.genre && (
                  <span className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold bg-muted/50 text-foreground rounded-xl border border-border">
                    <FiInfo className="mr-2 h-3.5 w-3.5 text-primary" /> {book.genre}
                  </span>
                )}
              </div>
            </div>

            {/* Description Card */}
            {book.description && (
              <Card className="border-none shadow-xl shadow-black/5">
                <CardHeader className="p-6 bg-muted/20 border-b border-border">
                  <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <FiInfo className="text-primary" /> Overview & Synopsis
                  </h2>
                </CardHeader>
                <CardContent className="p-6 lg:p-8">
                  <p className="text-secondary-foreground text-lg leading-relaxed whitespace-pre-line">
                    {book.description}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Availability Stats */}
              <Card className="border-none shadow-xl shadow-black/5 h-full">
                <CardHeader className="p-6 bg-muted/20 border-b border-border">
                  <h3 className="font-bold text-foreground">Library Access</h3>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <span className="text-sm font-medium text-secondary-foreground">Format</span>
                    <span className="text-sm font-bold text-foreground">Digital / PDF</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <span className="text-sm font-medium text-secondary-foreground">Availability</span>
                    <span className="flex items-center text-sm font-bold text-green-600">
                      <FiCheckCircle className="mr-1.5" /> Instant Load
                    </span>
                  </div>
                  {book.totalCopies !== undefined && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <span className="text-sm font-medium text-secondary-foreground">Copies Available</span>
                      <span className="text-sm font-bold text-foreground">
                        {book.totalCopies - (book.borrowedCopies || 0)} / {book.totalCopies}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Details */}
              <Card className="border-none shadow-xl shadow-black/5 h-full">
                <CardHeader className="p-6 bg-muted/20 border-b border-border">
                  <h3 className="font-bold text-foreground">Technical Info</h3>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <span className="text-sm font-medium text-secondary-foreground">Added On</span>
                    <span className="text-sm font-bold text-foreground">
                      {book.createdAt ? new Date(book.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <span className="text-sm font-medium text-secondary-foreground">Archive Source</span>
                    <span className="text-sm font-bold text-foreground">Global Registry</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Area */}
            <div className="pt-4 mt-auto">
              <Button
                variant="primary"
                onClick={() => {
                  const params = new URLSearchParams({
                    title: book.title,
                    author: book.author,
                    description: book.description || ''
                  });
                  router.push(`/book-request?${params.toString()}`);
                }}
                className="w-full h-16 rounded-2xl text-lg font-bold flex items-center justify-center gap-3"
              >
                <FiDownload className="w-6 h-6" />
                Request Digital Access
              </Button>
              <p className="text-center text-xs text-secondary-foreground mt-4 font-medium italic">
                Sourcing an electronic copy may take up to 24 hours depending on the archive status.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function BookDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center bg-background">
        <div className="border-4 border-primary/20 border-t-primary rounded-full w-12 h-12 animate-spin"></div>
      </div>
    }>
      <BookDetailsContent />
    </Suspense>
  );
}
