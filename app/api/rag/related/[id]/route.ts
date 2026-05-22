import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import ragPool from "@/lib/db-rag";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const docId = parseInt(id, 10);
  if (isNaN(docId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    // Get the average embedding of all chunks for this document
    const { rows: avgRows } = await ragPool.query<{ avg_embedding: string }>(
      `SELECT avg(embedding)::vector AS avg_embedding
       FROM document_chunks
       WHERE document_id = $1`,
      [docId]
    );

    if (!avgRows[0]?.avg_embedding) {
      return NextResponse.json({ related: [] });
    }

    // Find similar documents by cosine similarity, excluding the current doc
    const { rows } = await ragPool.query(
      `SELECT DISTINCT ON (d.id)
         d.id, d.title, d.case_no, d.category, d.subcategory, d.year, d.concise_summary,
         1 - (dc.embedding <=> $1::vector) AS similarity
       FROM document_chunks dc
       JOIN documents d ON d.id = dc.document_id
       WHERE d.id != $2
         AND 1 - (dc.embedding <=> $1::vector) >= 0.5
       ORDER BY d.id, dc.embedding <=> $1::vector
       LIMIT 20`,
      [avgRows[0].avg_embedding, docId]
    );

    // Re-sort by similarity and take top 5
    const related = rows
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, 5);

    return NextResponse.json({ related });
  } catch (err) {
    console.error("[api/rag/related]", err);
    return NextResponse.json({ related: [] });
  }
}
