import { getBooks, createBook, deleteBook } from '@/lib/db';

export type BookEntry = {
  id?: string;
  title: string;
  author: string;
  file_link: string;
  added_at?: string;
};

export type RequestEntry = {
  timestamp: string;
  title: string;
  author: string;
  description?: string;
  email: string;
  userType: string;
  status: 'available' | 'not_found' | 'delivery_failed' | 'delivered';
};

// Books functions
export async function readBooks(): Promise<BookEntry[]> {
  const books = await getBooks();
  return books.map(b => ({
    id: b.id,
    title: b.title,
    author: b.author,
    file_link: b.fileUrl || '',
    cover_link: b.coverUrl || '',
    added_at: b.createdAt ? b.createdAt.toISOString() : new Date().toISOString(),
  }));
}

export async function writeBooks(newBooks: BookEntry[]): Promise<void> {
  // Logic to sync entire list could be complex, for now we assume incremental adds
  // But since the original code was 'replace everything', we'd need TRUNCATE + INSERT
  // For safety and compatibility with current API, we just ignore this or implement as needed
  console.warn('writeBooks is deprecated. Use createBook or updateBook directly.');
}

// Requests functions
export async function readRequestLog(): Promise<RequestEntry[]> {
  // To be implemented with Supabase book_requests table if needed
  return [];
}

export async function logRequest(entry: RequestEntry): Promise<void> {
  // To be implemented with Supabase book_requests table if needed
  console.log('Logging request to console (Supabase logRequest not yet implemented):', entry);
}

// Helper function to reset data (useful for testing)
export function resetData(): void {
  // No-op for Supabase
}
