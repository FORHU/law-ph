/**
 * Legal case detail for law-ph (sources page, sidebar, content fetcher).
 * Reads directly from legal RAG via RAG_DATABASE_URL — not Chat Wonder.
 * See CONTEXT.md: Legal case detail.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDocumentById, getDocumentFullText } from "@/lib/rag-db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;

    if (!/^\d+$/.test(itemId)) {
      return NextResponse.json(
        { error: "item_id must be a numeric legal document id" },
        { status: 400 }
      );
    }

    const id = parseInt(itemId, 10);
    const doc = await getDocumentById(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const metadata = (doc.metadata_json ?? {}) as Record<string, string>;
    const fullText = await getDocumentFullText(id);
    const textContent = fullText || doc.summary || doc.concise_summary || "";
    const formattedMarkdown = doc.formatted_markdown?.trim() || null;

    return NextResponse.json({
      id: doc.id,
      item_id: String(doc.id),
      type: doc.category,
      title: doc.title,
      url: doc.source_url,
      text_content: textContent,
      formatted_markdown: formattedMarkdown,
      gr_number: metadata.gr_number ?? "",
      law_number: metadata.law_number ?? "",
      date: metadata.date ?? "",
      year: doc.year ?? "",
    });
  } catch (error: unknown) {
    console.error("[Legal Case] Error:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}
