/**
 * RAG database utilities — direct queries against the legalrag PostgreSQL database.
 * Uses lib/db-rag.ts (pg Pool via RAG_DATABASE_URL).
 *
 * Vector similarity search requires a pre-computed embedding (float[1536]).
 * Generate one with your embedding provider (Google, OpenAI, etc.) then pass it here.
 */

import ragPool from "./db-rag";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RagDocument {
  id: number;
  source_hash: string;
  content_hash: string | null;
  bucket_slug: string;
  category: string;
  subcategory: string | null;
  title: string | null;
  case_no: string | null;
  year: number | null;
  source_url: string | null;
  metadata_json: Record<string, unknown>;
  summary: string | null;
  concise_summary: string | null;
  full_text: string | null;
  full_text_source: string | null;
  formatted_markdown: string | null;
  s3_json_path: string;
  s3_manifest_path: string;
  created_at: Date;
  updated_at: Date;
}

export interface RagChunk {
  id: number;
  document_id: number;
  chunk_index: number;
  chunk_text: string;
  char_count: number;
  created_at: Date;
}

export interface ChunkWithDocument extends RagChunk {
  document: Pick<RagDocument, "id" | "title" | "category" | "subcategory" | "case_no" | "year" | "source_url" | "concise_summary">;
}

export interface VectorSearchResult extends ChunkWithDocument {
  similarity: number;
}

export interface IngestionRun {
  id: number;
  source_type: string;
  source_ref: string;
  status: string;
  started_at: Date;
  completed_at: Date | null;
  stats_json: Record<string, unknown>;
  error_json: Record<string, unknown> | null;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
}

export interface DocumentFilter extends ListOptions {
  category?: string;
  subcategory?: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  libraries?: string[];
  bucketSlug?: string;
}

// ── Documents ─────────────────────────────────────────────────────────────────

