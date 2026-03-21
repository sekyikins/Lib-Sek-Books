import { NextRequest, NextResponse } from 'next/server';
import { readBooks } from '@/lib/data-store';
import { createBook, deleteBook as dbDeleteBook } from '@/lib/db';

export async function GET() {
  try {
    const books = await readBooks();
    return NextResponse.json({ books });
  } catch (error) {
    console.error('books-admin GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle single book
    if (body.title || body.author || body.file_link) {
      const { title, author, file_link, cover_link, isbn, description, published_date, language, genre } = body;

      if (!title || !author || !file_link) {
        return NextResponse.json(
          { error: 'title, author, and file_link are required.' },
          { status: 400 }
        );
      }

      const bookId = await createBook({
        title,
        author,
        fileUrl: file_link,
        coverUrl: cover_link,
        isbn,
        description,
        publishedDate: published_date,
        language,
        genre
      });

      return NextResponse.json({ book: { id: bookId, title, author, file_link, cover_link } }, { status: 201 });
    }
    
    // Handle multiple books
    if (body.books && Array.isArray(body.books)) {
      const addedBooks = [];
      for (const bookData of body.books) {
        const { title, author, file_link, cover_link, isbn, description, published_date, language, genre } = bookData;

        if (title && author && file_link) {
          const id = await createBook({ 
            title, 
            author, 
            fileUrl: file_link,
            coverUrl: cover_link,
            isbn,
            description,
            publishedDate: published_date,
            language,
            genre
          });
          addedBooks.push({ id, title, author, file_link, cover_link });
        }
      }

      return NextResponse.json({ 
        message: `Successfully added ${addedBooks.length} books`,
        books: addedBooks
      }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Invalid request format.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('books-admin POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Book ID is required.' }, { status: 400 });
    }

    await dbDeleteBook(id);
    
    return NextResponse.json({ message: 'Book deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('books-admin DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
