import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

type BookJsonEntry = {
  title: string;
  author: string;
  file_link: string;
  added_at?: string;
};

const BOOKS_FILE = path.join(process.cwd(), 'book_bot', 'books.json');

async function ensureBooksFile() {
  if (!existsSync(BOOKS_FILE)) {
    await writeFile(BOOKS_FILE, '[]\n', 'utf8');
  }
}

async function readBooks(): Promise<BookJsonEntry[]> {
  await ensureBooksFile();

  try {
    const raw = await readFile(BOOKS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is BookJsonEntry => {
      return (
        typeof item?.title === 'string' &&
        typeof item?.author === 'string' &&
        typeof item?.file_link === 'string' &&
        (typeof item?.added_at === 'string' || typeof item?.added_at === 'undefined')
      );
    });
  } catch {
    return [];
  }
}

async function writeBooks(books: BookJsonEntry[]) {
  await writeFile(BOOKS_FILE, `${JSON.stringify(books, null, 2)}\n`, 'utf8');
}

function parseIndex(raw: string): number | null {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  try {
    const { index } = await params;
    const bookIndex = parseIndex(index);
    if (bookIndex === null) {
      return NextResponse.json({ error: 'Invalid book index.' }, { status: 400 });
    }

    const books = await readBooks();
    if (bookIndex >= books.length) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    }

    return NextResponse.json({ book: { id: bookIndex, ...books[bookIndex] } });
  } catch (error) {
    console.error('books-admin GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  try {
    const { index } = await params;
    const bookIndex = parseIndex(index);
    if (bookIndex === null) {
      return NextResponse.json({ error: 'Invalid book index.' }, { status: 400 });
    }

    const body = await request.json();
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const author = typeof body?.author === 'string' ? body.author.trim() : '';
    const fileLink = typeof body?.file_link === 'string' ? body.file_link.trim() : '';

    if (!title || !author || !fileLink) {
      return NextResponse.json(
        { error: 'title, author, and file_link are required.' },
        { status: 400 }
      );
    }

    const books = await readBooks();
    if (bookIndex >= books.length) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    }

    books[bookIndex] = {
      title,
      author,
      file_link: fileLink,
      added_at: books[bookIndex].added_at || new Date().toISOString(),
    };

    await writeBooks(books);
    return NextResponse.json({ book: { id: bookIndex, ...books[bookIndex] } });
  } catch (error) {
    console.error('books-admin PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  try {
    const { index } = await params;
    const bookIndex = parseIndex(index);
    if (bookIndex === null) {
      return NextResponse.json({ error: 'Invalid book index.' }, { status: 400 });
    }

    const books = await readBooks();
    if (bookIndex >= books.length) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    }

    books.splice(bookIndex, 1);
    await writeBooks(books);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('books-admin DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
