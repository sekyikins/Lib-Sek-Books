export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  coverUrl?: string;
  publishedDate?: string;
  genre?: string;
  language?: string;
  available: boolean;
  totalCopies: number;
  borrowedCopies: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BorrowRecord {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date;
  status: 'borrowed' | 'returned' | 'overdue';
  fine?: number;
  createdAt: Date;
}

export interface Fine {
  id: string;
  userId: string;
  borrowRecordId: string;
  amount: number;
  status: 'pending' | 'paid';
  reason: string;
  createdAt: Date;
  paidAt?: Date;
}

export interface BookApiResponse {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  cover_url?: string;
  published_date?: string;
  genre?: string;
}
