import { NextRequest, NextResponse } from 'next/server';

const CHAT_WONDER_API_URL = process.env.CHAT_WONDER_API_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    

    const response = await fetch(`${CHAT_WONDER_API_URL}/api/legal/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Legal search API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Legal Search Proxy] Error:', error);
    return NextResponse.json(
      { error: `Failed to reach legal search API: ${error.message}` },
      { status: 500 }
    );
  }
}
