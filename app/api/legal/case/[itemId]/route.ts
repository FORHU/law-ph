import { NextRequest, NextResponse } from 'next/server';

const CHAT_WONDER_API_URL = process.env.CHAT_WONDER_API_URL || 'http://localhost:8001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;

    const response = await fetch(`${CHAT_WONDER_API_URL}/api/legal/case/${encodeURIComponent(itemId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Legal case API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Legal Case Proxy] Error:', error);
    return NextResponse.json(
      { error: `Failed to reach legal case API: ${error.message}` },
      { status: 500 }
    );
  }
}
