'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, Trash2, ChevronDown, ChevronUp, BookOpen, Gavel, ExternalLink, CheckCircle2, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Portal } from './portal';
import { useConversations } from './conversation-provider/conversation-context';
import type { Bookmark as BookmarkType } from '@/lib/bookmarks-service';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSource?: (itemId: string) => void;
}

function BookmarkCard({
  bookmark,
  onRemove,
  onOpen,
  conversations = [],
  currentConsultationId,
}: {
  bookmark: BookmarkType;
  onRemove: (id: string) => void;
  onOpen: (itemId: string) => void;
  conversations?: any[];
  currentConsultationId?: string | number | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [removing, setRemoving] = useState(false);
  const router = useRouter();

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRemoving(true);
    await onRemove(bookmark.id);
    setRemoving(false);
  };

  const isAIResponse = bookmark.reference === 'AI_RESPONSE';

  // Check if consultation exists for AI response bookmarks
  const getConsultationStatus = () => {
    if (!isAIResponse || !bookmark.url) return { exists: true, id: null };

    // Extract conversation ID from URL: /consultation/uuid
    const parts = bookmark.url.split('/');
    const id = parts[parts.length - 1];

    // Ensure id is a valid UUID-like string before checking
    const exists = conversations.some(c => c.id.toString() === id) || (currentConsultationId && currentConsultationId.toString() === id);
    return { exists, id };
  };

  const { exists: consultationExists, id: consultationId } = getConsultationStatus();

  const isLibraryDoc = !isAIResponse && /^\d+$/.test(bookmark.itemId);

  const handleOpenLink = () => {
    if (isAIResponse) {
      if (consultationExists && bookmark.url) {
        const targetUrl = `${bookmark.url}#message-${bookmark.itemId}`;
        if (typeof window !== 'undefined' && window.location.pathname === bookmark.url) {
          window.location.hash = `message-${bookmark.itemId}`;
        } else {
          router.push(targetUrl);
        }
        onOpen('__NAVIGATE__');
      }
      return;
    }

    if (isLibraryDoc) {
      router.push(`/legal-library/${bookmark.itemId}`);
      onOpen('__NAVIGATE__');
      return;
    }

    onOpen(bookmark.itemId);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group relative bg-black/40 border border-[#722f37]/20 rounded-xl overflow-hidden shadow-lg transition-all hover:bg-white/[0.02]"
    >
      {/* Header Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex flex-col gap-0.5">
            {bookmark.reference && bookmark.reference !== 'No Reference' ? (
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                {bookmark.reference}
              </span>
            ) : <div />}
            {isAIResponse && !consultationExists && (
              <span className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest flex items-center gap-1">
                Consultation Archive Deleted
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Bookmark size={16} className="text-[#722f37] fill-[#722f37]/40" />
            <button
              onClick={handleRemove}
              disabled={removing}
              className="p-1.5 hover:bg-white/5 rounded-md text-gray-600 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <h3
          onClick={handleOpenLink}
          className={`text-lg font-serif mb-3 tracking-tight transition-colors ${isAIResponse
            ? consultationExists
              ? "text-white cursor-pointer hover:text-[#e9c176]"
              : "text-gray-500 cursor-default"
            : "text-white cursor-pointer hover:text-[#e9c176]"
            }`}
        >
          {bookmark.title}
        </h3>

        {isLibraryDoc && (
          <div className="flex items-center gap-1.5 mb-3 -mt-1">
            <BookOpen size={11} className="text-[#722f37]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#722f37]">Legal Library</span>
          </div>
        )}

        {/* AI Summary Section */}
        <div className="flex gap-3 mb-3">
          <div className="mt-0.5 flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isAIResponse && !consultationExists ? 'bg-white/[0.02] border-white/5' : 'bg-[#722f37]/10 border border-[#722f37]/20'
              }`}>
              {isAIResponse ? (
                <MessageSquare size={14} className={consultationExists ? "text-gray-300" : "text-gray-600"} />
              ) : (
                <CheckCircle2 size={14} className="text-white" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isAIResponse && !consultationExists ? "text-gray-500" : "text-gray-400"
              }`}>
              {isAIResponse ? 'AI Response' : 'AI Summary'}
            </h4>
            <div className="relative">
              <p className={`text-[13px] leading-relaxed italic ${isAIResponse && !isExpanded ? 'line-clamp-4' : ''
                } ${isAIResponse && !consultationExists ? "text-gray-400" : "text-gray-400"}`}>
                {bookmark.aiSummary || (isAIResponse ? "No content." : "Bookmark saved. Click the title to view the full legal details and capture an AI summary.")}
              </p>

              {isAIResponse && bookmark.aiSummary && bookmark.aiSummary.length > 200 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors mt-2 ${consultationExists ? "text-gray-400 hover:text-white" : "text-[#722f37] hover:text-white"
                    }`}
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {isExpanded ? 'Collapse' : 'Expand Insight'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Doctrine & Facts (Accordion) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {bookmark.doctrine && (
                <div className="mb-3 pl-11">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Legal Doctrine</h4>
                  <p className="text-[13px] text-gray-400 leading-relaxed font-serif italic">
                    {bookmark.doctrine}
                  </p>
                </div>
              )}
              {bookmark.facts && (
                <div className="mb-3 pl-11">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Case Facts</h4>
                  <p className="text-[13px] text-gray-400 leading-relaxed">
                    {bookmark.facts}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expand Toggle */}
        {(bookmark.doctrine || bookmark.facts) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-600 hover:text-white transition-colors mt-2"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? 'Hide Details' : 'View Full Brief'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function BookmarksModal({ isOpen, onClose, onOpenSource }: BookmarksModalProps) {
  const { bookmarks, removeBookmark, refreshBookmarks, conversations, currentConsultationId, setIsSidebarOpen } = useConversations();

  useEffect(() => {
    if (isOpen) {
      refreshBookmarks();
    }
  }, [isOpen]);

  const handleOpen = (itemId: string) => {
    if (itemId === '__NAVIGATE__') {
      setIsSidebarOpen(false);
    } else if (itemId) {
      if (onOpenSource) {
        onOpenSource(itemId);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl"
            />

            {/* Modal panel */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed z-[101] inset-0 flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="relative w-full max-w-5xl bg-[#0B0B0C] border border-[#722f37]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto">
                {/* Header */}
                <div className="px-8 py-6 border-b border-[#722f37]/20 flex items-center justify-between flex-shrink-0">
                  <div className="flex flex-col">
                    <h2 className="text-3xl font-serif text-white tracking-tight">Bookmarks</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-1">Stored Insights & Bookmarks</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Bookmark list */}
                <div className="overflow-y-auto flex-1 p-6 space-y-5 custom-scrollbar">
                  <AnimatePresence mode="popLayout">
                    {bookmarks.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-24 text-center"
                      >
                        <div className="w-20 h-20 bg-[#722f37]/10 rounded-full flex items-center justify-center mb-6 border border-[#722f37]/20 shadow-inner">
                          <Bookmark size={40} className="text-[#722f37]" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-serif text-white mb-2">Bookmarks empty.</h3>
                        <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest max-w-sm">
                          Items you bookmark during research will be preserved here.
                        </p>
                      </motion.div>
                    ) : (
                      bookmarks.map((bm) => (
                        <BookmarkCard
                          key={bm.id}
                          bookmark={bm}
                          onRemove={removeBookmark}
                          onOpen={handleOpen}
                          conversations={conversations}
                          currentConsultationId={currentConsultationId}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer Gradient */}
                <div className="h-6 bg-gradient-to-t from-[#0B0B0C] to-transparent pointer-events-none" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
