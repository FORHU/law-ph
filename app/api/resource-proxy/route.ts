import { NextRequest, NextResponse } from "next/server";

/**
 * Resource Proxy Route
 * 
 * This route allows the frontend to fetch external resources (like S3 files or Transcribe outputs)
 * through the Next.js server, bypassing browser CORS restrictions.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const targetUrl = new URL(url);
    
    // Security: Only allow requests to known AWS/CloudFront domains
    const allowedDomains = [
      'cloudfront.net',
      's3.amazonaws.com',
      'amazonaws.com'
    ];
    
    const isAllowed = allowedDomains.some(domain => 
      targetUrl.hostname.endsWith(domain)
    );

    if (!isAllowed) {
      console.warn(`[Resource Proxy] Blocked request to unauthorized domain: ${targetUrl.hostname}`);
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }

    console.log(`[Resource Proxy] Fetching: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      // Ensure we don't pass along any conflicting headers from the original request
      headers: {
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch resource: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    const arrayBuffer = await response.arrayBuffer();

    // Return the response with the original content type
    const headers = new Headers();
    if (contentType) {
      headers.set("Content-Type", contentType);
    }
    
    // Add cache control to avoid redundant fetches
    headers.set("Cache-Control", "public, max-age=3600");

    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error(`[Resource Proxy] Error proxying ${url}:`, error);
    return NextResponse.json({ 
      error: "Proxy failed", 
      detail: error.message 
    }, { status: 500 });
  }
}
