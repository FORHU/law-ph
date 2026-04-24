// Conversation Context - Types and Context Definition
import { createContext, useContext } from 'react';
import { Conversation, ConsultationSession, CaseData } from '@/types';
import { LegalSource, RelatedCase } from '@/lib/citation-parser';
import { Bookmark, NewBookmark } from '@/lib/bookmarks-service';

export interface Message {
  id: string | number;
  text: string;
  sender: 'user' | 'ai' | 'system';
  time: string;
  sources?: LegalSource[];
  relatedCases?: RelatedCase[];
  timeline?: any[];
  recordingUrl?: string; // @deprecated
  voiceNotes?: { id: string, url: string, s3_key?: string }[];
  isEditing?: boolean;
  originalText?: string;
  editedAt?: string;
  editedBy?: string;
  highlights?: { id: string, snippet: string, note: string }[];
  isAnalysis?: boolean;
  hidden?: boolean;
  mindMap?: any;
  status?: 'pending' | 'processing' | 'done' | 'error';
  rawContent?: string; // Stores uncleaned text with [MINDMAP]/[TIMELINE] tags
  fileAttachment?: {
    name: string;
    url?: string;
    type: string;
    size?: number;
    s3_key?: string;
    ai_summary?: string;
  };
  fileAttachments?: {
    name: string;
    url?: string;
    type: string;
    size?: number;
    s3_key?: string;
    ai_summary?: string;
  }[];
}

export type ConversationContextType = {
  // ... (keeping existing)
  documentContext: string | null;
  setDocumentContext: React.Dispatch<React.SetStateAction<string | null>>;
  analyzeDocuments: (files: File[], caseId: string, customPrompt?: string) => Promise<void>;
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
  handleSendMessage: (
    text: string,
    targetConversationId?: string | number,
    explicitDocumentContext?: string | null,
    file?: File | null,
    skipAIResponse?: boolean,
    isAnalysisTrigger?: boolean
  ) => Promise<string | number | undefined>;
  updateMessage: (id: string | number, updates: Partial<Message>) => void;
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
  openSourceByItemId: (itemId: string, title?: string, context?: string) => void;
  closeDetailSidebar: () => void;

  cases: CaseData[];
  refreshCases: () => Promise<void>;
  casesLoaded: boolean;
  handleCreateCase: (caseData: { name: string; party: string; notes: string }) => Promise<CaseData | null>;
  handleDeleteCase: (id: string) => Promise<void>;

  // Bookmarks
  bookmarks: Bookmark[];
  refreshBookmarks: () => Promise<void>;
  addBookmark: (bookmark: NewBookmark) => Promise<Bookmark | null>;
  removeBookmark: (id: string) => Promise<void>;
  isBookmarked: (itemId: string) => string | null; // returns bookmark id or null
  sendDocumentToChat: (name: string, summary: string, conversationId?: string | number) => Promise<string | number | undefined>;

  // Voice Recording (Global Persistence)
  isRecording: Record<string | number, boolean>;
  recordingTime: Record<string | number, number>;
  startRecording: (messageId: string | number) => Promise<void>;
  stopRecording: (messageId: string | number) => void;
  formatTime: (secs: number) => string;
  conflictRecordingId: string | number | null;
  activeRecordingTitle: string | null;
  resolveRecordingConflict: (proceed: boolean) => void;
};

export const ConversationContext = createContext<ConversationContextType | null>(null);

export const useConversations = () => {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error("useConversations must be used inside ConversationProvider");
  return ctx;
};
