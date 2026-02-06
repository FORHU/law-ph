'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppSidebar } from './app-sidebar';
import { CHAT_SENDER, STORAGE_KEYS, ASSETS } from '@/lib/constants';

// Sub-components
import { ConsultationHeader } from './consultation/consultation-header';
import { QuickQuestions } from './consultation/quick-questions';
import { MessageList } from './consultation/message-list';
import { ChatInput } from './consultation/chat-input';

interface Message {
  id: number;
  text: string;
  sender: typeof CHAT_SENDER.USER | typeof CHAT_SENDER.AI;
  time: string;
}

interface ConsultationSession {
  id: number;
  title: string;
  subtitle: string;
  messages: Message[];
}

export default function Consultation() {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConsultationId, setCurrentConsultationId] = useState<number | null>(null);
  const [recentConsultations, setRecentConsultations] = useState<ConsultationSession[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const quickQuestions = [
    "What are my tenant rights?",
    "How do I file a small claims case?",
    "Explain employment contract basics",
    "What is breach of contract?"
  ];

  // Load consultations from localStorage on mount
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
  }, []);

  // Save consultations to localStorage whenever they change
  useEffect(() => {
    if (recentConsultations.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify(recentConsultations));
    }
  }, [recentConsultations]);

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
  };

  const handleLoadConsultation = (consultation: ConsultationSession) => {
    setMessages(consultation.messages);
    setCurrentConsultationId(consultation.id);
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const newMessage: Message = {
        id: Date.now(),
        text: inputMessage,
        sender: CHAT_SENDER.USER,
        time: timestamp
      };
      
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      
      const sessionTitle = currentConsultationId 
        ? recentConsultations.find(c => c.id === currentConsultationId)?.title || inputMessage.substring(0, 30) + (inputMessage.length > 30 ? '...' : '')
        : inputMessage.substring(0, 30) + (inputMessage.length > 30 ? '...' : '');

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

      setInputMessage('');
      
      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: Date.now() + 1,
          text: "I'm processing your legal question. In a production environment, this would be connected to the ilovelawyer AI system to provide accurate legal information based on Philippine law.",
          sender: CHAT_SENDER.AI,
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        };
        
        const messagesWithAi = [...updatedMessages, aiResponse];
        setMessages(messagesWithAi);
        
        const finalSessionData = { ...sessionData, messages: messagesWithAi };
        setRecentConsultations(prev => prev.map(c => c.id === sessionId ? finalSessionData : c));
      }, 1000);
    }
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
    // Also update localStorage immediately to be safe
    localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify(updated));
  };

  const sidebarRecentItems = recentConsultations.map(c => ({
    id: c.id,
    title: c.title,
    onClick: () => handleLoadConsultation(c),
    onRemove: () => handleRemoveConsultation(c.id)
  }));

  return (
    <div className="flex h-screen bg-[#1A1A1A] text-white overflow-hidden relative" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="fixed inset-0 z-0">
        <motion.img 
          src={ASSETS.LADY_JUSTICE_IMAGE}
          alt="Lady Justice"
          className="w-full h-full object-cover opacity-30 grayscale"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/80 via-[#1A1A1A]/70 to-[#1A1A1A]/95"></div>
      </div>

      <AppSidebar 
        activePage="chat"
        onNewItem={handleNewConsultation}
        newItemLabel="New Consultation"
        showWorkspace={messages.length > 0}
        workspaceTitle="Active Consultation"
        workspaceSubtitle="AI Legal Analysis"
        recentItems={sidebarRecentItems}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        <ConsultationHeader 
          title="AI Legal Consultation"
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <div className="flex-1 overflow-y-auto px-6 py-8 relative z-10">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 && (
              <QuickQuestions 
                questions={quickQuestions} 
                onSelect={handleQuickQuestion} 
              />
            )}

            <MessageList messages={messages} />
          </div>
        </div>

        <ChatInput 
          value={inputMessage}
          onChange={setInputMessage}
          onSend={handleSendMessage}
        />
      </main>
    </div>
  );
}
