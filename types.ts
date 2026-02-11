export interface Message {
  id: string | number
  role?: 'user' | 'assistant'
  content?: string
  conversation_id?: string
  imagePreview?: string
  created_at?: Date | string
  /** @deprecated use created_at instead */
  timestamp?: Date | string
  // Chat UI fields (required for UI but can be mapped from content)
  text: string
  sender: 'user' | 'ai'
  time: string
}

export interface ConsultationSession {
  id: string | number;
  title: string;
  subtitle: string;
  messages: Message[];
}

export interface Conversation {
  id: string; // Changed to string for UUID support
  user_id?: string;
  title: string;
  created_at?: string;
}

export enum AppScreen {
  LANDING = 'LANDING',
  CONSULTATION = 'CONSULTATION',
  LOGIN = 'LOGIN'
}

// Chat API Types
export interface ChatStreamRequest {
  user_input: string;
  session_id: string;
}

export interface SessionResponse {
  session_id: string;
}

