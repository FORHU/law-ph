// Citation Parser Utility for extracting legal sources and case references from AI responses

export interface LegalSource {
  type: 'article' | 'section' | 'provision' | 'code';
  reference: string;
  description: string;
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
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json/i, '').replace(/```$/i, '').trim();
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```/i, '').replace(/```$/i, '').trim();
    }
    
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as TimelineItem[];
      }
    } catch (e) {
      console.error("Failed to parse timeline JSON:", e);
    }
  }

  // 3. Final fallback: parse Markdown numbered list timeline
  // Matches: "1. **Title** - 2026-02-23: Description" or "1. **Title** - 2026-02-23: ..."
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
    // Also try simpler pattern: "1. **Title**: Description" without date
    if (items.length === 0) {
      for (const line of lines) {
        const m2 = line.trim().match(/^\d+\.\s+\*?\*?([^*\n]+)\*?\*?:\s*(.+)/);
        if (m2) {
          items.push({
            title: m2[1].trim(),
            date: new Date().toISOString().split('T')[0],
            description: m2[2].trim(),
            status: 'pending',
          });
        }
      }
    }
    if (items.length > 0) return items;
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
    'loading...'
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
