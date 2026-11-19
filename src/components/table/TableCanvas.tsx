'use client';
import { useEffect, useRef, useState } from 'react';
import { createTable, type TableState } from './scene';
import { score } from '../../game/engine';
import { DieFace } from '../Gem';
import { specialUsage } from '../../game/playerStats';
import { useI18n, displayName } from '../../i18n';
export default function TableCanvas({ state, opponent, onSide, onChest, onPlayer }: { state: TableState; opponent: string; onSide: (side: number) => void; onChest: () => void; onPlayer: (id: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), container = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createTable> | null>(null);
  const callbacks = useRef({ onSide, onChest }); callbacks.current = { onSide, onChest };
  const latest = useRef(state); latest.current = state;
  const [fallback, setFallback] = useState(false), [loaded, setLoaded] = useState(false);
  const { t } = useI18n(), tb = t.table;
  useEffect(() => {
    if (!canvas.current) return;
    let context: ReturnType<typeof createTable> | null = null;
    try {
      context = createTable(canvas.current, (id, x, y) => {
        const node = container.current?.querySelector<HTMLElement>(`[data-anchor="${id}"]`);
        if (node && container.current) {
          const width = container.current.clientWidth, half = node.offsetWidth / 2 + 4;
          node.style.left = `${Math.max(half, Math.min(width - half, width * x / 100))}px`; node.style.top = `${y}%`;
        }
      }, side => callbacks.current.onSide(side), () => callbacks.current.onChest(), state.game.players.length);
      scene.current = context; context.update(latest.current); setLoaded(true);
    } catch { setFallback(true); }
    function lost(event: Event) { event.preventDefault(); setFallback(true); }
    const element = canvas.current; element.addEventListener('webglcontextlost', lost);
    return () => { element.removeEventListener('webglcontextlost', lost); context?.dispose(); scene.current = null; };
  }, [state.game.players.length]);
  useEffect(() => { scene.current?.update(state); }, [state]);
  const revealed = ['inspect', 'result', 'poison', 'over'].includes(state.game.phase);
  const myIndex = state.game.players.findIndex(p => p.id === state.me);
  const seatOffset = (index: number) => ((index - myIndex + state.game.players.length) % state.game.players.length) * 4 / state.game.players.length;
  const opponentOffset = seatOffset(state.game.players.findIndex(p => p.id === opponent));
  return <div className={`table-world ${loaded ? 'world-loaded' : ''} ${fallback ? 'world-fallback' : ''}`} ref={container} data-viewer-seat={state.me} data-match-from={state.me} data-match-to={opponent} data-renderer={fallback ? 'fallback' : loaded ? 'webgl' : 'loading'}>
    {!fallback && <canvas ref={canvas} className="table-canvas" aria-label={tb.canvasAria} />}
    {fallback && <div className="flat-table"><p>{tb.fallback}</p>{state.game.players.map((p, i) => <div className={`flat-seat flat-seat-${seatOffset(i)}`} key={p.id}>{(revealed ? state.game.selections[p.id] : p.id === state.me ? state.draft : [null, null])?.map((play, side) => <DieFace key={side} play={play} hidden={!revealed && (p.id !== state.me || state.locked.includes(p.id))} />)}</div>)}</div>}
    {fallback && state.game.phase !== 'over' && <svg className="flat-match-guide" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={tb.guideAria}><path d={opponentOffset === 1 ? 'M43 74 Q49 49 82 41' : opponentOffset === 2 ? 'M43 74 C22 64 22 35 43 24' : 'M43 74 Q23 69 18 55'} /><path className="right-cup-line" d={opponentOffset === 1 ? 'M57 74 Q79 69 82 55' : opponentOffset === 2 ? 'M57 74 C78 64 78 35 57 24' : 'M57 74 Q51 49 18 41'} /></svg>}
    {state.game.players.map((p, i) => <button type="button" aria-label={tb.nameplateAria(displayName(t, p.name))} onClick={() => onPlayer(p.id)} data-anchor={p.id} data-player={p.id} data-seat-offset={seatOffset(i)} key={p.id} className={`table-nameplate ${p.color} ${p.id === state.me ? 'my-nameplate' : ''} ${p.id === opponent ? 'rival-nameplate' : ''}`}>
      <span className="nameplate-dot" /><b>{displayName(t, p.name)}</b><span className="nameplate-score">{score(p, state.game.phase === 'over').total}<small>pt</small></span><small className="seat-caption">{p.id === state.me ? t.intel.yourSeat : p.id === opponent ? t.intel.thisOpponent : p.cpu ? tb.cpu : tb.player}{state.locked.includes(p.id) && !revealed ? tb.readySuffix : ''}</small>
      <span className="seat-usage"><small>{tb.usage}</small>{specialUsage(p).map(item => <span key={item.kind} title={tb.usageTitle(item.kind === 'mining' ? t.miningRight : t.kinds[item.kind], item.used, item.remaining)}><span>{t.usageAbbr[item.kind]}</span><b>{item.used}</b></span>)}</span>
    </button>)}
    {state.game.phase !== 'over' && <span className="match-legend"><span><i />{t.rules.legendLeft}</span><span><i className="right-cup-line" />{t.rules.legendRight}</span></span>}
    <button className="chest-label" data-anchor="chest" onClick={onChest} aria-label={tb.chestAria}><span>{tb.chest}</span><small>{tb.chestDice(state.game.miningCount ?? state.game.miningBag.length)}</small></button>
    {!loaded && !fallback && <div className="world-loading">{tb.seating}</div>}
  </div>;
}
