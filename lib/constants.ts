
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
  PRIMARY: '#8B4564',
  PRIMARY_LIGHT: '#9D5373',
  ACCENT_DARK: '#6D3650',
  BG_DARK: '#0a0e17', // Match the deep dark navy
  BG_CARD: '#242424', // Match the glassmorphism card base
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
