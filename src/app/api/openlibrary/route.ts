import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://openlibrary.org';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const query = searchParams.get('q') || 'harry potter';
  const page = parseInt(searchParams.get('page') || '0');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const offset = page * limit;
    const apiUrl = `${API_BASE_URL}/search.json?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Handle 422 status (invalid query) gracefully by returning empty results
    if (response.status === 422) {
      return NextResponse.json(
        { docs: [], numFound: 0, start: 0, numFoundExact: true },
        { status: 200 }
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books from Open Library API' },
      { status: 500 }
    );
  }
}
