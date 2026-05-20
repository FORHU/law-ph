import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiUrl = (process.env.CHAT_WONDER_API_URL || 'http://localhost:8001').replace(/\/+$/, '');
    const sessionUrl = `${apiUrl}/session-id`;
    console.log('[chat/session] Fetching session from:', sessionUrl);

    const response = await fetch(sessionUrl, {
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
    // Return a local fallback session ID so the stream route can still proceed
    const fallbackId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return NextResponse.json({ session_id: fallbackId });
  }
}