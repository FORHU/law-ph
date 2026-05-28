import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

function parseS3Url(url: string): { bucket: string; key: string } | null {
  const match = url.match(/https:\/\/([^.]+)\.s3(?:\.[^.]+)?\.amazonaws\.com\/(.+?)(\?.*)?$/);
  if (!match) return null;
  return { bucket: match[1], key: decodeURIComponent(match[2]) };
}

async function resolveUrl(url: string): Promise<string> {
  if (!url.includes("amazonaws.com")) return url;
  const parsed = parseS3Url(url);
  if (!parsed) return url;
  const command = new GetObjectCommand({ Bucket: parsed.bucket, Key: parsed.key });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function OPTIONS(_req: NextRequest) {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Range, Content-Type");
  return new NextResponse(null, { status: 204, headers });
}

async function handleProxy(req: NextRequest, method: "GET" | "HEAD") {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const targetUrl = new URL(url);

    const allowedDomains = ["cloudfront.net", "s3.amazonaws.com", "amazonaws.com"];
    const isAllowed = allowedDomains.some((domain) => targetUrl.hostname.endsWith(domain));
    if (!isAllowed) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }

    const fetchUrl = await resolveUrl(url);

    const forwardHeaders: Record<string, string> = {
      Accept: "*/*",
    };
    const rangeHeader = req.headers.get("range");
    if (rangeHeader) forwardHeaders["Range"] = rangeHeader;

    const response = await fetch(fetchUrl, {
      method,
      headers: forwardHeaders,
      cache: "no-store",
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Failed to fetch resource: ${response.status} ${response.statusText}`);
    }

    const resHeaders = new Headers();
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    resHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type");

    const contentType = response.headers.get("content-type");
    const acceptRanges = response.headers.get("accept-ranges") || "bytes";
    const contentRange = response.headers.get("content-range");
    const contentLength = response.headers.get("content-length");

    if (contentType) resHeaders.set("Content-Type", contentType);
    if (acceptRanges) resHeaders.set("Accept-Ranges", acceptRanges);
    if (contentRange) resHeaders.set("Content-Range", contentRange);
    if (contentLength) resHeaders.set("Content-Length", contentLength);

    if (response.status === 200 && method === "GET") {
      resHeaders.set("Cache-Control", "public, max-age=3600");
    }

    let body: Uint8Array | null = null;
    if (method === "GET") {
      body = new Uint8Array(await response.arrayBuffer());
    }

    return new NextResponse(body as any, { status: response.status, headers: resHeaders });
  } catch (error: any) {
    console.error(`[Resource Proxy] Error proxying ${url}:`, error);
    return NextResponse.json({ error: "Proxy failed", detail: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleProxy(req, "GET");
}

export async function HEAD(req: NextRequest) {
  return handleProxy(req, "HEAD");
}
