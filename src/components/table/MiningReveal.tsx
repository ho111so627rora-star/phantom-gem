'use client';
import { useEffect, useState } from 'react';
import type { Game } from '../../game/types';
import { COLORS } from '../../game/constants';
import { useI18n, displayName } from '../../i18n';
import { Gem } from '../Gem';

export function useMiningReveal(source: Game, me: string) {
  const events = ['result', 'poison'].includes(source.phase) ? (source.visualEvents || []).filter(e => e.type === 'mining' && e.player === me) : [];
  const key = events.length ? `${source.turn}:${events.map(e => e.die.id).join(':')}` : '';
  const [progress, setProgress] = useState({ key: '', step: 2 });
  const step = !key ? 2 : progress.key === key ? progress.step : 0;
  useEffect(() => {
    if (!key) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveal = setTimeout(() => setProgress({ key, step: 1 }), reduced ? 600 : 2400);
    const complete = setTimeout(() => setProgress({ key, step: 2 }), reduced ? 1900 : 4300 + (source.visualEvents?.length || 0) * 210);
    return () => { clearTimeout(reveal); clearTimeout(complete); };
  }, [key]);
  const ids = new Set(events.map(e => e.die.id));
  const game = step === 0 ? {
    ...source,
    players: source.players.map(p => ({ ...p, bag: p.bag.filter(d => !ids.has(d.id)) })),
    visualEvents: source.visualEvents?.filter(e => e.type !== 'mining'),
    logs: source.logs.filter(log => !log.includes('が採掘！')),
  } : source;
  return { game, events, step, active: step < 2, mixing: step === 0 };
}

export function MiningReveal({ events, game, step }: { events: NonNullable<Game['visualEvents']>; game: Game; step: number }) {
  const { t } = useI18n();
  if (step >= 2 || !events.length) return null;
  return <div className={`mining-reveal ${step === 0 ? 'mixing' : 'revealed'}`} role="status" aria-label={step === 0 ? t.mining.mixingAria : t.mining.resultAria}>
    <span className="mining-title">{step === 0 ? t.mining.mixing : t.mining.result}</span>
    {step === 0 ? <div className="mining-tumbler" aria-hidden="true">{COLORS.map(color => <div key={color} className={`mined-cube ${color}`}><i /><i /><i /><i /><i /></div>)}<b>?</b></div> : <div className="mining-prizes">{events.map(e => <div key={e.die.id}><div className={`mined-cube ${e.die.kind}`} aria-hidden="true"><i /><i /><i /><i /><i /></div><span>{displayName(t, game.players.find(p => p.id === e.player)!.name)}</span><small><Gem kind={e.die.kind} />{t.kinds[e.die.kind]}</small></div>)}</div>}
  </div>;
}
