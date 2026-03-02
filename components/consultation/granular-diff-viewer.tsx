import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Helper to normalize words for comparison
const normalizeWord = (word: string) => word.toLowerCase().trim().replace(/[.,!?;:()\[\]{}"'“”‘’]/g, '');

function DiffHighlighter({ children, originalSet }: { children: React.ReactNode, originalSet: Set<string> }) {
  if (children === undefined || children === null) return null;

  const processText = (text: string) => {
    if (!text) return text;
    // Split on spaces but keep them to preserve spacing intent
    const tokens = text.split(/(\s+)/);
    return tokens.map((token, i) => {
      if (!token) return null;
      // Whitespace tokens: render as-is inside a span to preserve visual spacing
      if (/^\s+$/.test(token)) {
        return <span key={i} style={{ whiteSpace: 'pre' }}>{token}</span>;
      }
      const cleanWord = normalizeWord(token);
      const isNew = cleanWord && !originalSet.has(cleanWord);
      return (
        <span
          key={i}
          className={isNew ? 'text-[#E0A7C2] font-semibold tracking-wide' : 'tracking-normal'}
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

export function GranularDiffViewer({ original, current }: { original?: string, current?: string }) {
  const safeOriginal = original || "";
  const safeCurrent = current || "";
  
  // Use a cleaner word set for comparison to avoid punctuation issues
  const originalWords = safeOriginal.split(/[\s,!?;:()\[\]{}"'“”‘’]+/).filter(Boolean);
  const originalSet = new Set(originalWords.map(normalizeWord).filter(Boolean));
  const hasEdit = safeOriginal && safeOriginal !== safeCurrent;

  return (
    <ReactMarkdown 
      components={{
        p: ({children}) => <p className="mb-2 last:mb-0 text-gray-200 leading-relaxed">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</p>,
        ul: ({children}) => <ul className="list-disc ml-5 mb-2 space-y-1 leading-relaxed">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</ul>,
        ol: ({children}) => <ol className="list-decimal ml-5 mb-2 space-y-1 leading-relaxed">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</ol>,
        li: ({children}) => <li className="text-gray-200 mb-0.5 last:mb-0 leading-relaxed">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</li>,
        h3: ({children}) => <h3 className="text-lg md:text-xl font-bold mb-2 mt-4 text-white tracking-wide">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</h3>,
        strong: ({children}) => <strong className="font-bold text-white">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</strong>,
        em: ({children}) => <em className="italic">{hasEdit ? <DiffHighlighter children={children} originalSet={originalSet} /> : children}</em>,
        a: ({node, children, ...props}) => (
          <a 
            {...props} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#E0A7C2] hover:text-[#F0B7D2] underline font-medium transition-colors"
          >
            {children}
          </a>
        ),
      }}
      remarkPlugins={[remarkGfm]}
    >
      {safeCurrent.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim()}
    </ReactMarkdown>
  );
}
