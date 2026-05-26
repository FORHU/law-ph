import React, { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { MessageItem } from './message-item';
import { Message } from './types';
import { RelatedCase, cleanLegalTitle, isGenericTitle } from '@/lib/citation-parser';
import { useConversations } from '@/components/conversation-provider/conversation-context';

// Module-level memory cache — survives component unmounts
const relatedCasesStore = new Map<string, RelatedCase[]>();
const relatedCasesPagesStore = new Map<string, number>();
const relatedCasesHasMoreStore = new Map<string, boolean>();

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
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;
    const msg = messages[msgIndex];

    const currentPage = isLoadMore ? (relatedCasesPagesStore.get(key(messageId)) || 1) + 1 : 1;
    const precedingUserMsg = [...messages.slice(0, msgIndex)].reverse().find(m => m.sender === 'user');
    const aiErrorMessage = "I'm sorry, I'm having trouble connecting right now.";
    const rawUserText = precedingUserMsg?.text?.replace(/\[ILM_META\][\s\S]*?\[\/ILM_META\]/g, '').trim() ?? '';
    const searchPrompt = rawUserText || (msg.text !== aiErrorMessage ? msg.text : '');

    if (!searchPrompt) return;

    setRelatedCasesLoading(prev => ({ ...prev, [messageId]: true }));
    try {
      const res = await fetch('/api/legal/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: searchPrompt,
          page: currentPage,
          limit: 10,
          content_types: ['case', 'statute'],
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

        const existing = isLoadMore ? (relatedCasesStore.get(key(messageId)) ?? []) : [];
        const updatedCases = [...existing, ...newCases];

        relatedCasesStore.set(key(messageId), updatedCases);
        relatedCasesPagesStore.set(key(messageId), currentPage);
        relatedCasesHasMoreStore.set(key(messageId), newCases.length === 10);
        saveToStorage(key(messageId), updatedCases);

        // Also sync to message state so other consumers see it
        onUpdateMessage?.(messageId, { relatedCases: updatedCases });
        // Bump version to trigger re-render
        setStoreVersion(v => v + 1);
      }
    } catch (err) {
      console.warn('[Related Cases] Fetch failed:', err);
    } finally {
      setRelatedCasesLoading(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const handleTabChange = async (messageId: string | number, tab: string) => {
    setActiveTabs(prev => ({ ...prev, [messageId]: tab }));
    if (tab === 'related') {
      const resolved = getResolved(key(messageId));
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
