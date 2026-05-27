import { NextRequest, NextResponse } from "next/server";

const CHAT_WONDER_API_URL = process.env.CHAT_WONDER_API_URL || "http://localhost:8000";

/**
 * POST /api/rag/documents/{id}/format
 * Format one legal document → formatted_markdown (proxies Chat Wonder).
 *
 * curl -X POST 'http://localhost:3000/api/rag/documents/150/format'
 * curl -X POST 'http://localhost:3000/api/rag/documents/150/format?force=true'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!/^\d+$/.test(id)) {
      return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
    }

    const { searchParams } = request.nextUrl;
    const forward = new URLSearchParams();
    if (searchParams.get("force") === "true") forward.set("force", "true");
    if (searchParams.get("generate_title") === "false") forward.set("generate_title", "false");
    const qs = forward.toString() ? `?${forward.toString()}` : "";
    const response = await fetch(
      `${CHAT_WONDER_API_URL}/api/legal/format-document/${id}${qs}`,
      { method: "POST" }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Format failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Format failed";
    console.error("[RAG Format Document]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
