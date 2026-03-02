import { LegalSource, RelatedCase } from '@/lib/citation-parser';

export interface Message {
  id: string | number;
  text: string;
  sender: 'user' | 'ai';
  time: string;
  sources?: LegalSource[];
  relatedCases?: RelatedCase[];
  recordingUrl?: string;
  voiceNotes?: { id: string; url: string; label?: string }[];
  isEditing?: boolean;
  originalText?: string;
  highlights?: { id: string, snippet: string, note: string }[];
  timeline?: any[];
  mindMap?: any;
  editedAt?: string;
  editedBy?: string;
  [key: string]: any;
}
