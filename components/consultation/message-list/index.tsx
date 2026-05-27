import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { MessageItem } from './message-item';
import { Message } from './types';
import { RelatedCase, cleanLegalTitle, isGenericTitle, extractRelatedQueries } from '@/lib/citation-parser';
import { useConversations } from '@/components/conversation-provider/conversation-context';

// Module-level memory cache — survives component unmounts
const relatedCasesStore = new Map<string, RelatedCase[]>();
const relatedCasesPagesStore = new Map<string, number>();
const relatedCasesHasMoreStore = new Map<string, boolean>();
// In-flight guard — prevents duplicate Postgres queries for the same cacheKey (question)
const inFlightIds = new Set<string>();
// Client-side phrase cache — maps question cacheKey → results
// Same question from a different message = instant, zero server calls.
const phraseCache = new Map<string, RelatedCase[]>();
// Persist guard — each message ID is only sent to onUpdateMessage once per session.
// Prevents the PUT storm caused by phraseCache hits calling onUpdateMessage on every
// messages-change re-render.
const persistedIds = new Set<string>();

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

    // Set loading immediately — synchronously, before any await — so it batches
    // with setActiveTabs in the same React render, preventing the empty-state flash.
    setRelatedCasesLoading(prev => ({ ...prev, [messageId]: true }));

    let cacheKey = '';
    try {
      const msgIndex = messages.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return;
      const msg = messages[msgIndex];

      const currentPage = isLoadMore ? (relatedCasesPagesStore.get(k) || 1) + 1 : 1;

      const streamTerms = msg.rawContent ? extractRelatedQueries(msg.rawContent) : undefined;
      if (!streamTerms || streamTerms.length === 0) return;

      const precedingUserMsg = [...messages.slice(0, msgIndex)].reverse().find(m => m.sender === 'user');
      const questionText = precedingUserMsg?.text?.replace(/\[ILM_META\][\s\S]*?\[\/ILM_META\]/g, '').trim() ?? '';
      cacheKey = questionText
        ? `q:${questionText.toLowerCase().slice(0, 200)}`
        : buildPhraseKey(streamTerms);

      // ── GUARD 2: client-side cache hit ────────────────────────────────────
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

      // ── GUARD 3: in-flight deduplication ──────────────────────────────────
      if (!isLoadMore && inFlightIds.has(cacheKey)) return;
      inFlightIds.add(cacheKey);

      try {
        const res = await fetch('/api/legal/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phrases: streamTerms,
            question: questionText || undefined,
            page: currentPage,
            limit: 10,
          }),
        });

        if (res.ok) {
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
            relatedCasesHasMoreStore.set(k, newCases.length === 10);
            saveToStorage(k, updatedCases);
            if (!isLoadMore) phraseCache.set(cacheKey, updatedCases);
            setStoreVersion(v => v + 1);
            if (!persistedIds.has(k)) {
              persistedIds.add(k);
              onUpdateMessage?.(messageId, { relatedCases: updatedCases });
            }
          }
        }
      } catch (err) {
        console.warn('[Related Cases] Fetch failed:', err);
      } finally {
        if (cacheKey) inFlightIds.delete(cacheKey);
      }
    } finally {
      // Always clear loading — covers early returns (no terms, msg not found, etc.)
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
      if (!extractRelatedQueries(msg.rawContent)) continue;
      // Skip if already loading for this message
      if (relatedCasesLoading[msg.id]) continue;
      // Skip if store/localStorage/message already has results
      const already = getResolved(key(msg.id), msg.relatedCases);
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

  return (
    <div className="space-y-8">
      {messages.filter(m => !m.hidden).map((message) => {
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
            onLoadMoreRelated={() => fetchRelatedCases(message.id, true)}
            isLoading={isLoading}
            onSendMessage={onSendMessage}
          />
        );
      })}
    </div>
  );
}
