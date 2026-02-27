import React from 'react';
import ReactMarkdown from 'react-markdown';

export function GranularDiffViewer({ original, current }: { original?: string, current: string }) {
  // If no original provided or texts match exactly, just render normally
  if (!original || original === current) {
    return (
      <ReactMarkdown 
        components={{
          p: ({children}) => <p className="mb-4 last:mb-0 text-gray-200">{children}</p>,
          ul: ({children}) => <ul className="list-disc ml-5 mb-4 space-y-2">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal ml-5 mb-4 space-y-2">{children}</ol>,
          li: ({children}) => <li className="text-gray-200">{children}</li>,
          h3: ({children}) => <h3 className="text-lg md:text-xl font-bold mb-3 mt-4 text-white">{children}</h3>,
          a: ({node, ...props}) => (
            <a 
              {...props} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#E0A7C2] hover:text-[#F0B7D2] underline font-medium transition-colors"
            />
          ),
        }}
      >
        {current.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").trim()}
      </ReactMarkdown>
    );
  }

  // Strip out punctuation for cleaner diffing but display the actual words
  const normalizeForDiff = (str: string) => str.replace(/[.,\/#!$%\^\&\*;:{}=\-_`~()]/g, "").toLowerCase();
  
  const originalSet = new Set(
    original.split(/\s+/)
      .map(normalizeForDiff)
      .filter(Boolean)
  );

  const processText = (text: string) => {
    // Split by words but KEEP the whitespace tokens in the array layout
    const tokens = text.split(/(\s+)/);
    
    return tokens.map((token, i) => {
      if (/^\s+$/.test(token)) return token; // Keep raw space/newlines
      
      const normalizedToken = normalizeForDiff(token);
      
      // It's a "new" word if it has semantic length and isn't in original text
      const isNew = normalizedToken.length > 0 && !originalSet.has(normalizedToken);
      
      return isNew ? <span key={`new-${i}-${token}`} className="text-[#E0A7C2] font-medium">{token}</span> : token;
    });
  };

  const processChildren = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, child => {
      if (typeof child === 'string') {
        return processText(child);
      }
      if (React.isValidElement(child)) {
        // Don't recurse into anchors — let them render their children as-is
        // to preserve href interactivity
        const type = child.type;
        if (type === 'a') return child;
        return React.cloneElement(child, {}, processChildren((child.props as any).children));
      }
      return child; 
    });
  };

  return (
    <ReactMarkdown 
        components={{
          p: ({children}) => <p className="mb-4 last:mb-0 text-gray-200 whitespace-pre-wrap">{processChildren(children)}</p>,
          ul: ({children}) => <ul className="list-disc ml-5 mb-4 space-y-2">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal ml-5 mb-4 space-y-2">{children}</ol>,
          li: ({children}) => <li className="text-gray-200">{processChildren(children)}</li>,
          h3: ({children}) => <h3 className="text-lg md:text-xl font-bold mb-3 mt-4 text-white">{processChildren(children)}</h3>,
          strong: ({children}) => <strong>{processChildren(children)}</strong>,
          em: ({children}) => <em>{processChildren(children)}</em>,
          a: ({node, href, children, ...props}: any) => (
            <a 
              href={href}
              {...props} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#E0A7C2] hover:text-[#F0B7D2] underline font-medium transition-colors cursor-pointer"
            >
              {children}
            </a>
          ),
        }}
      >
        {current.replace(/\[AUTH_URL\]\s*https?:\/\/[^\s]+/g, "").replace(/[\u00A0\u200B-\u200D\uFEFF]/g, ' ').trim()}
    </ReactMarkdown>
  );
}
