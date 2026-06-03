import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { MessageItem } from './message-item';
import { Message } from './types';
import { RelatedCase, cleanLegalTitle, isGenericTitle, extractRelatedQueries, extractLegalReferences } from '@/lib/citation-parser';
import { useConversations } from '@/components/conversation-provider/conversation-context';

// Module-level memory cache — survives component unmounts
const relatedCasesStore = new Map<string, RelatedCase[]>();
const relatedCasesPagesStore = new Map<string, number>();
const relatedCasesHasMoreStore = new Map<string, boolean>();
const relatedCasesTotalStore = new Map<string, number>();
// In-flight guard — prevents duplicate Postgres queries for the same cacheKey (question)
const inFlightIds = new Set<string>();
// Client-side phrase cache — maps question cacheKey → results
// Same question from a different message = instant, zero server calls.
const phraseCache = new Map<string, RelatedCase[]>();
// Persist guard — each message ID is only sent to onUpdateMessage once per session.
// Prevents the PUT storm caused by phraseCache hits calling onUpdateMessage on every
// messages-change re-render.
const persistedIds = new Set<string>();

function sortByParentage(messages: Message[]): Message[] {
  const placed = new Set<string | number>();
  const result: Message[] = [];
  for (const msg of messages) {
    if (placed.has(msg.id)) continue;
    if (!msg.parentMessageId) {
      result.push(msg);
      placed.add(msg.id);
      const reply = messages.find(m => m.parentMessageId === String(msg.id) && !placed.has(m.id));
      if (reply) { result.push(reply); placed.add(reply.id); }
    }
  }
  for (const msg of messages) {
    if (!placed.has(msg.id)) result.push(msg);
  }
  return result;
}

function buildPhraseKey(phrases: string[]): string {
  return [...phrases].sort().join('|').toLowerCase();
}

const STORAGE_PREFIX = 'lex_rc_';

function saveToStorage(messageId: string, cases: RelatedCase[]) {
  try {
    localStorage.setItem(STORAGE_PREFIX + messageId, JSON.stringify(cases));
  } catch {}
}

