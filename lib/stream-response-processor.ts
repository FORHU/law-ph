/**
 * Stream Response Processor
 *
 * Two responsibilities:
 *
 * 1. PROMPT RULES  — Instructions injected into every request to Chat Wonder
 *    so the AI formats its responses correctly. Edit CHAT_WONDER_RULES to
 *    change what the AI is told to do.
 *
 * 2. STREAM RULES  — Client-side rules that process every incoming chunk
 *    before it reaches the chat UI. These handle things the AI cannot
 *    control (e.g. backend-injected [Sources] metadata).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreamSource {
  caseNumber: string;
  title: string;
  description: string;
  url?: string;
  type?: string;
  itemId?: string;
}

export interface ProcessedChunk {
  /** Text that is safe to append to the chat display. Empty string means nothing to show. */
  text: string;
  /** Case/source references extracted from a [Sources] block, if one was present. */
  extractedSources?: StreamSource[];
}

// ---------------------------------------------------------------------------
// Part 1 — Prompt rules sent to Chat Wonder on every request
//
// These are injected into user_input so Chat Wonder knows how to format
// its responses. Add or edit rules here; they automatically apply to all
// requests made through the streaming hook.
// ---------------------------------------------------------------------------

export const CHAT_WONDER_RULES = `
[LEGAL_RULES]

Markdown only.

Response order:
## Legal Assessment
## Applicable Law
## Analysis
## Relevant Jurisprudence
## Recommended Steps

Rules:
- Bold laws, cases, deadlines.
- Use > for warnings, risks, deadlines, or quoted law.
- Numbered lists for steps.
- Cite:
  - "Republic Act No. XXXX"
  - "Article XX of the [Code]"
  - "**Case Name** (G.R. No. XXXXXX, Month DD, YYYY)"
- Apply law to facts directly.
- Use qualified terms: "may", "likely", "court may find".
- Never guarantee outcomes or invent citations/laws.
- Mention risks or consequences of inaction.
- State proper agency/lawyer if needed.

End with:
[TIMELINE]
[
{
"title":"",
"description":"",
"status":"pending",
"requires_previous":false
}
]
[/TIMELINE]

[/LEGAL_RULES]
`.trim();

//export const CHAT_WONDER_RULES = "";

// ---------------------------------------------------------------------------
// Part 2 — Stream rules applied to every incoming chunk from Chat Wonder
//
// These rules run client-side after the AI has responded. They handle
// backend-injected content that the AI itself does not control.
// ---------------------------------------------------------------------------

const STREAM_RULES = {
  /**
   * RULE — Tool traces
   * Lines prefixed with [Tool] are internal backend traces.
   * Strip them entirely — never show to the user.
   */
  STRIP_TOOL_LINES: /^(?:\[Tool\][^\n]*\n?)+/,

  /**
   * RULE — Sources block
   * The Chat Wonder backend prepends case/source metadata before the AI
   * answer using the format:  [Sources] [{...}, ...]
   * Extract it as structured data and remove it from the chat text.
   * The data is routed to the Related Cases tab instead.
   */
  SOURCES_PREFIX: '[Sources]',

  /**
   * RULE — Timeline block
   * [TIMELINE]...[/TIMELINE] is structured data for the Timeline component.
   * Remove it from the chat bubble — it is rendered separately.
   */
  STRIP_TIMELINE: /\[TIMELINE\][\s\S]*?(?:\[\/TIMELINE\]|$)/i,

  /**
   * RULE — Mind-map block
   * [MINDMAP]...[/MINDMAP] is structured data for the Mind Map component.
   * Remove it from the chat bubble — it is rendered separately.
   */
  STRIP_MINDMAP: /\[MINDMAP\][\s\S]*?(?:\[\/MINDMAP\]|$)/i,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Finds the closing bracket/brace of the first JSON value in `text`,
 * respecting nested structures and quoted strings.
 * Returns the extracted JSON string and whatever comes after it,
 * or null if the JSON is incomplete (e.g. still streaming).
 */
function extractJsonBlock(text: string): { json: string; remainder: string } | null {
  const startChar = text[0];
  if (startChar !== '[' && startChar !== '{') return null;

  const endChar = startChar === '[' ? ']' : '}';
  let depth = 0, inString = false, escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped)          { escaped = false; continue; }
    if (ch === '\\')      { escaped = true;  continue; }
    if (ch === '"')       { inString = !inString; continue; }
    if (inString)         continue;
    if (ch === startChar) { depth++; continue; }
    if (ch === endChar && --depth === 0) {
      return {
        json:      text.slice(0, i + 1),
        remainder: text.slice(i + 1).replace(/^\s*\n?/, '').trimStart(),
      };
    }
  }
  return null; // incomplete — still streaming
}

function mapToStreamSource(item: any): StreamSource {
  return {
    caseNumber:  item.gr_number || item.case_number || item.title || 'N/A',
    title:       item.title || 'Philippine Legal Document',
    description: item.snippet || item.title || '',
    url:         item.source_url  ?? undefined,
    type:        item.type        ?? undefined,
    itemId:      item.item_id     ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Applies all response rules to a single raw stream chunk.
 *
 * Call this for every chunk coming off the reader before touching
 * accumulatedText. Use `result.text` for the chat display and
 * `result.extractedSources` (when present) for the Related Cases tab.
 */
export function processChunk(rawChunk: string): ProcessedChunk {
  // RULE: strip internal [Tool] trace lines
  // let text = rawChunk.replace(STREAM_RULES.STRIP_TOOL_LINES, '');
  // console.log(rawChunk);
  // debugger;
  let text = rawChunk;

  // RULE: extract [Sources] block — never display in chat
  // if (text.startsWith(STREAM_RULES.SOURCES_PREFIX)) {
  //   const rest = text.slice(STREAM_RULES.SOURCES_PREFIX.length).trimStart();
  //   const block = extractJsonBlock(rest);

  //   if (block) {
  //     try {
  //       const parsed = JSON.parse(block.json);
  //       const items: any[] = Array.isArray(parsed) ? parsed : [parsed];
  //       return {
  //         text:             block.remainder,
  //         extractedSources: items.map(mapToStreamSource),
  //       };
  //     } catch (_) {
  //       // Malformed JSON — discard the whole [Sources] chunk silently
  //     }
  //   }

  //   // Could not parse (malformed or still streaming) — discard entirely
  //   return { text: '' };
  // }

  return { text };
}

/**
 * Applies display-only rules to the fully accumulated response text
 * before it is stored as the message's visible content.
 * This removes structured-data blocks that have already been extracted.
 */
export function cleanAccumulatedText(text: string): string {
  return text
    .replace(STREAM_RULES.STRIP_TIMELINE, '')
    .replace(STREAM_RULES.STRIP_MINDMAP, '')
    .trim();
}
