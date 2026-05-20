import { NextRequest, NextResponse } from 'next/server';
import { searchDocumentsByKeyword, listDocuments } from '@/lib/rag-db';

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','it','its','be','was','are','were','been','has','have',
  'had','do','does','did','will','would','could','should','may','might',
  'give','me','show','get','find','search','case','cases','about','what',
  'who','where','when','how','can','please','tell','regarding','related',
  'any','all','some','this','that','these','those','my','your','their',
]);

function extractKeywords(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .join(' ');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, page = 1, limit = 10 } = body;
    const offset = (page - 1) * limit;

    const keywords = prompt ? extractKeywords(prompt) : '';

    const documents = keywords
      ? await searchDocumentsByKeyword(keywords, { limit, offset })
      : await listDocuments({ limit, offset });

    const results = documents.map((doc) => ({
      item_id: String(doc.id),
      gr_number: doc.case_no,
      title: doc.title ?? doc.case_no ?? 'Philippine Legal Document',
      url: doc.source_url ?? null,
      type: doc.subcategory ?? doc.category,
      score: null,
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[Legal Search] Error:', error);
    return NextResponse.json(
      { error: `Failed to search legal documents: ${error.message}` },
      { status: 500 }
    );
  }
}
