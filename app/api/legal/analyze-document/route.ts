import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow it 60 seconds as GPT can take time

export async function POST(request: NextRequest) {
  try {
    const apiUrl = process.env.CHAT_WONDER_API_URL || 'http://localhost:8001';

    // Parse the multipart form data using Next.js built-in parser
    // This perfectly handles multipart boundaries but imposes a strict 10MB limit.
    const formData = await request.formData();

    const response = await fetch(`${apiUrl}/api/legal/analyze-document`, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type mapping manually, let fetch() set it with FormData boundary
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Analyze Document Proxy] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to analysis service.' },
      { status: 500 }
    );
  }
}
