// Legal Content Fetcher - Provides detailed content for legal sources and cases

import { LegalSource, RelatedCase } from './citation-parser';

export interface LegalContentDetail {
  title: string;
  reference: string;
  fullText: string;
  relevantSection?: string;
  url?: string;
}

/**
 * Fetches detailed content for a legal source
 * In a production environment, this would call an API to fetch actual legal documents
 */
export async function fetchSourceContent(source: LegalSource, context?: string): Promise<LegalContentDetail> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Mock content based on source type
  const mockContent = generateMockSourceContent(source);
  
  return {
    title: source.reference,
    reference: source.reference,
    fullText: mockContent,
    relevantSection: extractRelevantSection(mockContent, context),
    url: generateSourceUrl(source)
  };
}

/**
 * Fetches detailed content for a related case
 */
export async function fetchCaseContent(caseItem: RelatedCase, context?: string): Promise<LegalContentDetail> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const mockContent = generateMockCaseContent(caseItem);
  
  return {
    title: caseItem.title,
    reference: caseItem.caseNumber,
    fullText: mockContent,
    relevantSection: extractRelevantSection(mockContent, context),
    url: generateCaseUrl(caseItem)
  };
}

function generateMockSourceContent(source: LegalSource): string {
  // Generate realistic legal text based on source type
  if (source.type === 'article') {
    return `# ${source.reference}

## Full Text

${source.description}

This provision establishes the fundamental principles governing this area of Philippine law. The interpretation and application of this article has been the subject of numerous Supreme Court decisions.

### Key Provisions:

1. **Primary Obligation**: The law mandates that all parties must comply with the requirements set forth herein.

2. **Exceptions**: Certain circumstances may warrant deviation from the standard application, subject to judicial review.

3. **Penalties**: Non-compliance may result in civil or criminal liability as prescribed by law.

### Jurisprudential Development:

The Supreme Court has consistently held that this provision must be interpreted in light of the Constitution's mandate to protect individual rights while maintaining social order.

### Related Provisions:

- See also: Related sections of the Civil Code
- Cross-reference: Constitutional provisions on due process
- Implementing rules and regulations

### Practical Application:

In practice, this provision requires careful consideration of the specific facts and circumstances of each case. Courts have emphasized the need for a case-by-case analysis.`;
  }
  
  if (source.type === 'code') {
    return `# ${source.reference}

## Revised Penal Code

${source.description}

### Elements of the Offense:

1. There must be a specific act or omission
2. The act must be punishable by law
3. The act must be committed with criminal intent or negligence

### Penalties:

The law prescribes specific penalties depending on the gravity of the offense and the presence of aggravating or mitigating circumstances.

### Jurisprudence:

The Supreme Court has clarified the application of this article in numerous cases, establishing important precedents for its interpretation.`;
  }
  
  return `# ${source.reference}

${source.description}

This legal provision provides the framework for understanding and applying the relevant law in this jurisdiction.`;
}

function generateMockCaseContent(caseItem: RelatedCase): string {
  return `# ${caseItem.title}
**${caseItem.caseNumber}**

## Case Summary

${caseItem.description}

## Facts of the Case

The petitioner filed this case challenging the lower court's decision. The facts show that the parties were involved in a dispute concerning the application of relevant legal provisions.

## Issues

1. Whether the lower court correctly applied the law
2. Whether the evidence presented was sufficient to support the decision
3. Whether procedural requirements were properly observed

## Ruling

The Supreme Court ruled in favor of the petitioner, finding that the lower court erred in its interpretation of the applicable law.

## Doctrine Established

This case establishes the principle that courts must carefully consider all relevant factors when applying legal provisions to specific factual circumstances.

## Key Points

- **Burden of Proof**: The party asserting a claim bears the burden of proving it by preponderance of evidence
- **Procedural Compliance**: Strict adherence to procedural rules is required
- **Substantive Rights**: Procedural technicalities should not override substantive rights

## Disposition

WHEREFORE, the petition is GRANTED. The decision of the lower court is REVERSED and SET ASIDE.

SO ORDERED.`;
}

