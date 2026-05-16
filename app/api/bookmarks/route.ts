import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getBookmarks, addBookmark } from "@/lib/bookmarks-service";

export async function GET() {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bookmarks = await getBookmarks(user.id);
  return NextResponse.json({ bookmarks });
}

export async function POST(request: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const bookmark = await addBookmark(user.id, body);
  if (!bookmark) return NextResponse.json({ error: "Failed to create bookmark" }, { status: 500 });
  return NextResponse.json({ bookmark });
}
