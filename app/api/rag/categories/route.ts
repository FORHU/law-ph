import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getCategories, getSubcategories } from "@/lib/rag-db";

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  try {
    if (category) {
      const subcategories = await getSubcategories(category);
      return NextResponse.json({ subcategories });
    }

    const categories = await getCategories();
    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error("[RAG Categories] Error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
