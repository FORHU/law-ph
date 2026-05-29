import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { cleanAiText } from "@/lib/citation-parser";
import ragPool from "@/lib/db-rag";

const CHAT_WONDER_API_URL = (process.env.CHAT_WONDER_API_URL || "http://localhost:8000").replace(/\/+$/, "");

let sharedChatSessionId: string | null = null;

type ChatResponse = {
  response?: string;
  source_metadata?: unknown;
  lookup?: unknown;
  status?: string;
  intermediate_response?: string;
};

const SOURCE_ANALYSIS_PROMPT_TEMPLATE = `[legal ai]

## ROLE
You are an advanced Philippine Legal AI assistant specializing in labor law, jurisprudence, statutory interpretation, and legal document analysis.

## OBJECTIVE
Perform a comprehensive legal analysis of the provided legal keyword, statute, article, or doctrine. Generate a detailed, structured, and citation-aware legal response in Markdown format.

## USER QUERY
{{KEYWORD}}

## ANALYSIS REQUIREMENTS

When analyzing the legal topic, dynamically determine and include ALL relevant sections when applicable:

### 1. Legal Overview
- Define and summarize the law/article/doctrine
- Explain its legal purpose and policy intent
- Identify the governing jurisdiction and legal framework

### 2. Full Statutory Text
- Provide the complete text if available
- Highlight important clauses, phrases, and legal terminology
- Explain legal implications in plain language

### 3. Elements and Requirements
- Enumerate legal elements
- Discuss requisites, conditions, exceptions, and limitations
- Explain burden of proof where applicable

### 4. Legal Interpretation
- Explain how courts interpret the provision
- Include statutory construction principles
- Clarify ambiguous or commonly misunderstood concepts

### 5. Jurisprudence and Case Law
For each relevant case:
- Case title
- G.R. Number
- Promulgation date
- Facts
- Issues
- Ruling
- Legal doctrine established
- Relevance to the queried law

### 6. Practical Application
- Real-world examples
- Employer vs employee perspective
- Common violations or disputes
- Administrative and procedural considerations

### 7. Penalties, Remedies, or Consequences
- Civil liabilities
- Criminal liabilities
- Administrative sanctions
- Employee remedies or employer defenses

### 8. Related Laws and Cross References
Identify and explain related:
- Labor Code provisions
- Supreme Court rulings
- DOLE regulations
- Constitutional provisions
- Special laws
- International labor standards if applicable

### 9. Legal Risks and Compliance Notes
- Compliance recommendations
- Common legal mistakes
- Risk exposure analysis

### 10. AI Legal Insights
Provide:
- Contextual interpretation
- Legal trends
- Practical legal observations
- Comparative insights when relevant

## RESPONSE FORMAT

Generate the response strictly in Markdown using:
- Proper headings (#, ##, ###)
- Bullet points
- Tables where useful
- Blockquotes for important doctrines
- Code blocks ONLY for statutory text or templates
- Clear section separators

## OUTPUT STYLE
- Professional
- Comprehensive
- Legally analytical
- Easy to understand
- Citation-aware
- Structured for legal research

## SPECIAL RULES
- If the query references a Philippine law article (e.g. "Labor Code, Art. 297"), automatically identify:
  - Former article numbers
  - Renumbered provisions
  - Historical amendments
  - DOLE interpretations
  - Relevant jurisprudence

- If jurisprudence exists, prioritize landmark and recent Supreme Court cases.

- If the query is vague, intelligently infer the most legally relevant interpretation.

- Always explain legal concepts in both:
  1. Technical legal language
  2. Plain English

## OUTPUT
Return a fully structured Markdown legal analysis.`;

const EMPTY_PLACEHOLDER_SNIPPET = "No analysis text was returned by Chat Wonder.";

function normalizeKeyword(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[`'""'']/g, "")
    .replace(/\bof\s+the\s+philippines\b/g, "")
    .replace(/\bart\b\.?/g, "article")
    .replace(/\bno\b\.?/g, "")
    .replace(/\((\d{4})\)/g, "$1")  // "(1949)" -> "1949": keep year, drop parens
    .replace(/\blaw\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function extractYearHint(rawKeyword: string): number | null {
  const m = rawKeyword.match(/\((\d{4})\)/);
  if (m) return parseInt(m[1], 10);
  const m2 = rawKeyword.match(/\b(19\d{2}|20\d{2})\b/);
  return m2 ? parseInt(m2[1], 10) : null;
}

function buildPrompt(keyword: string): string {
  return SOURCE_ANALYSIS_PROMPT_TEMPLATE.replace("{{KEYWORD}}", keyword);
}

async function createSessionId(): Promise<string> {
  const res = await fetch(`${CHAT_WONDER_API_URL}/session-id`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to initialize Chat Wonder session: ${res.status}`);
  }

  const payload = await res.json();
  if (!payload?.session_id) {
    throw new Error("Chat Wonder did not return session_id");
  }

  return payload.session_id as string;
}

