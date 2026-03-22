'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Role } from '@/types/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiPlus, FiUpload, FiCheck, FiAlertCircle, FiX, FiFileText, FiImage, FiInfo, FiLayers, FiTrash2 } from 'react-icons/fi';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface BookData {
  title: string;
  author: string;
  file: File | null;
  coverFile: File | null;
  isbn?: string;
  description?: string;
  published_date?: string;
  language?: string;
  genre?: string;
}

interface TagInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

function TagInput({ label, value, onChange, placeholder, required }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const tags = value.split(',').map(t => t.trim()).filter(t => t !== '');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const values = inputValue.split(',').map(v => v.trim()).filter(v => v !== '');
    if (values.length > 0) {
      const newUniqueTags = values.filter(v => !tags.includes(v));
      if (newUniqueTags.length > 0) {
        const newTags = [...tags, ...newUniqueTags];
        onChange(newTags.join(', '));
      }
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags.join(', '));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="flex flex-wrap gap-2 p-2 bg-card border border-border rounded-xl focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary transition-all min-h-[46px]">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            {tag}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeTag(i)}
              className="ml-1.5 h-4 w-4 min-h-0 min-w-0 p-0 text-primary/70 hover:text-destructive hover:bg-destructive/10 rounded-full"
            >
              <FiX className="h-3 w-3" />
            </Button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-secondary-foreground"
          placeholder={tags.length === 0 ? placeholder : ""}
          required={required && tags.length === 0}
        />
      </div>
    </div>
  );
}

