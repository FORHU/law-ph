// Citation Parser Utility for extracting legal sources and case references from AI responses

export interface LegalSource {
  type: 'article' | 'section' | 'provision' | 'code';
  reference: string;
  description: string;
  itemId?: string;
}

export interface RelatedCase {
  caseNumber: string;
  title: string;
  description: string;
  // Fields from the real /api/legal/search API
  score?: number;
  url?: string;
  type?: string;
  itemId?: string; // DB item_id used to fetch full case content
}

export interface TimelineItem {
  title: string;
  date?: string;
  description: string;
  status: 'completed' | 'pending' | 'active';
}

export interface MindMapItem {
  id: string;
  label: string;
  description?: string;
  isRoot?: boolean;
  children: MindMapItem[];
}

/**
 * Extracts legal sources from AI response text
 * Looks for patterns like:
 * - Article X, Section Y
 * - RPC Article Z
 * - Constitutional provisions
 * - Civil Code, Family Code, Labor Code references
 */
export function extractLegalSources(text: string): LegalSource[] {
  const sources: LegalSource[] = [];
  
  // Pattern 1: Article X, Section Y (with optional code name)
  const articlePattern = /(?:(?:the|of)\s+)?(?:(Civil Code|Family Code|Labor Code|Constitution|Revised Penal Code|RPC)\s+)?Article\s+([IVXLCDM\d]+)(?:,?\s+Section\s+(\d+))?/gi;
  let match;
  
  while ((match = articlePattern.exec(text)) !== null) {
    const codeName = match[1] || 'Philippine law';
    const article = match[2];
    const section = match[3];
    const reference = section 
      ? `${codeName} Article ${article}, Section ${section}` 
      : `${codeName} Article ${article}`;
    
    sources.push({
      type: 'article',
      reference,
      description: `Reference to ${reference}`
    });
  }
  
  // Pattern 2: RPC/Revised Penal Code references (standalone)
  const rpcPattern = /(?:RPC|Revised Penal Code)\s+(?:Article\s+)?(\d+)/gi;
  while ((match = rpcPattern.exec(text)) !== null) {
    const ref = `RPC Article ${match[1]}`;
    if (!sources.some(s => s.reference === ref)) {
      sources.push({
        type: 'code',
        reference: ref,
        description: `Revised Penal Code Article ${match[1]}`
      });
    }
  }
  
  // Pattern 3: Section references with context
  const sectionPattern = /Section\s+(\d+)(?:\s+of\s+(?:the\s+)?(Civil Code|Family Code|Labor Code|Constitution|[^.,\n]{5,40}))?/gi;
  while ((match = sectionPattern.exec(text)) !== null) {
    const section = match[1];
    const context = match[2] || 'Philippine law';
    const ref = `Section ${section} of ${context}`;
    
    if (!sources.some(s => s.reference === ref)) {
      sources.push({
        type: 'section',
        reference: ref,
        description: `${ref}`
      });
    }
  }
  
  // Pattern 4: Republic Act (RA) references
  const raPattern = /(?:Republic Act|R\.?A\.?)\s+(?:No\.\s+)?(\d+)/gi;
  while ((match = raPattern.exec(text)) !== null) {
    const ref = `Republic Act No. ${match[1]}`;
    if (!sources.some(s => s.reference === ref)) {
      sources.push({
        type: 'code',
        reference: ref,
        description: `Republic Act No. ${match[1]}`
      });
    }
  }
  
  // Pattern 5: Presidential Decree (PD) references
  const pdPattern = /(?:Presidential Decree|P\.?D\.?)\s+(?:No\.\s+)?(\d+)/gi;
  while ((match = pdPattern.exec(text)) !== null) {
    const ref = `Presidential Decree No. ${match[1]}`;
    if (!sources.some(s => s.reference === ref)) {
      sources.push({
        type: 'code',
        reference: ref,
        description: `Presidential Decree No. ${match[1]}`
      });
    }
  }
  
  // Pattern 6: Batas Pambansa (BP) references
  const bpPattern = /(?:Batas Pambansa|B\.?P\.?)\s+(?:Blg\.\s+)?(\d+)/gi;
  while ((match = bpPattern.exec(text)) !== null) {
    const ref = `Batas Pambansa Blg. ${match[1]}`;
    if (!sources.some(s => s.reference === ref)) {
      sources.push({
        type: 'code',
        reference: ref,
        description: `Batas Pambansa Blg. ${match[1]}`
      });
    }
  }
  
  // Remove duplicates based on reference
  const uniqueSources = sources.filter((source, index, self) =>
    index === self.findIndex((s) => s.reference === source.reference)
  );
  
  return uniqueSources;
}

