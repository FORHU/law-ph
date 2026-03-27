import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const backendUrl = (process.env.CHAT_WONDER_API_URL || process.env.NEXT_PUBLIC_CHAT_WONDER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/$/, '');
  
  const resolvedParams = await params;
  const apiPath = resolvedParams.path.join('/');
  const targetUrl = `${backendUrl}/${apiPath}`;

  console.log(`[Proxy] Routing ${req.method} request to: ${targetUrl}`);

  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[Proxy] Failed to parse request JSON body');
      body = {};
    }
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
        'Cookie': req.headers.get('Cookie') || '',
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.warn(`[Proxy] Backend returned non-JSON response: ${text.substring(0, 100)}`);
      data = { success: false, error: 'Invalid response from backend', detail: text };
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error(`[Proxy] CRITICAL ERROR for ${targetUrl}:`, error);
    return NextResponse.json({ 
      success: false, 
      error: 'Proxy request failed', 
      detail: error.message,
      targetUrl: targetUrl,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
