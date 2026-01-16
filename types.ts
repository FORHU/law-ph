
export interface Message {
  id?: string
  role: 'user' | 'assistant';
  content: string;
  conversation_id?: string
  imagePreview?: string;
  created_at?: Date;
  timestamp?: Date;
}

 export interface Conversation {
    id: string
    user_id: string
    title: string
    created_at: string
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

