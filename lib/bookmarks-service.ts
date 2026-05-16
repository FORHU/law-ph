import { prisma } from "@/lib/prisma";
import { BookmarkType } from "@/generated/prisma";

export interface Bookmark {
  id: string;
  userId: string;
  itemId: string;
  title: string;
  reference: string | null;
  type: "case" | "source";
  url?: string | null;
  aiSummary?: string | null;
  doctrine?: string | null;
  facts?: string | null;
  createdAt: Date;
}

export type NewBookmark = Omit<Bookmark, "id" | "userId" | "createdAt">;

export async function getBookmarks(userId: string): Promise<Bookmark[]> {
  try {
    const rows = await prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      ...r,
      type: r.type as "case" | "source",
    }));
  } catch (err) {
    console.error("[bookmarks-service] getBookmarks error:", err);
    return [];
  }
}

export async function addBookmark(userId: string, bookmark: NewBookmark): Promise<Bookmark | null> {
  try {
    const row = await prisma.bookmark.create({
      data: {
        userId,
        itemId: bookmark.itemId,
        title: bookmark.title,
        reference: bookmark.reference ?? null,
        type: bookmark.type as BookmarkType,
        url: bookmark.url ?? null,
        aiSummary: bookmark.aiSummary ?? null,
        doctrine: bookmark.doctrine ?? null,
        facts: bookmark.facts ?? null,
      },
    });
    return { ...row, type: row.type as "case" | "source" };
  } catch (err) {
    console.error("[bookmarks-service] addBookmark error:", err);
    return null;
  }
}

export async function removeBookmark(id: string): Promise<boolean> {
  try {
    await prisma.bookmark.delete({ where: { id } });
    return true;
  } catch (err) {
    console.error("[bookmarks-service] removeBookmark error:", err);
    return false;
  }
}

export async function checkIsBookmarked(userId: string, itemId: string): Promise<string | null> {
  try {
    const row = await prisma.bookmark.findUnique({
      where: { userId_itemId: { userId, itemId } },
      select: { id: true },
    });
    return row?.id ?? null;
  } catch (err) {
    console.error("[bookmarks-service] checkIsBookmarked error:", err);
    return null;
  }
}
