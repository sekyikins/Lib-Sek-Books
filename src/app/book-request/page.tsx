'use client';

import { useState, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FiSend, FiBook, FiUser, FiInfo, FiMail, FiCheckCircle, FiAlertCircle, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';

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
      <div className="min-h-full flex flex-col gap-5 items-center justify-center bg-background">
        <div className="text-lg font-medium text-primary animate-pulse">Consulting Archives...</div>
        <div className="border-4 border-primary/20 border-t-primary rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pt-4 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-3">
              Request <span className="text-primary">New Titles</span>
            </h1>
            <p className="text-secondary-foreground font-medium text-lg leading-relaxed">
              Can&apos;t find what you&apos;re looking for? Submit your request and our curators 
              will attempt to source the digital edition for you.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.replace('/library')} className="rounded-xl shrink-0">
            <FiArrowLeft className="mr-2" /> Back to Library
          </Button>
        </div>

        {succeeded ? (
          <Card className="border-none shadow-2xl shadow-primary/10 overflow-hidden animate-in zoom-in-95 duration-500">
            <CardContent className="p-12 text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <FiCheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Request Successfully Lodged</h2>
                <p className="text-secondary-foreground max-w-md mx-auto">
                  Our team has received your request. We&apos;ll notify you at <strong>{email}</strong> 
                  the moment the title becomes available in our digital stacks.
                </p>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="primary" onClick={() => router.replace('/library')} className="px-8 rounded-xl h-12 shadow-xl shadow-primary/20">
                  Return to Library
                </Button>
                <Button variant="outline" onClick={() => {
                  setSucceeded(false);
                  setTitle('');
                  setAuthor('');
                  setDescription('');
                  setError('');
                }} className="px-8 rounded-xl h-12">
                  <FiRefreshCw className="mr-2" /> Submit Another
                </Button>
              </div>
              <p className="text-xs text-secondary-foreground pt-4 flex items-center justify-center gap-1.5 font-medium">
                <FiInfo className="w-3 h-3" /> Check your spam folder if you don&apos;t see our confirmation email.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-xl shadow-black/5 overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border p-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FiSend />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Request Details</h3>
                <p className="text-xs text-secondary-foreground font-medium uppercase tracking-wider">Fill in the book metadata</p>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleFormSubmit} className="space-y-8">
                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <FiAlertCircle className="shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-bold text-foreground flex items-center gap-2">
                      <FiMail className="text-primary" /> Delivery Email <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none font-medium"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-bold text-foreground flex items-center gap-2">
                      <FiBook className="text-primary" /> Desired Title <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      required
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setError(''); }}
                      className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none font-medium"
                      placeholder="Full book title"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="author" className="text-sm font-bold text-foreground flex items-center gap-2">
                      <FiUser className="text-primary" /> Author / Creator <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      id="author"
                      required
                      value={author}
                      onChange={(e) => { setAuthor(e.target.value); setError(''); }}
                      className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none font-medium"
                      placeholder="Name of the author"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="status" className="text-sm font-bold text-foreground flex items-center gap-2">
                      <FiInfo className="text-primary" /> Current Status
                    </label>
                    <input
                      type="text"
                      disabled
                      value="Priority Sourcing"
                      className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-secondary-foreground font-bold cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FiInfo className="text-primary" /> Context & Metadata (Optional)
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setError(''); }}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none font-medium min-h-[120px]"
                    placeholder="Provide ISBN, publisher, edition, or any other details that help us find the exact version you need..."
                  />
                </div>

                <div className="flex items-center justify-between gap-4 pt-6 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setTitle('');
                      setAuthor('');
                      setDescription('');
                      setEmail('');
                      setError('');
                    }}
                    className="px-8 rounded-xl h-12 font-bold"
                  >
                    Clear Form
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="px-10 rounded-xl h-12 font-bold shadow-xl shadow-primary/20"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-2">
                        <FiSend /> Send Request
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function BookRequestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full flex flex-col gap-5 items-center justify-center bg-background">
        <div className="border-4 border-primary/20 border-t-primary rounded-full w-12 h-12 animate-spin"></div>
      </div>
    }>
      <BookRequestContent />
    </Suspense>
  );
}
