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
    <div className="min-h-screen bg-[#1a1a1a] text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <Link
          href="/consultation"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to consultation
        </Link>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="animate-spin text-[#E0A7C2]" size={40} />
            <p className="mt-4 text-gray-400">Loading source...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-24">
            <p className="text-gray-400 mb-6">{error}</p>
            <Link
              href="/consultation"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft size={16} />
              Back to consultation
            </Link>
          </div>
        )}

        {data && !loading && (
          <article className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-white ${
                  isLaw ? 'bg-[#c2185b]' : 'bg-[#03a9f4]'
                }`}
              >
                {isLaw ? <BookOpen size={12} /> : <Gavel size={12} />}
                {isLaw ? 'Law' : 'Jurisprudence'}
              </span>
              {data.gr_number && (
                <span className="text-xs text-gray-500">{data.gr_number}</span>
              )}
              {data.law_number && (
                <span className="text-xs text-gray-500">{data.law_number}</span>
              )}
              {data.year && (
                <span className="text-xs text-gray-500">({data.year})</span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              {data.title}
            </h1>

            <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-white border-t border-white/10 pt-6">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-white mb-4 mt-6">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold text-white mb-3 mt-5">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold text-white mb-2 mt-4">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-300 mb-4 leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc ml-5 mb-4 space-y-2 text-gray-300">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal ml-5 mb-4 space-y-2 text-gray-300">
                      {children}
                    </ol>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-white font-semibold">
                      {children}
                    </strong>
                  ),
                }}
              >
                {markdownContent || '*No content available.*'}
              </ReactMarkdown>
            </div>

            {data.url && (
              <div className="pt-6 border-t border-white/10">
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: `${COLORS.PRIMARY}20`,
                    color: COLORS.PRIMARY_LIGHT || '#E0A7C2',
                  }}
                >
                  <ExternalLink size={16} />
                  Open original source
                </a>
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
