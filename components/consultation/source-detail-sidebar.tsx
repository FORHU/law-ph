'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Loader2, BookOpen, Gavel } from 'lucide-react';
import { LegalSource, RelatedCase } from '@/lib/citation-parser';
import { fetchSourceContent, fetchCaseContent, LegalContentDetail } from '@/lib/legal-content-fetcher';
import { COLORS } from '@/lib/constants';
import ReactMarkdown from 'react-markdown';

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
        detail = await fetchCaseContent(caseItem, context);
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

          {/* Sidebar */}
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
                    {content?.reference || 'Loading...'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
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
                    <p className="text-sm text-gray-400">{content.reference}</p>
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