function loadFromStorage(messageId: string): RelatedCase[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + messageId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getResolved(messageId: string, messageCases?: RelatedCase[]): RelatedCase[] | undefined {
  return relatedCasesStore.get(messageId)
    ?? loadFromStorage(messageId)
    ?? messageCases;
}

interface MessageListProps {
  messages: Message[];
  onDelete?: (id: string | number) => void;
  onSourceClick?: (source: any, context?: string) => void;
  onCaseClick?: (caseItem: any, context?: string) => void;
  onSourceLinkClick?: (itemId: string, title?: string) => void;
  onUpdateMessage?: (id: string | number, updates: Partial<Message>) => void;
  onOpenNote?: (id: string | number, text: string) => void;
  isLoading?: boolean;
  onSendMessage?: (text: string) => void;
}

export function MessageList({
  messages,
  onDelete,
  onSourceClick,
  onCaseClick,
  onSourceLinkClick,
  onUpdateMessage,
  onOpenNote,
  isLoading,
  onSendMessage
}: MessageListProps) {
  const { user } = useAuth();
  const { isRecording, recordingTime, startRecording, stopRecording, formatTime } = useConversations();
  const [activeTabs, setActiveTabs] = useState<Record<string | number, string>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string | number, boolean>>({});
  const [relatedCasesLoading, setRelatedCasesLoading] = useState<Record<string | number, boolean>>({});
  const [storeVersion, setStoreVersion] = useState(0);
  void storeVersion; // used to trigger re-renders when store updates

  const key = (id: string | number) => String(id);

  const fetchRelatedCases = async (messageId: string | number, isLoadMore: boolean = false) => {
    const k = key(messageId);

    // ── GUARD 1: store already has results ────────────────────────────────────
    if (!isLoadMore) {
      const existing = relatedCasesStore.get(k);
      if (existing && existing.length > 0) return;
    }

    // Extract terms synchronously before touching loading state.
    // If there are no terms to search, exit silently — no spinner shown.
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;
    const msg = messages[msgIndex];

    const currentPage = isLoadMore ? (relatedCasesPagesStore.get(k) || 1) + 1 : 1;
    const tagTerms  = msg.rawContent ? (extractRelatedQueries(msg.rawContent) ?? []) : [];
    const legalRefs = msg.rawContent ? extractLegalReferences(msg.rawContent) : [];
    const seenRefs  = new Set(legalRefs.map(r => r.toLowerCase()));
    const streamTerms = [...legalRefs, ...tagTerms.filter(t => !seenRefs.has(t.toLowerCase()))];
    console.log('[RELATED_QUERIES] tagTerms:', tagTerms, '| legalRefs:', legalRefs, '| final streamTerms:', streamTerms);
    if (streamTerms.length === 0) return; // no terms → no loading, no fetch

    const precedingUserMsg = [...messages.slice(0, msgIndex)].reverse().find(m => m.sender === 'user');
    const questionText = precedingUserMsg?.text?.replace(/\[ILM_META\][\s\S]*?\[\/ILM_META\]/g, '').trim() ?? '';
    const cacheKey = questionText
      ? `q:${questionText.toLowerCase().slice(0, 200)}`
      : buildPhraseKey(streamTerms);

    // ── GUARD 2: client-side cache hit (no loading needed) ───────────────────
    if (!isLoadMore) {
      const cached = phraseCache.get(cacheKey);
      if (cached && cached.length > 0) {
        relatedCasesStore.set(k, cached);
        saveToStorage(k, cached);
        setStoreVersion(v => v + 1);
        if (!persistedIds.has(k)) {
          persistedIds.add(k);
          onUpdateMessage?.(messageId, { relatedCases: cached });
        }
        return;
      }
    }

    // ── GUARD 3: in-flight deduplication (no loading needed) ─────────────────
    if (!isLoadMore && inFlightIds.has(cacheKey)) return;

    // We know we'll make a network request — show loading now
    setRelatedCasesLoading(prev => ({ ...prev, [messageId]: true }));
    inFlightIds.add(cacheKey);

    try {
      const res = await fetch('/api/legal/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exactRefs: legalRefs,
          phrases: tagTerms,
          question: questionText || undefined,
          page: 1,
        }),
      });
      if (!res.ok) throw new Error(`Search API ${res.status}`);
      const data = await res.json();
      const apiResults: any[] = data.results || [];

      const newCases: RelatedCase[] = apiResults.map((item: any) => {
        const rawTitle = item.title || 'Philippine Legal Document';
        const cleanedTitle = cleanLegalTitle(rawTitle);
        const finalTitle = isGenericTitle(cleanedTitle) && (item.gr_number || item.case_number)
          ? (item.gr_number || item.case_number)
          : cleanedTitle;
        return {
          caseNumber: item.gr_number || item.law_number || item.case_number || 'N/A',
          title: finalTitle,
          description: item.title || item.type,
          snippet: item.snippet ?? null,
          score: item.score,
          url: item.url,
          type: item.type,
          subtype: item.subtype ?? null,
          year: item.year ?? null,
          itemId: item.item_id,
        };
      });
      const existing = isLoadMore ? (relatedCasesStore.get(k) ?? []) : [];
      const updatedCases = [...existing, ...newCases];

      if (updatedCases.length > 0) {
        relatedCasesStore.set(k, updatedCases);
        relatedCasesPagesStore.set(k, currentPage);
        relatedCasesHasMoreStore.set(k, false);
        relatedCasesTotalStore.set(k, typeof data.total === 'number' ? data.total : updatedCases.length);
        saveToStorage(k, updatedCases);
        if (!isLoadMore) phraseCache.set(cacheKey, updatedCases);
        setStoreVersion(v => v + 1);
        if (!persistedIds.has(k)) {
          persistedIds.add(k);
          onUpdateMessage?.(messageId, { relatedCases: updatedCases });
        }
      }
    } catch (err) {
      console.warn('[Related Cases] Fetch failed:', err);
    } finally {
      inFlightIds.delete(cacheKey);
      setRelatedCasesLoading(prev => ({ ...prev, [messageId]: false }));
    }
  };

  // Pre-fetch related cases as soon as an AI message has rawContent + RELATED_QUERIES tag.
  // Three guards inside fetchRelatedCases prevent duplicate work:
  //   - store hit      → exit immediately (primary loop-breaker)
  //   - phraseCache hit → instant, no server call, persist only once
  //   - inFlightIds hit → skip (same question already running)
  useEffect(() => {
    for (const msg of messages) {
      if (msg.sender !== 'ai') continue;
      if (!msg.rawContent) continue;

      const terms = extractRelatedQueries(msg.rawContent);
      const k = key(msg.id);

      if (!terms) {
        // RELATED_QUERIES tag present but empty → AI finished with no legal terms.
        // Mark the store as [] so the UI shows "no related cases" instead of the
        // "searching" placeholder (which fires when relatedCases is undefined).
        if (/\[RELATED_QUERIES\]/i.test(msg.rawContent) && !relatedCasesStore.has(k)) {
          relatedCasesStore.set(k, []);
          setStoreVersion(v => v + 1);
        }
        continue;
      }

      // Skip if already loading for this message
      if (relatedCasesLoading[msg.id]) continue;
      // Skip if store/localStorage/message already has results
      const already = getResolved(k, msg.relatedCases);
      if (already && already.length > 0) continue;
      fetchRelatedCases(msg.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const handleTabChange = async (messageId: string | number, tab: string) => {
    setActiveTabs(prev => ({ ...prev, [messageId]: tab }));
    if (tab === 'related') {
      const msg = messages.find(m => m.id === messageId);
      const resolved = getResolved(key(messageId), msg?.relatedCases);
      if (!resolved || resolved.length === 0) {
        fetchRelatedCases(messageId);
      } else if (!relatedCasesStore.has(key(messageId))) {
        // Restore from localStorage into memory store and trigger re-render
        relatedCasesStore.set(key(messageId), resolved);
        setStoreVersion(v => v + 1);
      }
    }
  };

  const scrollToMessage = (id: string | number) => {
    setTimeout(() => {
      document.getElementById(`message-bubble-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Scroll to and highlight a bookmarked message
  const scrollToBookmarkedMessage = (targetId: string) => {
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(`message-bubble-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow 0.4s ease';
        el.style.boxShadow = '0 0 0 2px rgba(233,193,118,0.8)';
        el.style.borderRadius = '12px';
        setTimeout(() => { el.style.boxShadow = ''; el.style.borderRadius = ''; }, 2500);
        sessionStorage.removeItem('scrollToMessage');
      } else if (attempts < 20) {
        attempts++;
        setTimeout(tryScroll, 200);
      }
    };
    setTimeout(tryScroll, 100);
  };

  // On mount: check sessionStorage for a pending scroll target (cross-page navigation)
  useEffect(() => {
    if (!messages.length) return;
    const targetId = sessionStorage.getItem('scrollToMessage');
    if (targetId) scrollToBookmarkedMessage(targetId);
  }, [messages.length]);

  // Same-page: listen for the custom event (already on the right page)
  useEffect(() => {
    const handler = (e: Event) => scrollToBookmarkedMessage((e as CustomEvent).detail);
    window.addEventListener('scrollToBookmark', handler);
    return () => window.removeEventListener('scrollToBookmark', handler);
  }, []);

  return (
    <div className="space-y-8">
      {sortByParentage(messages).filter(m => !m.hidden).map((message) => {
        // Always read from store/localStorage first — never rely on message.relatedCases alone
        const resolvedCases = getResolved(key(message.id), message.relatedCases);
        return (
          <MessageItem
            key={message.id}
            message={{ ...message, relatedCases: resolvedCases }}
            activeTab={activeTabs[message.id] || 'answer'}
            onTabChange={(tab) => handleTabChange(message.id, tab)}
            showOriginal={showOriginal[message.id] || false}
            onToggleOriginal={() => setShowOriginal(prev => ({ ...prev, [message.id]: !prev[message.id] }))}
            isRecording={isRecording[message.id] || false}
            recordingTime={recordingTime[message.id] || 0}
            onStartRecording={() => startRecording(message.id)}
            onStopRecording={() => stopRecording(message.id)}
            onDelete={onDelete}
            onSourceClick={onSourceClick}
            onCaseClick={onCaseClick}
            onSourceLinkClick={onSourceLinkClick}
            onUpdateMessage={onUpdateMessage}
            onOpenNote={onOpenNote}
            scrollToMessage={scrollToMessage}
            formatTime={formatTime}
            session={user}
            relatedCasesLoading={relatedCasesLoading[message.id]}
            hasMoreRelatedCases={relatedCasesHasMoreStore.get(key(message.id))}
            relatedCasesTotal={relatedCasesTotalStore.get(key(message.id))}
            onLoadMoreRelated={() => fetchRelatedCases(message.id, true)}
            isLoading={isLoading}
            onSendMessage={onSendMessage}
          />
        );
      })}
    </div>
  );
}
