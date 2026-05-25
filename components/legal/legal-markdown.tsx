'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const proseComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-3xl font-serif text-[#e9c176] mb-6 mt-10 tracking-tight">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-2xl font-serif text-[#e9c176] mb-4 mt-8 tracking-tight">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-xl font-serif text-[#e9c176] mb-3 mt-6">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-gray-300 mb-4 leading-relaxed text-sm">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-300 text-sm">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-300 text-sm">{children}</ol>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-[#722f37] bg-[#722f37]/5 px-4 py-3 my-4 italic text-gray-300 text-sm">
      {children}
    </blockquote>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-white font-bold">{children}</strong>
  ),
};

export function LegalMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none prose-headings:text-[#e9c176] prose-headings:font-serif">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={proseComponents}>
        {content || '*No content available.*'}
      </ReactMarkdown>
    </div>
  );
}
