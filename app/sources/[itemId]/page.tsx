'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Loader2, BookOpen, Gavel } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TurndownService from 'turndown';
import { COLORS } from '@/lib/constants';

interface SourceData {
  item_id: string;
  type: string;
  title: string;
  url: string;
  text_content: string;
  gr_number?: string;
  law_number?: string;
  date?: string;
  year?: string;
}

export default function SourcePage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = React.use(params);
  const [data, setData] = useState<SourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/legal/case/${encodeURIComponent(itemId)}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) setError('Source not found');
          else setError('Failed to load source');
          return null;
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch(() => setError('Failed to load source'))
      .finally(() => setLoading(false));
  }, [itemId]);

  const isCase = data?.type === 'lawphil_case' || data?.type === 'scelibrary_document';
  const isLaw = data?.type === 'lawphil_statute';

  const markdownContent = (() => {
    if (!data?.text_content) return '';
    try {
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-',
      });
      return turndownService.turndown(data.text_content);
    } catch {
      return data.text_content;
    }
  })();

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <Link
          href="/consultation"
          className="inline-flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-white mb-12 transition-all uppercase tracking-[0.2em]"
        >
          <ArrowLeft size={14} />
          Return to Consultation
        </Link>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-16 h-16 rounded-2xl bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
              <Loader2 className="animate-spin text-[#e9c176]" size={32} />
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest animate-pulse">Loading source...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-24 space-y-8">
            <p className="text-gray-400 font-serif italic text-lg">"{error}"</p>
            <Link
              href="/consultation"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#722f37] text-white text-[11px] font-bold uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#722f37]/20"
            >
              <ArrowLeft size={16} />
              Return to Repository
            </Link>
          </div>
        )}

        {data && !loading && (
          <article className="space-y-8">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest ${isLaw ? 'bg-[#722f37] border border-[#e9c176]/30' : 'bg-[#e9c176] !text-black shadow-lg shadow-[#e9c176]/10'
                  }`}
              >
                {isLaw ? <BookOpen size={12} /> : <Gavel size={12} />}
                {isLaw ? 'Philippine Law' : 'Case Law'}
              </span>
              {data.gr_number && (
                <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider bg-white/5 px-3 py-1 rounded-md">{data.gr_number}</span>
              )}
              {data.law_number && (
                <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider bg-white/5 px-3 py-1 rounded-md">{data.law_number}</span>
              )}
              {data.year && (
                <span className="text-[10px] font-mono text-[#e9c176] font-bold uppercase tracking-wider">Published {data.year}</span>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-serif text-white leading-tight tracking-tight">
              {data.title}
            </h1>

            <div className="prose prose-invert max-w-none prose-headings:text-[#e9c176] prose-headings:font-serif prose-p:text-gray-300 prose-p:leading-relaxed prose-li:text-gray-300 prose-strong:text-white border-t border-white/10 pt-8 mt-8">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-serif text-[#e9c176] mb-6 mt-10 tracking-tight">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-serif text-[#e9c176] mb-4 mt-8 tracking-tight">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-serif text-[#e9c176] mb-3 mt-6">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-300 mb-6 leading-relaxed text-lg">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc ml-6 mb-6 space-y-3 text-gray-300">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal ml-6 mb-6 space-y-3 text-gray-300">
                      {children}
                    </ol>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-white font-bold border-b border-[#e9c176]/30">
                      {children}
                    </strong>
                  ),
                }}
              >
                {markdownContent || '*No content available.*'}
              </ReactMarkdown>
            </div>

            {data.url && (
              <div className="pt-10 border-t border-white/10">
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all bg-[#722f37] text-white hover:bg-[#8b3a44] shadow-xl shadow-[#722f37]/20 active:scale-95"
                >
                  <ExternalLink size={16} />
                  View Original Document
                </a>
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
