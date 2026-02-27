import { LegalSource, RelatedCase } from '@/lib/citation-parser';

export interface Message {
  id: string | number;
  text: string;
  sender: 'user' | 'ai';
  time: string;
  sources?: LegalSource[];
  relatedCases?: RelatedCase[];
  recordingUrl?: string; // @deprecated
  voiceNotes?: { id: string; url: string; label?: string }[];
  isEditing?: boolean;
  originalText?: string;
  editedAt?: string;
  editedBy?: string;
  highlights?: { id: string, snippet: string, note: string }[];
  timeline?: any[];
  mindMap?: any;
}

export interface MessageListProps {
  messages: Message[];
  onDelete?: (id: string | number) => void;
  onSourceClick?: (source: LegalSource, context?: string) => void;
  onCaseClick?: (caseItem: RelatedCase, context?: string) => void;
  onUpdateMessage?: (id: string | number, updates: Partial<Message>) => void;
  onOpenNote?: (id: string | number, text: string) => void;
}
