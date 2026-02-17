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

function withIds(books: BookJsonEntry[]) {
  return books.map((book, index) => ({
    id: index,
    ...book,
  }));
}

export async function GET() {
  const books = await readBooks();
  return NextResponse.json({ books: withIds(books) });
}

export async function POST(request: NextRequest) {
  try {
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

    const newBook: BookJsonEntry = {
      title,
      author,
      file_link: fileLink,
      added_at: new Date().toISOString(),
    };

    const books = await readBooks();
    books.push(newBook);

    await writeBooks(books);
    return NextResponse.json({ book: { id: books.length - 1, ...newBook } }, { status: 201 });
  } catch (error) {
    console.error('books-admin POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