async function getSharedSessionId(): Promise<string> {
  if (sharedChatSessionId) {
    return sharedChatSessionId;
  }
  sharedChatSessionId = await createSessionId();
  return sharedChatSessionId;
}

async function callChatWonder(prompt: string, sessionId: string): Promise<ChatResponse> {
  const res = await fetch(`${CHAT_WONDER_API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_input: prompt,
      session_id: sessionId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat Wonder /chat failed (${res.status}): ${text.slice(0, 400)}`);
  }

  const payload = (await res.json()) as ChatResponse;
  if (payload?.status === "pending_approval") {
    throw new Error("Chat Wonder returned pending_approval for source analysis.");
  }
  return payload;
}

function extractFirstUrl(sourceMetadata: unknown): string | null {
  if (!Array.isArray(sourceMetadata) || sourceMetadata.length === 0) return null;
  const candidate = sourceMetadata[0] as Record<string, unknown>;
  const url = candidate?.source_url || candidate?.url;
  return typeof url === "string" ? url : null;
}

interface RagMatch {
  id: number;
  title: string | null;
  source_url: string | null;
  formatted_markdown: string | null;
  concise_summary: string | null;
}

const KNOWN_CODES = [
  "Labor Code",
  "Civil Code",
  "Family Code",
  "Revised Penal Code",
  "Corporation Code",
  "National Internal Revenue Code",
  "Tax Code",
  "Constitution",
];

function extractRagSearchTerms(keyword: string): string[] {
  const terms: string[] = [];

  const articleMatch = keyword.match(/article\s+(\d+)/i);
  if (articleMatch) terms.push(`Article ${articleMatch[1]}`);

  const sectionMatch = keyword.match(/section\s+(\d+)/i);
  if (sectionMatch) terms.push(`Section ${sectionMatch[1]}`);

  for (const code of KNOWN_CODES) {
    if (keyword.toLowerCase().includes(code.toLowerCase())) {
      terms.push(code);
      break;
    }
  }

  const raMatch = keyword.match(/republic act\s+(?:no\.?\s*)?(\d+)/i);
  if (raMatch) { terms.push("Republic Act"); terms.push(raMatch[1]); }

  const pdMatch = keyword.match(/presidential decree\s+(?:no\.?\s*)?(\d+)/i);
  if (pdMatch) { terms.push("Presidential Decree"); terms.push(pdMatch[1]); }

  return terms;
}

