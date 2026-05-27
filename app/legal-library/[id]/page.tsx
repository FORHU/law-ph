'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ExternalLink, Loader2, Gavel, Scale, Building2, BookOpen,
  FileText, Copy, Check, Printer, StickyNote, Trash2, PenLine, X,
  Bookmark, BookmarkCheck, Search, ChevronUp, ChevronDown,
} from 'lucide-react';
import { FormattedLegalText, cleanText } from '@/components/legal/formatted-legal-text';
import { LegalMarkdown } from '@/components/legal/legal-markdown';

interface Annotation {
  id: string;
  text: string;
  note: string;
  color: string;
  createdAt: string;
}

interface RagDocument {
  id: number;
  title: string | null;
  case_no: string | null;
  category: string;
  subcategory: string | null;
  year: number | null;
  source_url: string | null;
  concise_summary: string | null;
  full_text: string | null;
  formatted_markdown: string | null;
  summary: string | null;
}

interface RelatedDoc {
  id: number;
  title: string | null;
  case_no: string | null;
  category: string;
  subcategory: string | null;
  year: number | null;
  similarity: number;
}

const CATEGORY_ICONS: Record<string, any> = {
  law: Scale,
  jurisprudence: Gavel,
  issuance: Building2,
};

export default function LegalLibraryDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  // Core doc state
  const [doc, setDoc] = useState<RagDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Actions
  const [copied, setCopied] = useState(false);

  // Bookmark
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // In-document search
  const [findQuery, setFindQuery] = useState('');
  const [showFind, setShowFind] = useState(false);
  const [findIndex, setFindIndex] = useState(0);
  const findMatches = useRef<HTMLElement[]>([]);
  const findInputRef = useRef<HTMLInputElement>(null);
  const fullTextRef = useRef<HTMLDivElement>(null);

  // Annotations
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingHighlight, setPendingHighlight] = useState<{ text: string; note: string; color: string } | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const HIGHLIGHT_COLORS = ['#e9c176', '#722f37', '#4a9eff', '#4ade80'];

  // Related docs
  const [related, setRelated] = useState<RelatedDoc[]>([]);

  // ── Load document ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/rag/documents/${id}?fullText=true`)
      .then(res => { if (!res.ok) { setError('Document not found'); return null; } return res.json(); })
      .then(data => { if (data) setDoc(data.document); })
      .catch(() => setError('Failed to load document'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Load related docs ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    fetch(`/api/rag/related/${id}`)
      .then(r => r.json())
      .then(d => setRelated(d.related ?? []))
      .catch(() => {});
  }, [id]);

  // ── Load bookmark status ───────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/bookmarks')
      .then(r => r.json())
      .then(d => {
        const match = (d.bookmarks ?? []).find((b: any) => b.itemId === String(id));
        if (match) { setBookmarked(true); setBookmarkId(match.id); }
      })
      .catch(() => {});
  }, [id]);

  // ── Load annotations ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    try {
      const stored = localStorage.getItem(`annotations_${id}`);
      if (stored) setAnnotations(JSON.parse(stored));
    } catch {}
  }, [id]);

  const saveAnnotations = (updated: Annotation[]) => {
    setAnnotations(updated);
    localStorage.setItem(`annotations_${id}`, JSON.stringify(updated));
  };

  // ── Keyboard shortcut: Ctrl+F ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && (doc?.formatted_markdown || doc?.full_text)) {
        e.preventDefault();
        setShowFind(v => !v);
        setTimeout(() => findInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setShowFind(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doc]);

  // ── Find in page ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fullTextRef.current) return;
    // Clear previous marks
    fullTextRef.current.querySelectorAll('mark.find-mark').forEach(m => {
      const parent = m.parentNode;
      if (parent) { parent.replaceChild(document.createTextNode(m.textContent || ''), m); parent.normalize(); }
    });
    findMatches.current = [];
    if (!findQuery.trim() || findQuery.length < 2) return;

    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const idx = text.toLowerCase().indexOf(findQuery.toLowerCase());
        if (idx === -1) return;
        const before = document.createTextNode(text.slice(0, idx));
        const mark = document.createElement('mark');
        mark.className = 'find-mark';
        mark.textContent = text.slice(idx, idx + findQuery.length);
        mark.style.cssText = 'background:#e9c176;color:#000;border-radius:2px;padding:0 1px;';
        const after = document.createTextNode(text.slice(idx + findQuery.length));
        node.parentNode?.insertBefore(before, node);
        node.parentNode?.insertBefore(mark, node);
        node.parentNode?.insertBefore(after, node);
        node.parentNode?.removeChild(node);
        findMatches.current.push(mark);
      } else {
        Array.from(node.childNodes).forEach(walk);
      }
    };
    walk(fullTextRef.current);
    setFindIndex(0);
    if (findMatches.current[0]) findMatches.current[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [findQuery]);

  const navigateFind = (dir: 1 | -1) => {
    const total = findMatches.current.length;
    if (!total) return;
    findMatches.current[findIndex]?.style.setProperty('background', '#e9c176');
    const next = (findIndex + dir + total) % total;
    setFindIndex(next);
    const el = findMatches.current[next];
    el?.style.setProperty('background', '#f97316');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ── Annotations ────────────────────────────────────────────────────────────
  const handleTextSelect = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length < 5) return;
    setPendingHighlight({ text, note: '', color: HIGHLIGHT_COLORS[0] });
    setTimeout(() => noteInputRef.current?.focus(), 50);
  };

  const saveAnnotation = () => {
    if (!pendingHighlight) return;
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      text: pendingHighlight.text,
      note: pendingHighlight.note,
      color: pendingHighlight.color,
      createdAt: new Date().toISOString(),
    };
    saveAnnotations([...annotations, newAnnotation]);
    setPendingHighlight(null);
    window.getSelection()?.removeAllRanges();
  };

  const deleteAnnotation = (annotationId: string) =>
    saveAnnotations(annotations.filter(a => a.id !== annotationId));

  // ── Bookmark ───────────────────────────────────────────────────────────────
  const handleBookmark = async () => {
    if (bookmarkLoading || !doc) return;
    setBookmarkLoading(true);
    try {
      if (bookmarked && bookmarkId) {
        await fetch(`/api/bookmarks/${bookmarkId}`, { method: 'DELETE' });
        setBookmarked(false);
        setBookmarkId(null);
      } else {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: String(id),
            title: resolvedTitle,
            type: doc.category === 'jurisprudence' ? 'case' : 'source',
            reference: doc.case_no || undefined,
            url: doc.source_url || undefined,
            aiSummary: doc.concise_summary || undefined,
          }),
        });
        const data = await res.json();
        setBookmarked(true);
        setBookmarkId(data.bookmark?.id ?? null);
      }
    } catch {}
    setBookmarkLoading(false);
  };

  // ── Copy ───────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!doc) return;
    const text = [resolvedTitle, doc.case_no, doc.year, '', doc.concise_summary ? `SUMMARY\n${doc.concise_summary}` : '', '', doc.full_text ?? ''].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  // ── Print with annotations ─────────────────────────────────────────────────
  const handlePrint = () => {
    const title = resolvedTitle;
    const annotationStyles = annotations.map(a =>
      `.ann-${a.id}{background:${a.color}40;border-bottom:2px solid ${a.color};border-radius:2px;padding:0 1px;}`
    ).join('');

    const applyAnnotations = (text: string) => {
      let result = text;
      annotations.forEach(a => {
        const escaped = a.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escaped, 'g'),
          `<span class="ann-${a.id}" title="${a.note || ''}">${a.text}</span>`);
      });
      return result;
    };

    const annotationsList = annotations.length > 0 ? `
      <div style="border:1px solid #ddd;border-radius:6px;padding:14px 16px;margin-bottom:24px;page-break-inside:avoid;">
        <div style="font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.15em;color:#888;margin-bottom:10px;">Annotations (${annotations.length})</div>
        ${annotations.map(a => `
          <div style="display:flex;gap:10px;margin-bottom:8px;padding:8px;border:1px solid #eee;border-radius:4px;">
            <div style="width:3px;background:${a.color};border-radius:2px;flex-shrink:0;"></div>
            <div>
              <div style="font-size:9pt;color:#555;font-style:italic;">"${a.text}"</div>
              ${a.note ? `<div style="font-size:9pt;color:#222;margin-top:4px;">${a.note}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>` : '';

    const fullTextHtml = doc?.full_text ? doc.full_text.split(/\n{2,}/).filter(Boolean).map(block => {
      const trimmed = applyAnnotations(block.trim());
      const isAllCaps = block.trim() === block.trim().toUpperCase() && block.trim().length >= 6 && block.trim().length < 120 && block.trim().split(/\s+/).length >= 3;
      const isHeader = /^(section|article|whereas|now therefore|be it enacted|republic act|resolved|ordered)\b/i.test(block.trim());
      if (isAllCaps) return `<h3>${trimmed}</h3>`;
      if (isHeader) return `<p><strong>${trimmed}</strong></p>`;
      return `<p>${trimmed}</p>`;
    }).join('') : '';

    const content = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
      <style>
        @page{margin:2cm;size:A4;}
        *{box-sizing:border-box;} body{font-family:'Georgia',serif;color:#111;background:white;margin:0;padding:0;font-size:11pt;line-height:1.6;}
        .badges{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
        .badge{border:1px solid #ccc;border-radius:4px;padding:2px 8px;font-size:8pt;text-transform:uppercase;letter-spacing:0.1em;color:#555;}
        h1{font-size:20pt;margin:0 0 24px 0;line-height:1.3;color:#111;}
        .summary-box{border:1px solid #ddd;border-radius:6px;padding:14px 16px;margin-bottom:24px;background:#fafafa;}
        .summary-box .label{font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.15em;color:#888;margin-bottom:6px;}
        .summary-box p{margin:0;font-size:10pt;color:#333;}
        hr{border:none;border-top:1px solid #ddd;margin:24px 0;}
        .ft-label{font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.15em;color:#888;margin-bottom:16px;}
        p{margin:0 0 10px 0;color:#222;}
        h3{font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.12em;color:#444;border-bottom:1px solid #eee;padding-bottom:4px;margin:16px 0 8px 0;}
        mark,.find-mark{background:#e9c17640;border-bottom:2px solid #e9c176;border-radius:2px;padding:0 1px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        ${annotationStyles}
        span[class^="ann-"]{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      </style></head><body>
      <div class="badges">
        ${doc?.category ? `<span class="badge">${doc.category}</span>` : ''}
        ${doc?.subcategory ? `<span class="badge">${doc.subcategory.replace(/_/g, ' ')}</span>` : ''}
        ${doc?.case_no ? `<span class="badge">${doc.case_no}</span>` : ''}
        ${doc?.year ? `<span class="badge">${doc.year}</span>` : ''}
      </div>
      <h1>${title}</h1>
      ${doc?.concise_summary ? `<div class="summary-box"><div class="label">Summary</div><p>${doc.concise_summary}</p></div>` : ''}
      ${annotationsList}
      ${doc?.full_text ? `<hr/><div class="ft-label">Full Text</div>${fullTextHtml}` : ''}
    </body></html>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(content);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  // ── Title helpers ──────────────────────────────────────────────────────────
  const extractTitleFromText = (text: string): string | null => {
    const lines = text.split('\n').map(l => l.replace(/^\[.*?\]\s*/g, '').replace(/#{1,6}\s*/g, '').trim());
    const candidate = lines.find(l => l.length > 5 && l.length <= 120 && /[a-zA-Z]/.test(l));
    return candidate ? candidate.replace(/\s+/g, ' ').trim() : null;
  };
  const stripDates = (t: string) => t
    .replace(/,?\s*\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}\b/gi, '')
    .replace(/,?\s*\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi, '')
    .replace(/\s+/g, ' ').trim();

  const resolvedTitle = stripDates(doc?.title || doc?.case_no || (doc?.full_text ? extractTitleFromText(doc.full_text) : null) || 'Untitled Document');
  const CategoryIcon = doc ? (CATEGORY_ICONS[doc.category] || FileText) : FileText;

  return (
    <div className="min-h-screen text-gray-100">

      {/* Top bar */}
      <div className="sticky top-0 z-10 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 backdrop-blur-md bg-black/20 print:hidden">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-white transition-all uppercase tracking-[0.2em]">
          <ArrowLeft size={14} /> Back to Legal Library
        </button>
      </div>

      {/* Find in page bar */}
      {showFind && (
        <div className="sticky top-[53px] z-20 px-4 sm:px-6 py-3 bg-[#0B0B0C]/95 border-b border-white/5 backdrop-blur-md flex items-center gap-3 print:hidden">
          <Search size={14} className="text-gray-500 flex-shrink-0" />
          <input
            ref={findInputRef}
            value={findQuery}
            onChange={e => setFindQuery(e.target.value)}
            placeholder="Find in document..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600"
          />
          <span className="text-[11px] text-gray-600 flex-shrink-0">
            {findMatches.current.length > 0 ? `${findIndex + 1} / ${findMatches.current.length}` : findQuery ? '0 results' : ''}
          </span>
          <button onClick={() => navigateFind(-1)} disabled={!findMatches.current.length} className="p-1 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"><ChevronUp size={14} /></button>
          <button onClick={() => navigateFind(1)} disabled={!findMatches.current.length} className="p-1 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"><ChevronDown size={14} /></button>
          <button onClick={() => { setShowFind(false); setFindQuery(''); }} className="p-1 text-gray-500 hover:text-white transition-colors"><X size={14} /></button>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-16 h-16 rounded-2xl bg-[#722f37]/10 flex items-center justify-center border border-[#722f37]/20">
              <Loader2 className="animate-spin text-[#e9c176]" size={32} />
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest animate-pulse">Loading document...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-24 space-y-6">
            <p className="text-gray-400 font-serif italic text-lg">{error}</p>
            <Link href="/legal-library" className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#722f37] text-white text-[11px] font-bold uppercase tracking-[0.2em]">
              <ArrowLeft size={16} /> Back to Library
            </Link>
          </div>
        )}

        {doc && !loading && (
          <article className="space-y-8">

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest bg-[#722f37]/20 border border-[#722f37]/30">
                <CategoryIcon size={12} className="text-[#e9c176]" />{doc.category}
              </span>
              {doc.subcategory && <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white/5 px-3 py-1 rounded-md">{doc.subcategory.replace(/_/g, ' ')}</span>}
              {doc.case_no && <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider bg-white/5 px-3 py-1 rounded-md">{doc.case_no}</span>}
              {doc.year && <span className="text-[10px] font-bold text-[#e9c176] uppercase tracking-wider">{doc.year}</span>}
            </div>

            {/* Title + actions */}
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-white leading-tight tracking-tight">{resolvedTitle}</h1>

              {/* Action buttons — icon-only on mobile, icon+label on sm+ */}
              <div className="flex items-center gap-2 flex-wrap print:hidden">
                <button
                  onClick={handleBookmark}
                  disabled={bookmarkLoading}
                  title={bookmarked ? 'Remove bookmark' : 'Bookmark this document'}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border transition-all text-[11px] font-bold uppercase tracking-widest ${bookmarked ? 'border-[#e9c176]/40 bg-[#e9c176]/10 text-[#e9c176]' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.07]'}`}
                >
                  {bookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                  <span className="hidden sm:inline">{bookmarked ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  onClick={() => { setShowFind(v => !v); setTimeout(() => findInputRef.current?.focus(), 50); }}
                  title="Find in document (Ctrl+F)"
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border transition-all text-[11px] font-bold uppercase tracking-widest ${showFind ? 'border-[#722f37]/40 bg-[#722f37]/10 text-white' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.07]'}`}
                >
                  <Search size={13} />
                  <span className="hidden sm:inline">Find</span>
                </button>

                <button
                  onClick={handleCopy}
                  title="Copy full text"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-gray-400 hover:text-white transition-all text-[11px] font-bold uppercase tracking-widest"
                >
                  {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handlePrint}
                  title="Print / Export PDF"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-gray-400 hover:text-white transition-all text-[11px] font-bold uppercase tracking-widest"
                >
                  <Printer size={13} />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>
              </div>
            </div>

            {/* Summary */}
            {doc.concise_summary && (
              <div className="bg-white/[0.02] border border-[#722f37]/20 rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-[#e9c176]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#e9c176]">Summary</span>
                </div>
                <p className="text-gray-300 leading-relaxed text-sm">{cleanText(doc.concise_summary)}</p>
              </div>
            )}

            {/* Full text */}
            {(doc.formatted_markdown || doc.full_text) && (
              <div className="border-t border-white/10 pt-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-gray-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {doc.formatted_markdown ? 'Document' : 'Full Text'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 print:hidden flex-wrap justify-end">
                    <span className="text-[10px] text-gray-600 italic hidden sm:inline">Select text to highlight · Ctrl+F to search</span>
                    {annotations.length > 0 && (
                      <button onClick={() => setShowAnnotations(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e9c176]/30 bg-[#e9c176]/10 text-[#e9c176] text-[10px] font-bold uppercase tracking-widest hover:bg-[#e9c176]/20 transition-all">
                        <StickyNote size={11} />{annotations.length} Note{annotations.length !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </div>

                {/* Annotations panel */}
                {showAnnotations && annotations.length > 0 && (
                  <div className="mb-6 rounded-2xl border border-[#e9c176]/20 bg-[#e9c176]/[0.03] p-4 space-y-3 print:hidden">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#e9c176]">Your Annotations</p>
                    {annotations.map(a => (
                      <div key={a.id} className="flex gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
                        <div className="w-1 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-gray-400 italic line-clamp-2">"{a.text}"</p>
                          {a.note && <p className="text-xs text-white mt-1">{a.note}</p>}
                          <p className="text-[10px] text-gray-600 mt-1">{new Date(a.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => deleteAnnotation(a.id)} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div ref={fullTextRef} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-6 md:p-8 space-y-4" onMouseUp={doc.formatted_markdown ? undefined : handleTextSelect}>
                  {doc.formatted_markdown ? (
                    <LegalMarkdown content={doc.formatted_markdown} />
                  ) : (
                    <FormattedLegalText text={doc.full_text!} annotations={annotations} />
                  )}
                </div>

                {/* Highlight popup */}
                {pendingHighlight && (
                  <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-[#0B0B0C] border border-[#722f37]/40 rounded-2xl shadow-2xl p-4 print:hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <PenLine size={13} className="text-[#e9c176]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#e9c176]">Add Annotation</span>
                      </div>
                      <button onClick={() => setPendingHighlight(null)} className="text-gray-600 hover:text-white transition-colors"><X size={14} /></button>
                    </div>
                    <p className="text-[11px] text-gray-500 italic line-clamp-2 mb-3">"{pendingHighlight.text}"</p>
                    <div className="flex gap-2 mb-3">
                      {HIGHLIGHT_COLORS.map(c => (
                        <button key={c} onClick={() => setPendingHighlight(p => p ? { ...p, color: c } : null)}
                          className="w-6 h-6 rounded-full transition-all"
                          style={{ backgroundColor: c, outline: pendingHighlight.color === c ? '2px solid white' : 'none', outlineOffset: '2px' }} />
                      ))}
                    </div>
                    <textarea ref={noteInputRef} value={pendingHighlight.note}
                      onChange={e => setPendingHighlight(p => p ? { ...p, note: e.target.value } : null)}
                      placeholder="Add a note (optional)..." rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-[#722f37]/50 resize-none mb-3" />
                    <button onClick={saveAnnotation}
                      className="w-full bg-[#722f37] hover:bg-[#8b3a44] text-white font-bold py-2.5 rounded-xl text-[11px] uppercase tracking-widest transition-all">
                      Save Annotation
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Similar documents */}
            {related.length > 0 && (
              <div className="border-t border-white/10 pt-8 print:hidden">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={14} className="text-gray-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Similar Documents</span>
                </div>
                <p className="text-[10px] text-gray-600 italic mb-4">Based on text similarity — not legal citations</p>
                <div className="grid grid-cols-1 gap-2">
                  {related.map(r => {
                    const Icon = CATEGORY_ICONS[r.category] || FileText;
                    const title = r.title || r.case_no || 'Untitled';
                    return (
                      <Link key={r.id} href={`/legal-library/${r.id}`}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#722f37]/30 transition-all group">
                        <div className="w-8 h-8 rounded-xl bg-[#722f37]/10 border border-[#722f37]/20 flex items-center justify-center flex-shrink-0">
                          <Icon size={14} className="text-[#e9c176]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300 group-hover:text-white transition-colors line-clamp-1 capitalize">{stripDates(title)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {r.case_no && <span className="text-[10px] font-mono text-gray-600">{r.case_no}</span>}
                            {r.year && <span className="text-[10px] text-gray-600">· {r.year}</span>}
                            <span className="text-[10px] text-[#e9c176]/60">{Math.round(r.similarity * 100)}% similar</span>
                          </div>
                        </div>
                        <ChevronDown size={14} className="text-gray-600 group-hover:text-white -rotate-90 transition-colors flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Source link */}
            {doc.source_url?.startsWith('http') && (
              <div className="pt-6 border-t border-white/10">
                <a href={doc.source_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all bg-[#722f37] text-white hover:bg-[#8b3a44] shadow-xl shadow-[#722f37]/20 active:scale-95">
                  <ExternalLink size={16} /> View Original Source
                </a>
              </div>
            )}

          </article>
        )}
      </div>
    </div>
  );
}
