'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark, BookmarkCheck, Trash2, ChevronDown, ChevronUp,
  BookOpen, MessageSquare, ExternalLink, Search, X, Building2,
  Scale, Gavel, FileText,
} from 'lucide-react';
import { PageLayout } from '@/components/ui/page-layout';
import { useConversations } from '@/components/conversation-provider/conversation-context';
import type { Bookmark as BookmarkType } from '@/lib/bookmarks-service';

const CATEGORY_ICONS: Record<string, any> = {
  law: Scale,
  jurisprudence: Gavel,
  issuance: Building2,
};

function BookmarkCard({
  bookmark,
  onRemove,
  conversations = [],
  currentConsultationId,
}: {
  bookmark: BookmarkType;
  onRemove: (id: string) => void;
  conversations?: any[];
  currentConsultationId?: string | number | null;
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isAIResponse = bookmark.reference === 'AI_RESPONSE';
  const isLibraryDoc = !isAIResponse && /^\d+$/.test(bookmark.itemId);

  const getConsultationStatus = () => {
    if (!isAIResponse || !bookmark.url) return { exists: true };
    const parts = bookmark.url.split('/');
    const id = parts[parts.length - 1];
    const exists = conversations.some((c: any) => c.id.toString() === id) ||
      (currentConsultationId && currentConsultationId.toString() === id);
    return { exists };
  };

  const { exists: consultationExists } = getConsultationStatus();

  const handleOpen = () => {
    if (isLibraryDoc) {
      router.push(`/legal-library/${bookmark.itemId}`);
      return;
    }
    if (isAIResponse && consultationExists && bookmark.url) {
      router.push(`${bookmark.url}#message-${bookmark.itemId}`);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRemoving(true);
    await onRemove(bookmark.id);
    setRemoving(false);
  };

  const Icon = isLibraryDoc ? (CATEGORY_ICONS[bookmark.type] ?? FileText) : (isAIResponse ? MessageSquare : Bookmark);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="bg-[#0B0B0C] border border-[#722f37]/20 rounded-2xl overflow-hidden hover:border-[#722f37]/40 transition-all"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#722f37]/10 border border-[#722f37]/20 flex items-center justify-center flex-shrink-0">
              <Icon size={14} className="text-[#e9c176]" />
            </div>
            <div className="min-w-0 flex-1">
              {bookmark.reference && bookmark.reference !== 'No Reference' && bookmark.reference !== 'AI_RESPONSE' && (
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] truncate">{bookmark.reference}</p>
              )}
              {isLibraryDoc && (
                <p className="text-[10px] font-bold text-[#722f37] uppercase tracking-widest">Legal Library</p>
              )}
              {isAIResponse && !consultationExists && (
                <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest">Consultation Deleted</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Bookmark size={14} className="text-[#722f37] fill-[#722f37]/40" />
            <button
              onClick={handleRemove}
              disabled={removing}
              className="p-1.5 hover:bg-white/5 rounded-lg text-gray-600 hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3
          onClick={handleOpen}
          className={`font-serif text-lg leading-snug tracking-tight mb-3 transition-colors ${
            (isLibraryDoc || (isAIResponse && consultationExists))
              ? 'text-white cursor-pointer hover:text-[#e9c176]'
              : isAIResponse && !consultationExists
              ? 'text-gray-500 cursor-default'
              : 'text-white cursor-pointer hover:text-[#e9c176]'
          }`}
        >
          {bookmark.title}
        </h3>

        {/* Summary */}
        {bookmark.aiSummary && (
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                {isAIResponse ? 'AI Response' : 'Summary'}
              </p>
              <p className={`text-[13px] leading-relaxed italic text-gray-400 ${!isExpanded ? 'line-clamp-3' : ''}`}>
                {bookmark.aiSummary}
              </p>
              {bookmark.aiSummary.length > 200 && (
                <button
                  onClick={() => setIsExpanded(v => !v)}
                  className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-gray-600 hover:text-white transition-colors mt-1.5"
                >
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {isExpanded ? 'Collapse' : 'Read more'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Doctrine & Facts */}
        <AnimatePresence>
          {isExpanded && (bookmark.doctrine || bookmark.facts) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-3 space-y-3"
            >
              {bookmark.doctrine && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Legal Doctrine</p>
                  <p className="text-[13px] text-gray-400 leading-relaxed font-serif italic">{bookmark.doctrine}</p>
                </div>
              )}
              {bookmark.facts && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Case Facts</p>
                  <p className="text-[13px] text-gray-400 leading-relaxed">{bookmark.facts}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expand toggle for doctrine/facts */}
        {!isAIResponse && (bookmark.doctrine || bookmark.facts) && (
          <button
            onClick={() => setIsExpanded(v => !v)}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-600 hover:text-white transition-colors mt-3"
          >
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {isExpanded ? 'Hide Details' : 'View Full Brief'}
          </button>
        )}

        {/* Open link button */}
        {(isLibraryDoc || (isAIResponse && consultationExists)) && (
          <button
            onClick={handleOpen}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#722f37] hover:text-[#e9c176] transition-colors mt-3"
          >
            <ExternalLink size={11} />
            {isLibraryDoc ? 'Open in Library' : 'Go to Consultation'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function BookmarksPage() {
  const { bookmarks, removeBookmark, refreshBookmarks, conversations, currentConsultationId } = useConversations();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'library' | 'consultation'>('all');

  useEffect(() => { refreshBookmarks(); }, []);

  const filtered = bookmarks.filter(b => {
    const isLibrary = /^\d+$/.test(b.itemId) && b.reference !== 'AI_RESPONSE';
    const isConsultation = b.reference === 'AI_RESPONSE';
    if (filter === 'library' && !isLibrary) return false;
    if (filter === 'consultation' && !isConsultation) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.title.toLowerCase().includes(q) ||
        b.reference?.toLowerCase().includes(q) ||
        b.aiSummary?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <PageLayout
      activePage="chat"
      title="Bookmarks"
      subtitle={`${bookmarks.length} saved item${bookmarks.length !== 1 ? 's' : ''}`}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-4 px-4 py-6 overflow-y-auto h-full">

        {/* Search + filter */}
        {bookmarks.length > 0 && (
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-[#722f37]/40 transition-all">
              <Search size={14} className="text-gray-600 flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search bookmarks..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-600 hover:text-white transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1">
              {(['all', 'library', 'consultation'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                    filter === f ? 'bg-[#722f37] text-white' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {bookmarks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 bg-[#722f37]/10 rounded-full flex items-center justify-center mb-6 border border-[#722f37]/20">
              <Bookmark size={36} className="text-[#722f37]" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-serif text-white mb-2">No bookmarks yet.</h3>
            <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest max-w-sm">
              Save documents from the library or insights from consultations.
            </p>
          </div>
        )}

        {/* No results */}
        {bookmarks.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 font-serif italic">No bookmarks match your search.</p>
          </div>
        )}

        {/* Bookmark list */}
        <AnimatePresence mode="popLayout">
          {filtered.map(bm => (
            <BookmarkCard
              key={bm.id}
              bookmark={bm}
              onRemove={removeBookmark}
              conversations={conversations}
              currentConsultationId={currentConsultationId}
            />
          ))}
        </AnimatePresence>

      </div>
    </PageLayout>
  );
}
