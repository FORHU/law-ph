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

  // Sanitize: remove broken legacy images and background attributes from LawPhil content
  const sanitizedContent = content
    .replace(/<img[^>]*>/gi, '')
    .replace(/\sbackground="[^"]*"/gi, '')
    .replace(/\sbgcolor="[^"]*"/gi, '');

  return (
    <div 
      className={`prose prose-invert max-w-none 
        prose-headings:text-white prose-headings:font-bold
        prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
        prose-li:text-gray-300 
        prose-strong:text-white
        prose-a:text-[#e9c176] prose-a:no-underline hover:prose-a:underline font-bold
        ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}
