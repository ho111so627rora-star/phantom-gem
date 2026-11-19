import { FlaskConical, Pickaxe, VenetianMask } from 'lucide-react';
import type { Kind, Play } from '../game/types';
import { isJewel } from '../game/constants';
import { useI18n } from '../i18n';
export function Gem({ kind = 'emerald', className = '' }: { kind?: Kind; className?: string }) {
  const props = { className: `gem-icon ${kind} ${className}`, 'aria-hidden': true as const };
  if (kind === 'thief') return <VenetianMask {...props} />;
  if (kind === 'mining') return <Pickaxe {...props} />;
  if (kind === 'poison') return <FlaskConical {...props} />;
  return <svg {...props} viewBox="0 0 80 80" fill="none">
    <path d="M23 9h34l17 24-34 40L6 33Z" fill="currentColor" />
    <path d="m23 9 6 24H6Zm34 0-6 24h23Z" fill="white" opacity=".25" />
    <path d="M23 9h34L40 33Z" fill="white" opacity=".48" />
    <path d="m29 33 11 40L6 33Z" fill="black" opacity=".2" />
    <path d="m51 33-11 40 34-40Z" fill="black" opacity=".35" />
    <path d="M29 33h22L40 73Z" fill="white" opacity=".15" />
    <path d="M6 33h68M23 9l6 24L40 73l11-40 6-24" stroke="white" opacity=".25" />
  </svg>;
}
export function DieFace({ play, hidden = false }: { play: Play | null; hidden?: boolean }) {
  const { t } = useI18n();
  if (hidden) return <div className="cup"><span>PG</span></div>;
  if (!play) return <div className="die-face empty"><span>—</span><small>{t.pass}</small></div>;
  return <div className={`die-face ${play.kind}`}><Gem kind={play.kind} />{isJewel(play.kind) && <b>{play.value}</b>}<small>{t.kinds[play.kind]}</small></div>;
}
