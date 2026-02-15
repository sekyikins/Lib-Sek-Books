import { Book } from '@/types/books';

export interface OpenLibraryAuthor {
  key: string;
  name: string;
}

export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  isbn?: string[];
  publisher?: string[];
  language?: string[];
  cover_i?: number;
  edition_count?: number;
  has_fulltext?: boolean;
  public_scan_b?: boolean;
}

export interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  docs: OpenLibraryBook[];
  num_found?: number;
  q?: string;
}

export interface OpenLibraryWorkDetail {
  description?: {
    type: string;
    value: string;
  } | string;
  title: string;
  created: {
    type: string;
    value: string;
  };
  last_modified: {
    type: string;
    value: string;
  };
  latest_revision: number;
  revision: number;
  key: string;
  authors?: Array<{
    author: {
      key: string;
    };
    type: {
      key: string;
    };
  }>;
  covers?: number[];
  subject_places?: string[];
  subjects?: string[];
  subject_times?: string[];
  subject_people?: string[];
  first_publish_date?: string;
}

export class OpenLibraryAPI {
  // Use our Next.js API proxy to avoid CORS issues
  private static readonly BASE_URL = '/api/openlibrary';

  static async searchBooks(query: string, page: number = 0, limit: number = 20): Promise<OpenLibrarySearchResponse> {
    try {
      const response = await fetch(
        `${this.BASE_URL}?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching books:', error);
      throw error;
    }
  }

  static async getBookDetails(workId: string): Promise<OpenLibraryWorkDetail> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/${workId}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting book details:', error);
      throw error;
    }
  }

  static getCoverUrl(coverId: number, size: 'S' | 'M' | 'L' = 'M'): string {
    return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
  }

  static getDownloadUrl(workId: string): string {
    return `https://openlibrary.org/works/${workId}`;
  }

  static async downloadBook(workId: string): Promise<void> {
    try {
      const downloadUrl = this.getDownloadUrl(workId);
      
      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading book:', error);
      throw error;
    }
  }

  static convertToBook(openLibraryBook: OpenLibraryBook): Book {
    // Extract work ID from key (e.g., "/works/OL82563W" -> "OL82563W")
    const workId = openLibraryBook.key.split('/').pop() || openLibraryBook.key;
    
    // Handle authors
    let authorString = 'Unknown Author';
    if (openLibraryBook.author_name && openLibraryBook.author_name.length > 0) {
      authorString = openLibraryBook.author_name.slice(0, 3).join(', ');
    }

    // Handle genres/subjects - Open Library search doesn't provide subjects in basic search
    // We'll use a placeholder or empty array
    const genres: string[] = [];

    // Get cover URL if cover ID exists
    let coverUrl = '';
    if (openLibraryBook.cover_i) {
      coverUrl = this.getCoverUrl(openLibraryBook.cover_i);
    }

    // Handle ISBN - take first one if available
    const isbn = openLibraryBook.isbn && openLibraryBook.isbn.length > 0 
      ? openLibraryBook.isbn[0] 
      : '';

    return {
      id: workId,
      title: openLibraryBook.title,
      author: authorString,
      isbn: isbn,
      description: '', // Will be populated when fetching details
      coverUrl: coverUrl,
      publishedDate: openLibraryBook.first_publish_year?.toString() || '',
      genre: genres.join(', '),
      language: openLibraryBook.language && openLibraryBook.language.length > 0 
        ? openLibraryBook.language[0] 
        : 'Unknown',
      available: true,
      totalCopies: 999, // Digital books - unlimited copies
      borrowedCopies: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static convertToBookWithDetails(searchBook: OpenLibraryBook, details: OpenLibraryWorkDetail): Book {
    const baseBook = this.convertToBook(searchBook);
    
    // Extract description from details
    let description = '';
    if (details.description) {
      if (typeof details.description === 'string') {
        description = details.description;
      } else if (details.description.value) {
        description = details.description.value;
      }
    }

    // Extract subjects as genres, filtering out generic ones and taking meaningful ones
    let genres: string[] = [];
    if (details.subjects && details.subjects.length > 0) {
      // Filter out generic subjects and take the most specific ones
      const filteredSubjects = details.subjects.filter(subject => 
        !subject.includes('series:') && 
        !subject.includes('Open Library Staff Picks') &&
        !subject.includes('Reading Level') &&
        !subject.includes('NOVELAS') &&
        subject.length > 2
      );
      genres = filteredSubjects.slice(0, 3);
    }

    // Extract subject places as additional genre info if available
    let places: string[] = [];
    if (details.subject_places && details.subject_places.length > 0) {
      places = details.subject_places.slice(0, 2);
    }

    // Combine genres and places
    const allGenres = [...genres, ...places].slice(0, 3);

    // Use first publish date from details if available, otherwise fall back to search result
    const publishDate = details.first_publish_date || baseBook.publishedDate;

    // Extract additional language info if available
    let language = baseBook.language;
    if (details.subjects && details.subjects.some(s => s.includes('English'))) {
      language = 'English';
    } else if (details.subjects && details.subjects.some(s => s.includes('Spanish'))) {
      language = 'Spanish';
    } else if (details.subjects && details.subjects.some(s => s.includes('French'))) {
      language = 'French';
    }

    return {
      ...baseBook,
      description: description,
      genre: allGenres.join(', '),
      publishedDate: publishDate,
      language: language
    };
  }
}
