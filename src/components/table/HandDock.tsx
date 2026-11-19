'use client';
import { ArrowRight, Check, LockKeyhole } from 'lucide-react';
import type { Game, Kind, Player, Selection } from '../../game/types';
import { COLORS, isJewel } from '../../game/constants';
import { useI18n } from '../../i18n';
import { selectableValues } from '../../game/engine';
import { PieceIcon } from './PieceIcon';
import { playSfx } from '../../lib/sfx';
export function HandDock({ game, player, draft, side, locked, busy, onDraft, onSide, onLock }: { game: Game; player: Player; draft: Selection; side: number; locked: boolean; busy: boolean; onDraft: (s: Selection) => void; onSide: (s: number) => void; onLock: () => void }) {
  const selected = draft[side];
  const { t } = useI18n(), h = t.hand;
  const count = draft.filter(Boolean).length, required = Math.min(2, player.bag.length);
  function put(kind: Kind) {
    const die = player.bag.find(d => d.kind === kind && d.id !== draft[1 - side]?.id); if (!die) return;
    const next: Selection = [...draft]; next[side] = { ...die, value: isJewel(kind) ? selectableValues(game, kind, draft[1 - side]).at(-1)! : 0 }; onDraft(next);
    playSfx('select');
    if (!isJewel(kind) && side === 0 && !draft[1]) onSide(1);
  }
  const double = draft[0] && draft[1] && isJewel(draft[0].kind) && isJewel(draft[1].kind) && draft[0].kind === draft[1].kind && draft[0].value === draft[1].value;
  return <section className={`hand-dock ${locked ? 'hand-locked' : ''}`} aria-label={h.aria}><div className="hand-topline"><h2>{locked ? h.lockedTitle : h.title}</h2><span>{h.handCount(player.bag.length)}</span></div>
    <p className="cup-facing-hint">{h.facing(side)}</p>
    <div className="hand-layout"><div className="cup-switch">{[0, 1].map(i => <button key={i} disabled={locked} aria-label={h.cupAria(i)} aria-pressed={side === i} className={side === i ? 'active' : ''} onClick={() => onSide(i)}><span>{i === 0 ? 'L' : 'R'}</span><b>{draft[i] ? `${t.kinds[draft[i]!.kind]}${isJewel(draft[i]!.kind) ? ` ${draft[i]!.value}` : ''}` : h.cupEmpty(i)}</b>{draft[i] && <Check />}</button>)}</div>
      {!locked && <div className="physical-inventory">{([...COLORS, 'thief', 'mining', 'poison'] as Kind[]).filter(kind => player.bag.some(d => d.kind === kind)).map(kind => {
        const available = player.bag.filter(d => d.kind === kind && d.id !== draft[1 - side]?.id).length;
        return <button key={kind} disabled={!available || busy} className={selected?.kind === kind ? 'chosen' : ''} aria-label={h.remainingAria(t.kinds[kind], available)} onClick={() => put(kind)}><PieceIcon kind={kind} /><span>{kind === 'mining' ? t.miningRight : t.kinds[kind]}</span><small>×{available}</small></button>;
      })}</div>}
      <button className="primary cover-cups" disabled={locked || busy || count !== required} onClick={() => { playSfx('lock'); onLock(); }}><LockKeyhole />{locked ? h.ready : required === 0 ? h.passWait : h.cover}{!locked && <ArrowRight />}</button>
    </div>
    {!locked && <div className="hand-bottomline">{selected && isJewel(selected.kind) ? <div className="die-values"><span>{h.faceUp}</span>{[1, 2, 3, 4, 5, 6].map(value => <button key={value} disabled={!selectableValues(game, selected.kind as typeof COLORS[number], draft[1 - side]).includes(value)} aria-label={h.valueAria(value)} aria-pressed={selected.value === value} className={selected.value === value ? 'active' : ''} onClick={() => { const next: Selection = [...draft]; next[side] = { ...selected, value }; onDraft(next); playSfx('select'); if (side === 0 && !draft[1]) onSide(1); }}>{value}</button>)}</div> : <p>{selected?.kind === 'mining' ? h.hintMining : selected?.kind === 'poison' ? h.hintPoison : selected?.kind === 'thief' ? h.hintThief : h.hintDefault}</p>}{double && <span className="hand-warning">{h.doubleWarning}</span>}</div>}
    {locked && <p className="hand-secret">{h.secret}</p>}
  </section>;
}
