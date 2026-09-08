export interface Language {
  code: string;
  label: string;
  nativeLabel: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
];

export const DEFAULT_LANG = 'en';
export const STORAGE_KEY = 'ds-lang';

export function isLanguageCode(v: string | null): v is string {
  return !!v && LANGUAGES.some(l => l.code === v);
}
