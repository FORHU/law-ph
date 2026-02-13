'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AppSidebar } from './app-sidebar';
import { CHAT_SENDER, STORAGE_KEYS, ASSETS } from '@/lib/constants';
import { Session } from '@supabase/supabase-js';
import { Conversation } from '@/types';

import { useConsultation } from '@/hooks/use-consultation';
import { useConversations } from '@/components/conversation-provider';

// Sub-components
import { ConsultationHeader } from './consultation/consultation-header';
import { QuickQuestions } from './consultation/quick-questions';
import { MessageList } from './consultation/message-list';
import { ChatInput } from './consultation/chat-input';

interface ConsultationProps {
  onBack?: () => void;
  isLoggedIn?: boolean;
  activeConversationId?: string;
  conversations?: Conversation[];
  session?: Session | null;
}

export default function Consultation({
  onBack,
  isLoggedIn,
  activeConversationId,
  conversations: externalConversations,
  session
}: ConsultationProps) {
  const [inputMessage, setInputMessage] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    messages,
    isLoading,
    recentConsultations,
    currentConsultationId,
    handleLoadConsultation,
    handleNewConsultation: coreHandleNewConsultation,
    handleRemoveConsultation,
    handleRenameConsultation,
    handleSendMessage,
    handleDeleteMessage
  } = useConsultation(session?.user?.id, activeConversationId);

  const { isSidebarOpen, setIsSidebarOpen } = useConversations();

  console.log("[Consultation] Render. Messages:", messages.length, "RecentItems:", recentConsultations.length, "ActiveID:", activeConversationId);

  const quickQuestions = [
    "What are my tenant rights?",
    "How do I file a small claims case?",
    "Explain employment contract basics",
    "What is breach of contract?"
  ];

  const suggestedQuestions = [
    "Can you access my email?",
    "Can you send an email to this person for me?",
    "Can you create a schedule for me?",
    "Can you set a schedule for this person on my behalf?"
  ];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const lastIdRef = useRef<string | null>(null);

  // Sync state to URL for new consultations
  useEffect(() => {
    // Only redirect if we have a real UUID (string) and messages, and we aren't already on that URL
    const shouldRedirect = currentConsultationId && 
                          typeof currentConsultationId === 'string' && 
                          !activeConversationId && 
                          messages.length > 0 &&
                          currentConsultationId !== lastIdRef.current;

    if (shouldRedirect) {
      lastIdRef.current = currentConsultationId as string;
      router.push(`/consultation/${currentConsultationId}`);
    }
  }, [currentConsultationId, activeConversationId, messages.length, router]);

  const onSendMessage = () => {
    if (inputMessage.trim()) {
      handleSendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
    // Optional: Focus the input after selecting
    const textarea = document.getElementById('chat-message-input');
    if (textarea) {
      textarea.focus();
    }
  };

  /* sidebarRecentItems update to include onRename */
  const sidebarRecentItems = recentConsultations.map((c: any) => ({
    id: c.id,
    title: c.title,
    onClick: () => router.push(`/consultation/${c.id}`),
    onRemove: async () => {
      console.log("[Consultation] Removing item in sidebar:", c.id);
      const isDeletingActive = c.id === activeConversationId || c.id?.toString() === currentConsultationId?.toString();
      
      // If we are deleting the active one, push BEFORE awaiting to clear the URL ID immediately
      if (isDeletingActive) {
        console.log("[Consultation] Deleting active item, pushing to /consultation");
        router.push('/consultation');
      }
      
      await handleRemoveConsultation(c.id);
    },
    onRename: (newTitle: string) => handleRenameConsultation(c.id, newTitle)
  }));

  const handleNewConsultation = () => {
    // Clear state and reset redirect ref to allow fresh start
    lastIdRef.current = null;
    coreHandleNewConsultation();
    // Navigating to /consultation will trigger the sync logic but with clean state
    router.push('/consultation', { scroll: false });
  };

  // Find active conversation for title
  const activeConversation = recentConsultations.find((c: any) => c.id === currentConsultationId) || 
                             (activeConversationId ? recentConsultations.find((c: any) => c.id === activeConversationId) : null);
  
  const headerTitle = activeConversation?.title || "AI Legal Consultation";
  const isDefaultTitle = !activeConversation;

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

      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="h-full z-20 flex-shrink-0"
          >
            <AppSidebar 
              activePage="chat"
              onNewItem={handleNewConsultation}
              newItemLabel="New Consultation"
              recentItems={sidebarRecentItems}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        <ConsultationHeader 
          title={headerTitle}
          onMenuClick={() => setIsSidebarOpen(true)}
          showMenuButton={!isSidebarOpen}
          isEditable={!isDefaultTitle}
          onTitleChange={(newTitle) => {
            if (currentConsultationId) {
              handleRenameConsultation(currentConsultationId, newTitle);
            }
          }}
          showSubtitle={isDefaultTitle}
        />

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-6 py-8 relative z-10 scroll-smooth"
        >
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 && (
              <QuickQuestions 
                questions={quickQuestions} 
                onSelect={handleQuickQuestion} 
              />
            )}

            <MessageList 
              messages={messages} 
              onDelete={handleDeleteMessage}
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full px-4 md:px-6 h-6 mb-1 relative z-10">
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-gray-400"
            >
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span>ilovelawyer is thinking...</span>
            </motion.div>
          )}
        </div>

        <ChatInput 
          value={inputMessage}
          onChange={setInputMessage}
          onSend={onSendMessage}
          disabled={isLoading}
          suggestedQuestions={suggestedQuestions}
          onQuestionClick={handleSuggestedQuestion}
        />
      </main>
    </div>
  );
}
