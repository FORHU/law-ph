import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const backendUrl = process.env.CHAT_WONDER_API_URL || process.env.NEXT_PUBLIC_CHAT_WONDER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
  
  // Await the params object in Next.js 15
  const resolvedParams = await params;
  
  // Reconstruct the exact path they wanted to hit (e.g. ['api', 'legal', 'document-upload-url'])
  const apiPath = resolvedParams.path.join('/');
  const targetUrl = `${backendUrl}/${apiPath}`;

  try {
    const body = await req.json();
    
    // Have Next.js server talk to EC2 (no browser mixed-content rule here!)
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ success: false, error: 'Proxy request failed' }, { status: 500 });
  }
}
