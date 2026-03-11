'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Loader2, BookOpen, Gavel, Bookmark } from 'lucide-react';
import { LegalSource, RelatedCase, isGenericTitle, extractTitleFromContent, cleanLegalTitle } from '@/lib/citation-parser';
import { fetchSourceContent, fetchCaseContent, LegalContentDetail } from '@/lib/legal-content-fetcher';
import { COLORS } from '@/lib/constants';
import ReactMarkdown from 'react-markdown';
import { HtmlRenderer } from '@/components/ui/html-renderer';
import { useConversations } from '@/components/conversation-provider/conversation-context';

interface SourceDetailSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  source?: LegalSource;
  caseItem?: RelatedCase;
  context?: string;
}

export function SourceDetailSidebar({ isOpen, onClose, source, caseItem, context }: SourceDetailSidebarProps) {
  const [content, setContent] = useState<LegalContentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { addBookmark, removeBookmark, isBookmarked } = useConversations();
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // Derive a stable item_id from the source/case reference
  // Derive a stable item_id from the source/case reference
  const itemId = source?.reference || caseItem?.caseNumber || caseItem?.itemId || content?.reference || content?.title || '';

  const bookmarkId = itemId ? isBookmarked(itemId) : null;
  const bookmarked = !!bookmarkId;

  // Debug icon visibility
  useEffect(() => {
    if (isOpen && (source || caseItem)) {
      console.log("[SourceDetailSidebar] Bookmark check:", { itemId, bookmarked, bookmarkId, isLocal: (caseItem as any)?.isLocalCase });
    }
  }, [isOpen, itemId, bookmarked, bookmarkId, caseItem]);

  useEffect(() => {
    if (isOpen && (source || caseItem)) {
      loadContent();
    }
  }, [isOpen, source, caseItem]);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      let detail: LegalContentDetail;
      if (source) {
        detail = await fetchSourceContent(source, context);
      } else if (caseItem) {
        if ((caseItem as any).isLocalCase) {
          detail = {
            title: caseItem.title,
            reference: '',
            fullText: caseItem.description,
          };
        } else {
          detail = await fetchCaseContent(caseItem, context);
        }
      } else {
        return;
      }
      setContent(detail);
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractSection = (text: string, title: string): string => {
    const regex = new RegExp(`(?:##|###)?\\s*${title}[^\\n]*\\n([\\s\\S]*?)(?=\\n(?:##|###)|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  const handleBookmarkToggle = async () => {
    if (!itemId || bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      if (bookmarked && bookmarkId) {
        await removeBookmark(bookmarkId);
      } else {
        const fullText = content?.fullText || '';
        
        // Improved extraction with fallbacks
        const aiSummary = 
          extractSection(fullText, 'Case Summary') || 
          extractSection(fullText, 'AI Summary') || 
          extractSection(fullText, 'Full Text').substring(0, 200) ||
          fullText.replace(/[#*]/g, '').substring(0, 200).trim() + '...';

        const doctrine = 
          extractSection(fullText, 'Doctrine Established') || 
          extractSection(fullText, 'Doctrine') ||
          extractSection(fullText, 'Key Provisions') ||
          extractSection(fullText, 'Elements of the Offense') || '';

        const facts = 
          extractSection(fullText, 'Facts of the Case') || 
          extractSection(fullText, 'Facts') ||
          extractSection(fullText, 'Background') || '';

        // Better reference extraction if missing
        let derivedReference = content?.reference || source?.reference || caseItem?.caseNumber || '';
        
        if (!derivedReference || derivedReference === 'No Reference') {
          // Try to extract G.R. No. or RA No. from title or content
          const textToSearch = (content?.title || '') + ' ' + (content?.fullText || '');
          const grMatch = textToSearch.match(/G\.R\.\s*No\.\s*[\w-]+/i);
          const raMatch = textToSearch.match(/R\.A\.\s*No\.\s*\d+/i);
          const phMatch = textToSearch.match(/\d+\s+Phil\.\s+\d+/i);
          
          derivedReference = grMatch?.[0] || raMatch?.[0] || phMatch?.[0] || '';
        }

        // Improved title extraction
        const rawTitle = content?.title || source?.reference || caseItem?.title || itemId;
        const finalTitle = extractTitleFromContent(fullText, rawTitle);

        await addBookmark({
          item_id: itemId,
          title: finalTitle,
          reference: derivedReference,
          type: caseItem ? 'case' : 'source',
          url: content?.url || null,
          ai_summary: aiSummary,
          doctrine: doctrine,
          facts: facts
        });
      }
    } finally {
      setBookmarkLoading(false);
    }
  };

  const isCase = !!caseItem;
  const icon = isCase ? <Gavel size={20} /> : <BookOpen size={20} />;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sidebar - slides in from the right (uniform with Related Cases) */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full md:w-[600px] lg:w-[700px] bg-[#1a1a1a] border-l border-white/10 z-50 overflow-hidden flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#252525]">
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${COLORS.PRIMARY}20` }}
                >
                  {icon}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {isCase ? 'Case Details' : 'Legal Source'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {(() => {
                      const rawTitle = content?.title || caseItem?.title || '';
                      const rawRef = content?.reference || source?.reference || caseItem?.caseNumber || '';
                      
                      const cleanedTitle = cleanLegalTitle(rawTitle);
                      const cleanedRef = cleanLegalTitle(rawRef);
                      
                      // 1. If title is a G.R./RA/AO No., it's the best "reference title"
                      if (cleanedTitle.match(/(?:G\.R\.|R\.A\.|Republic\s+Act|A\.O\.|Administrative\s+Order|P\.D\.|Presidential\s+Decree|B\.P\.|Batas\s+Pambansa)\s*(?:No\.|Blg\.)?\s*[\w-]+/i)) {
                        return cleanedTitle;
                      }
                      
                      // 2. Short references are perfect for the subtitle
                      if (cleanedRef && cleanedRef.length <= 30 && !isGenericTitle(cleanedRef)) {
                        return cleanedRef;
                      }
                      
                      // 3. Fallback to cleaned title if not generic
                      if (cleanedTitle && !isGenericTitle(cleanedTitle)) {
                        return cleanedTitle;
                      }
                      
                      return cleanedRef || (isLoading ? 'Loading document...' : '');
                    })()}
                  </p>
                </div>
              </div>

              {/* Right-side action buttons (like anycase.ai) */}
              <div className="flex items-center gap-1">
                {/* Show bookmark icon if we have any way to identify the item */}
                {(itemId || source || caseItem) && !((caseItem as any)?.isLocalCase) && (
                  <button
                    onClick={handleBookmarkToggle}
                    disabled={bookmarkLoading}
                    title={bookmarked ? 'Remove bookmark' : 'Bookmark this'}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
                  >
                    <Bookmark
                      size={20}
                      className={`transition-all duration-200 ${
                        bookmarked
                          ? 'text-[#8B4564] fill-[#8B4564] scale-110'
                          : 'text-gray-400 hover:text-[#8B4564]'
                      }`}
                    />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>


            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="animate-spin text-[#E0A7C2]" size={32} />
                </div>
              ) : content ? (
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                      {content.title}
                    </h1>
                    {content.reference && content.reference.length > 20 && isCase ? null : (
                      <p className="text-sm text-gray-400">{content.reference}</p>
                    )}
                  </div>

                  {/* Relevant Section Highlight */}
                  {content.relevantSection && (
                    <div 
                      className="p-4 rounded-lg border-l-4"
                      style={{ 
                        backgroundColor: `${COLORS.PRIMARY}10`,
                        borderColor: COLORS.PRIMARY
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-[#E0A7C2]">
                          RELEVANT SECTION
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {content.relevantSection}
                      </p>
                    </div>
                  )}

                  {/* Full Text */}
                  <div className="prose prose-invert max-w-none">
                    {content.isHtml ? (
                      <HtmlRenderer content={content.fullText} />
                    ) : (
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
                        {content.fullText}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* External Link */}
                  {content.url && (
                    <div className="pt-4 border-t border-white/10">
                      <a
                        href={content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: `${COLORS.PRIMARY}20`,
                          color: COLORS.PRIMARY_LIGHT
                        }}
                      >
                        <ExternalLink size={16} />
                        View Official Source
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No content available
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
