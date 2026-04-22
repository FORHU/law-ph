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

        let response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
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
                    method: 'GET',
                    headers: { 'Accept': '*/*' }
                });

                if (fallbackResponse.ok) {
                    console.log(`[Resource Proxy] S3 Fallback SUCCESS`);
                    response = fallbackResponse;
                } else {
                    console.error(`[Resource Proxy] S3 Fallback also failed: ${fallbackResponse.status}`);
                }
            }
        }

        if (!response.ok) {
            console.error(`[Resource Proxy] Fetch failed for ${url}: ${response.status} ${response.statusText}`);
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
