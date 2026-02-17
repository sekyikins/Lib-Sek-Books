'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Role } from '@/types/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiPlus, FiUpload, FiX, FiCheck, FiAlertCircle, FiLink } from 'react-icons/fi';

interface BookData {
  title: string;
  author: string;
  file: File | null;
  file_link?: string;
  inputMode?: 'file' | 'link';
}

interface LinkBookData {
  title: string;
  author: string;
  file_link: string;
  file?: File | null;
}

type InputMode = 'link' | 'file';

export default function AddBooksPage() {
  const { isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<BookData[]>([
    { title: '', author: '', file: null, file_link: '', inputMode: 'file' }
  ]);
  const [linkBook, setLinkBook] = useState<LinkBookData>({
    title: '',
    author: '',
    file_link: '',
    file: null
  });
  const [inputMode, setInputMode] = useState<InputMode>('link');
  const [editingId, setEditingId] = useState<number | null>(null);
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
    
    if (editId && title && author && link) {
      setLinkBook({
        title: decodeURIComponent(title),
        author: decodeURIComponent(author),
        file_link: decodeURIComponent(link),
        file: null
      });
      setEditingId(parseInt(editId));
      setInputMode('link');
    }
  }, [searchParams]);

  const addNewBook = () => {
    setBooks([...books, { title: '', author: '', file: null, file_link: '', inputMode: 'file' }]);
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
    newBooks[index] = { title: '', author: '', file: null, file_link: '', inputMode: 'file' };
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
      
      if (book.inputMode === 'file') {
        if (!book.file) return 'File is required';
        if (book.file && !book.file.name.match(/\.(pdf|epub|doc|docx|txt)$/i)) {
          return 'Invalid file type. Only PDF, EPUB, DOC, DOCX, and TXT files are allowed';
        }
        if (book.file && book.file.size > 50 * 1024 * 1024) { // 50MB limit
          return 'File size must be less than 50MB';
        }
      } else {
        if (!book.file_link?.trim()) return 'File link is required';
        if (book.file_link && !book.file_link.match(/^https?:\/\/.+/)) {
          return 'Please enter a valid URL';
        }
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
    
    if (inputMode === 'link') {
      if (!linkBook.file_link.trim()) {
        setLinkError('File link is required');
        return false;
      }
      if (!linkBook.file_link.match(/^https?:\/\/.+/)) {
        setLinkError('Please enter a valid URL');
        return false;
      }
    } else {
      if (!linkBook.file) {
        setLinkError('File is required');
        return false;
      }
      if (!linkBook.file.name.match(/\.(pdf|epub|doc|docx|txt)$/i)) {
        setLinkError('Invalid file type. Only PDF, EPUB, DOC, DOCX, and TXT files are allowed');
        return false;
      }
      if (linkBook.file.size > 50 * 1024 * 1024) { // 50MB limit
        setLinkError('File size must be less than 50MB');
        return false;
      }
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
      let fileLink = linkBook.file_link.trim();
      let previousFileLink = '';
      
      // For editing, get the previous file link for cleanup
      if (editingId) {
        const response = await fetch(`/api/books-admin/${editingId}`);
        if (response.ok) {
          const bookData = await response.json();
          previousFileLink = bookData.book?.file_link || '';
        }
      }
      
      // Handle file upload mode
      if (inputMode === 'file' && linkBook.file) {
        fileLink = await uploadToGoogleDrive(linkBook.file);
      } else if (inputMode === 'link' && editingId) {
        // Check if link exists when updating
        const linkExists = await checkFileExists(fileLink);
        if (!linkExists) {
          throw new Error('The provided file link does not exist or is not accessible');
        }
      }

      const bookData = {
        title: linkBook.title.trim(),
        author: linkBook.author.trim(),
        file_link: fileLink
      };

      let response;
      if (editingId) {
        // Update existing book
        response = await fetch(`/api/books-admin/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookData),
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
      
      // Clean up previous file if update was successful and file/link changed
      if (editingId && previousFileLink && previousFileLink !== fileLink) {
        try {
          await deleteFromStorage(previousFileLink);
        } catch (error) {
          console.warn('Failed to delete previous file:', error);
        }
      }

      setSuccessMessage(`Book ${editingId ? 'updated' : 'added'} successfully!`);
      
      // Reset form after successful submission
      setTimeout(() => {
        setLinkBook({ title: '', author: '', file_link: '', file: null });
        setInputMode('link');
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

  const uploadToGoogleDrive = async (file: File): Promise<string> => {
    // This is a placeholder for Google Drive upload
    // In a real implementation, you would use Google Drive API
    // For now, we'll simulate the upload and return a mock link
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    
    try {
      const response = await fetch('/api/upload-to-drive', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      return result.fileUrl;
    } catch {
      // Fallback to mock URL for demo
      console.warn('Google Drive upload not implemented, using mock URL');
      return `https://drive.google.com/file/d/mock_${Date.now()}/view?usp=sharing`;
    }
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
        if (book.title && book.author) {
          let fileUrl = '';
          
          if (book.inputMode === 'file' && book.file) {
            // Upload file to Google Drive
            fileUrl = await uploadToGoogleDrive(book.file);
          } else if (book.inputMode === 'link' && book.file_link) {
            // Check if link exists
            const linkExists = await checkFileExists(book.file_link);
            if (!linkExists) {
              throw new Error(`File link for book "${book.title}" does not exist or is not accessible`);
            }
            fileUrl = book.file_link;
          }
          
          if (fileUrl) {
            booksToAdd.push({
              title: book.title.trim(),
              author: book.author.trim(),
              file_link: fileUrl,
            });
          }
        }
      }

      // Save to books.json
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
        setBooks([{ title: '', author: '', file: null, file_link: '', inputMode: 'file' }]);
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
        <div className="border-b-3 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole={Role.ADMIN}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
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
                    Back to Management
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
                <div className="mb-6 bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Edit Book
                  </h2>
                  
                  {/* Input Mode Toggle */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="inputMode"
                          value="link"
                          checked={inputMode === 'link'}
                          onChange={(e) => {
                            setInputMode(e.target.value as InputMode);
                            setLinkBook({ ...linkBook, file: null });
                            setLinkError('');
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Use Link</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="inputMode"
                          value="file"
                          checked={inputMode === 'file'}
                          onChange={(e) => {
                            setInputMode(e.target.value as InputMode);
                            setLinkBook({ ...linkBook, file_link: '' });
                            setLinkError('');
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Upload File</span>
                      </label>
                    </div>
                  </div>
                  
                  <form onSubmit={handleLinkSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Author *
                        </label>
                        <input
                          type="text"
                          value={linkBook.author}
                          onChange={(e) => setLinkBook({ ...linkBook, author: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter author name"
                          required
                        />
                      </div>
                    </div>
                    {inputMode === 'link' && (
                      <div className="transition-all duration-300 ease-in-out">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          File Link *
                        </label>
                        <input
                          type="url"
                          value={linkBook.file_link}
                          onChange={(e) => setLinkBook({ ...linkBook, file_link: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                          required
                        />
                      </div>
                    )}
                    
                    {inputMode === 'file' && (
                      <div className="transition-all duration-300 ease-in-out">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload File *
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
                              required
                            />
                            <div className="border-2 shadow-sm border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors">
                              {linkBook.file ? (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <FiUpload className="w-5 h-5 text-indigo-600 mr-2" />
                                    <span className="text-sm text-gray-700">{linkBook.file.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({(linkBook.file.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <FiUpload className="w-8 h-8 text-gray-400 mb-2" />
                                  <span className="text-sm text-gray-600">Click to upload or drag and drop</span>
                                  <span className="text-xs text-gray-500 mt-1">
                                    PDF, EPUB, DOC, DOCX, TXT (Max 50MB)
                                  </span>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
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
                          setLinkBook({ title: '', author: '', file_link: '', file: null });
                          setInputMode('link');
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Author *
                        </label>
                        <input
                          type="text"
                          value={book.author}
                          onChange={(e) => updateBook(index, 'author', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter author name"
                          required
                        />
                      </div>
                    </div>
                    
                    {/* Input Mode Toggle for Multiple Books */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`inputMode-${index}`}
                            value="file"
                            checked={book.inputMode === 'file'}
                            onChange={(e) => {
                              const newBooks = [...books];
                              newBooks[index] = { ...newBooks[index], inputMode: 'file', file_link: '' };
                              setBooks(newBooks);
                              const newErrors = [...errors];
                              newErrors[index] = '';
                              setErrors(newErrors);
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">Upload File</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`inputMode-${index}`}
                            value="link"
                            checked={book.inputMode === 'link'}
                            onChange={(e) => {
                              const newBooks = [...books];
                              newBooks[index] = { ...newBooks[index], inputMode: 'link', file: null };
                              setBooks(newBooks);
                              const newErrors = [...errors];
                              newErrors[index] = '';
                              setErrors(newErrors);
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">Use Link</span>
                        </label>
                      </div>
                    </div>

                    {book.inputMode === 'file' ? (
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
                              required
                            />
                            <div className="border-2 shadow-sm border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 transition-colors">
                              {book.file ? (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <FiUpload className="w-5 h-5 text-indigo-600 mr-2" />
                                    <span className="text-sm text-gray-700">{book.file.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({(book.file.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <FiUpload className="w-8 h-8 text-gray-400 mb-2" />
                                  <span className="text-sm text-gray-600">Click to upload or drag and drop</span>
                                  <span className="text-xs text-gray-500 mt-1">
                                    PDF, EPUB, DOC, DOCX, TXT (Max 50MB)
                                  </span>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="transition-all duration-300 ease-in-out">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          File Link *
                        </label>
                        <input
                          type="url"
                          value={book.file_link || ''}
                          onChange={(e) => {
                            const newBooks = [...books];
                            newBooks[index] = { ...newBooks[index], file_link: e.target.value };
                            setBooks(newBooks);
                          }}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                          required
                        />
                      </div>
                    )}

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
                        setBooks([{ title: '', author: '', file: null, file_link: '', inputMode: 'file' }]);
                        setErrors([]);
                        setSuccessMessage('');
                      }}
                      className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-gray-600 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
                    >
                      Close All
                    </button>

                  <div className="space-x-4">
                    <button
                    title='Add Book'
                    type="button"
                    onClick={addNewBook}
                    className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-green-600 text-sm font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-offset-2 focus:ring-green-600"
                  >
                    <FiPlus className="mr-2" />
                    Add Another Book
                  </button>
                    
                    <button
                      title='Upload Book(s)'
                      type="submit"
                      disabled={uploading}
                      className="inline-flex items-center px-6 py-2 shadow-lg border-2 border-indigo-700 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FiUpload className="mr-2" />
                          Upload Books
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
