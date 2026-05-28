import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { cleanAiText } from "@/lib/citation-parser";

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
    .replace(/[`'"“”‘’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
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
          metadataJson: (chatPayload.source_metadata as object | null) ?? null,
        },
        create: {
          rawKeyword,
          normalizedKeyword,
          title: rawKeyword,
          markdownContent,
          rawResponse,
          sourceUrl,
          metadataJson: (chatPayload.source_metadata as object | null) ?? null,
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
