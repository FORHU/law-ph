'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2, Gavel, BookOpen } from 'lucide-react';

interface RagDocument {
  id: number;
  title: string | null;
  case_no: string | null;
  category: string;
  subcategory: string | null;
  year: number | null;
  source_url: string | null;
  concise_summary: string | null;
  full_text: string | null;
  created_at: string;
}

export default function LegalRagDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const searchParams = useSearchParams();
  const keyword = searchParams.get('from') || '';

  const [doc, setDoc] = useState<RagDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/rag/documents/${id}?fullText=true`)
      .then(res => {
        if (!res.ok) { setError('Document not found'); return null; }
        return res.json();
      })
      .then(data => { if (data) setDoc(data.document); })
      .catch(() => setError('Failed to load document'))
      .finally(() => setLoading(false));
  }, [id]);

  const backHref = keyword ? `/legal-rag?keyword=${encodeURIComponent(keyword)}` : '/legal-rag';

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-12">

        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-white mb-12 transition-all uppercase tracking-[0.2em]"
        >
          <ArrowLeft size={14} />
          Back to Search
        </Link>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-16 h-16 rounded-2xl bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
              <Loader2 className="animate-spin text-[#e9c176]" size={32} />
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest animate-pulse">
              Loading document...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-24 space-y-6">
            <p className="text-gray-400 font-serif italic text-lg">{error}</p>
            <Link
              href="/legal-rag"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#722f37] text-white text-[11px] font-bold uppercase tracking-[0.2em] transition-all"
            >
              <ArrowLeft size={16} /> Back to Search
            </Link>
          </div>
        )}

        {doc && !loading && (
          <article className="space-y-8">

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest bg-[#722f37]/20 border border-[#722f37]/30">
                <Gavel size={12} className="text-[#e9c176]" />
                {doc.subcategory ?? doc.category}
              </span>
              {doc.case_no && (
                <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider bg-white/5 px-3 py-1 rounded-md">
                  {doc.case_no}
                </span>
              )}
              {doc.year && (
                <span className="text-[10px] font-bold text-[#e9c176] uppercase tracking-wider">
                  {doc.year}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-serif text-white leading-tight tracking-tight">
              {doc.title ?? doc.case_no ?? 'Untitled Document'}
            </h1>

            {/* Summary */}
            {doc.concise_summary && (
              <div className="bg-white/[0.02] border border-[#722f37]/20 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={14} className="text-[#e9c176]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#e9c176]">Summary</span>
                </div>
                <p className="text-gray-300 leading-relaxed text-sm">{doc.concise_summary}</p>
              </div>
            )}

            {/* Full text */}
            {doc.full_text && (
              <div className="border-t border-white/10 pt-8">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                  <BookOpen size={12} /> Full Text
                </h2>
                <div className="prose prose-invert max-w-none">
                  <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {doc.full_text}
                  </pre>
                </div>
              </div>
            )}

            {/* Source link */}
            {doc.source_url && (
              <div className="pt-8 border-t border-white/10">
                <a
                  href={doc.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all bg-[#722f37] text-white hover:bg-[#8b3a44] shadow-xl shadow-[#722f37]/20"
                >
                  <ExternalLink size={16} />
                  View Original Source
                </a>
              </div>
            )}

          </article>
        )}
      </div>
    </div>
  );
}