function extractRelevantSection(fullText: string, context?: string): string {
  if (!context) return '';
  
  // Simple extraction - in production, this would use NLP/search
  const lines = fullText.split('\n');
  const relevantLines = lines.filter(line => 
    context.toLowerCase().split(' ').some(word => 
      word.length > 3 && line.toLowerCase().includes(word)
    )
  );
  
  return relevantLines.slice(0, 3).join('\n') || '';
}

function generateSourceUrl(source: LegalSource): string {
  // Use actual Philippine legal databases with specific article/section links
  const reference = source.reference.toLowerCase();
  
  // Extract article and section numbers
  const articleMatch = reference.match(/article\s+([ivxlcdm\d]+)/i);
  const sectionMatch = reference.match(/section\s+(\d+)/i);
  const raMatch = reference.match(/republic act.*?(\d+)/i);
  const pdMatch = reference.match(/presidential decree.*?(\d+)/i);
  const bpMatch = reference.match(/batas pambansa.*?(\d+)/i);
  
  // Republic Acts - link to Official Gazette with search
  if (raMatch) {
    const raNumber = raMatch[1];
    return `https://www.officialgazette.gov.ph/?s=republic+act+${raNumber}`;
  }
  
  // Presidential Decrees - link to Official Gazette with search
  if (pdMatch) {
    const pdNumber = pdMatch[1];
    return `https://www.officialgazette.gov.ph/?s=presidential+decree+${pdNumber}`;
  }
  
  // Batas Pambansa - link to Official Gazette with search
  if (bpMatch) {
    const bpNumber = bpMatch[1];
    return `https://www.officialgazette.gov.ph/?s=batas+pambansa+${bpNumber}`;
  }
  
  // Civil Code - link to specific article on ChanRobles
  if (reference.includes('civil code') && articleMatch) {
    const articleNum = articleMatch[1];
    // ChanRobles uses article numbers in anchors
    return `https://www.chanrobles.com/civilcode.htm#Article%20${articleNum}`;
  }
  
  // Family Code - link to specific article
  if (reference.includes('family code') && articleMatch) {
    const articleNum = articleMatch[1];
    return `https://www.chanrobles.com/executiveorderno209.htm#Article%20${articleNum}`;
  }
  
  // Labor Code - link to specific article
  if (reference.includes('labor code') && articleMatch) {
    const articleNum = articleMatch[1];
    return `https://www.chanrobles.com/laborcode.htm#Article%20${articleNum}`;
  }
  
  // Revised Penal Code - link to specific article
  if ((reference.includes('revised penal code') || reference.includes('rpc')) && articleMatch) {
    const articleNum = articleMatch[1];
    // RPC articles are split across multiple pages, try book 1 first
    return `https://www.chanrobles.com/revisedpenalcodeofthephilippinesbook1.htm#Article%20${articleNum}`;
  }
  
  // Generic article reference - try LawPhil search
  if (articleMatch) {
    const articleNum = articleMatch[1];
    const searchTerm = encodeURIComponent(`Article ${articleNum}`);
    return `https://lawphil.net/search.html?q=${searchTerm}`;
  }
  
  // Section reference - try LawPhil search
  if (sectionMatch) {
    const sectionNum = sectionMatch[1];
    const searchTerm = encodeURIComponent(source.reference);
    return `https://lawphil.net/search.html?q=${searchTerm}`;
  }
  
  // Default to LawPhil with search for the full reference
  const searchTerm = encodeURIComponent(source.reference);
  return `https://lawphil.net/search.html?q=${searchTerm}`;
}

function generateCaseUrl(caseItem: RelatedCase): string {
  // Use Supreme Court E-Library or LawPhil with specific case search
  const grMatch = caseItem.caseNumber.match(/G\.R\.?\s+(?:L-)?No\.?\s+(\d+(?:-\d+)?)/i);
  
  if (grMatch) {
    const grNumber = grMatch[1];
    // Supreme Court E-Library search
    return `https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/1/${grNumber}`;
  }
  
  // Search LawPhil for case title
  const searchTerm = encodeURIComponent(caseItem.title);
  return `https://lawphil.net/search.html?q=${searchTerm}`;
}

