'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Role } from '@/types/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiPlus, FiUpload, FiCheck, FiAlertCircle, FiLink, FiX } from 'react-icons/fi';

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

interface LinkBookData {
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

type InputMode = 'link' | 'file';

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
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && '*'}
      </label>
      <div className="flex flex-wrap gap-2 p-1.5 bg-white border border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 min-h-[38px]">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="ml-1 inline-flex items-center p-0.5 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none"
            >
              <FiX className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          className="flex-1 min-w-[120px] outline-none text-sm"
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
  const [linkBook, setLinkBook] = useState<LinkBookData>({
    title: '',
    author: '',
    file: null,
    coverFile: null,
    isbn: '',
    description: '',
    published_date: '',
    language: 'English',
    genre: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [linkError, setLinkError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle URL parameters for editing
  useEffect(() => {
    const editId = searchParams.get('edit');
    const title = searchParams.get('title');
    const author = searchParams.get('author');
    const link = searchParams.get('link');
    
    if (editId && title && author) {
      setLinkBook({
        title: decodeURIComponent(title),
        author: decodeURIComponent(author),
        file: null,
        coverFile: null,
        isbn: searchParams.get('isbn') || '',
        description: searchParams.get('description') || '',
        published_date: searchParams.get('published_date') || '',
        language: searchParams.get('language') || 'English',
        genre: searchParams.get('genre') || ''
      });
      setEditingId(editId);
    }
  }, [searchParams]);

  const addNewBook = () => {
    setBooks([...books, { title: '', author: '', file: null, coverFile: null }]);
    setErrors([...errors, '']);
  };

  const removeBook = (index: number) => {
    const newBooks = books.filter((_, i) => i !== index);
    const newErrors = errors.filter((_, i) => i !== index);
    setBooks(newBooks);
    setErrors(newErrors);
  };

  const clearBook = (index: number) => {
    const newBooks = [...books];
    newBooks[index] = { title: '', author: '', file: null, coverFile: null };
    setBooks(newBooks);
    
    // Clear error for this book
    const newErrors = [...errors];
    newErrors[index] = '';
    setErrors(newErrors);
  };

  const updateBook = (index: number, field: keyof BookData, value: string | File | null) => {
    const newBooks = [...books];
    newBooks[index] = { ...newBooks[index], [field]: value };
    setBooks(newBooks);
    
    // Clear error for this book when user makes changes
    const newErrors = [...errors];
    newErrors[index] = '';
    setErrors(newErrors);
  };
  
  const validateBooks = () => {
    const newErrors = books.map(book => {
      if (!book.title.trim()) return 'Title is required';
      if (!book.author.trim()) return 'Author is required';
      
      if (!book.file) return 'Book file is required';
      if (book.file && !book.file.name.match(/\.(pdf|epub|doc|docx|txt)$/i)) {
        return 'Invalid book file type. Only PDF, EPUB, DOC, DOCX, and TXT files are allowed';
      }
      if (book.file && book.file.size > 50 * 1024 * 1024) { // 50MB limit
        return 'Book file size must be less than 50MB';
      }

      if (book.coverFile && !book.coverFile.type.startsWith('image/')) {
        return 'Invalid cover image type. Please upload an image file.';
      }

      return '';
    });
    
    setErrors(newErrors);
    return newErrors.every(error => !error);
  };

  const validateLinkBook = () => {
    if (!linkBook.title.trim()) {
      setLinkError('Title is required');
      return false;
    }
    if (!linkBook.author.trim()) {
      setLinkError('Author is required');
      return false;
    }
    
    if (!linkBook.file && !editingId) {
      setLinkError('Book file is required');
      return false;
    }
    if (linkBook.file && !linkBook.file.name.match(/\.(pdf|epub|doc|docx|txt)$/i)) {
      setLinkError('Invalid book file type. Only PDF, EPUB, DOC, DOCX, and TXT files are allowed');
      return false;
    }
    if (linkBook.file && linkBook.file.size > 50 * 1024 * 1024) { // 50MB limit
      setLinkError('Book file size must be less than 50MB');
      return false;
    }
    
    if (linkBook.coverFile && !linkBook.coverFile.type.startsWith('image/')) {
      setLinkError('Invalid cover image type. Please upload an image file.');
      return false;
    }
    
    setLinkError('');
    return true;
  };

  const checkFileExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  const deleteFromStorage = async (url: string): Promise<void> => {
    // This is a placeholder for actual storage deletion
    // In a real implementation, you would extract the file ID from the URL
    // and use the storage API (Google Drive, S3, etc.) to delete it
    console.log('Would delete file from storage:', url);
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLinkBook()) {
      return;
    }

    setUploading(true);
    setLinkError('');
    setSuccessMessage('');

    try {
      let fileUrl = '';
      let coverUrl = '';
      
      // Handle book file upload
      if (linkBook.file) {
        fileUrl = await uploadToSupabaseStorage(linkBook.file, 'Books');
      }
      
      // Handle cover image upload
      if (linkBook.coverFile) {
        coverUrl = await uploadToSupabaseStorage(linkBook.coverFile, 'Cover Image');
      }

      const bookData: any = {
        title: linkBook.title.trim(),
        author: linkBook.author.trim(),
        isbn: linkBook.isbn?.trim(),
        description: linkBook.description?.trim(),
        published_date: linkBook.published_date?.trim(),
        language: linkBook.language?.trim(),
        genre: linkBook.genre?.trim()
      };
      
      if (fileUrl) bookData.file_link = fileUrl;
      if (coverUrl) bookData.cover_link = coverUrl;

      let response;
      if (editingId) {
        // Update existing book
        response = await fetch('/api/books-admin', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingId,
            ...bookData
          }),
        });
      } else {
        // Create new book
        response = await fetch('/api/books-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            books: [bookData]
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save book');
      }
      
      // Successfully saved

      setSuccessMessage(`Book ${editingId ? 'updated' : 'added'} successfully!`);
      
      // Reset form after successful submission
      setTimeout(() => {
        setLinkBook({ title: '', author: '', file: null, coverFile: null });
        setEditingId(null);
        setSuccessMessage('');
        // Clear URL parameters
        router.replace('/add-books');
      }, 2000);

    } catch (error) {
      console.error('Error saving book:', error);
      setLinkError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setUploading(false);
    }
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
    
    if (!validateBooks()) {
      return;
    }

    setUploading(true);
    setErrors([]);
    setSuccessMessage('');

    try {
      const booksToAdd = [];
      
      for (let i = 0; i < books.length; i++) {
        const book = books[i];
        if (book.title && book.author && book.file) {
          // 1. Upload Book File
          const fileUrl = await uploadToSupabaseStorage(book.file, 'Books');
          
          // 2. Upload Cover Image (if provided)
          let coverUrl = '';
          if (book.coverFile) {
            coverUrl = await uploadToSupabaseStorage(book.coverFile, 'Cover Image');
          }
          
          booksToAdd.push({
            title: book.title.trim(),
            author: book.author.trim(),
            file_link: fileUrl,
            cover_link: coverUrl || null,
            isbn: book.isbn?.trim(),
            description: book.description?.trim(),
            published_date: book.published_date?.trim(),
            language: book.language?.trim(),
            genre: book.genre?.trim()
          });
        }
      }

      // Save to database via API
      const saveResponse = await fetch('/api/books-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          books: booksToAdd
        }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.error || 'Failed to save books');
      }

      setSuccessMessage(`Successfully added ${booksToAdd.length} book(s) to the library!`);
      
      // Reset form after successful submission
      setTimeout(() => {
        setBooks([{ title: '', author: '', file: null, coverFile: null }]);
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error adding books:', error);
      setErrors([error instanceof Error ? error.message : 'An unexpected error occurred']);
    } finally {
      setUploading(false);
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
    <ProtectedRoute requiredRole={Role.ADMIN}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-4 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Add New Books</h1>
                  <p className="text-lg text-gray-600 mt-2">Upload multiple books to the library at once</p>
                </div>
                <div className="space-x-4">
                  <button
                    title='Back To Book Management'
                    onClick={() => router.replace('/book-management')}
                    className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-gray-600 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
                  >
                    Back&nbsp;<span className='hidden md:inline'>to Management</span>
                  </button>
                </div>
              </div>

              {successMessage && (
                <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
                  <FiCheck className="mr-2" />
                  {successMessage}
                </div>
              )}

              {errors.some(error => error) && (
                <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
                  <FiAlertCircle className="mr-2" />
                  Please fix the errors below before submitting.
                </div>
              )}

              {linkError && (
                <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
                  <FiAlertCircle className="mr-2" />
                  {linkError}
                </div>
              )}

              {editingId && (
                <div className="mb-6 bg-white p-5 rounded-lg shadow-md border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Edit Book
                  </h2>
                  
                  <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <p className="text-sm text-indigo-700">
                      <strong>Note:</strong> External URL links are no longer supported. All books must be uploaded directly.
                    </p>
                  </div>
                  
                  <form onSubmit={handleLinkSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={linkBook.title}
                          onChange={(e) => setLinkBook({ ...linkBook, title: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter book title"
                          required
                        />
                      </div>
                      <TagInput
                        label="Author(s)"
                        value={linkBook.author}
                        onChange={(val) => setLinkBook({ ...linkBook, author: val })}
                        placeholder="e.g. Frank Wood"
                        required
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ISBN
                        </label>
                        <input
                          type="text"
                          value={linkBook.isbn}
                          onChange={(e) => setLinkBook({ ...linkBook, isbn: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter ISBN"
                        />
                      </div>
                      <TagInput
                        label="Genre(s)"
                        value={linkBook.genre || ''}
                        onChange={(val) => setLinkBook({ ...linkBook, genre: val })}
                        placeholder="e.g. Programming"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Published Date
                        </label>
                        <input
                          type="text"
                          value={linkBook.published_date}
                          onChange={(e) => setLinkBook({ ...linkBook, published_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="e.g. 2023-01-01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Language
                        </label>
                        <input
                          type="text"
                          value={linkBook.language}
                          onChange={(e) => setLinkBook({ ...linkBook, language: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter language"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={linkBook.description}
                        onChange={(e) => setLinkBook({ ...linkBook, description: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter book description"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                      <div className="transition-all duration-300 ease-in-out">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Book File *
                        </label>
                        <div className="flex items-center space-x-4">
                          <label className="flex-1">
                            <input
                              type="file"
                              accept=".pdf,.epub,.doc,.docx,.txt"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setLinkBook({ ...linkBook, file });
                              }}
                              className="hidden"
                            />
                            <div className="border-2 shadow-sm border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-white">
                              {linkBook.file ? (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <FiUpload className="w-5 h-5 text-indigo-600 mr-2" />
                                    <span className="text-sm text-gray-700 truncate max-w-[150px]">{linkBook.file.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({(linkBook.file.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <FiUpload className="w-6 h-6 text-gray-400 mb-1" />
                                  <span className="text-xs text-gray-600 font-medium">Click to upload Book</span>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="transition-all duration-300 ease-in-out">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cover Image
                        </label>
                        <div className="flex items-center space-x-4">
                          <label className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setLinkBook({ ...linkBook, coverFile: file });
                              }}
                              className="hidden"
                            />
                            <div className="border-2 shadow-sm border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-white">
                              {linkBook.coverFile ? (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <FiPlus className="w-5 h-5 text-green-600 mr-2" />
                                    <span className="text-sm text-gray-700 truncate max-w-[150px]">{linkBook.coverFile.name}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <FiPlus className="w-6 h-6 text-gray-400 mb-1" />
                                  <span className="text-xs text-gray-600 font-medium">Click to upload Cover</span>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        title='Add Book To List'
                        type="submit"
                        disabled={uploading}
                        className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-indigo-700 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            {editingId ? 'Updating...' : 'Adding...'}
                          </>
                        ) : (
                          <>
                            <FiLink className="mr-2" />
                            {editingId ? 'Update Book' : 'Add Book'}
                          </>
                        )}
                      </button>
                      <button
                        title='Hide Link Form'
                        type="button"
                        onClick={() => {
                          setLinkBook({ title: '', author: '', file: null, coverFile: null });
                          setEditingId(null);
                          setLinkError('');
                          router.replace('/add-books');
                        }}
                        className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-gray-600 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Files</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                {books.map((book, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Book {index + 1}
                      </h3>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={() => clearBook(index)}
                          className="text-blue-600 hover:text-blue-800 p-2 shadow-lg border border-blue-400 rounded-md hover:bg-blue-50 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                          title="Clear Book Content"
                        >
                          Clear
                        </button>
                        {books.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBook(index)}
                            className="text-red-600 hover:text-red-800 p-2 shadow-lg border border-red-400 rounded-md hover:bg-red-50 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
                            title="Remove Book"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={book.title}
                          onChange={(e) => updateBook(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter book title"
                          required
                        />
                      </div>
                      <TagInput
                        label="Author(s)"
                        value={book.author}
                        onChange={(val) => updateBook(index, 'author', val)}
                        placeholder="e.g. Frank Wood"
                        required
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ISBN
                        </label>
                        <input
                          type="text"
                          value={book.isbn}
                          onChange={(e) => updateBook(index, 'isbn', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter ISBN"
                        />
                      </div>
                      <TagInput
                        label="Genre(s)"
                        value={book.genre || ''}
                        onChange={(val) => updateBook(index, 'genre', val)}
                        placeholder="e.g. Programming"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Published Date
                        </label>
                        <input
                          type="text"
                          value={book.published_date}
                          onChange={(e) => updateBook(index, 'published_date', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="e.g. 2023-01-01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Language
                        </label>
                        <input
                          type="text"
                          value={book.language}
                          onChange={(e) => updateBook(index, 'language', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter language"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={book.description}
                        onChange={(e) => updateBook(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter book description"
                        rows={2}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="transition-all duration-300 ease-in-out">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Book File *
                        </label>
                        <div className="flex items-center space-x-4">
                          <label className="flex-1">
                            <input
                              type="file"
                              accept=".pdf,.epub,.doc,.docx,.txt"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                updateBook(index, 'file', file);
                              }}
                              className="hidden"
                            />
                            <div className="border-2 shadow-sm border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-gray-50">
                              {book.file ? (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <FiUpload className="w-6 h-6 text-indigo-600 mr-3" />
                                    <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{book.file.name}</span>
                                    <span className="text-xs text-gray-500 ml-3">
                                      ({(book.file.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <FiUpload className="w-10 h-10 text-gray-400 mb-3" />
                                  <span className="text-sm text-gray-600 font-semibold">Click to upload Book File</span>
                                  <span className="text-xs text-gray-500 mt-2">
                                    PDF, EPUB, DOC, DOCX, TXT (Max 50MB)
                                  </span>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="transition-all duration-300 ease-in-out">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cover Image
                        </label>
                        <div className="flex items-center space-x-4">
                          <label className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                updateBook(index, 'coverFile', file);
                              }}
                              className="hidden"
                            />
                            <div className="border-2 shadow-sm border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-gray-50">
                              {book.coverFile ? (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <FiPlus className="w-6 h-6 text-green-600 mr-3" />
                                    <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{book.coverFile.name}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <FiPlus className="w-10 h-10 text-gray-400 mb-3" />
                                  <span className="text-sm text-gray-600 font-semibold">Click to upload Cover Image</span>
                                  <span className="text-xs text-gray-500 mt-2">
                                    JPG, PNG, WEBP, etc.
                                  </span>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {errors[index] && (
                      <div className="mt-2 text-sm text-red-600">
                        {errors[index]}
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                    <button
                      title='Clear All Books'
                      type="button"
                      onClick={() => {
                        setBooks([{ title: '', author: '', file: null, coverFile: null }]);
                        setErrors([]);
                        setSuccessMessage('');
                      }}
                      className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-gray-600 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
                    >
                      Close All
                    </button>

                  <div className="space-x-4 flex">
                    <button
                      title='Add Book'
                      type="button"
                      onClick={addNewBook}
                      className="inline-flex items-center px-2 md:px-4 py-2 shadow-lg border-2 border-green-600 text-sm font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-offset-2 focus:ring-green-600"
                    >
                      <FiPlus className="mr-2" />
                      Add&nbsp;<span className='hidden md:inline'>Another</span>&nbsp;Book
                    </button>
                    
                    <button
                      title='Upload Book(s)'
                      type="submit"
                      disabled={uploading}
                      className="inline-flex items-center px-2 md:px-6 py-2 shadow-lg border-2 border-indigo-700 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FiUpload className="mr-2" />
                          Upload&nbsp;<span className='hidden md:inline'>Books</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function AddBooksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddBooksContent />
    </Suspense>
  );
}