/** Fetch a single document by its numeric ID. */
export async function getDocumentById(id: number): Promise<RagDocument | null> {
  const { rows } = await ragPool.query<RagDocument>(
    "SELECT * FROM documents WHERE id = $1 LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

/** Fetch a single document by its unique source hash. */
export async function getDocumentBySourceHash(hash: string): Promise<RagDocument | null> {
  const { rows } = await ragPool.query<RagDocument>(
    "SELECT * FROM documents WHERE source_hash = $1 LIMIT 1",
    [hash]
  );
  return rows[0] ?? null;
}

/**
 * List documents with optional filters.
 * Returns lightweight rows (no full_text) for listing UIs.
 */
export async function listDocuments(filter: DocumentFilter = {}): Promise<RagDocument[]> {
  const { limit = 20, offset = 0, category, subcategory, year, yearFrom, yearTo, libraries, bucketSlug } = filter;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  if (subcategory) {
    params.push(subcategory);
    conditions.push(`subcategory = $${params.length}`);
  }
  if (year) {
    params.push(year);
    conditions.push(`year = $${params.length}`);
  }
  if (yearFrom) {
    params.push(yearFrom);
    conditions.push(`year >= $${params.length}`);
  }
  if (yearTo) {
    params.push(yearTo);
    conditions.push(`year <= $${params.length}`);
  }
  if (bucketSlug) {
    params.push(bucketSlug);
    conditions.push(`bucket_slug = $${params.length}`);
  }
  if (libraries && libraries.length > 0) {
    const libConditions = libraries.map(lib => {
      params.push(`%${lib}%`);
      return `(title ILIKE $${params.length} OR subcategory ILIKE $${params.length})`;
    });
    conditions.push(`(${libConditions.join(" OR ")})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit, offset);

  const { rows } = await ragPool.query<RagDocument>(
    `SELECT id, source_hash, bucket_slug, category, subcategory, title,
            case_no, year, source_url, concise_summary, created_at, updated_at
     FROM documents
     ${where}
     ORDER BY year ASC NULLS LAST, case_no ASC NULLS LAST
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

/**
 * Full-text keyword search across title, concise_summary, and case_no using ILIKE.
 * For production-scale search, prefer vectorSearch() instead.
 */
export async function searchDocumentsByKeyword(
  query: string,
  opts: ListOptions & { yearFrom?: number; yearTo?: number; libraries?: string[]; category?: string; subcategory?: string } = {}
): Promise<RagDocument[]> {
  const { limit = 20, offset = 0, yearFrom, yearTo, libraries, category, subcategory } = opts;

  const keywords = query
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2);

  if (keywords.length === 0) return [];

  const params: unknown[] = [];
  const keywordConditions: string[] = [];

  for (const word of keywords) {
    const pattern = `%${word}%`;
    params.push(pattern);
    const i = params.length;
    keywordConditions.push(
      `(title ILIKE $${i} OR concise_summary ILIKE $${i} OR full_text ILIKE $${i})`
    );
  }

  const andConditions: string[] = [`(${keywordConditions.join(" OR ")})`];

  if (category) { params.push(category); andConditions.push(`category = $${params.length}`); }
  if (subcategory) { params.push(subcategory); andConditions.push(`subcategory = $${params.length}`); }
  if (yearFrom) { params.push(yearFrom); andConditions.push(`year >= $${params.length}`); }
  if (yearTo) { params.push(yearTo); andConditions.push(`year <= $${params.length}`); }
  if (libraries && libraries.length > 0) {
    const libConds = libraries.map(lib => {
      params.push(`%${lib}%`);
      return `(title ILIKE $${params.length} OR subcategory ILIKE $${params.length})`;
    });
    andConditions.push(`(${libConds.join(" OR ")})`);
  }

  params.push(limit, offset);

  const { rows } = await ragPool.query<RagDocument>(
    `SELECT id, source_hash, bucket_slug, category, subcategory, title,
            case_no, year, source_url, concise_summary, created_at, updated_at
     FROM documents
     WHERE ${andConditions.join(" AND ")}
     ORDER BY
       CASE WHEN title ILIKE $1 THEN 0 WHEN concise_summary ILIKE $1 THEN 1 ELSE 2 END,
       year ASC NULLS LAST, case_no ASC NULLS LAST
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

/**
 * Phrase search — each entry in `phrases` is searched as a complete phrase
 * using ILIKE `%phrase%` (never split into words). Documents matching more
 * phrases rank higher. Used by the Related Cases auto-populate path.
 */
export async function searchDocumentsByPhrases(
  phrases: string[],
  opts: ListOptions = {}
): Promise<RagDocument[]> {
  const { limit = 20, offset = 0 } = opts;
  const cleaned = phrases.map(p => p.trim()).filter(p => p.length > 0);
  if (cleaned.length === 0) return [];

  const params: unknown[] = [];
  const whereConditions: string[] = [];
  const scoreTerms: string[] = [];

  for (const phrase of cleaned) {
    params.push(`%${phrase}%`);
    const i = params.length;
    const cond = `(title ILIKE $${i} OR concise_summary ILIKE $${i} OR full_text ILIKE $${i})`;
    whereConditions.push(cond);
    scoreTerms.push(`(CASE WHEN ${cond} THEN 1 ELSE 0 END)`);
  }

  params.push(limit, offset);

  const { rows } = await ragPool.query<RagDocument>(
    `SELECT id, source_hash, bucket_slug, category, subcategory, title,
            case_no, year, source_url, concise_summary, created_at, updated_at
     FROM documents
     WHERE ${whereConditions.join(' OR ')}
     ORDER BY (${scoreTerms.join(' + ')}) DESC,
              year ASC NULLS LAST, case_no ASC NULLS LAST
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

/** Get the full text of a document (heavy — only load when needed). */
export async function getDocumentFullText(id: number): Promise<string | null> {
  const { rows } = await ragPool.query<Pick<RagDocument, "full_text">>(
    "SELECT full_text FROM documents WHERE id = $1 LIMIT 1",
    [id]
  );
  return rows[0]?.full_text ?? null;
}

// ── Chunks ────────────────────────────────────────────────────────────────────

/** Get all chunks for a document, ordered by chunk_index. */
export async function getChunksByDocumentId(documentId: number): Promise<RagChunk[]> {
  const { rows } = await ragPool.query<RagChunk>(
    `SELECT id, document_id, chunk_index, chunk_text, char_count, created_at
     FROM document_chunks
     WHERE document_id = $1
     ORDER BY chunk_index ASC`,
    [documentId]
  );
  return rows;
}

/**
 * Vector similarity search using pgvector cosine distance.
 * Pass a float[1536] embedding — generate it with your embedding model first.
 *
 * @example
 * const embedding = await getEmbedding("What is the law on self-defense?");
 * const results = await vectorSearch(embedding, { limit: 5 });
 */
export async function vectorSearch(
  embedding: number[],
  opts: ListOptions & { minSimilarity?: number } = {}
): Promise<VectorSearchResult[]> {
  const { limit = 10, offset = 0, minSimilarity = 0.3 } = opts;

  // Cosine similarity = 1 - cosine_distance
  const { rows } = await ragPool.query<VectorSearchResult>(
    `SELECT
       dc.id, dc.document_id, dc.chunk_index, dc.chunk_text, dc.char_count, dc.created_at,
       1 - (dc.embedding <=> $1::vector) AS similarity,
       d.id         AS "document.id",
       d.title      AS "document.title",
       d.category   AS "document.category",
       d.subcategory AS "document.subcategory",
       d.case_no    AS "document.case_no",
       d.year       AS "document.year",
       d.source_url AS "document.source_url",
       d.concise_summary AS "document.concise_summary"
     FROM document_chunks dc
     JOIN documents d ON d.id = dc.document_id
     WHERE 1 - (dc.embedding <=> $1::vector) >= $2
     ORDER BY dc.embedding <=> $1::vector
     LIMIT $3 OFFSET $4`,
    [`[${embedding.join(",")}]`, minSimilarity, limit, offset]
  );

  // Reshape flat rows into nested document object
  return rows.map((row: any) => ({
    id: row.id,
    document_id: row.document_id,
    chunk_index: row.chunk_index,
    chunk_text: row.chunk_text,
    char_count: row.char_count,
    created_at: row.created_at,
    similarity: row.similarity,
    document: {
      id: row["document.id"],
      title: row["document.title"],
      category: row["document.category"],
      subcategory: row["document.subcategory"],
      case_no: row["document.case_no"],
      year: row["document.year"],
      source_url: row["document.source_url"],
      concise_summary: row["document.concise_summary"],
    },
  }));
}

// ── Categories ────────────────────────────────────────────────────────────────

/** Get all distinct categories in the database. */
export async function getCategories(): Promise<string[]> {
  const { rows } = await ragPool.query<{ category: string }>(
    "SELECT DISTINCT category FROM documents WHERE category IS NOT NULL ORDER BY category ASC"
  );
  return rows.map((r) => r.category);
}

/** Get all distinct subcategories for a given category. */
export async function getSubcategories(category: string): Promise<string[]> {
  const { rows } = await ragPool.query<{ subcategory: string }>(
    "SELECT DISTINCT subcategory FROM documents WHERE category = $1 AND subcategory IS NOT NULL ORDER BY subcategory ASC",
    [category]
  );
  return rows.map((r) => r.subcategory);
}

// ── Ingestion Runs ────────────────────────────────────────────────────────────

/** Get recent ingestion runs, newest first. */
export async function getIngestionRuns(opts: ListOptions = {}): Promise<IngestionRun[]> {
  const { limit = 20, offset = 0 } = opts;
  const { rows } = await ragPool.query<IngestionRun>(
    `SELECT * FROM ingestion_runs
     ORDER BY started_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

/** Get the latest ingestion run for a given source reference. */
export async function getLatestIngestionRun(sourceRef: string): Promise<IngestionRun | null> {
  const { rows } = await ragPool.query<IngestionRun>(
    "SELECT * FROM ingestion_runs WHERE source_ref = $1 ORDER BY started_at DESC LIMIT 1",
    [sourceRef]
  );
  return rows[0] ?? null;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

/** Quick counts — useful for admin dashboards. */
export async function getRagStats(): Promise<{
  totalDocuments: number;
  totalChunks: number;
  categories: { category: string; count: number }[];
}> {
  const [docsResult, chunksResult, catsResult] = await Promise.all([
    ragPool.query<{ count: string }>("SELECT COUNT(*) AS count FROM documents"),
    ragPool.query<{ count: string }>("SELECT COUNT(*) AS count FROM document_chunks"),
    ragPool.query<{ category: string; count: string }>(
      "SELECT category, COUNT(*) AS count FROM documents GROUP BY category ORDER BY count DESC"
    ),
  ]);

  return {
    totalDocuments: parseInt(docsResult.rows[0].count, 10),
    totalChunks: parseInt(chunksResult.rows[0].count, 10),
    categories: catsResult.rows.map((r) => ({
      category: r.category,
      count: parseInt(r.count, 10),
    })),
  };
}