async function findInRagDb(rawKeyword: string): Promise<RagMatch | null> {
  const terms = extractRagSearchTerms(rawKeyword);
  const yearHint = extractYearHint(rawKeyword);

  try {
    if (terms.length > 0) {
      // Structured match: Article + Code name, or RA/PD number -- title ILIKE only (fast)
      const params: unknown[] = [];
      const conditions = terms.map((term) => {
        params.push(`%${term}%`);
        return `title ILIKE $${params.length}`;
      });
      params.push(yearHint ?? 0);
      const yearParam = `$${params.length}`;
      const { rows } = await ragPool.query<RagMatch>(
        `SELECT id, title, source_url, formatted_markdown, concise_summary
         FROM documents
         WHERE ${conditions.join(" AND ")}
         ORDER BY
           CASE WHEN year = ${yearParam} THEN 0 ELSE 1 END,
           CASE WHEN formatted_markdown IS NOT NULL AND char_length(formatted_markdown) > 100 THEN 0 ELSE 1 END,
           year DESC NULLS LAST
         LIMIT 1`,
        params
      );
      if (rows[0]) return rows[0];
    }

    // Fallback: FTS on full_text using the keyword as a phrase query (uses GIN index)
    const ftsQuery = rawKeyword
      .replace(/\(\d{4}\)/g, "")   // strip "(1991)" year hints
      .replace(/\blaw\b/gi, "")    // strip trailing "Law"
      .trim();
    if (!ftsQuery) return null;

    const { rows: ftsRows } = await ragPool.query<RagMatch>(
      `SELECT id, title, source_url, formatted_markdown, concise_summary
       FROM documents
       WHERE to_tsvector('english', COALESCE(full_text, '')) @@ plainto_tsquery('english', $1)
         AND formatted_markdown IS NOT NULL AND char_length(formatted_markdown) > 100
       ORDER BY ts_rank(to_tsvector('english', COALESCE(full_text, '')), plainto_tsquery('english', $1)) DESC
       LIMIT 1`,
      [ftsQuery]
    );
    return ftsRows[0] ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const user = await getServerSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { keyword } = await req.json();
    const rawKeyword = String(keyword || "").trim();
    if (!rawKeyword) {
      return NextResponse.json({ error: "keyword is required" }, { status: 400 });
    }

    const normalizedKeyword = normalizeKeyword(rawKeyword);
    if (!normalizedKeyword) {
      return NextResponse.json({ error: "keyword is invalid after normalization" }, { status: 400 });
    }

    const cached = await prisma.legalSourceAnalysisCache.findUnique({
      where: { normalizedKeyword },
    });

    if (cached && !cached.markdownContent.includes(EMPTY_PLACEHOLDER_SNIPPET)) {
      console.log(`[source-analysis] Tier 1 (cache) -- "${rawKeyword}"`);
      return NextResponse.json({
        item_id: cached.id,
        type: "keyword_analysis",
        title: cached.title || rawKeyword,
        url: cached.sourceUrl || "",
        text_content: cached.markdownContent,
        formatted_markdown: cached.markdownContent,
        cached: true,
      });
    }

    // Tier 2: RAG DB direct lookup -- fast Postgres title match, no LLM needed
    const ragDoc = await findInRagDb(rawKeyword);
    if (ragDoc) {
      const markdownContent = ragDoc.formatted_markdown?.trim() || ragDoc.concise_summary?.trim() || "";
      if (markdownContent) {
        console.log(`[source-analysis] Tier 2 (RAG DB) -- "${rawKeyword}" -> doc ${ragDoc.id} "${ragDoc.title}"`);
        const title = ragDoc.title || rawKeyword;
        let persisted;
        try {
          persisted = await prisma.legalSourceAnalysisCache.upsert({
            where: { normalizedKeyword },
            update: { rawKeyword, title, markdownContent, rawResponse: markdownContent, sourceUrl: ragDoc.source_url },
            create: { rawKeyword, normalizedKeyword, title, markdownContent, rawResponse: markdownContent, sourceUrl: ragDoc.source_url },
          });
        } catch {
          const existing = await prisma.legalSourceAnalysisCache.findUnique({ where: { normalizedKeyword } });
          if (!existing) throw new Error("Failed to cache RAG result");
          persisted = existing;
        }
        return NextResponse.json({
          item_id: persisted.id,
          type: "keyword_analysis",
          title: persisted.title || rawKeyword,
          url: persisted.sourceUrl || "",
          text_content: persisted.markdownContent,
          formatted_markdown: persisted.markdownContent,
          cached: false,
        });
      }
    }

    // Tier 3: Chat Wonder generation -- only when no RAG DB match exists
    console.log(`[source-analysis] Tier 3 (Chat Wonder) -- "${rawKeyword}"`);
    const prompt = buildPrompt(rawKeyword);

    let sessionId = await getSharedSessionId();
    let chatPayload: ChatResponse;

    try {
      chatPayload = await callChatWonder(prompt, sessionId);
    } catch (err) {
      // Shared-session fallback path: create a fresh session once and retry.
      sessionId = await createSessionId();
      sharedChatSessionId = sessionId;
      chatPayload = await callChatWonder(prompt, sessionId);
      console.warn("[source-analysis] Shared session failed; refreshed session used.", err);
    }

    const rawResponse = String(chatPayload.response || chatPayload.intermediate_response || "").trim();
    const cleanedResponse = cleanAiText(rawResponse).trim();
    const fallbackFromLookup = typeof chatPayload.lookup === "string" ? chatPayload.lookup.trim() : "";
    const markdownContent =
      cleanedResponse ||
      rawResponse ||
      fallbackFromLookup ||
      `# ${rawKeyword}\n\nNo analysis text was returned by Chat Wonder. Please try again.`;

    const sourceUrl = extractFirstUrl(chatPayload.source_metadata);

    let persisted;
    try {
      persisted = await prisma.legalSourceAnalysisCache.upsert({
        where: { normalizedKeyword },
        update: {
          rawKeyword,
          title: rawKeyword,
          markdownContent,
          rawResponse,
          sourceUrl,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadataJson: (chatPayload.source_metadata ?? null) as any,
        },
        create: {
          rawKeyword,
          normalizedKeyword,
          title: rawKeyword,
          markdownContent,
          rawResponse,
          sourceUrl,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadataJson: (chatPayload.source_metadata ?? null) as any,
        },
      });
    } catch (upsertError) {
      // Retry-read pattern for race conditions on unique normalizedKeyword.
      const existing = await prisma.legalSourceAnalysisCache.findUnique({
        where: { normalizedKeyword },
      });
      if (!existing) throw upsertError;
      persisted = existing;
    }

    return NextResponse.json({
      item_id: persisted.id,
      type: "keyword_analysis",
      title: persisted.title || rawKeyword,
      url: persisted.sourceUrl || "",
      text_content: persisted.markdownContent,
      formatted_markdown: persisted.markdownContent,
      cached: false,
    });
  } catch (error) {
    console.error("[source-analysis] Error:", error);
    return NextResponse.json({ error: "Failed to generate source analysis" }, { status: 500 });
  }
}
