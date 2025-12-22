
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export enum AppScreen {
  LANDING = 'LANDING',
  CONSULTATION = 'CONSULTATION'
}
