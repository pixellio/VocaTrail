export interface SupportedLanguage {
  code: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'si', label: 'Sinhala' },
  { code: 'ta', label: 'Tamil' },
  { code: 'hi', label: 'Hindi' },
];

export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_STORAGE_KEY = 'voxaboard_language';

export function getLanguageLabel(code: string): string {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)?.label ?? code;
}
