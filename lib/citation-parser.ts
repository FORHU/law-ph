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
