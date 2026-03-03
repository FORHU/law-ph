import React, { useState } from 'react';
import { CHAT_SENDER } from '@/lib/constants';
import { useAuth } from '@/components/auth/auth-provider';
import { MessageItem } from './message-item';
import { Message } from './types';

interface MessageListProps {
  messages: Message[];
  onDelete?: (id: string | number) => void;
  onSourceClick?: (source: any, context?: string) => void;
  onCaseClick?: (caseItem: any, context?: string) => void;
  onUpdateMessage?: (id: string | number, updates: Partial<Message>) => void;
  onOpenNote?: (id: string | number, text: string) => void;
}

export function MessageList({ messages, onDelete, onSourceClick, onCaseClick, onUpdateMessage, onOpenNote }: MessageListProps) {
  const { session } = useAuth();
  const [activeTabs, setActiveTabs] = useState<Record<string | number, string>>({});
  const [isRecording, setIsRecording] = useState<Record<string | number, boolean>>({});
  const [recordingTime, setRecordingTime] = useState<Record<string | number, number>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string | number, boolean>>({});
  const [relatedCasesLoading, setRelatedCasesLoading] = useState<Record<string | number, boolean>>({});
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<BlobPart[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startRecording = async (messageId: string | number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener('dataavailable', event => {
        audioChunksRef.current.push(event.data);
      });

      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        if (onUpdateMessage) {
          const newNote = { id: Date.now().toString(), url: audioUrl };
          onUpdateMessage(messageId, { __appendVoiceNote: newNote });
        }
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingTime(prev => ({ ...prev, [messageId]: 0 }));
      });

      mediaRecorder.start();
      setIsRecording(prev => ({ ...prev, [messageId]: true }));
      setRecordingTime(prev => ({ ...prev, [messageId]: 0 }));
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => ({ ...prev, [messageId]: (prev[messageId] || 0) + 1 }));
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = (messageId: string | number) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(prev => ({ ...prev, [messageId]: false }));
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleTabChange = async (messageId: string | number, tab: string) => {
    setActiveTabs(prev => ({ ...prev, [messageId]: tab }));

    // Lazy-load legal cases when user clicks Related Cases tab
    if (tab === 'related') {
      const msgIndex = messages.findIndex(m => m.id === messageId);
      const msg = messages[msgIndex];
      if (msg && (!msg.relatedCases || msg.relatedCases.length === 0)) {
        const precedingUserMsg = [...messages.slice(0, msgIndex)].reverse().find(m => m.sender === 'user');
        const searchPrompt = precedingUserMsg?.text || msg.text;

        setRelatedCasesLoading(prev => ({ ...prev, [messageId]: true }));
        try {
          const res = await fetch('/api/legal/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: searchPrompt,
              max_results: 5,
              content_types: ['case', 'statute'],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const apiResults: any[] = data.results || [];
            const relatedCases = apiResults.map((item: any) => ({
              caseNumber: item.gr_number || item.law_number || item.case_number || 'N/A',
              title: item.title || 'Philippine Legal Document',
              description: item.title || item.type,
              score: item.score,
              url: item.url,
              type: item.type,
              itemId: item.item_id,
            }));
            onUpdateMessage?.(messageId, { relatedCases });
          }
        } catch (err) {
          console.warn('[Related Cases] Fetch failed:', err);
        } finally {
          setRelatedCasesLoading(prev => ({ ...prev, [messageId]: false }));
        }
      }
    }
  };

  const scrollToMessage = (id: string | number) => {
    setTimeout(() => {
      document.getElementById(`message-bubble-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => (
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
          onUpdateMessage={onUpdateMessage}
          onOpenNote={onOpenNote}
          scrollToMessage={scrollToMessage}
          formatTime={formatTime}
          session={session}
          relatedCasesLoading={relatedCasesLoading[message.id]}
        />
      ))}
    </div>
  );
}
