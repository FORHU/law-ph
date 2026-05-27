'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Gavel, Search, Loader2, ExternalLink, ChevronRight, BookOpen, X } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';

interface RagDocument {
  id: number;
  title: string | null;
  case_no: string | null;
  category: string;
  subcategory: string | null;
  year: number | null;
  source_url: string | null;
  concise_summary: string | null;
  created_at: string;
}

export default function LegalRagPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialKeyword = searchParams.get('keyword') || '';

  const [input, setInput] = useState(initialKeyword);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const search = useCallback(async (q: string, p: number) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const offset = (p - 1) * limit;
      const res = await fetch(`/api/rag/documents?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setDocuments(data.documents || []);
      setTotal(data.total || data.documents?.length || 0);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (keyword) search(keyword, page);
  }, [keyword, page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setPage(1);
    setKeyword(input.trim());
    router.push(`/legal-rag?keyword=${encodeURIComponent(input.trim())}`);
  };

  const handleClear = () => {
    setInput('');
    setKeyword('');
    setDocuments([]);
    router.push('/legal-rag');
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#722f37]/20 flex items-center justify-center border border-[#722f37]/30">
              <Gavel size={20} className="text-[#e9c176]" />
            </div>
            <h1 className="text-2xl font-serif text-white tracking-tight">Legal RAG Database</h1>
          </div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
            Search {(68142).toLocaleString()} Philippine legal documents
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative mb-10">
          <div className="flex items-center gap-3 bg-white/[0.03] border border-[#722f37]/20 rounded-2xl px-5 py-4 focus-within:border-[#722f37]/50 transition-all shadow-xl">
            <Search size={18} className="text-gray-500 flex-shrink-0" />
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Search by keyword, case number, or legal topic..."
              className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm outline-none"
              autoFocus
            />
            {input && (
              <button type="button" onClick={handleClear} className="text-gray-600 hover:text-white transition-colors">
                <X size={16} />
              </button>
            )}
            <button
              type="submit"
              className="bg-[#722f37] hover:bg-[#8b3a44] text-white text-[10px] font-bold uppercase tracking-widest px-5 py-2 rounded-xl transition-all flex-shrink-0"
            >
              Search
            </button>
          </div>
        </form>

        {/* Loading */}
        {loading && <PageLoader label="Searching legal database..." />}

        {/* Empty state */}
        {!loading && keyword && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
              <Gavel size={28} className="text-gray-600" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-lg font-serif text-white mb-2">No documents found</h3>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                No results for &quot;{keyword}&quot; — try a different keyword
              </p>
            </div>
          </div>
        )}

        {/* Default state */}
        {!loading && !keyword && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
              <BookOpen size={28} className="text-gray-600" strokeWidth={1.5} />
            </div>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
              Enter a keyword to search the legal database
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && documents.length > 0 && (
          <>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">
              Showing {documents.length} results for &quot;{keyword}&quot;
            </p>

            <div className="space-y-3">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/legal-rag/${doc.id}`}
                  className="block bg-white/[0.02] border border-[#722f37]/10 rounded-xl p-5 hover:border-[#722f37]/40 hover:bg-white/[0.04] transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#722f37]/20 text-[#e9c176] border border-[#722f37]/20">
                          {doc.subcategory ?? doc.category}
                        </span>
                        {doc.case_no && (
                          <span className="text-[9px] font-mono text-gray-500 font-bold uppercase tracking-wider">
                            {doc.case_no}
                          </span>
                        )}
                        {doc.year && (
                          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                            {doc.year}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-serif text-white group-hover:text-[#e9c176] transition-colors leading-snug mb-2 truncate">
                        {doc.title ?? doc.case_no ?? 'Untitled Document'}
                      </h3>
                      {doc.concise_summary && (
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                          {doc.concise_summary}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors flex-shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                Page {page}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={documents.length < limit}
                className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
