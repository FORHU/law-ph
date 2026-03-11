'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, Trash2, ChevronDown, ChevronUp, BookOpen, Gavel, ExternalLink, CheckCircle2 } from 'lucide-react';
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
}: {
  bookmark: BookmarkType;
  onRemove: (id: string) => void;
  onOpen: (itemId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRemoving(true);
    await onRemove(bookmark.id);
    setRemoving(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group relative bg-[#0A0C10] border border-white/10 rounded-xl overflow-hidden shadow-lg transition-all hover:bg-white/[0.02]"
    >
      {/* Header Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1.5">
          {bookmark.reference && bookmark.reference !== 'No Reference' ? (
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
              {bookmark.reference}
            </span>
          ) : <div />}
          <div className="flex items-center gap-2">
            <Bookmark size={16} className="text-[#8B4564] fill-[#8B4564]" />
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
          onClick={() => onOpen(bookmark.item_id)}
          className="text-[15px] font-bold text-white mb-3 cursor-pointer hover:text-[#E0A7C2] transition-colors leading-snug"
        >
          {bookmark.title}
        </h3>

        {/* AI Summary Section */}
        <div className="flex gap-3 mb-3">
          <div className="mt-0.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <CheckCircle2 size={14} className="text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-[12px] font-bold text-white mb-0.5">AI Summary</h4>
            <p className="text-[13px] text-gray-300 leading-relaxed font-medium">
              {bookmark.ai_summary || "Bookmark saved. Click the title to view the full legal details and capture an AI summary."}
            </p>
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
                <div className="mb-3 pl-10">
                  <h4 className="text-[12px] font-bold text-white mb-0.5">Doctrine</h4>
                  <p className="text-[13px] text-gray-400 leading-relaxed italic">
                    {bookmark.doctrine}
                  </p>
                </div>
              )}
              {bookmark.facts && (
                <div className="mb-3 pl-10">
                  <h4 className="text-[12px] font-bold text-white mb-0.5">Facts</h4>
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
            className="flex items-center gap-1.5 text-[12px] font-semibold text-white/50 hover:text-white transition-colors mt-2"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? 'See less' : 'See more'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function BookmarksModal({ isOpen, onClose, onOpenSource }: BookmarksModalProps) {
  const { bookmarks, removeBookmark, refreshBookmarks } = useConversations();

  useEffect(() => {
    if (isOpen) {
      refreshBookmarks();
    }
  }, [isOpen]);

  const handleOpen = (itemId: string) => {
    if (onOpenSource) {
      onOpenSource(itemId);
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
              className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md"
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
              <div className="relative w-full max-w-3xl bg-[#020508] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] pointer-events-auto">
                {/* Header */}
                <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Bookmarks</h2>
                  <button
                    onClick={onClose}
                    className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Bookmark list */}
                <div className="overflow-y-auto flex-1 p-6 space-y-4 scroll-smooth scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  <AnimatePresence mode="popLayout">
                    {bookmarks.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                      >
                        <div className="w-16 h-16 bg-[#8B4564]/10 rounded-full flex items-center justify-center mb-4">
                          <Bookmark size={32} className="text-[#8B4564]" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No bookmarks saved yet</h3>
                        <p className="text-sm text-gray-500 max-w-sm">
                          Items you bookmark while researching will be saved and appear here for quick access.
                        </p>
                      </motion.div>
                    ) : (
                      bookmarks.map((bm) => (
                        <BookmarkCard
                          key={bm.id}
                          bookmark={bm}
                          onRemove={removeBookmark}
                          onOpen={handleOpen}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer Gradient */}
                <div className="h-4 bg-gradient-to-t from-[#020508] to-transparent pointer-events-none" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
