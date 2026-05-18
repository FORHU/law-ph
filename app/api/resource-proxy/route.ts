import { NextRequest, NextResponse } from "next/server";

/**
 * Resource Proxy Route with full HTTP Range Request, HEAD method, and CORS support.
 * 
 * This route allows the frontend to fetch external resources (like S3 files or Transcribe outputs)
 * through the Next.js server, bypassing browser CORS restrictions and supporting media seeking/scrubbing.
 */

export async function OPTIONS(req: NextRequest) {
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Range, Content-Type");
    return new NextResponse(null, { status: 204, headers });
}

async function handleProxy(req: NextRequest, method: 'GET' | 'HEAD') {
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

        console.log(`[Resource Proxy] [${method}] Fetching: ${url}`);

        const rangeHeader = req.headers.get("range");
        const forwardHeaders: Record<string, string> = {
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };
        if (rangeHeader) {
            forwardHeaders['Range'] = rangeHeader;
        }

        let response = await fetch(url, {
            method: method,
            headers: forwardHeaders,
            cache: 'no-store', // Disable Next.js caching to prevent range/seeking bugs
        });

        // Fallback Logic: If CloudFront fails (403/404), try direct S3
        if (!response.ok && (response.status === 403 || response.status === 404) && url.includes('cloudfront.net')) {
            console.warn(`[Resource Proxy] CloudFront failed (${response.status}). Attempting S3 fallback for: ${url}`);
            
            const filename = targetUrl.pathname.split('/').pop();
            if (filename) {
                const bucket = process.env.AWS_S3_BUCKET || "ilovelawyer-dev";
                const region = process.env.NEXT_PUBLIC_AWS_REGION || "ap-southeast-1";
                const s3FallbackUrl = `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
                
                console.log(`[Resource Proxy] S3 Fallback URL: ${s3FallbackUrl}`);
                const fallbackResponse = await fetch(s3FallbackUrl, {
                    method: method,
                    headers: forwardHeaders,
                    cache: 'no-store'
                });

                if (fallbackResponse.ok) {
                    console.log(`[Resource Proxy] S3 Fallback SUCCESS`);
                    response = fallbackResponse;
                } else {
                    console.error(`[Resource Proxy] S3 Fallback also failed: ${fallbackResponse.status}`);
                }
            }
        }

        if (!response.ok && response.status !== 206) {
            console.error(`[Resource Proxy] Fetch failed for ${url}: ${response.status} ${response.statusText}`);
            throw new Error(`Failed to fetch resource: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type");
        const acceptRanges = response.headers.get("accept-ranges") || "bytes";
        const contentRange = response.headers.get("content-range");
        const contentLength = response.headers.get("content-length");

        let body: Buffer | null = null;
        if (method === 'GET') {
            const arrayBuffer = await response.arrayBuffer();
            body = Buffer.from(arrayBuffer);
        }

        // Return the response with the original content type and range headers
        const headers = new Headers();
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Range, Content-Type");

        if (contentType) headers.set("Content-Type", contentType);
        if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);
        if (contentRange) headers.set("Content-Range", contentRange);
        if (contentLength) headers.set("Content-Length", contentLength);

        // Add cache control to avoid redundant fetches (only for 200 GET responses)
        if (response.status === 200 && method === 'GET') {
            headers.set("Cache-Control", "public, max-age=3600");
        }

        return new NextResponse(body, {
            status: response.status,
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

export async function GET(req: NextRequest) {
    return handleProxy(req, 'GET');
}

export async function HEAD(req: NextRequest) {
    return handleProxy(req, 'HEAD');
}
