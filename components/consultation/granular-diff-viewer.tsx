import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { LegalSource } from '@/lib/citation-parser';

// Helper to normalize words for comparison
const normalizeWord = (word: string) => word.toLowerCase().replace(/[*_~`#\[\]()]/g, '').trim();

function DiffHighlighter({ children, originalSet }: { children: React.ReactNode, originalSet: Set<string> }) {
  if (children === undefined || children === null) return null;

  const processText = (text: string) => {
    if (!text) return text;
    // Split on spaces but keep them to preserve spacing intent
    const tokens = text.split(/(\s+)/);
    return tokens.map((token, i) => {
      if (!token) return null;
      // Whitespace tokens: render as-is
      if (/^\s+$/.test(token)) {
        return <span key={i}>{token}</span>;
      }
      const cleanWord = normalizeWord(token);
      const isNew = cleanWord && !originalSet.has(cleanWord);
      return (
        <span
          key={i}
          className={isNew ? 'text-white font-bold tracking-wide underline decoration-[#e9c176]/30 decoration-2 underline-offset-4' : ''}
        >
          {token}
        </span>
      );
    });
  };

  return (
    <>
      {React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return processText(child);
        }
        if (React.isValidElement(child)) {
          const element = child as React.ReactElement<any>;
          // We only process children that are strings or have string children
          if (typeof element.props.children === 'string') {
            return React.cloneElement(element, {
              children: processText(element.props.children)
            } as any);
          }
          return child;
        }
        return child;
      })}
    </>
  );
}

const SOURCE_PATH_REGEX = /\/sources\/([^/?#]+)/;

export function GranularDiffViewer({
  original,
  current,
  onSourceLinkClick,
  onSourceClick,
}: {
  original?: string;
  current?: string;
  onSourceLinkClick?: (itemId: string, title?: string) => void;
  onSourceClick?: (source: LegalSource, context?: string) => void;
}) {
  const safeOriginal = original || "";
  const safeCurrent = current || "";
  
  // Use the same tokenization for both original set and current text processing
  // This ensures that words like "else's" match correctly
  const originalWords = safeOriginal.split(/(\s+)/).filter(Boolean);
  const originalSet = new Set(originalWords.map(normalizeWord).filter(Boolean));
  const hasEdit = safeOriginal && safeOriginal !== safeCurrent;

  return (
    <ReactMarkdown 
      components={{
        p: ({children}) => <p className="mb-3 last:mb-0 text-gray-200 leading-relaxed font-normal">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</p>,
        ul: ({children}) => <ul className="list-disc ml-5 mb-2.5 space-y-1 leading-relaxed">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</ul>,
        ol: ({children}) => <ol className="list-decimal ml-5 mb-2.5 space-y-1 leading-relaxed">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</ol>,
        li: ({children}) => <li className="text-gray-200 mb-1 last:mb-0 leading-relaxed">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</li>,
        h1: ({children}) => <h1 className="text-3xl md:text-4xl font-serif font-bold mb-6 mt-8 text-white tracking-tight border-b border-white/5 pb-2">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</h1>,
        h2: ({children}) => <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4 mt-7 text-white tracking-tight">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</h2>,
        h3: ({children}) => <h3 className="text-xl md:text-2xl font-serif font-bold mb-3 mt-6 text-white tracking-wide">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</h3>,
        blockquote: ({children}) => (
          <blockquote className="border-l-4 border-[#722f37] bg-[#722f37]/5 px-6 py-4 my-6 italic text-gray-300 font-serif leading-relaxed rounded-r-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-[#722f37]/10 to-transparent pointer-events-none" />
            {hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}
          </blockquote>
        ),
        strong: ({children}) => <strong className="font-bold text-white">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</strong>,
        em: ({children}) => <em className="italic">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</em>,
        a: ({node, children, href, ...props}) => {
          const match = href && SOURCE_PATH_REGEX.exec(href);
          const itemId = match?.[1];
          const linkText = Array.isArray(children) ? children.join('') : String(children || '');

          const handleClick = (e: React.MouseEvent) => {
            e.preventDefault();
            if (itemId && onSourceLinkClick) {
              onSourceLinkClick(itemId, linkText);
            } else if (linkText && onSourceClick) {
              onSourceClick({ reference: linkText, description: linkText, type: 'article' as const });
            }
          };

          return (
            <a
              {...props}
              href={href}
              className="text-white hover:text-[#e9c176] underline decoration-white/20 hover:decoration-[#e9c176]/50 font-bold transition-all cursor-pointer"
              onClick={handleClick}
            >
              {children}
            </a>
          );
        },
      }}
      remarkPlugins={[remarkGfm, remarkBreaks]}
    >
      {/* ReactMarkdown can sometimes swallow text that looks like HTML tags. */}
      {/* We escape < and > to prevent this. */}
      {safeCurrent
        .replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .trim()}
    </ReactMarkdown>
  );
}
