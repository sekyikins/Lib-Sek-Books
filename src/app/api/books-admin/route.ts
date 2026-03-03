import { NextRequest, NextResponse } from 'next/server';
import { readBooks, writeBooks, type BookEntry } from '@/lib/data-store';

type BookJsonEntry = BookEntry;



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
    
    // Handle single book (existing functionality)
    if (body.title || body.author || body.file_link) {
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
    }
    
    // Handle multiple books (new functionality)
    if (body.books && Array.isArray(body.books)) {
      const newBooks: BookJsonEntry[] = [];
      
      for (const bookData of body.books) {
        const title = typeof bookData?.title === 'string' ? bookData.title.trim() : '';
        const author = typeof bookData?.author === 'string' ? bookData.author.trim() : '';
        const fileLink = typeof bookData?.file_link === 'string' ? bookData.file_link.trim() : '';

        if (!title || !author || !fileLink) {
          return NextResponse.json(
            { error: 'All books must have title, author, and file_link.' },
            { status: 400 }
          );
        }

        newBooks.push({
          title,
          author,
          file_link: fileLink,
          added_at: new Date().toISOString(),
        });
      }

      const books = await readBooks();
      books.push(...newBooks);

      await writeBooks(books);
      return NextResponse.json({ 
        message: `Successfully added ${newBooks.length} books`,
        books: withIds(newBooks)
      }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Invalid request format. Provide either a single book or an array of books.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('books-admin POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, author, file_link } = body;

    if (typeof id !== 'number' || id < 0) {
      return NextResponse.json(
        { error: 'Valid book ID is required.' },
        { status: 400 }
      );
    }

    const books = await readBooks();
    
    if (id >= books.length) {
      return NextResponse.json(
        { error: 'Book not found.' },
        { status: 404 }
      );
    }

    // Update only provided fields
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json(
          { error: 'Title must be a non-empty string.' },
          { status: 400 }
        );
      }
      books[id].title = title.trim();
    }

    if (author !== undefined) {
      if (typeof author !== 'string' || !author.trim()) {
        return NextResponse.json(
          { error: 'Author must be a non-empty string.' },
          { status: 400 }
        );
      }
      books[id].author = author.trim();
    }

    if (file_link !== undefined) {
      if (typeof file_link !== 'string' || !file_link.trim()) {
        return NextResponse.json(
          { error: 'File link must be a non-empty string.' },
          { status: 400 }
        );
      }
      books[id].file_link = file_link.trim();
    }

    await writeBooks(books);
    return NextResponse.json({ book: { id, ...books[id] } }, { status: 200 });
  } catch (error) {
    console.error('books-admin PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    
    if (idParam === null) {
      return NextResponse.json(
        { error: 'Book ID is required.' },
        { status: 400 }
      );
    }

    const id = parseInt(idParam, 10);
    
    if (isNaN(id) || id < 0) {
      return NextResponse.json(
        { error: 'Valid book ID is required.' },
        { status: 400 }
      );
    }

    const books = await readBooks();
    
    if (id >= books.length) {
      return NextResponse.json(
        { error: 'Book not found.' },
        { status: 404 }
      );
    }

    const deletedBook = books[id];
    books.splice(id, 1);
    
    await writeBooks(books);
    return NextResponse.json({ 
      message: 'Book deleted successfully',
      deletedBook: { id, ...deletedBook }
    }, { status: 200 });
  } catch (error) {
    console.error('books-admin DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
