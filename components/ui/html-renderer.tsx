import React from 'react';

interface HtmlRendererProps {
  content: string;
  className?: string;
}

/**
 * A reusable component for rendering raw HTML content safely.
 * Applies Tailwind typography (prose) classes for nice formatting.
 */
export function HtmlRenderer({ content, className = '' }: HtmlRendererProps) {
  if (!content) return null;

  return (
    <div 
      className={`prose prose-invert max-w-none 
        prose-headings:text-white prose-headings:font-bold
        prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
        prose-li:text-gray-300 
        prose-strong:text-white
        prose-a:text-[#E0A7C2] prose-a:no-underline hover:prose-a:underline
        ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
