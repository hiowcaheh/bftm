export type Lang = 'pl' | 'sv' | 'en' | 'uk';

export const LANGS: Array<{ code: Lang; label: string; flag: string }> = [
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
];
