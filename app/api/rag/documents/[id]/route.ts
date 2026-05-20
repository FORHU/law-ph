import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getDocumentById, getDocumentFullText, getChunksByDocumentId } from "@/lib/rag-db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numericId = parseInt(id);
  if (isNaN(numericId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const includeFullText = searchParams.get("fullText") === "true";
  const includeChunks = searchParams.get("chunks") === "true";

  try {
    const document = await getDocumentById(numericId);
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const result: Record<string, unknown> = { document };

    if (includeFullText) {
      result.fullText = await getDocumentFullText(numericId);
    }

    if (includeChunks) {
      result.chunks = await getChunksByDocumentId(numericId);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[RAG Document] Error:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}
