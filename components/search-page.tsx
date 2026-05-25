'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MessageSquare, Loader2, Clock } from 'lucide-react';
import { PageLayout } from '@/components/ui/page-layout';
import { useConversations } from '@/components/conversation-provider/conversation-context';

interface ConvResult {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

function ChatCard({
  conv,
  index,
  isSearchResult,
}: {
  conv: ConvResult;
  index: number;
  isSearchResult: boolean;
}) {
  const router = useRouter();

  const formattedDate = conv.updatedAt
    ? new Date(conv.updatedAt).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : conv.createdAt
    ? new Date(conv.createdAt).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, delay: index * 0.04 }}
      onClick={() => router.push(`/consultation/${conv.id}`)}
      className="group p-5 bg-black/40 border border-[#722f37]/20 hover:border-[#e9c176]/30 hover:bg-white/[0.02] rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-[#722f37]/10 border border-[#722f37]/20 flex items-center justify-center flex-shrink-0 group-hover:border-[#e9c176]/20 transition-colors">
          <MessageSquare size={16} className="text-[#722f37] group-hover:text-[#e9c176] transition-colors" />
        </div>
        <div className="min-w-0">
          <h3 className="font-serif text-[15px] text-white truncate tracking-tight group-hover:text-[#e9c176] transition-colors leading-snug">
            {conv.title || 'Untitled Chat'}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            {isSearchResult && (
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#722f37] bg-[#722f37]/10 px-1.5 py-0.5 rounded-md border border-[#722f37]/20">
                Match
              </span>
            )}
            {formattedDate && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                <Clock size={9} />
                {formattedDate}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
        <span className="text-[11px] font-bold text-[#e9c176] uppercase tracking-widest whitespace-nowrap">
          Open →
        </span>
      </div>
    </motion.div>
  );
}

export function SearchPage() {
  const router = useRouter();
  const { recentConsultations } = useConversations();

  // Input value
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState<ConvResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(
        `/api/conversations?search=${encodeURIComponent(trimmed)}`
      );
      if (res.ok) {
        const { conversations } = await res.json();
        // Guard against race conditions: only update state if the input value still matches
        if (inputRef.current?.value.trim() === trimmed) {
          setSearchResults(
            (conversations ?? []).filter(
              (c: ConvResult & { title?: string }) =>
                !(c.title ?? '').startsWith('[CASE]')
            )
          );
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search logic for typing
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      runSearch(trimmed);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(inputValue);
  };

  const handleClear = () => {
    setInputValue('');
    setSearchResults([]);
    inputRef.current?.focus();
  };

  const isSearching = inputValue.trim().length > 0;
  const showRecent = !isSearching;

  // Real-time client-side filter merged with background server-side results
  const displayItems: ConvResult[] = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) {
      return recentConsultations.map((c: any) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));
    }

    // 1. Client-side title matches (instant)
    const clientMatches = recentConsultations
      .filter((c: any) => c.title?.toLowerCase().includes(query))
      .map((c: any) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

    // 2. Server-side deep content matches
    const serverMatches = searchResults;

    // Merge and deduplicate by conversation ID, keeping client-side matches first
    const mergedMap = new Map<string, ConvResult>();
    clientMatches.forEach(item => {
      mergedMap.set(String(item.id), item);
    });
    serverMatches.forEach(item => {
      if (!mergedMap.has(String(item.id))) {
        mergedMap.set(String(item.id), item);
      }
    });

    return Array.from(mergedMap.values());
  }, [inputValue, searchResults, recentConsultations]);

  return (
    <PageLayout
      activePage="search"
      title="Search Chats"
      subtitle="Find past conversations by keyword"
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-6 px-4 py-6 h-full overflow-y-auto">

        {/* ── Search form ── */}
        <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
          {/* Input pill */}
          <div className="relative flex-1 flex items-center group">
            <span className="absolute left-5 pointer-events-none text-gray-500 group-focus-within:text-[#e9c176] transition-colors duration-300">
              {isLoading ? (
                <Loader2 size={18} className="text-[#e9c176] animate-spin" />
              ) : (
                <Search size={18} />
              )}
            </span>

            <input
              ref={inputRef}
              type="text"
              placeholder="Search by title or message content…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runSearch(inputValue); }}
              className="w-full bg-black/50 border border-[#722f37]/30 hover:border-[#722f37]/50 focus:border-[#e9c176]/50 focus:ring-2 focus:ring-[#e9c176]/10 rounded-full pl-14 pr-12 py-4 text-[15px] text-white placeholder-gray-600 outline-none transition-all duration-300 font-inter shadow-lg"
              autoFocus
            />

            {/* Clear button — only shows when input has text */}
            <AnimatePresence>
              {inputValue && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={handleClear}
                  className="absolute right-4 p-1.5 text-gray-500 hover:text-white rounded-full hover:bg-white/5 transition-all"
                  title="Clear"
                >
                  <X size={15} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="flex-shrink-0 flex items-center gap-2 px-6 py-4 rounded-full bg-[#722f37] hover:bg-[#8a3842] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-widest transition-all duration-200 shadow-lg"
          >
            Search
          </button>
        </form>

        {/* ── Section label ── */}
        <div className="flex items-center justify-between -mb-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-500">
            {isSearching
              ? `${displayItems.length} result${displayItems.length !== 1 ? 's' : ''} for "${inputValue}"`
              : 'Recent Chats'}
          </p>
          {showRecent && recentConsultations.length > 0 && (
            <button
              onClick={() => router.push('/consultation')}
              className="text-[10px] font-bold uppercase tracking-widest text-[#722f37] hover:text-[#e9c176] transition-colors"
            >
              New Chat +
            </button>
          )}
        </div>

        {/* ── Content ── */}
        <AnimatePresence mode="wait">

          {/* No results */}
          {!isLoading && isSearching && displayItems.length === 0 && (
            <motion.div
              key="empty-search"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center gap-4"
            >
              <div className="p-6 bg-[#722f37]/10 rounded-3xl border border-[#722f37]/20">
                <Search size={36} className="text-[#722f37]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-lg font-serif text-white mb-1">No chats found.</p>
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">
                  Try a different keyword or check spelling
                </p>
              </div>
            </motion.div>
          )}

          {/* No recent chats */}
          {!isLoading && showRecent && recentConsultations.length === 0 && (
            <motion.div
              key="empty-recent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center gap-4"
            >
              <div className="p-6 bg-[#722f37]/10 rounded-3xl border border-[#722f37]/20">
                <MessageSquare size={36} className="text-[#722f37]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-lg font-serif text-white mb-1">No conversations yet.</p>
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">
                  Start a new chat to get going
                </p>
              </div>
              <button
                onClick={() => router.push('/consultation')}
                className="mt-2 px-6 py-2.5 bg-[#722f37]/20 border border-[#722f37]/40 hover:bg-[#722f37]/30 text-white rounded-xl text-[12px] font-bold uppercase tracking-widest transition-all"
              >
                New Chat
              </button>
            </motion.div>
          )}

          {/* Cards */}
          {displayItems.length > 0 && (
            <motion.div
              key={isSearching ? 'results' : 'recent'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-3"
            >
              {displayItems.map((conv, i) => (
                <ChatCard
                  key={conv.id}
                  conv={conv}
                  index={i}
                  isSearchResult={isSearching}
                />
              ))}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </PageLayout>
  );
}
