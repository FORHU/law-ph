import { NextRequest, NextResponse } from "next/server";

const CHAT_WONDER_API_URL = process.env.CHAT_WONDER_API_URL || "http://localhost:8000";

/**
 * POST /api/rag/format-documents
 * Batch-format legal documents → formatted_markdown (proxies Chat Wonder).
 *
 * curl -X POST 'http://localhost:3000/api/rag/format-documents?limit=10'
 * curl -X POST 'http://localhost:3000/api/rag/format-documents?all=true'
 * curl -X POST 'http://localhost:3000/api/rag/format-documents?all=true&delay=0.25'
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const forward = new URLSearchParams();

    if (searchParams.get("force") === "true") forward.set("force", "true");
    if (searchParams.get("all") === "true") forward.set("all", "true");
    if (searchParams.get("generate_title") === "false") forward.set("generate_title", "false");
    if (searchParams.has("limit")) forward.set("limit", searchParams.get("limit")!);
    if (searchParams.has("delay")) forward.set("delay", searchParams.get("delay")!);

    const qs = forward.toString();
    const url = `${CHAT_WONDER_API_URL}/api/legal/format-documents${qs ? `?${qs}` : ""}`;

    const response = await fetch(url, {
      method: "POST",
      // Batch runs can take a long time when all=true
      signal: AbortSignal.timeout(60 * 60 * 1000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Batch format failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Batch format failed";
    console.error("[RAG Format Documents]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
