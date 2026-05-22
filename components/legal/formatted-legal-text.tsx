export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    // Remove standalone single-letter section markers (A. B. C. on their own line)
    .replace(/^[A-Z]\.\s*$/gm, '')
    // Remove single-letter prefix at start of paragraph (B. text or B.text → text)
    .replace(/^[A-Z]\.\s*(?=[A-Za-z])/gm, '')
    // Remove standalone SEC. N lines that are just markers
    .replace(/^SEC\.\s*\d+\.?\s*$/gm, '')
    // Remove dotted blank fields (............)
    .replace(/\.{3,}/g, '')
    // Remove excessive quotation marks
    .replace(/"{2,}/g, '')
    .replace(/^"(.+)"$/gm, '$1')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface AnnotationMark {
  text: string;
  color: string;
  note?: string;
}

function applyHighlights(block: string, annotations: AnnotationMark[]): React.ReactNode {
  if (!annotations.length) return block;

  // Build a list of all matches with their positions
  type Segment = { start: number; end: number; annotation: AnnotationMark };
  const segments: Segment[] = [];

  for (const ann of annotations) {
    const needle = ann.text;
    let idx = block.indexOf(needle);
    while (idx !== -1) {
      segments.push({ start: idx, end: idx + needle.length, annotation: ann });
      idx = block.indexOf(needle, idx + needle.length);
    }
  }

  if (!segments.length) return block;

  // Sort by start, remove overlaps
  segments.sort((a, b) => a.start - b.start);
  const merged: Segment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && seg.start < last.end) continue; // skip overlap
    merged.push(seg);
  }

  // Build React nodes
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const seg of merged) {
    if (cursor < seg.start) nodes.push(block.slice(cursor, seg.start));
    nodes.push(
      <mark
        key={seg.start}
        title={seg.annotation.note || undefined}
        style={{
          backgroundColor: seg.annotation.color + '40',
          borderBottom: `2px solid ${seg.annotation.color}`,
          color: 'inherit',
          borderRadius: '2px',
          padding: '0 1px',
          cursor: seg.annotation.note ? 'help' : 'default',
        }}
      >
        {block.slice(seg.start, seg.end)}
      </mark>
    );
    cursor = seg.end;
  }
  if (cursor < block.length) nodes.push(block.slice(cursor));
  return <>{nodes}</>;
}

import React from 'react';

export function FormattedLegalText({ text, annotations = [] }: { text: string; annotations?: AnnotationMark[] }) {
  const rawBlocks = cleanText(text)
    .split(/\n{2,}/)
    .flatMap(block => {
      const trimmed = block.trim();
      if (!trimmed) return [];
      if (!trimmed.includes('\n') && trimmed.length > 300) {
        return trimmed
          .split(/(?<=[.?!])\s+(?=[A-Z"(])/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
      return [trimmed];
    });

  // Merge surname onto name ending with middle initial
  const blocks: string[] = [];
  for (let i = 0; i < rawBlocks.length; i++) {
    const current = rawBlocks[i];
    const next = rawBlocks[i + 1];
    if (next && /\b[A-Z]\.\s*$/.test(current)) {
      const surnameMatch = next.match(/^([A-Z]{2,})\b/);
      if (surnameMatch) {
        const surname = surnameMatch[1];
        const remainder = next.slice(surname.length).trim();
        blocks.push(current + ' ' + surname);
        if (remainder) blocks.push(remainder);
        i++;
        continue;
      }
    }
    blocks.push(current);
  }

  return (
    <>
      {blocks.map((block, i) => {
        const wordCount = block.trim().split(/\s+/).length;
        const isAllCaps = block === block.toUpperCase()
          && block.length >= 6
          && block.length < 120
          && wordCount >= 3
          && /[A-Z]/.test(block)
          && !/\b[A-Z]\.\s*$/.test(block);
        const isSectionHeader = /^(section|article|whereas|now therefore|be it enacted|republic act|resolved|ordered)\b/i.test(block);
        const content = applyHighlights(block, annotations);

        if (isAllCaps) {
          return (
            <h3 key={i} className="text-[#e9c176] font-bold text-sm uppercase tracking-widest pt-4 pb-1 border-b border-white/5">
              {content}
            </h3>
          );
        }
        if (isSectionHeader) {
          return (
            <p key={i} className="text-white font-semibold text-sm leading-relaxed">
              {content}
            </p>
          );
        }
        return (
          <p key={i} className="text-gray-400 text-sm leading-relaxed">
            {content}
          </p>
        );
      })}
    </>
  );
}
