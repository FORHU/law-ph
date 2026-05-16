import React, { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { MessageItem } from './message-item';
import { Message } from './types';
import { RelatedCase, cleanLegalTitle, isGenericTitle } from '@/lib/citation-parser';
import { useConversations } from '@/components/conversation-provider/conversation-context';

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
  const [relatedCasesPage, setRelatedCasesPage] = useState<Record<string | number, number>>({});
  const [relatedCasesHasMore, setRelatedCasesHasMore] = useState<Record<string | number, boolean>>({});

  const fetchRelatedCases = async (messageId: string | number, isLoadMore: boolean = false) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;
    const msg = messages[msgIndex];

    const currentPage = isLoadMore ? (relatedCasesPage[messageId] || 1) + 1 : 1;
    const precedingUserMsg = [...messages.slice(0, msgIndex)].reverse().find(m => m.sender === 'user');
    const searchPrompt = precedingUserMsg?.text || msg.text;

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
          // If the title is still a UUID or generic, try to use the case number
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
            itemId: item.item_id,
          };
        });

        let updatedCases: RelatedCase[] = newCases;
        if (isLoadMore && msg.relatedCases) {
          updatedCases = [...msg.relatedCases, ...newCases];
        }

        onUpdateMessage?.(messageId, { relatedCases: updatedCases });
        setRelatedCasesPage(prev => ({ ...prev, [messageId]: currentPage }));
        setRelatedCasesHasMore(prev => ({ ...prev, [messageId]: newCases.length === 10 }));
      }
    } catch (err) {
      console.warn('[Related Cases] Fetch failed:', err);
    } finally {
      setRelatedCasesLoading(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const handleTabChange = async (messageId: string | number, tab: string) => {
    setActiveTabs(prev => ({ ...prev, [messageId]: tab }));

    // Lazy-load legal cases when user clicks Related Cases tab
    if (tab === 'related') {
      const msg = messages.find(m => m.id === messageId);
      if (msg && (!msg.relatedCases || msg.relatedCases.length === 0)) {
        await fetchRelatedCases(messageId, false);
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
      {messages.filter(m => !m.hidden).map((message) => (
        <MessageItem
          key={message.id}
          message={message}
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
          hasMoreRelatedCases={relatedCasesHasMore[message.id]}
          onLoadMoreRelated={() => fetchRelatedCases(message.id, true)}
          isLoading={isLoading}
          onSendMessage={onSendMessage}
        />
      ))}
    </div>
  );
}
