import { NextRequest, NextResponse } from 'next/server';
import { searchDocumentsByKeyword, searchDocumentsByPhrases, searchDocumentsByPhrasesWithTotal, listDocuments } from '@/lib/rag-db';
import { redis } from '@/lib/redis';
import ragPool from '@/lib/db-rag';

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','it','its','be','was','are','were','been','has','have',
  'had','do','does','did','will','would','could','should','may','might',
  'give','me','show','get','find','search','case','cases','about','what',
  'who','where','when','how','can','please','tell','regarding','related',
  'any','all','some','this','that','these','those','my','your','their',
]);

function extractKeywords(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  return [...new Set(words)]
    .sort((a, b) => b.length - a.length)
    .slice(0, 5)
    .join(' ');
}

// ---------------------------------------------------------------------------
// L1: in-process LRU (always available, per-instance, zero latency)
// L2: Upstash Redis (cross-instance, 10-min TTL, only when env vars set)
// ---------------------------------------------------------------------------
const CACHE_TTL_S  = 10 * 60;   // 10 min (Redis)
const CACHE_TTL_MS = CACHE_TTL_S * 1000;
const CACHE_MAX    = 200;

interface CacheEntry { results: unknown[]; total: number; ts: number }
const l1 = new Map<string, CacheEntry>();

type SearchResultRow = {
  item_id?: string;
  [key: string]: unknown;
};

function buildKey(phrases: string[] | null, keyword: string, limit: number | undefined, offset: number, question?: string): string {
  // Prefer question text as key — stable across responses to the same question.
  // AI-generated phrases vary even for identical inputs, making them unreliable cache keys.
  const base = question
    ? `legal:q:${question.toLowerCase().slice(0, 200)}`
    : phrases
      ? `legal:p:${[...phrases].sort().join('|')}`
      : `legal:k:${keyword}`;
  return `${base}:${limit}:${offset}`;
}

function l1Get(key: string): { results: unknown[]; total: number } | null {
  const entry = l1.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { l1.delete(key); return null; }
  return { results: entry.results, total: entry.total };
}

function l1Set(key: string, results: unknown[], total: number): void {
  if (l1.size >= CACHE_MAX) {
    const oldest = [...l1.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) l1.delete(oldest[0]);
  }
  l1.set(key, { results, total, ts: Date.now() });
}

async function filterExistingItemIds(results: unknown[]): Promise<SearchResultRow[]> {
  const rows = (Array.isArray(results) ? results : []) as SearchResultRow[];
  if (rows.length === 0) return [];

  const ids = rows
    .map((r) => String(r?.item_id ?? '').trim())
    .filter((id) => /^\d+$/.test(id));

  if (ids.length === 0) return [];

  const uniqueIds = [...new Set(ids)].map((id) => Number(id));
  const { rows: existingRows } = await ragPool.query<{ id: number }>(
    "SELECT id FROM documents WHERE id = ANY($1::bigint[])",
    [uniqueIds]
  );
  const existing = new Set(existingRows.map((r) => String(r.id)));
  return rows.filter((r) => existing.has(String(r.item_id)));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, phrases: rawPhrases, exactRefs: rawExactRefs, question, page = 1 } = body;
    const limitRaw = parseInt(body.limit, 10);
    const limit = isNaN(limitRaw) || limitRaw <= 0 ? undefined : limitRaw;
    const offset = limit ? (page - 1) * limit : 0;

    const phrases   = Array.isArray(rawPhrases)   ? rawPhrases.slice(0, 8)   : [];
    const exactRefs = Array.isArray(rawExactRefs) ? rawExactRefs.slice(0, 8) : [];

    const isPhrases = phrases.length > 0 || exactRefs.length > 0;
    const keyword   = !isPhrases && prompt ? extractKeywords(prompt) : '';
    const key       = buildKey(isPhrases ? [...exactRefs, ...phrases] : null, keyword, limit, offset, question);

    // ── L1 hit ──────────────────────────────────────────────────────────────
    const fromL1 = l1Get(key);
    if (fromL1) {
      const validated = await filterExistingItemIds(fromL1.results);
      if (validated.length > 0) {
        const totalPages = limit ? Math.ceil(fromL1.total / limit) : 1;
        return NextResponse.json({ results: validated, total: fromL1.total, page, limit, totalPages, cache: 'l1' });
      }
      l1.delete(key);
    }

    // ── L2 hit (Redis) ───────────────────────────────────────────────────────
    const fromRedis = await redis.get<{ results: unknown[]; total: number } | unknown[]>(key);
    const redisResults = Array.isArray(fromRedis) ? fromRedis : (fromRedis as any)?.results;
    const redisTotal: number = Array.isArray(fromRedis) ? 0 : ((fromRedis as any)?.total ?? 0);
    if (redisResults && redisResults.length > 0) {
      const validated = await filterExistingItemIds(redisResults);
      if (validated.length > 0) {
        l1Set(key, validated, redisTotal);
        const totalPages = limit ? Math.ceil(redisTotal / limit) : 1;
        return NextResponse.json({ results: validated, total: redisTotal, page, limit, totalPages, cache: 'l2' });
      }
    }

    // ── Cache miss — query Postgres ──────────────────────────────────────────
    console.log('[Legal Search] Searching phrases:', phrases, '| question:', question?.slice(0, 80));
    let documents;
    let total = 0;
    if (isPhrases) {
      const { rows, total: t } = await searchDocumentsByPhrasesWithTotal(phrases, { limit, offset, exactRefs });
      documents = rows;
      total = t;
      console.log('[Legal Search] Postgres returned', documents.length, 'rows, total:', total);
    } else {
      documents = keyword
        ? await searchDocumentsByKeyword(keyword, { limit, offset })
        : await listDocuments({ limit, offset });
      total = documents.length + offset; // best-effort estimate for non-phrase paths
    }

    const results = documents.map((doc) => ({
      item_id:   String(doc.id),
      gr_number: doc.case_no,
      title:     doc.title ?? doc.case_no ?? 'Philippine Legal Document',
      snippet:   doc.concise_summary ?? null,
      url:       doc.source_url ?? null,
      type:      doc.bucket_slug,
      subtype:   doc.subcategory ?? doc.category ?? null,
      year:      doc.year ?? null,
      score:     null,
    }));

    const totalPages = limit ? Math.ceil(total / limit) : 1;

    // Only cache non-empty results — caching [] would lock out retries for 10 min
    if (results.length > 0) {
      l1Set(key, results, total);
      redis.set(key, { results, total }, CACHE_TTL_S);
    }

    return NextResponse.json({ results, total, page, limit, totalPages, cache: 'miss' });
  } catch (error: any) {
    console.error('[Legal Search] Error:', error);
    return NextResponse.json(
      { error: `Failed to search legal documents: ${error.message}` },
      { status: 500 }
    );
  }
}
