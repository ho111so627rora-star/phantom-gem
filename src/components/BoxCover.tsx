import { PieceIcon } from './table/PieceIcon';
import { useI18n } from '../i18n';

function LeatherCup({ className }: { className: string }) {
  return <div className={`cover-cup ${className}`}><div className="cover-cup-base" /><div className="cover-cup-body"><span>PG</span></div><div className="cover-cup-rim" /></div>;
}
function Compass() {
  return <svg className="cover-compass" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" opacity=".55" />
    <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".4" />
    {Array.from({ length: 16 }, (_, i) => i * 22.5).map(angle => <line key={angle} x1="50" y1="6" x2="50" y2={angle % 90 === 0 ? "13" : "10"} stroke="currentColor" strokeWidth=".7" opacity=".5" transform={`rotate(${angle} 50 50)`} />)}
    <path d="M50 14 58 50 50 86 42 50Z" fill="currentColor" opacity=".18" />
    <path d="M50 14 55 50 50 60 45 50Z" fill="currentColor" opacity=".7" />
    <circle cx="50" cy="50" r="3" fill="currentColor" />
  </svg>;
}
export function BoxCover() {
  const { t } = useI18n();
  return <div className="box-cover" aria-hidden="true">
    <div className="cover-lantern" />
    <div className="cover-print"><span>{t.cover.title}</span><i>Phantom Gem</i></div>
    <div className="cover-felt" />
    <Compass />
    <div className="cover-coins"><i /><i /><i /><i /><i /></div>
    <LeatherCup className="cup-a" /><LeatherCup className="cup-b" />
    <div className="cover-piece cover-ruby"><PieceIcon kind="ruby" /></div>
    <div className="cover-piece cover-blue"><PieceIcon kind="sapphire" /></div>
    <div className="cover-piece cover-thief"><PieceIcon kind="thief" /></div>
    <div className="cover-piece cover-poison"><PieceIcon kind="poison" /></div>
    <div className="cover-piece cover-mine"><PieceIcon kind="mining" /></div>
    <div className="cover-colophon"><span>{t.cover.line1}</span><span>{t.cover.line2}</span></div>
  </div>;
}
