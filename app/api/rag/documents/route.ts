import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { listDocuments, searchDocumentsByKeyword, getCategories } from "@/lib/rag-db";

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("q");
  const category = searchParams.get("category") ?? undefined;
  const subcategory = searchParams.get("subcategory") ?? undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

  try {
    if (keyword) {
      const documents = await searchDocumentsByKeyword(keyword, { limit, offset });
      return NextResponse.json({ documents });
    }

    const documents = await listDocuments({ category, subcategory, year, limit, offset });
    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error("[RAG Documents] Error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
