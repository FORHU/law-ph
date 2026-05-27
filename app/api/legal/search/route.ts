import { NextRequest, NextResponse } from 'next/server';
import { searchDocumentsByKeyword, searchDocumentsByPhrases, listDocuments } from '@/lib/rag-db';
import { redis } from '@/lib/redis';

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

interface CacheEntry { results: unknown[]; ts: number }
const l1 = new Map<string, CacheEntry>();

function buildKey(phrases: string[] | null, keyword: string, limit: number, offset: number, question?: string): string {
  // Prefer question text as key — stable across responses to the same question.
  // AI-generated phrases vary even for identical inputs, making them unreliable cache keys.
  const base = question
    ? `legal:q:${question.toLowerCase().slice(0, 200)}`
    : phrases
      ? `legal:p:${[...phrases].sort().join('|')}`
      : `legal:k:${keyword}`;
  return `${base}:${limit}:${offset}`;
}

function l1Get(key: string): unknown[] | null {
  const entry = l1.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { l1.delete(key); return null; }
  return entry.results;
}

function l1Set(key: string, results: unknown[]): void {
  if (l1.size >= CACHE_MAX) {
    const oldest = [...l1.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) l1.delete(oldest[0]);
  }
  l1.set(key, { results, ts: Date.now() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, phrases: rawPhrases, question, page = 1, limit = 10 } = body;
    const offset = (page - 1) * limit;

    const phrases = Array.isArray(rawPhrases) ? rawPhrases.slice(0, 8) : rawPhrases;

    const isPhrases = Array.isArray(phrases) && phrases.length > 0;
    const keyword   = !isPhrases && prompt ? extractKeywords(prompt) : '';
    const key       = buildKey(isPhrases ? phrases : null, keyword, limit, offset, question);

    // ── L1 hit ──────────────────────────────────────────────────────────────
    const fromL1 = l1Get(key);
    if (fromL1) return NextResponse.json({ results: fromL1, cache: 'l1' });

    // ── L2 hit (Redis) ───────────────────────────────────────────────────────
    const fromRedis = await redis.get<unknown[]>(key);
    // Ignore stale empty-array entries — they were cached before the "no-cache-empty" fix
    if (fromRedis && fromRedis.length > 0) {
      l1Set(key, fromRedis); // warm L1 so next request skips Redis
      return NextResponse.json({ results: fromRedis, cache: 'l2' });
    }

    // ── Cache miss — query Postgres ──────────────────────────────────────────
    console.log('[Legal Search] Searching phrases:', phrases, '| question:', question?.slice(0, 80));
    let documents;
    if (isPhrases) {
      documents = await searchDocumentsByPhrases(phrases, { limit, offset });
      console.log('[Legal Search] Postgres returned', documents.length, 'rows');
    } else {
      documents = keyword
        ? await searchDocumentsByKeyword(keyword, { limit, offset })
        : await listDocuments({ limit, offset });
    }

    const results = documents.map((doc) => ({
      item_id:   String(doc.id),
      gr_number: doc.case_no,
      title:     doc.title ?? doc.case_no ?? 'Philippine Legal Document',
      url:       doc.source_url ?? null,
      type:      doc.bucket_slug,
      subtype:   doc.subcategory ?? doc.category ?? null,
      year:      doc.year ?? null,
      score:     null,
    }));

    // Only cache non-empty results — caching [] would lock out retries for 10 min
    if (results.length > 0) {
      l1Set(key, results);
      redis.set(key, results, CACHE_TTL_S);
    }

    return NextResponse.json({ results, cache: 'miss' });
  } catch (error: any) {
    console.error('[Legal Search] Error:', error);
    return NextResponse.json(
      { error: `Failed to search legal documents: ${error.message}` },
      { status: 500 }
    );
  }
}
