'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MessageSquare, Briefcase, Loader2 } from 'lucide-react';
import { PageLayout } from '@/components/ui/page-layout';
import { useConversations } from '@/components/conversation-provider/conversation-context';

type SearchTab = 'chats' | 'cases';

interface ConvResult {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CaseResult {
  id: string;
  case_name: string;
  party_involved?: string | null;
  notes?: string | null;
  created_at?: string;
}

function ChatCard({ conv, index, isSearchResult }: { conv: ConvResult; index: number; isSearchResult: boolean }) {
  const router = useRouter();
  const dateSource = conv.updatedAt || conv.createdAt;
  const dateObj = dateSource ? new Date(dateSource) : null;
  const now = new Date();
  const formattedDate = dateObj
    ? dateObj.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
        ...(dateObj.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
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
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[15px] text-white truncate tracking-tight group-hover:text-[#e9c176] transition-colors leading-snug">
            {conv.title || 'Untitled Chat'}
          </h3>
          {isSearchResult && (
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#722f37] bg-[#722f37]/10 px-1.5 py-0.5 rounded-md border border-[#722f37]/20 mt-1 inline-block">
              Match
            </span>
          )}
        </div>
      </div>
      {formattedDate && (
        <span className="flex-shrink-0 text-[12px] text-gray-500 group-hover:text-[#e9c176]/80 transition-colors tabular-nums whitespace-nowrap">
          {formattedDate}
        </span>
      )}
    </motion.div>
  );
}

function CaseCard({ c, index, isSearchResult }: { c: CaseResult; index: number; isSearchResult: boolean }) {
  const router = useRouter();
  const dateObj = c.created_at ? new Date(c.created_at) : null;
  const now = new Date();
  const formattedDate = dateObj
    ? dateObj.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
        ...(dateObj.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, delay: index * 0.04 }}
      onClick={() => router.push(`/cases/${c.id}`)}
      className="group p-5 bg-black/40 border border-[#722f37]/20 hover:border-[#e9c176]/30 hover:bg-white/[0.02] rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-[#722f37]/10 border border-[#722f37]/20 flex items-center justify-center flex-shrink-0 group-hover:border-[#e9c176]/20 transition-colors">
          <Briefcase size={16} className="text-[#722f37] group-hover:text-[#e9c176] transition-colors" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[15px] text-white truncate tracking-tight group-hover:text-[#e9c176] transition-colors leading-snug">
            {c.case_name || 'Untitled Case'}
          </h3>
          {c.party_involved && (
            <p className="text-[11px] text-gray-500 truncate mt-0.5">{c.party_involved}</p>
          )}
          {isSearchResult && (
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#722f37] bg-[#722f37]/10 px-1.5 py-0.5 rounded-md border border-[#722f37]/20 mt-1 inline-block">
              Match
            </span>
          )}
        </div>
      </div>
      {formattedDate && (
        <span className="flex-shrink-0 text-[12px] text-gray-500 group-hover:text-[#e9c176]/80 transition-colors tabular-nums whitespace-nowrap">
          {formattedDate}
        </span>
      )}
    </motion.div>
  );
}

export function SearchPage() {
  const router = useRouter();
  const { recentConsultations, cases: recentCases } = useConversations();

  const [activeTab, setActiveTab] = useState<SearchTab>('chats');
  const [inputValue, setInputValue] = useState('');
  const [chatResults, setChatResults] = useState<ConvResult[]>([]);
  const [caseResults, setCaseResults] = useState<CaseResult[]>([]);
  const [chatServerIds, setChatServerIds] = useState<Set<string>>(new Set());
  const [caseServerIds, setCaseServerIds] = useState<Set<string>>(new Set());
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setChatResults([]);
      setCaseResults([]);
      setChatServerIds(new Set());
      setCaseServerIds(new Set());
      return;
    }

    setIsLoadingChats(true);
    setIsLoadingCases(true);

