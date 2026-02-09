'use client';

import { useState, useEffect } from 'react';
import { CHAT_SENDER, STORAGE_KEYS } from '@/lib/constants';

export interface Message {
  id: number;
  text: string;
  sender: typeof CHAT_SENDER.USER | typeof CHAT_SENDER.AI;
  time: string;
}

export interface ConsultationSession {
  id: number;
  title: string;
  subtitle: string;
  messages: Message[];
}

export function useConsultation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConsultationId, setCurrentConsultationId] = useState<number | null>(null);
  const [recentConsultations, setRecentConsultations] = useState<ConsultationSession[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Load consultations and initialize session
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONSULTATIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentConsultations(parsed);
      } catch (e) {
        console.error('Failed to parse consultations', e);
      }
    }

    const fetchSession = async () => {
      try {
        const res = await fetch('/api/chat/session');
        if (res.ok) {
          const data = await res.json();
          setChatSessionId(data.session_id);
        }
      } catch (err) {
        console.error("Failed to initialize session:", err);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (recentConsultations.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify(recentConsultations));
    }
  }, [recentConsultations]);

  const handleLoadConsultation = (consultation: ConsultationSession) => {
    setMessages(consultation.messages);
    setCurrentConsultationId(consultation.id);
  };

  const handleNewConsultation = () => {
    setMessages([]);
    setCurrentConsultationId(null);
  };

  const handleRemoveConsultation = (id: number) => {
    const updated = recentConsultations.filter(c => c.id !== id);
    setRecentConsultations(updated);
    if (currentConsultationId === id) {
      handleNewConsultation();
    }
    localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify(updated));
  };

  const handleSendMessage = async (text: string) => {
    if (text.trim() && !isLoading) {
      const currentInput = text.trim();
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const newMessage: Message = {
        id: Date.now(),
        text: currentInput,
        sender: CHAT_SENDER.USER,
        time: timestamp
      };
      
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      
      const sessionTitle = currentConsultationId 
        ? recentConsultations.find(c => c.id === currentConsultationId)?.title || currentInput.substring(0, 30) + (currentInput.length > 30 ? '...' : '')
        : currentInput.substring(0, 30) + (currentInput.length > 30 ? '...' : '');

      const sessionId = currentConsultationId || Date.now();
      
      const sessionData: ConsultationSession = {
        id: sessionId,
        title: sessionTitle,
        subtitle: `Session_${sessionId.toString().slice(-5)}...`,
        messages: updatedMessages
      };

      if (!currentConsultationId) {
        setCurrentConsultationId(sessionId);
        setRecentConsultations([sessionData, ...recentConsultations]);
      } else {
        setRecentConsultations(recentConsultations.map(c => c.id === sessionId ? sessionData : c));
      }

      setIsLoading(true);
      
      try {
        const aiMessageId = Date.now() + 1;
        const initialAiMessage: Message = {
          id: aiMessageId,
          text: "",
          sender: CHAT_SENDER.AI,
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        };

        setMessages(prev => [...prev, initialAiMessage]);

        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_input: `[Legal AI] ${currentInput}`,
            session_id: chatSessionId || `session_${Date.now()}`,
          }),
        });

        if (!response.ok) throw new Error("Failed to connect to AI");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            let chunk = decoder.decode(value, { stream: true });
            if (chunk.includes("__END__")) {
              chunk = chunk.replace("__END__", "");
            }
            
            if (chunk.startsWith("[Error]")) {
              accumulatedText = "Error: " + chunk.replace("[Error]", "");
              break;
            }

            if (chunk.startsWith("[Tool]")) continue;

            accumulatedText += chunk;

            setMessages(prev => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (updated[lastIdx].id === aiMessageId) {
                updated[lastIdx] = { ...updated[lastIdx], text: accumulatedText };
              }
              return updated;
            });
          }

          const finalMessages = [...updatedMessages, { ...initialAiMessage, text: accumulatedText }];
          const finalSessionData = { ...sessionData, messages: finalMessages };
          setRecentConsultations(prev => prev.map(c => c.id === sessionId ? finalSessionData : c));
        }
      } catch (error) {
        console.error("AI Stream Error:", error);
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = { ...updated[lastIdx], text: "I'm sorry, I'm having trouble connecting right now. Please try again later." };
          return updated;
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return {
    messages,
    isLoading,
    recentConsultations,
    handleLoadConsultation,
    handleNewConsultation,
    handleRemoveConsultation,
    handleSendMessage
  };
}
