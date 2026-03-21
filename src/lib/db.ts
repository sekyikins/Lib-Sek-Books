import { Role } from '@/types/auth';
import { supabaseAdmin } from '@/lib/supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
}

// Shareable database calls using Supabase
export async function addUser(user: User) {
  const { error } = await supabaseAdmin
    .from('users')
    .insert({
      email: user.email,
      name: user.name,
      password_hash: user.passwordHash,
      role: user.role,
    });
  
  if (error) {
    console.error('Error adding user to Supabase:', error);
    throw error;
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error finding user in Supabase:', error);
    return null;
  }

  // Convert snake_case from DB to camelCase for the app
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    passwordHash: data.password_hash,
    role: data.role as Role,
  };
}

// Book Operations
export async function getBooks() {
  const { data, error } = await supabaseAdmin
    .from('books')
    .select(`
      *,
      authors:book_authors(authors(*)),
      genres:book_genres(genres(*))
    `);

  if (error) {
    console.error('Error fetching books from Supabase:', error);
    return [];
  }

  // Map the nested join data back to a simpler format for the UI
  return data.map((b: any) => ({
    id: b.id,
    title: b.title,
    isbn: b.isbn,
    description: b.description,
    coverUrl: b.cover_url,
    fileUrl: b.file_url,
    publishedDate: b.published_date,
    language: b.language,
    available: b.available,
    totalCopies: b.total_copies,
    borrowedCopies: b.borrowed_copies,
    createdAt: new Date(b.created_at),
    updatedAt: new Date(b.updated_at),
    // Join authors and genres into strings for compatibility
    author: b.authors?.map((a: any) => a.authors.name).join(', ') || 'Unknown Author',
    genre: b.genres?.map((g: any) => g.genres.name).join(', ') || '',
  }));
}

export async function createBook(book: any) {
  const bookId = book.id || `LOCAL_${Math.random().toString(36).substr(2, 9)}`;
  
  // 1. Insert Book metadata
  const { error: bError } = await supabaseAdmin
    .from('books')
    .insert({
      id: bookId,
      title: book.title,
      cover_url: book.coverUrl || book.cover_url,
      file_url: book.fileUrl || book.file_link,
      description: book.description,
      isbn: book.isbn,
      published_date: book.publishedDate || book.published_date,
      language: book.language || 'English',
      available: book.available ?? true,
      total_copies: book.totalCopies || book.total_copies || 1,
      borrowed_copies: book.borrowedCopies || book.borrowed_copies || 0,
    });
  
  if (bError) {
    console.error('Error inserting book:', bError);
    throw bError;
  }

  // 2. Handle multiple Authors
  const authors = Array.isArray(book.author) 
    ? book.author 
    : (book.author ? book.author.split(',').map((s: string) => s.trim()) : []);

  for (const authorName of authors) {
    if (!authorName) continue;
    
    let authorId;
    const { data: existingAuthor } = await supabaseAdmin
      .from('authors')
      .select('id')
      .eq('name', authorName)
      .single();

    if (existingAuthor) {
      authorId = existingAuthor.id;
    } else {
      const { data: newAuthor, error: aError } = await supabaseAdmin
        .from('authors')
        .insert({ name: authorName })
        .select('id')
        .single();
      if (aError) throw aError;
      authorId = newAuthor.id;
    }

    // Link Author
    await supabaseAdmin
      .from('book_authors')
      .insert({
        book_id: bookId,
        author_id: authorId
      });
  }

  // 3. Handle multiple Genres
  const genres = Array.isArray(book.genre) 
    ? book.genre 
    : (book.genre ? book.genre.split(',').map((s: string) => s.trim()) : []);

  for (const genreName of genres) {
    if (!genreName) continue;

    let genreId;
    const { data: existingGenre } = await supabaseAdmin
      .from('genres')
      .select('id')
      .eq('name', genreName)
      .single();

    if (existingGenre) {
      genreId = existingGenre.id;
    } else {
      const { data: newGenre, error: gError } = await supabaseAdmin
        .from('genres')
        .insert({ name: genreName })
        .select('id')
        .single();
      if (gError) throw gError;
      genreId = newGenre.id;
    }

    // Link Genre
    await supabaseAdmin
      .from('book_genres')
      .insert({
        book_id: bookId,
        genre_id: genreId
      });
  }

  return bookId;
}

export async function deleteBook(id: string) {
  const { error } = await supabaseAdmin
    .from('books')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}
