'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, FileText, Sparkles, CheckSquare, ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-provider';

type ModalType = 'terms' | 'privacy' | 'ethical-ai' | 'compliance';

interface LegalModalProps {
  type: ModalType;
  onClose: () => void;
  onRead?: (type: ModalType) => void;
}

interface LegalBlock {
  kind: string;
  text: string;
  items: readonly string[];
  emphasis: boolean;
}

interface LegalSection {
  title: string;
  blocks: readonly LegalBlock[];
}

interface LegalDoc {
  intro: string;
  sections: readonly LegalSection[];
}

const DOC_KEY: Record<ModalType, 'terms' | 'privacy' | 'ethicalAi' | 'compliance'> = {
  'terms': 'terms',
  'privacy': 'privacy',
  'ethical-ai': 'ethicalAi',
  'compliance': 'compliance',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <ChevronRight size={14} className="text-[#e9c176] flex-shrink-0" />
        <h3 className="text-white font-bold text-sm uppercase tracking-widest">{title}</h3>
      </div>
      <div className="pl-5 text-gray-400 text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function DocContent({ doc }: { doc: LegalDoc }) {
  return (
    <div>
      <p className="text-gray-400 text-sm leading-relaxed mb-8">{doc.intro}</p>
      {doc.sections.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.blocks.map((block, i) =>
            block.kind === 'list' ? (
              <ul key={i} className="list-disc list-inside space-y-1 mt-2">
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={i} className={block.emphasis ? 'text-[#e9c176]/80 font-medium' : undefined}>
                {block.text}
              </p>
            )
          )}
        </Section>
      ))}
    </div>
  );
}

export function LegalModal({ type, onClose, onRead }: LegalModalProps) {
  const { t, dict } = useTranslation();
  const meta = {
    title: dict.legal.modalTitles[DOC_KEY[type]],
    icon:
      type === 'terms' ? <FileText size={16} className="text-[#e9c176]" /> :
      type === 'privacy' ? <Shield size={16} className="text-[#e9c176]" /> :
      type === 'ethical-ai' ? <Sparkles size={16} className="text-[#e9c176]" /> :
      <CheckSquare size={16} className="text-[#e9c176]" />,
  };
  const doc: LegalDoc = dict.legal[DOC_KEY[type]];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || hasScrolledToBottom) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) {
      setHasScrolledToBottom(true);
      onRead?.(type);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#0d0d0e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] bg-[#111111] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#722f37]/20 border border-[#722f37]/30 flex items-center justify-center">
                {meta.icon}
              </div>
              <div>
                <h2 className="text-white font-serif text-lg tracking-tight">
                  {meta.title}
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-0.5">
                  {t('legal.common.lastUpdatedLabel')} {t('legal.common.lastUpdatedDate')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable body */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-6 py-6 custom-sidebar-scrollbar"
          >
            <DocContent doc={doc} />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.08] bg-[#111111] flex-shrink-0 flex items-center justify-between gap-4">
            {hasScrolledToBottom ? (
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                ✓ {meta.title} {t('legal.common.readSuffix')}
              </p>
            ) : (
              <p className="text-[10px] text-gray-500 leading-tight flex items-center gap-1.5">
                <ChevronDown size={12} className="animate-bounce text-[#e9c176]" />
                {t('legal.common.scrollToAcknowledge')}
              </p>
            )}
            <button
              onClick={onClose}
              disabled={!hasScrolledToBottom}
              className="flex-shrink-0 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed bg-[#722f37] hover:bg-[#8b3a44] disabled:hover:bg-[#722f37] text-white"
            >
              {t('legal.common.iHaveReadThis')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
