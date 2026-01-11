import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiUrl = process.env.CHAT_WONDER_API_URL || 'http://localhost:8001';
    
    const response = await fetch(`${apiUrl}/session-id`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch session ID: ${response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Session initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize session. Please try again.' },
      { status: 500 }
    );
  }
}
