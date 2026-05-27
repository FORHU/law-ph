/**
 * Stream Response Processor
 *
 * Applies client-side rules to every incoming chunk from Chat Wonder before
 * it reaches the chat UI. These handle things the AI cannot control
 * (e.g. backend-injected structured data blocks).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcessedChunk {
  /** Text that is safe to append to the chat display. Empty string means nothing to show. */
  text: string;
}

// ---------------------------------------------------------------------------
// CHAT_WONDER_RULES — reference copy only. DO NOT inject into user_input.
// Paste this into the Chat Wonder backend system prompt.
// ---------------------------------------------------------------------------
//
// export const CHAT_WONDER_RULES = `
// At the end of your response, output this tag:
//
// [RELATED_QUERIES]["term1","term2","term3"][/RELATED_QUERIES]
//
// Replace the terms with 3–5 specific Philippine legal search terms drawn from
// the question and your answer. Use precise terms — law names, legal concepts,
// offense types, agency names. Be specific, not generic
// (e.g. "illegal dismissal" not "employment").
//
// CRITICAL: NEVER mention "Related Queries" in your prose.
// Output only the tag at the very bottom, after all text.
// `;

// ---------------------------------------------------------------------------
// Stream rules applied to every incoming chunk from Chat Wonder
// ---------------------------------------------------------------------------

const STREAM_RULES = {
  /**
   * RULE — Tool traces
   * Lines prefixed with [Tool] are internal backend traces.
   * Strip them entirely — never show to the user.
   */
  STRIP_TOOL_LINES: /^(?:\[Tool\][^\n]*\n?)+/,

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

  /**
   * RULE — Sources block
   * [Sources][...JSON...] is backend-injected metadata. Strip from display.
   */
  STRIP_SOURCES: /\[Sources\][\s\S]*$/i,

  /**
   * RULE — Related queries block
   * [RELATED_QUERIES][...][/RELATED_QUERIES] contains search terms the AI
   * selected to query the legal-rag DB. Strip from display — used by
   * use-send-message.ts to populate the Related Cases tab.
   */
  STRIP_RELATED_QUERIES: /\[RELATED_QUERIES\][\s\S]*?(?:\[\/RELATED_QUERIES\]|$)/i,
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Applies all stream rules to a single raw chunk.
 * Call this for every chunk coming off the reader before touching accumulatedText.
 */
export function processChunk(rawChunk: string): ProcessedChunk {
  let text = rawChunk.replace(STREAM_RULES.STRIP_TOOL_LINES, '');
  text = text.replace(STREAM_RULES.STRIP_SOURCES, '');
  return { text };
}

/**
 * Applies display-only rules to the fully accumulated response text
 * before it is stored as the message's visible content.
 */
export function cleanAccumulatedText(text: string): string {
  return text
    .replace(STREAM_RULES.STRIP_SOURCES, '')
    .replace(STREAM_RULES.STRIP_TIMELINE, '')
    .replace(STREAM_RULES.STRIP_MINDMAP, '')
    .replace(STREAM_RULES.STRIP_RELATED_QUERIES, '')
    .trim();
}
