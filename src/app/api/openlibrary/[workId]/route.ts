import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://openlibrary.org';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workId: string }> }
) {
  const { workId } = await params;

  try {
    const apiUrl = `${API_BASE_URL}/works/${workId}.json`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book details from Open Library API' },
      { status: 500 }
    );
  }
}
