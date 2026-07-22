export const languages = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
] as const;

export type LanguageCode = (typeof languages)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';
