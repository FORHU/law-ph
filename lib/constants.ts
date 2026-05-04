
export const CHAT_SENDER = {
  USER: 'user',
  AI: 'ai',
  SYSTEM: 'system',
} as const;

export const STORAGE_KEYS = {
  DOCUMENTS: 'ilovelawyer_documents',
} as const;

export const ASSETS = {
  HERO_BG: "/assets/auth-bg.jpg",
  AUTH_BG: "/assets/auth-bg.jpg",
  LADY_JUSTICE_IMAGE: "/assets/auth-bg.jpg"
} as const;

export const BRAND = {
  NAME_PART1: 'ilove',
  NAME_PART2: 'lawyer',
} as const;

export const COLORS = {
  PRIMARY: '#722f37', // Deep wine red
  PRIMARY_LIGHT: '#ffb2b8', // Soft rose
  SECONDARY: '#e9c176', // Sovereign gold
  BG_DARK: '#131314', // Institutional dark
  BG_CARD: 'rgba(255, 255, 255, 0.03)', 
} as const;

export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  SIGN_UP: '/auth/sign-up',
  FORGOT_PASSWORD: '/auth/forgot-password',
  UPDATE_PASSWORD: '/auth/update-password',
  CALLBACK: '/auth/callback',
} as const;

export const S3_CONFIG = {
  CDN_URL: process.env.NEXT_PUBLIC_CLOUDFRONT_URL,
  AUDIO_CDN_URL: process.env.NEXT_PUBLIC_AUDIO_CLOUDFRONT_URL || process.env.NEXT_PUBLIC_CLOUDFRONT_URL,
} as const;
