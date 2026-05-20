import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { vectorSearch } from "@/lib/rag-db";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { embedding, limit = 10, offset = 0, minSimilarity = 0.3 } = body;

    if (!embedding || !Array.isArray(embedding)) {
      return NextResponse.json(
        { error: "embedding is required and must be a float array" },
        { status: 400 }
      );
    }

    const results = await vectorSearch(embedding, { limit, offset, minSimilarity });
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("[RAG Search] Error:", error);
    return NextResponse.json({ error: "Failed to perform vector search" }, { status: 500 });
  }
}
