/**
 * Legal case detail for law-ph (sources page, sidebar, content fetcher).
 * Reads directly from legal RAG via RAG_DATABASE_URL — not Chat Wonder.
 *
 * Caching:
 *   L1 — in-process Map (per instance, instant)
 *   L2 — Redis (cross-instance, 1-hour TTL)
 *   Legal documents never change, so a long TTL is safe.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDocumentById, getDocumentFullText } from "@/lib/rag-db";
import { redis } from "@/lib/redis";

const CACHE_TTL_S  = 60 * 60;        // 1 hour in Redis
const CACHE_TTL_MS = CACHE_TTL_S * 1000;
const CACHE_MAX    = 100;             // max documents in L1

interface CacheEntry { data: unknown; ts: number }
const l1 = new Map<string, CacheEntry>();

function l1Get(key: string): unknown | null {
  const entry = l1.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { l1.delete(key); return null; }
  return entry.data;
}

function l1Set(key: string, data: unknown): void {
  if (l1.size >= CACHE_MAX) {
    const oldest = [...l1.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) l1.delete(oldest[0]);
  }
  l1.set(key, { data, ts: Date.now() });
}

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

    const cacheKey = `legal:doc:${itemId}`;

    // ── L1 hit ──────────────────────────────────────────────────────────────
    const fromL1 = l1Get(cacheKey);
    if (fromL1) {
      return NextResponse.json(fromL1, {
        headers: { 'X-Cache': 'L1' },
      });
    }

    // ── L2 hit (Redis) ───────────────────────────────────────────────────────
    const fromRedis = await redis.get<unknown>(cacheKey);
    if (fromRedis) {
      l1Set(cacheKey, fromRedis);
      return NextResponse.json(fromRedis, {
        headers: { 'X-Cache': 'L2' },
      });
    }

    // ── Cache miss — query Postgres ──────────────────────────────────────────
    const id = parseInt(itemId, 10);

    // Run both queries in parallel instead of sequentially
    const [doc, fullText] = await Promise.all([
      getDocumentById(id),
      getDocumentFullText(id),
    ]);

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const metadata = (doc.metadata_json ?? {}) as Record<string, string>;
    const textContent = fullText || doc.summary || doc.concise_summary || "";
    const formattedMarkdown = doc.formatted_markdown?.trim() || null;

    const result = {
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
    };

    // Cache — fire-and-forget for Redis
    l1Set(cacheKey, result);
    redis.set(cacheKey, result, CACHE_TTL_S);

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'miss' },
    });
  } catch (error: unknown) {
    console.error("[Legal Case] Error:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}
