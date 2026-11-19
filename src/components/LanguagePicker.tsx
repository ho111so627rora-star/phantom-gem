'use client';
import { Check, X } from 'lucide-react';
import { useDialog } from './useDialog';
import { LANGUAGES, useI18n } from '../i18n';

export function LanguagePicker({ onClose }: { onClose: () => void }) {
  useDialog(onClose);
  const { lang, t, setLang } = useI18n();
  return <div className="modal-backdrop" onClick={onClose}><section className="modal language-modal" role="dialog" aria-modal="true" aria-labelledby="language-title" onClick={e => e.stopPropagation()}>
    <button className="icon-button modal-close" aria-label={t.language.close} onClick={onClose}><X /></button>
    <p className="eyebrow">{t.language.eyebrow}</p><h2 id="language-title">{t.language.title}</h2><p>{t.language.note}</p>
    <div className="language-options" role="radiogroup" aria-labelledby="language-title">
      {LANGUAGES.map(l => <button key={l.code} type="button" role="radio" aria-checked={lang === l.code} lang={l.code} className={lang === l.code ? 'selected' : ''} onClick={() => setLang(l.code)}>
        <span><b>{l.name}</b><small>{l.english}</small></span>{lang === l.code && <Check aria-hidden="true" />}
      </button>)}
    </div>
    <button className="primary" onClick={onClose}>{t.language.done}</button>
  </section></div>;
}
