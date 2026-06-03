import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { listDocuments, searchDocumentsByKeyword, getCategories } from "@/lib/rag-db";
import { redis } from "@/lib/redis";

// ---------------------------------------------------------------------------
// L1: in-process Map (per-instance, zero latency)
// L2: Upstash Redis (cross-instance, 30-min TTL — library data changes rarely)
// ---------------------------------------------------------------------------
const CACHE_TTL_S  = 30 * 60;
const CACHE_TTL_MS = CACHE_TTL_S * 1000;
const CACHE_MAX    = 300;

interface CacheEntry { documents: unknown[]; total: number; ts: number }
const l1 = new Map<string, CacheEntry>();

function l1Get(key: string): { documents: unknown[]; total: number } | null {
  const entry = l1.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { l1.delete(key); return null; }
  return { documents: entry.documents, total: entry.total };
}

function l1Set(key: string, documents: unknown[], total: number): void {
  if (l1.size >= CACHE_MAX) {
    const oldest = [...l1.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) l1.delete(oldest[0]);
  }
  l1.set(key, { documents, total, ts: Date.now() });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const keyword    = searchParams.get("q");
  const category   = searchParams.get("category") ?? undefined;
  const subcategory = searchParams.get("subcategory") ?? undefined;
  const year       = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const yearFrom   = searchParams.get("yearFrom") ? parseInt(searchParams.get("yearFrom")!) : undefined;
  const yearTo     = searchParams.get("yearTo") ? parseInt(searchParams.get("yearTo")!) : undefined;
  const libraries  = searchParams.get("libraries") ? searchParams.get("libraries")!.split(",") : undefined;
  const limit      = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20;
  const offset     = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

  // Cache key = full query string (already contains all params, deterministic)
  const cacheKey = `rag:docs:${searchParams.toString()}`;

  try {
    // ── L1 hit ──────────────────────────────────────────────────────────────
    const fromL1 = l1Get(cacheKey);
    if (fromL1) {
      return NextResponse.json({ ...fromL1, cache: 'l1' });
    }

    // ── L2 hit (Redis) ───────────────────────────────────────────────────────
    const fromRedis = await redis.get<{ documents: unknown[]; total: number }>(cacheKey);
    if (fromRedis?.documents && fromRedis.documents.length > 0) {
      l1Set(cacheKey, fromRedis.documents, fromRedis.total ?? 0);
      return NextResponse.json({ ...fromRedis, cache: 'l2' });
    }

    // ── Cache miss — query Postgres ──────────────────────────────────────────
    let documents: unknown[];
    let total: number;

    if (keyword) {
      const result = await searchDocumentsByKeyword(keyword, { limit, offset, yearFrom, yearTo, libraries, category, subcategory });
      documents = result.rows;
      total = result.total;
    } else {
      const result = await listDocuments({ category, subcategory, year, yearFrom, yearTo, libraries, limit, offset });
      documents = result.rows;
      total = result.total;
    }

    if (documents.length > 0) {
      l1Set(cacheKey, documents, total);
      redis.set(cacheKey, { documents, total }, CACHE_TTL_S);
    }

    return NextResponse.json({ documents, total, cache: 'miss' });
  } catch (error: any) {
    console.error("[RAG Documents] Error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
