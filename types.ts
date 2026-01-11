
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

