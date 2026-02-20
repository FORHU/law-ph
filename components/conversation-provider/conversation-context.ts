// Conversation Context - Types and Context Definition
import { createContext, useContext } from 'react';
import { Conversation, ConsultationSession, CaseData } from '@/types';
import { LegalSource, RelatedCase } from '@/lib/citation-parser';

export interface Message {
  id: string | number;
  text: string;
  sender: 'user' | 'ai';
  time: string;
  sources?: LegalSource[];
  relatedCases?: RelatedCase[];
}

export type ConversationContextType = {
  // Supabase/Cloud state
  conversations: Conversation[];
  refreshConversations: () => Promise<void>;
  
  // Local/Consultation state (hoisted from useConsultation)
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  recentConsultations: ConsultationSession[];
  currentConsultationId: string | number | null;
  chatSessionId: string;
  
  // Handlers
  handleSendMessage: (text: string) => Promise<void>;
  handleLoadConsultation: (consultation: ConsultationSession) => void;
  handleNewConsultation: () => void;
  handleRemoveConsultation: (id: string | number) => void;
  handleRenameConsultation: (id: string | number, newTitle: string) => Promise<void>;
  handleDeleteMessage: (messageId: string | number) => Promise<void>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  
  // Detail sidebar state
  isDetailSidebarOpen: boolean;
  selectedSource: LegalSource | null;
  selectedCase: RelatedCase | null;
  detailContext: string;
  openSourceDetail: (source: LegalSource, context?: string) => void;
  openCaseDetail: (caseItem: RelatedCase, context?: string) => void;
  closeDetailSidebar: () => void;

  // Cases
  cases: CaseData[];
  refreshCases: () => Promise<void>;
  handleCreateCase: (caseData: { name: string; party: string; notes: string }) => Promise<void>;
  handleDeleteCase: (id: string) => Promise<void>;
};

export const ConversationContext = createContext<ConversationContextType | null>(null);

export const useConversations = () => {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error("useConversations must be used inside ConversationProvider");
  return ctx;
};
