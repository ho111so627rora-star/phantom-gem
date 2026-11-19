'use client';
import { X } from 'lucide-react';
import { useDialog } from './useDialog';
import { DieFace } from './Gem';
import type { Play } from '../game/types';
import { useI18n } from '../i18n';

const die = (kind: Play['kind'], value = 0): Play => ({ id: kind + value, kind, value });

export function Rules({ onClose }: { onClose: () => void }) {
  useDialog(onClose);
  const { t } = useI18n(), r = t.rules;
  return <div className="modal-backdrop" onClick={onClose}><section className="modal rules" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={e => e.stopPropagation()}>
    <button className="icon-button modal-close" aria-label={r.closeAria} onClick={onClose}><X /></button>
    <p className="eyebrow">HOW TO PLAY</p><h2 id="rules-title">{r.title}</h2><p>{r.intro}</p>

    <ol className="rule-steps">
      {r.steps.map(([title, body]) => <li key={title}><b>{title}</b><span>{body}</span></li>)}
    </ol>

    <div className="rule-match" aria-hidden="true">
      <span className="rule-match-tag">{r.opponent}</span>
      <div className="rule-match-grid">
        <div className="rule-match-col"><div className="cup"><span>{t.hand.cupSide(1)}</span></div><div className="rule-match-link gold" /><div className="cup"><span>{t.hand.cupSide(0)}</span></div></div>
        <div className="rule-match-col"><div className="cup"><span>{t.hand.cupSide(0)}</span></div><div className="rule-match-link cyan" /><div className="cup"><span>{t.hand.cupSide(1)}</span></div></div>
      </div>
      <span className="rule-match-tag">{r.you}</span>
      <div className="rule-match-legend">
        <span><i className="gold" />{r.legendLeft}</span>
        <span><i className="cyan" />{r.legendRight}</span>
      </div>
    </div>

    <div className="rule-effect-grid">
      <div className="rule-effect-card"><div className="rule-effect-die"><DieFace play={die('ruby', 5)} /></div><div><b>{r.jewel}</b><span>{r.jewelBody}</span></div></div>
      <div className="rule-effect-card"><div className="rule-effect-die"><DieFace play={die('thief')} /></div><div><b>{t.kinds.thief}</b><span>{r.thiefBody}</span></div></div>
      <div className="rule-effect-card"><div className="rule-effect-die"><DieFace play={die('poison')} /></div><div><b>{t.kinds.poison}</b><span>{r.poisonBody}</span></div></div>
      <div className="rule-effect-card"><div className="rule-effect-die"><DieFace play={die('mining')} /></div><div><b>{t.kinds.mining}</b><span>{r.miningBody}</span></div></div>
    </div>

    <div className="rule-warning">
      <b>{r.warning}</b>
      <div className="rule-compare">
        <div className="rule-compare-case bad"><div className="rule-compare-dice"><DieFace play={die('ruby', 4)} /><DieFace play={die('ruby', 4)} /></div><span className="rule-compare-tag">{r.doublesTag}</span><small>{r.doublesNote}</small></div>
        <div className="rule-compare-case good"><div className="rule-compare-dice"><DieFace play={die('ruby', 4)} /><DieFace play={die('sapphire', 4)} /></div><span className="rule-compare-tag">{r.okTag}</span><small>{r.okNote}</small></div>
        <div className="rule-compare-case bad"><div className="rule-compare-dice"><DieFace play={die('emerald', 3)} /><DieFace play={die('emerald', 3)} /></div><span className="rule-compare-tag">{r.clashTag}</span><small>{r.clashNote}</small></div>
      </div>
    </div>

    <p className="fine-print">{r.finePrint}</p>
    <button className="primary" onClick={onClose}>{r.start}</button>
  </section></div>;
}