    fetch(`/api/conversations?search=${encodeURIComponent(trimmed)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (inputRef.current?.value.trim() === trimmed) {
          const results: ConvResult[] = (data?.conversations ?? []).filter(
            (c: ConvResult & { title?: string }) => !(c.title ?? '').startsWith('[CASE]')
          );
          setChatResults(results);
          setChatServerIds(new Set(results.map(r => String(r.id))));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingChats(false));

    fetch(`/api/cases?search=${encodeURIComponent(trimmed)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (inputRef.current?.value.trim() === trimmed) {
          const results: CaseResult[] = data?.cases ?? [];
          setCaseResults(results);
          setCaseServerIds(new Set(results.map(r => String(r.id))));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingCases(false));
  };

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setChatResults([]);
      setCaseResults([]);
      setChatServerIds(new Set());
      setCaseServerIds(new Set());
      return;
    }
    const timer = setTimeout(() => runSearch(trimmed), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleClear = () => {
    setInputValue('');
    setChatResults([]);
    setCaseResults([]);
    setChatServerIds(new Set());
    setCaseServerIds(new Set());
    inputRef.current?.focus();
  };

  const isSearching = inputValue.trim().length > 0;
  const isLoading = isLoadingChats || isLoadingCases;

  const displayChats: ConvResult[] = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) {
      return recentConsultations.map((c: any) => ({ id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt }));
    }
    const clientMatches = recentConsultations
      .filter((c: any) => c.title?.toLowerCase().includes(query))
      .map((c: any) => ({ id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt }));
    const merged = new Map<string, ConvResult>();
    clientMatches.forEach((item: ConvResult) => merged.set(String(item.id), item));
    chatResults.forEach(item => { if (!merged.has(String(item.id))) merged.set(String(item.id), item); });
    return Array.from(merged.values());
  }, [inputValue, chatResults, recentConsultations]);

  const displayCases: CaseResult[] = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return recentCases ?? [];
    const clientMatches = (recentCases ?? []).filter((c: any) =>
      c.case_name?.toLowerCase().includes(query) ||
      c.party_involved?.toLowerCase().includes(query)
    );
    const merged = new Map<string, CaseResult>();
    clientMatches.forEach((item: CaseResult) => merged.set(String(item.id), item));
    caseResults.forEach(item => { if (!merged.has(String(item.id))) merged.set(String(item.id), item); });
    return Array.from(merged.values());
  }, [inputValue, caseResults, recentCases]);

  const activeItems = activeTab === 'chats' ? displayChats : displayCases;

  return (
    <PageLayout
      activePage="search"
      title="Search"
      subtitle="Find past consultations and cases by keyword"
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-6 px-4 py-6 h-full overflow-y-auto">

        {/* Search input */}
        <div className="relative flex items-center group">
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
            placeholder={activeTab === 'chats' ? 'Search by title or message content…' : 'Search by case name, party, or notes…'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-black/50 border border-[#722f37]/30 hover:border-[#722f37]/50 focus:border-[#e9c176]/50 focus:ring-2 focus:ring-[#e9c176]/10 rounded-full pl-14 pr-12 py-4 text-[15px] text-white placeholder-gray-600 outline-none transition-all duration-300 font-inter shadow-lg"
            autoFocus
          />
          <AnimatePresence>
            {inputValue && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                onClick={handleClear}
                className="absolute right-4 p-1.5 text-gray-500 hover:text-white rounded-full hover:bg-white/5 transition-all"
              >
                <X size={15} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-black/30 border border-[#722f37]/20 rounded-xl w-fit">
          {(['chats', 'cases'] as SearchTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab
                  ? 'bg-[#722f37]/30 border border-[#722f37]/50 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'chats' ? (
                <span className="flex items-center gap-1.5"><MessageSquare size={12} />{isSearching ? `Chats (${displayChats.length})` : 'Chats'}</span>
              ) : (
                <span className="flex items-center gap-1.5"><Briefcase size={12} />{isSearching ? `Cases (${displayCases.length})` : 'Cases'}</span>
              )}
            </button>
          ))}
        </div>

        {/* Section label */}
        <div className="flex items-center justify-between -mb-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-500">
            {isSearching
              ? `${activeItems.length} result${activeItems.length !== 1 ? 's' : ''} for "${inputValue}"`
              : activeTab === 'chats' ? 'Recent Chats' : 'Recent Cases'}
          </p>
          {!isSearching && activeTab === 'chats' && (
            <button
              onClick={() => router.push('/consultation')}
              className="text-[10px] font-bold uppercase tracking-widest text-[#722f37] hover:text-[#e9c176] transition-colors"
            >
              New Chat +
            </button>
          )}
          {!isSearching && activeTab === 'cases' && (
            <button
              onClick={() => router.push('/cases')}
              className="text-[10px] font-bold uppercase tracking-widest text-[#722f37] hover:text-[#e9c176] transition-colors"
            >
              New Case +
            </button>
          )}
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {!isLoading && isSearching && activeItems.length === 0 && (
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
                <p className="text-lg font-serif text-white mb-1">No {activeTab} found.</p>
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">
                  Try a different keyword or check spelling
                </p>
              </div>
            </motion.div>
          )}

          {!isLoading && !isSearching && activeItems.length === 0 && (
            <motion.div
              key="empty-recent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center gap-4"
            >
              <div className="p-6 bg-[#722f37]/10 rounded-3xl border border-[#722f37]/20">
                {activeTab === 'chats' ? <MessageSquare size={36} className="text-[#722f37]" strokeWidth={1.5} /> : <Briefcase size={36} className="text-[#722f37]" strokeWidth={1.5} />}
              </div>
              <div>
                <p className="text-lg font-serif text-white mb-1">No {activeTab === 'chats' ? 'conversations' : 'cases'} yet.</p>
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">
                  {activeTab === 'chats' ? 'Start a new chat to get going' : 'Create a case to get started'}
                </p>
              </div>
            </motion.div>
          )}

          {activeItems.length > 0 && (
            <motion.div
              key={`${activeTab}-${isSearching ? 'results' : 'recent'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-3"
            >
              {activeTab === 'chats'
                ? displayChats.map((conv, i) => (
                    <ChatCard key={conv.id} conv={conv} index={i} isSearchResult={isSearching && chatServerIds.has(String(conv.id))} />
                  ))
                : displayCases.map((c, i) => (
                    <CaseCard key={c.id} c={c} index={i} isSearchResult={isSearching && caseServerIds.has(String(c.id))} />
                  ))
              }
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}
