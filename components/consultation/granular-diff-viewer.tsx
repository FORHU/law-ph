import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

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
          className={isNew ? 'text-[#E0A7C2] font-semibold tracking-wide' : ''}
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
}: {
  original?: string;
  current?: string;
  onSourceLinkClick?: (itemId: string) => void;
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
        h3: ({children}) => <h3 className="text-lg md:text-xl font-bold mb-3 mt-5 text-white tracking-wide">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</h3>,
        strong: ({children}) => <strong className="font-bold text-white">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</strong>,
        em: ({children}) => <em className="italic">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</em>,
        a: ({node, children, href, ...props}) => {
          const match = href && SOURCE_PATH_REGEX.exec(href);
          const itemId = match?.[1];
          const isSourceLink = !!itemId && !!onSourceLinkClick;
          return (
            <a
              {...props}
              href={href}
              target={isSourceLink ? undefined : '_blank'}
              rel={isSourceLink ? undefined : 'noopener noreferrer'}
              className="text-[#E0A7C2] hover:text-[#F0B7D2] underline font-medium transition-colors cursor-pointer"
              onClick={isSourceLink ? (e: React.MouseEvent) => { e.preventDefault(); onSourceLinkClick(itemId); } : undefined}
            >
              {children}
            </a>
          );
        },
      }}
      remarkPlugins={[remarkGfm, remarkBreaks]}
    >
      {safeCurrent.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim()}
    </ReactMarkdown>
  );
}