function AddBooksContent() {
  const { isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<BookData[]>([
    { title: '', author: '', file: null, coverFile: null, isbn: '', description: '', published_date: '', language: 'English', genre: '' }
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const editId = searchParams.get('edit');
    const title = searchParams.get('title');
    const author = searchParams.get('author');
    
    if (editId && title && author) {
      setBooks([{
        title: decodeURIComponent(title),
        author: decodeURIComponent(author),
        file: null,
        coverFile: null,
        isbn: searchParams.get('isbn') || '',
        description: searchParams.get('description') || '',
        published_date: searchParams.get('published_date') || '',
        language: searchParams.get('language') || 'English',
        genre: searchParams.get('genre') || ''
      }]);
      setEditingId(editId);
    }
  }, [searchParams]);

  const addNewBook = () => {
    setBooks([...books, { title: '', author: '', file: null, coverFile: null, isbn: '', description: '', published_date: '', language: 'English', genre: '' }]);
    setErrors([...errors, '']);
  };

  const removeBook = (index: number) => {
    const newBooks = books.filter((_, i) => i !== index);
    const newErrors = errors.filter((_, i) => i !== index);
    setBooks(newBooks);
    setErrors(newErrors);
  };

  const updateBook = (index: number, field: keyof BookData, value: string | File | null) => {
    const newBooks = [...books];
    newBooks[index] = { ...newBooks[index], [field]: value };
    setBooks(newBooks);
    
    const newErrors = [...errors];
    newErrors[index] = '';
    setErrors(newErrors);
  };
  
  const validateBooks = () => {
    const newErrors = books.map(book => {
      if (!book.title.trim()) return 'Title is required';
      if (!book.author.trim()) return 'Author is required';
      if (!book.file && !editingId) return 'Book file is required';
      if (book.file && !book.file.name.match(/\.(pdf|epub|doc|docx|txt)$/i)) {
        return 'Invalid book file type (PDF, EPUB, DOC, DOCX, TXT allowed)';
      }
      if (book.file && book.file.size > 50 * 1024 * 1024) {
        return 'File size must be less than 50MB';
      }
      return '';
    });
    
    setErrors(newErrors);
    return newErrors.every(error => !error);
  };

  const uploadToSupabaseStorage = async (file: File, bucket: string = 'Books'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    
    const response = await fetch('/api/upload-to-storage', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }
    
    const result = await response.json();
    return result.fileUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBooks()) return;

    setUploading(true);
    setSuccessMessage('');

    try {
      const booksToSave = [];
      
      for (const book of books) {
        let fileUrl = '';
        let coverUrl = '';
        
        if (book.file) {
          fileUrl = await uploadToSupabaseStorage(book.file, 'Books');
        }
        
        if (book.coverFile) {
          coverUrl = await uploadToSupabaseStorage(book.coverFile, 'Cover Image');
        }

        const bookData: Record<string, string | undefined> = {
          title: book.title.trim(),
          author: book.author.trim(),
          isbn: book.isbn?.trim(),
          description: book.description?.trim(),
          published_date: book.published_date?.trim(),
          language: book.language?.trim(),
          genre: book.genre?.trim()
        };
        
        if (fileUrl) bookData.file_link = fileUrl;
        if (coverUrl) bookData.cover_link = coverUrl;
        
        booksToSave.push(bookData);
      }

      let response;
      if (editingId) {
        response = await fetch('/api/books-admin', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...booksToSave[0] }),
        });
      } else {
        response = await fetch('/api/books-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ books: booksToSave }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save books');
      }

      setSuccessMessage(`Successfully ${editingId ? 'updated' : 'added'} ${booksToSave.length} book(s)!`);
      setTimeout(() => {
        router.push('/book-management');
      }, 2000);

    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'An unexpected error occurred']);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center bg-background">
        <div className="text-lg font-medium text-primary animate-pulse">Preparing Archives...</div>
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
              {editingId ? 'Edit' : 'Add'} <span className="text-primary">Books</span>
            </h1>
            <p className="text-secondary-foreground font-medium">
              {editingId ? 'Update existing book details and metadata.' : 'Upload new literary treasures to the shared catalog.'}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.replace('/book-management')} className="rounded-xl">
            Cancel & Return
          </Button>
        </div>

        {successMessage && (
          <Card className="bg-green-500/10 border-green-500/20 mb-8">
            <CardContent className="p-4 text-green-600 font-bold flex items-center">
              <FiCheck className="mr-2 h-5 w-5" /> {successMessage}
            </CardContent>
          </Card>
        )}

        {errors.some(e => e) && (
          <Card className="bg-destructive/10 border-destructive/20 mb-8">
            <CardHeader className="p-4 pb-0 text-destructive font-bold flex items-center gap-2">
              <FiAlertCircle className="h-5 w-5" /> Attention Required
            </CardHeader>
            <CardContent className="p-4 space-y-1">
              {errors.filter(e => e).map((error, i) => (
                <p key={i} className="text-sm font-medium text-destructive">{error}</p>
              ))}
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 pb-12">
          {books.map((book, index) => (
            <Card key={index} className="border-none shadow-xl shadow-black/5 overflow-visible">
              <CardHeader className="flex items-center justify-between p-6 bg-muted/20 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Book Details</h3>
                    <p className="text-xs text-secondary-foreground">Information & Metadata</p>
                  </div>
                </div>
                {books.length > 1 && !editingId && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    type="button"
                    onClick={() => removeBook(index)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <FiTrash2 className="mr-2" /> Remove
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Title <span className="text-destructive">*</span></label>
                    <div className="relative">
                      <FiFileText className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-foreground" />
                      <input
                        type="text"
                        value={book.title}
                        onChange={(e) => updateBook(index, 'title', e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        placeholder="e.g. The Great Gatsby"
                        required
                      />
                    </div>
                  </div>
                  
                  <TagInput
                    label="Author(s)"
                    value={book.author}
                    onChange={(val) => updateBook(index, 'author', val)}
                    placeholder="e.g. F. Scott Fitzgerald"
                    required
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">ISBN</label>
                    <div className="relative">
                      <FiLayers className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-foreground" />
                      <input
                        type="text"
                        value={book.isbn}
                        onChange={(e) => updateBook(index, 'isbn', e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        placeholder="ISBN-13"
                      />
                    </div>
                  </div>

                  <TagInput
                    label="Genre(s)"
                    value={book.genre || ''}
                    onChange={(val) => updateBook(index, 'genre', val)}
                    placeholder="e.g. Classic, Fiction"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Publication Date</label>
                    <input
                      type="text"
                      value={book.published_date}
                      onChange={(e) => updateBook(index, 'published_date', e.target.value)}
                      className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      placeholder="e.g. 1925"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Language</label>
                    <input
                      type="text"
                      value={book.language}
                      onChange={(e) => updateBook(index, 'language', e.target.value)}
                      className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      placeholder="English"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Status / Tag</label>
                    <input
                      type="text"
                      disabled
                      value="Digital Archive"
                      className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-secondary-foreground font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Description</label>
                  <div className="relative">
                    <FiInfo className="absolute left-3 top-3 text-secondary-foreground" />
                    <textarea
                      value={book.description}
                      onChange={(e) => updateBook(index, 'description', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 transition-all outline-none min-h-[100px]"
                      placeholder="Brief overview of the book contents..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-foreground">Book Source <span className="text-destructive">*</span></label>
                    <label className="group relative block cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.epub,.doc,.docx,.txt"
                        onChange={(e) => updateBook(index, 'file', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-border rounded-2xl p-8 hover:border-primary hover:bg-primary/5 transition-all text-center">
                        {book.file ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                              <FiUpload className="w-6 h-6" />
                            </div>
                            <p className="font-bold text-foreground truncate max-w-full">{book.file.name}</p>
                            <p className="text-xs text-secondary-foreground">{(book.file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <FiUpload className="w-10 h-10 text-secondary-foreground mb-2 group-hover:text-primary transition-colors" />
                            <p className="font-bold text-foreground">Click to upload document</p>
                            <p className="text-xs text-secondary-foreground">PDF, EPUB, DOC, TXT up to 50MB</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-foreground">Cover Art</label>
                    <label className="group relative block cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => updateBook(index, 'coverFile', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-border rounded-2xl p-8 hover:border-primary hover:bg-primary/5 transition-all text-center">
                        {book.coverFile ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 mb-2">
                              <FiImage className="w-6 h-6" />
                            </div>
                            <p className="font-bold text-foreground truncate max-w-full">{book.coverFile.name}</p>
                            <p className="text-xs text-secondary-foreground">Thumbnail Image</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <FiImage className="w-10 h-10 text-secondary-foreground mb-2 group-hover:text-primary transition-colors" />
                            <p className="font-bold text-foreground">Upload cover image</p>
                            <p className="text-xs text-secondary-foreground">High-quality JPG or PNG</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6">
            {!editingId ? (
              <Button type="button" variant="secondary" onClick={addNewBook} className="w-full md:w-auto rounded-xl h-12 px-8">
                <FiPlus className="mr-2" /> Add Another Book
              </Button>
            ) : <div />}

            <div className="flex items-center gap-4 w-full md:w-auto">
              <Button 
                type="submit" 
                variant="primary" 
                disabled={uploading} 
                className="flex-1 md:flex-none h-12 px-12 rounded-xl text-lg font-bold shadow-xl shadow-primary/20"
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <FiCheck className="mr-2" /> {editingId ? 'Update Record' : 'Upload to Library'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function AddBooksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center bg-background">
        <div className="border-4 border-primary/20 border-t-primary rounded-full w-12 h-12 animate-spin"></div>
      </div>
    }>
      <AddBooksContent />
    </Suspense>
  );
}