/**
 * Extracts case references from AI response text
 * Looks for patterns like:
 * - G.R. No. XXXXXX
 * - [Party] v. [Party]
 * - [Party] vs. [Party]
 * - Case names with years
 */
export function extractRelatedCases(text: string): RelatedCase[] {
  const cases: RelatedCase[] = [];
  
  // Pattern 1: G.R. No. XXXXXX (with optional L- prefix)
  const grPattern = /G\.R\.?\s+(?:L-)?No\.?\s+(\d+(?:-\d+)?)/gi;
  let match;
  
  while ((match = grPattern.exec(text)) !== null) {
    const caseNumber = `G.R. No. ${match[1]}`;
    
    // Try to find case title nearby (within 150 characters before and after)
    const contextStart = Math.max(0, match.index - 150);
    const contextEnd = Math.min(text.length, match.index + 150);
    const context = text.substring(contextStart, contextEnd);
    
    // Look for case title pattern: "Name v. Name" or "Name vs. Name"
    const titleMatch = context.match(/([A-Z][a-zA-Z\s.&,'-]+?)\s+v[s]?\.\s+([A-Z][a-zA-Z\s.&,'-]+?)(?:\s|,|\(|$)/);
    const title = titleMatch ? `${titleMatch[1].trim()} v. ${titleMatch[2].trim()}` : 'Supreme Court Case';
    
    // Look for year
    const yearMatch = context.match(/\((\d{4})\)/);
    const year = yearMatch ? yearMatch[1] : null;
    
    const description = year ? `${title} (${year}) - ${caseNumber}` : `${title} - ${caseNumber}`;
    
    if (!cases.some(c => c.caseNumber === caseNumber)) {
      cases.push({
        caseNumber,
        title,
        description
      });
    }
  }
  
  // Pattern 2: Case titles with "v." or "vs." (without G.R. numbers)
  const casePattern = /\b([A-Z][a-zA-Z\s.&,'-]{2,40}?)\s+v[s]?\.\s+([A-Z][a-zA-Z\s.&,'-]{2,40}?)(?:\s*\((\d{4})\))?/g;
  while ((match = casePattern.exec(text)) !== null) {
    const party1 = match[1].trim();
    const party2 = match[2].trim();
    const year = match[3];
    
    // Filter out common false positives
    if (party1.length < 3 || party2.length < 3) continue;
    if (party1.includes('Article') || party2.includes('Article')) continue;
    if (party1.includes('Section') || party2.includes('Section')) continue;
    
    const title = `${party1} v. ${party2}`;
    const caseNumber = year || 'N/A';
    const description = year ? `${title} (${year})` : title;
    
    // Only add if we don't already have this case
    if (!cases.some(c => c.title.toLowerCase() === title.toLowerCase())) {
      cases.push({
        caseNumber,
        title,
        description
      });
    }
  }
  
  // Pattern 3: "People of the Philippines v. [Name]" variations
  const peoplePattern = /(?:People of the Philippines|People)\s+v[s]?\.\s+([A-Z][a-zA-Z\s.&,'-]+?)(?:\s*\((\d{4})\))?(?:\s|,|;|\.|\n|$)/gi;
  while ((match = peoplePattern.exec(text)) !== null) {
    const defendant = match[1].trim();
    const year = match[2];
    
    if (defendant.length < 3) continue;
    
    const title = `People v. ${defendant}`;
    const caseNumber = year || 'N/A';
    const description = year ? `${title} (${year})` : title;
    
    if (!cases.some(c => c.title.toLowerCase() === title.toLowerCase())) {
      cases.push({
        caseNumber,
        title,
        description
      });
    }
  }
  
  // Remove duplicates
  const uniqueCases = cases.filter((caseItem, index, self) =>
    index === self.findIndex((c) => 
      c.caseNumber === caseItem.caseNumber && c.title.toLowerCase() === caseItem.title.toLowerCase()
    )
  );
  
  return uniqueCases;
}

/**
 * Extracts a timeline from AI responses.
 * Supports: [TIMELINE]...[/TIMELINE] JSON wrapper, bare JSON array, and Markdown numbered list fallback.
 */
export function extractTimeline(text: string): TimelineItem[] | undefined {
  // 1. Try [TIMELINE]...[/TIMELINE] wrapper first
  const timelineRegex = /\[TIMELINE\]([\s\S]*?)\[\/TIMELINE\]/i;
  const match = text.match(timelineRegex);
  
  let jsonStr = "";
  if (match) {
    jsonStr = match[1].trim();
  } else {
    // 2. Fallback: look for a bare JSON array
    const fallbackMatch = text.match(/(\[\s*\{\s*"title"\s*:[\s\S]*?\}\s*\])/i);
    if (fallbackMatch) {
      jsonStr = fallbackMatch[1].trim();
    }
  }

  if (jsonStr) {
    const cleaned = jsonStr.trim().replace(/^\uFEFF/, "");
    const parsed = safeJsonParse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as TimelineItem[];
    }
  }

  // 3. Final fallback: parse Markdown numbered list timeline
  const mdTimelineSection = text.match(/(?:timeline|actionable steps)[^\n]*\n((?:\d+\..+\n?)+)/i);
  if (mdTimelineSection) {
    const items: TimelineItem[] = [];
    const lineRe = /^\d+\.\s+\*?\*?([^*\n-]+)\*?\*?\s*[-–]\s*(\d{4}-\d{2}-\d{2})(?:[^:]*)?:\s*(.+)/;
    const lines = mdTimelineSection[1].split('\n');
    for (const line of lines) {
      const m = line.trim().match(lineRe);
      if (m) {
        items.push({
          title: m[1].trim(),
          date: m[2].trim(),
          description: m[3].trim(),
          status: 'pending',
        });
      }
    }
    if (items.length > 0) return items;
  }

  return undefined;
}

/**
 * Helper to validate if a parsed object looks like a mind map
 */
function isMindMapShape(v: unknown): v is MindMapItem {
  if (!v || typeof v !== "object") return false;
  const anyV: any = v;
  return Boolean(anyV.id || anyV.nodes || anyV.label || anyV.children);
}

/**
 * Extracts a mind map structure from AI responses.
 * Supports [MINDMAP]...[/MINDMAP] wrapper and bare JSON objects.
 */
export function extractMindMap(text: string): MindMapItem | undefined {
  const mindMapRegex = /\[MINDMAP\]([\s\S]*?)\[\/MINDMAP\]/i;
  const match = text.match(mindMapRegex);
  
  let jsonStr = "";
  if (match) {
    jsonStr = match[1].trim();
  } else {
    const blocks = text.split(/[\r\n]{2,}/);
    for (const block of blocks.reverse()) {
      if (block.includes('"id"') && block.includes('"root"')) {
        const fallbackMatch = block.match(/(\{[\s\S]*\})/);
        if (fallbackMatch) {
          jsonStr = fallbackMatch[1].trim();
          break;
        }
      }
    }
  }

  if (jsonStr) {
    const cleaned = jsonStr.trim().replace(/^\uFEFF/, "");
    const parsed = safeJsonParse(cleaned);
    if (isMindMapShape(parsed)) {
      return parsed as MindMapItem;
    }
  }

  return undefined;
}


/**
 * Checks if a title is generic or junk (like UUIDs or website names)
 */
export function isGenericTitle(title: string): boolean {
  if (!title) return true;
  
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(title)) return true;
  
  const genericTerms = [
    'e-library',
    'information at your fingertips',
    'printer friendly',
    'philippine legal document',
    'supreme court case',
    'no content available',
  ];
  
  const lowerTitle = title.toLowerCase();
  return genericTerms.some(term => lowerTitle.includes(term));
}

/**
 * Cleans a legal title by removing common website junk
 */
export function cleanLegalTitle(title: string): string {
  if (!title) return '';
  
  let cleaned = title
    .replace(/E-Library\s*-?\s*Information at Your Fingertips:?\s*/gi, '')
    .replace(/:\s*Printer Friendly/gi, '')
    .replace(/Supreme Court Case\s*-\s*/gi, '')
    .trim();
    
  return cleaned;
}

/**
 * Attempts to extract a better title from the content if the provided title is generic
 */
export function extractTitleFromContent(content: string, currentTitle: string): string {
  if (!isGenericTitle(currentTitle) && currentTitle.length > 10) return cleanLegalTitle(currentTitle);
  
  // Try to find a G.R. No. or RA No. at the start of the content
  const firstLines = content.split('\n').slice(0, 10).join('\n');
  
  // Look for G.R. No. patterns
  const grMatch = firstLines.match(/G\.R\.\s*No\.\s*[\w-]+/i);
  if (grMatch) return grMatch[0];
  
  // Look for RA No. patterns
  const raMatch = firstLines.match(/Republic Act\s+No\.\s+\d+/i) || firstLines.match(/R\.A\.\s+No\.\s+\d+/i);
  if (raMatch) return raMatch[0];
  
  // Look for Case Titles (Party v. Party)
  const caseMatch = firstLines.match(/([A-Z][A-Z\s.,&-]+?)\s+v[s]?\.\s+([A-Z][A-Z\s.,&-]+)/);
  if (caseMatch) return `${caseMatch[1].trim()} v. ${caseMatch[2].trim()}`;
  
  // Look for Markdown headers
  const headerMatch = content.match(/^#\s+(.+)$/m);
  if (headerMatch && !isGenericTitle(headerMatch[1])) return cleanLegalTitle(headerMatch[1]);
  
  return cleanLegalTitle(currentTitle);
}

/**
 * Robustly removes bracketed and fallback MINDMAP/TIMELINE/ILM_META raw JSON blocks from AI text,
 * so they don't appear in the main conversation UI.
 */
export function cleanAiText(text: string): string {
  if (!text) return text;
  
  let cleaned = text;

  // 1. Strip bracketed standard structures
  cleaned = cleaned.replace(/\[TIMELINE\][\s\S]*?(?:\[\/TIMELINE\]|$)/gi, "");
  cleaned = cleaned.replace(/\[MINDMAP\][\s\S]*?(?:\[\/MINDMAP\]|$)/gi, "");
  cleaned = cleaned.replace(/\[ILM_META\][\s\S]*?(?:\[\/ILM_META\]|$)/gi, "");
  cleaned = cleaned.replace(/\[HIDDEN_INSTRUCTION\][\s\S]*?(?:\[\/HIDDEN_INSTRUCTION\]|$)/gi, "");

  // 2. Find fallback structures starting with TIMELINE or MINDMAP
  const timelineIdx = cleaned.search(/\bTIMELINE\b\s*\[/i);
  const mindmapIdx = cleaned.search(/\bMINDMAP\b\s*\{/i);

  if (timelineIdx !== -1 && mindmapIdx !== -1) {
    cleaned = cleaned.substring(0, Math.min(timelineIdx, mindmapIdx));
  } else if (timelineIdx !== -1) {
    cleaned = cleaned.substring(0, timelineIdx);
  } else if (mindmapIdx !== -1) {
    cleaned = cleaned.substring(0, mindmapIdx);
  }

  // 3. Strip any weird introductory timeline prose the AI likes to add at the end
  cleaned = cleaned.replace(/(?:\n|^)?\s*\*?\*?(?:Proposed |Given |Following )?Timeline[\s\S]{0,200}?:?\*?\*?\s*(?:```(?:json)?)?\s*$/i, "");
  cleaned = cleaned.replace(/(?:\n|^)?\s*\*?\*?Here is[\s\S]*?(?:timeline|plan)[\s\S]*?:?\*?\*?\s*$/i, "");

  return cleaned.trim();
}

/**
 * Clean any message text for display by removing metadata tags and instructions.
 * Safe to use for both User and AI messages.
 */
export function cleanMessageText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\[ILM_META\][\s\S]*?(?:\[\/ILM_META\]|$)/gi, "")
    .replace(/\[HIDDEN_INSTRUCTION\][\s\S]*?(?:\[\/HIDDEN_INSTRUCTION\]|$)/gi, "")
    .replace(/\[TIMELINE\][\s\S]*?(?:\[\/TIMELINE\]|$)/gi, "")
    .replace(/\[MINDMAP\][\s\S]*?(?:\[\/MINDMAP\]|$)/gi, "")
    .trim();
}


/**
 * Robustly parses a JSON string that might contain unescaped control characters
 * from AI-generated content. Returns null on failure instead of throwing.
 */
function safeJsonParse(str: string): any {
  if (!str) return null;
  
  try {
    // 1. Extract JSON block
    const firstBrace = str.indexOf('{');
    const firstBracket = str.indexOf('[');
    const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
    
    const lastBrace = str.lastIndexOf('}');
    const lastBracket = str.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    
    let jsonPart = str;
    if (start !== -1 && end !== -1 && end > start) {
      jsonPart = str.substring(start, end + 1);
    }

    // 2. Initial clean
    let sanitized = jsonPart
      .trim()
      .replace(/^\uFEFF/, "") // Remove BOM
      .replace(/\/\/.*$/gm, "") // Remove single line comments
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
      .replace(/,\s*([}\]])/g, "$1"); // Remove trailing commas

    // 3. Fix missing commas between elements (e.g. } {  or " " )
    sanitized = sanitized
      .replace(/\}\s*\{/g, "}, {")
      .replace(/\]\s*\[/g, "], [")
      .replace(/\"\s*\"/g, '", "');

    // 4. Try parsing the semi-sanitized version
    try {
      return JSON.parse(sanitized);
    } catch (firstPassError) {
      // 5. Deep sanitization for unescaped quotes and control chars
      let processed = "";
      let inQuote = false;
      let escaped = false;
      
      for (let i = 0; i < sanitized.length; i++) {
        const char = sanitized[i];
        
        if (char === '"' && !escaped) {
          // Check if this is likely a quote meant to be inside a string
          // e.g. "He said "Hello"" 
          // If we are inQuote and the NEXT non-whitespace char is NOT : , } or ]
          // then this quote is likely internal and should be escaped.
          if (inQuote) {
            let nextChar = '';
            for (let j = i + 1; j < sanitized.length; j++) {
              if (!/\s/.test(sanitized[j])) {
                nextChar = sanitized[j];
                break;
              }
            }
            if (nextChar && ![':', ',', '}', ']'].includes(nextChar)) {
              processed += '\\"';
              continue;
            }
          }
          
          inQuote = !inQuote;
          processed += char;
        } else if (inQuote && !escaped) {
          if (char === '\n') processed += '\\n';
          else if (char === '\r') processed += '\\r';
          else if (char === '\t') processed += '\\t';
          else if (char === '\\') {
            escaped = true;
            processed += char;
          } else {
            const code = char.charCodeAt(0);
            if (code < 32) { /* skip */ }
            else processed += char;
          }
        } else {
          if (escaped) escaped = false;
          processed += char;
        }
      }

      // 6. Final attempt with "Force Close" brackets for truncated JSON
      try {
        return JSON.parse(processed);
      } catch (secondPassError) {
        // One last ditch effort: try to close unbalanced brackets
        let finalAttempt = processed;
        const openBraces = (finalAttempt.match(/\{/g) || []).length;
        const closeBraces = (finalAttempt.match(/\}/g) || []).length;
        const openBrackets = (finalAttempt.match(/\[/g) || []).length;
        const closeBrackets = (finalAttempt.match(/\]/g) || []).length;

        for (let i = 0; i < openBraces - closeBraces; i++) finalAttempt += '}';
        for (let i = 0; i < openBrackets - closeBrackets; i++) finalAttempt += ']';

        try {
          return JSON.parse(finalAttempt);
        } catch (e) {
          console.warn("safeJsonParse: All sanitization attempts failed.", e);
          return null;
        }
      }
    }
  } catch (globalError) {
    console.error("safeJsonParse: Critical failure during parsing logic", globalError);
    return null;
  }
}
