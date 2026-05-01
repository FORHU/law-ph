import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const backendUrl = (process.env.CHAT_WONDER_API_URL || process.env.NEXT_PUBLIC_CHAT_WONDER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/$/, '');
  
  const resolvedParams = await params;
  const apiPath = resolvedParams.path.join('/');
  const searchParams = req.nextUrl.search;
  const targetUrl = `${backendUrl}/${apiPath}${searchParams}`;

  console.log(`[Proxy] Routing GET request to: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Authorization': req.headers.get('Authorization') || '',
        'Cookie': req.headers.get('Cookie') || '',
      },
    });

    const contentType = response.headers.get('content-type');
    
    // For large files or binary data, we stream the response
    const headers = new Headers();
    if (contentType) headers.set('Content-Type', contentType);
    
    // Copy other important headers
    const importantHeaders = ['content-length', 'accept-ranges', 'content-range', 'cache-control'];
    importantHeaders.forEach(h => {
      const val = response.headers.get(h);
      if (val) headers.set(h, val);
    });

    return new NextResponse(response.body, { 
      status: response.status,
      headers
    });
  } catch (error: any) {
    console.error(`[Proxy] GET ERROR for ${targetUrl}:`, error);
    return NextResponse.json({ 
      success: false, 
      error: 'Proxy GET failed', 
      detail: error.message 
    }, { status: 500 });
  }
}

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
