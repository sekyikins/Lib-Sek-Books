import { NextRequest, NextResponse } from 'next/server';
import { readBooks, writeBooks, type BookEntry } from '@/lib/data-store';



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
