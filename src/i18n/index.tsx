'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ja, type Messages } from './locales/ja';
import { en } from './locales/en';
import { ko } from './locales/ko';
import { zh } from './locales/zh';
import { es } from './locales/es';
import { pt } from './locales/pt';

export const LANGUAGES = [
  { code: 'ja', name: '日本語', english: 'Japanese' },
  { code: 'en', name: 'English', english: 'English' },
  { code: 'ko', name: '한국어', english: 'Korean' },
  { code: 'zh', name: '简体中文', english: 'Chinese (Simplified)' },
  { code: 'es', name: 'Español', english: 'Spanish' },
  { code: 'pt', name: 'Português', english: 'Portuguese' },
] as const;
export type Lang = typeof LANGUAGES[number]['code'];
export type { Messages };

const MESSAGES: Record<Lang, Messages> = { ja, en, ko, zh, es, pt };
const STORAGE_KEY = 'phantom-gem-lang';

function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && value in MESSAGES;
}
/** Picks the first supported language from the browser settings (e.g. "pt-BR" → "pt"). */
function detect(): Lang {
  const preferred = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'ja';
}

type I18n = { lang: Lang; t: Messages; setLang: (lang: Lang) => void };
const I18nContext = createContext<I18n>({ lang: 'ja', t: ja, setLang: () => {} });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Render Japanese on the server and first paint, then switch on the client to avoid hydration mismatches.
  const [lang, setLangState] = useState<Lang>('ja');
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
    setLangState(isLang(saved) ? saved : detect());
  }, []);
  const t = MESSAGES[lang];
  useEffect(() => {
    document.documentElement.lang = t.meta.htmlLang;
    document.title = t.meta.title;
  }, [t]);
  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* The choice still applies for this visit. */ }
  }, []);
  const value = useMemo(() => ({ lang, t, setLang }), [lang, t, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }

export { translateError, displayName, translateLog } from './translate';
