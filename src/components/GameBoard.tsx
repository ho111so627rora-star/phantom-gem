'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Eye, Gem as GemIcon, Swords, Trophy, X } from 'lucide-react';
import type { RoomView } from '../server/types';
import type { Selection } from '../game/types';
import { schedule, score } from '../game/engine';
import { useI18n, displayName, translateLog } from '../i18n';
import { Gem, DieFace } from './Gem';
import { Market } from './Market';
import { HandDock } from './table/HandDock';
import { TableLedger } from './table/TableLedger';
import { MiningReveal, useMiningReveal } from './table/MiningReveal';
import { TurnClock } from './table/TurnClock';
import { PlayerIntel } from './table/PlayerIntel';
import { useDialog } from './useDialog';
import { playSfx } from '../lib/sfx';
import './table/table.css';
const TableCanvas = dynamic(() => import('./table/TableCanvas'), { ssr: false, loading: () => <TableLoading /> });
function TableLoading() { const { t } = useI18n(); return <div className="table-world world-loading">{t.board.loadingTable}</div>; }

function Drawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useDialog(onClose);
  const { t } = useI18n();
  return <div className="table-drawer-backdrop" onClick={onClose}><section className="table-drawer" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}><div className="drawer-heading"><h2>{title}</h2><button className="icon-button" aria-label={t.board.backToTable} onClick={onClose}><X /></button></div>{children}</section></div>;
}
export function GameBoard({ room, busy, act, revealing }: { room: RoomView; busy: boolean; act: (action: string, data?: object) => Promise<void>; revealing: number | null }) {
  const mining = useMiningReveal(room.game!, room.me);
  const { t } = useI18n(), b = t.board, nm = (name: string) => displayName(t, name);
  const game = mining.game, player = game.players.find(p => p.id === room.me)!;
  const pair = schedule(game.turn, game.players.length).find(p => p.includes(game.players.indexOf(player)))!;
  const opponent = game.players[pair.find(i => game.players[i].id !== player.id)!];
  const [draft, setDraft] = useState<Selection>(game.selections[room.me] || [null, null]), [side, setSide] = useState(0);
  const [drawer, setDrawer] = useState<'market' | 'collection' | null>(null), [overhead, setOverhead] = useState(false);
  const [inspectedPlayer, setInspectedPlayer] = useState(opponent.id);
  const [settled, setSettled] = useState(true), previousPhase = useRef(game.phase);
  useEffect(() => { setDraft(game.selections[room.me] || [null, null]); setSide(0); }, [game.turn, room.me]);
  const mountedTurn = useRef(false);
  useEffect(() => { if (mountedTurn.current) playSfx('turn'); mountedTurn.current = true; }, [game.turn]);
  const wasCountdown = useRef(false);
  useEffect(() => {
    const countdown = game.phase === 'reveal';
    if (countdown && !wasCountdown.current) playSfx('reveal');
    wasCountdown.current = countdown;
  }, [game.phase]);
  const playedEventsTurn = useRef(-1), eventTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (!['inspect', 'poison', 'result', 'over'].includes(game.phase) || playedEventsTurn.current === game.turn) return;
    playedEventsTurn.current = game.turn;
    // Not returned as cleanup: polling gives visualEvents a new reference every ~550ms, which would
    // otherwise cancel these before the staggered reveal (900ms+) gets a chance to fire.
    (game.visualEvents || []).forEach((event, i) => eventTimeouts.current.push(setTimeout(() => {
      if (event.type === 'thief') playSfx('steal');
      else if (event.type === 'collision') playSfx('collision');
      else if (event.type === 'mining') playSfx('mining');
    }, 900 + i * 210)));
  }, [game.phase, game.turn, game.visualEvents]);
  useEffect(() => () => eventTimeouts.current.forEach(clearTimeout), []);
  const playedVictory = useRef(false);
  useEffect(() => {
    if (game.phase === 'over') { if (!playedVictory.current) { playSfx('victory'); playedVictory.current = true; } }
    else playedVictory.current = false;
  }, [game.phase]);
  useEffect(() => {
    const previous = previousPhase.current; previousPhase.current = game.phase;
    if (game.phase === 'select' || game.phase === 'reveal' || game.phase === 'inspect') { setSettled(false); return; }
    if (previous === 'select' || previous === 'reveal' || previous === 'inspect') {
      const timeout = setTimeout(() => setSettled(true), matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : 1900 + (game.visualEvents?.length || 0) * 210);
      return () => clearTimeout(timeout);
    }
    setSettled(true);
  }, [game.phase, game.turn]);
  const locked = room.locked.includes(room.me), task = game.poisonTasks[0], final = game.phase === 'over';
  const effectiveDraft = locked ? game.selections[room.me] || draft : draft;
  const ranking = [...game.players].sort((a, b) => score(b, true).total - score(a, true).total);
  const winners = ranking.filter(p => score(p, true).total === score(ranking[0], true).total);
  const countdown = game.phase === 'reveal';
  const lastEvent = game.visualEvents?.find(e => e.type === 'mining') || game.visualEvents?.[0];
  return <main className="table-game"><div className="table-hud"><div className="table-turn"><span>TURN</span><b>{String(game.turn).padStart(2, '0')}</b><span>/ 10</span></div><div className="table-match"><Swords /><span>{b.opponent} <b>{nm(opponent.name)}</b></span><Gem kind={opponent.color} /></div><button className={`view-button ${overhead ? 'active' : ''}`} aria-label={overhead ? b.viewOwnAria : b.viewOverheadAria} aria-pressed={overhead} onClick={() => setOverhead(!overhead)}><Eye /><span>{overhead ? b.viewOwn : b.viewOverhead}</span></button></div>
    {game.phase === 'select' && room.selectionDeadline && <TurnClock deadline={room.selectionDeadline} serverNow={room.serverNow} />}
    {!!room.timedOut?.length && game.phase !== 'select' && <p className="timeout-note">{b.timedOut(game.players.filter(p => room.timedOut!.includes(p.id)).map(p => nm(p.name)).join(b.nameJoin))}</p>}
    {!final && game.phase !== 'select' && <section className="table-aftermath" aria-live="polite">
      {countdown ? <><span className="aftermath-label">EVERYONE READY</span><h2>{b.countdownTitle}</h2><p>{b.countdownBody}</p></> : game.phase === 'inspect' ? <><span className="aftermath-label">CUPS OPEN</span><h2>{b.inspectTitle}</h2><p>{b.inspectBody}</p></> : !settled || mining.active ? <><span className="aftermath-label">ON THE TABLE</span><h2>{b.resolvingTitle}</h2><p>{b.resolvingBody}</p></> : game.phase === 'poison' && task ? <><span className="aftermath-label">POISON COUNTER</span><h2>{task.actor === room.me ? b.poisonChoose : b.poisonWaiting(nm(game.players.find(p => p.id === task.actor)!.name))}</h2>{task.actor === room.me && <div className="physical-poison-picks">{game.players.find(p => p.id === task.target)!.jewels.filter(j => task.candidates.includes(j.id)).map(j => <button key={j.id} aria-label={b.poisonPickAria(t.kinds[j.kind], j.value)} disabled={busy} onClick={() => { playSfx('poison'); void act('poison', { jewelId: j.id }); }}><DieFace play={j} /></button>)}</div>}</> : <><div className="aftermath-summary"><span className="aftermath-label">TURN {game.turn} COMPLETE</span><h2>{b.nextTitle}</h2><p>{game.logs.filter(log => log.startsWith(player.name)).slice(-2).map(log => translateLog(t, log, game.players.map(p => p.name))).join(' ') || b.noLog}</p></div><button className="primary next-hand" disabled={busy || room.ready.includes(room.me)} onClick={() => void act('ready')}>{room.ready.includes(room.me) ? b.waitingReady(room.ready.length, room.humanCount) : game.turn === 10 ? b.finalResult : b.nextTurn}<ArrowRight /></button></>}
    </section>}
    <section className="table-stage" aria-label={b.stageAria(game.players.length)}>
      <TableCanvas state={{ game, me: room.me, draft: effectiveDraft, side, locked: room.locked, overhead, revealAt: room.revealAt, serverNow: room.serverNow, miningMixing: mining.mixing }} opponent={opponent.id} onSide={setSide} onChest={() => setDrawer('market')} onPlayer={id => { setInspectedPlayer(id); setDrawer('collection'); }} />
      <div className="turn-flash" key={game.turn} aria-hidden="true" />
      <div className="table-tools"><button onClick={() => setDrawer('market')}><GemIcon /><span>{b.toolMarket}</span></button><button onClick={() => { setInspectedPlayer(opponent.id); setDrawer('collection'); }}><Trophy /><span>{b.toolIntel}</span></button></div>
      <MiningReveal events={mining.events} game={game} step={mining.step} />
      {countdown && <div className="table-countdown" role="status"><span>{b.allReady}</span><strong key={revealing}>{revealing || b.go}</strong><h2>{b.countdownHeading}</h2></div>}
      {!settled && !mining.active && !countdown && game.phase !== 'select' && game.phase !== 'inspect' && <div className="table-event" role="status"><b>OPEN!</b><span>{lastEvent?.type === 'mining' ? b.eventMining : lastEvent?.type === 'thief' ? b.eventThief : lastEvent?.type === 'collision' ? b.eventClash : b.eventDefault(game.players.length)}</span></div>}
      {final && <div className="table-final"><Trophy /><p className="eyebrow">THE HUNT IS COMPLETE</p><h1>{winners.map(p => nm(p.name)).join(b.winnersJoin)}<span>{winners.length > 1 ? b.tie : b.win}</span></h1><div className="table-ranking">{ranking.map(p => <div key={p.id}><Gem kind={p.color} /><b>{nm(p.name)}</b><small>{b.jewelsScore(score(p).base)}{p.completionBonus !== false && b.bonusScore(score(p).bonus)}</small><strong>{score(p, true).total}pt</strong></div>)}</div>{room.host ? <button className="primary" disabled={busy} onClick={() => void act('rematch')}>{b.rematch}<ArrowRight /></button> : <p>{b.hostCanStart}</p>}</div>}
    </section>
    {!final && game.phase === 'select' && <HandDock game={game} player={player} draft={effectiveDraft} side={side} locked={locked} busy={busy} onDraft={setDraft} onSide={setSide} onLock={() => void act('select', { selection: draft })} />}
    <TableLedger game={game} me={room.me} />
    {drawer && <Drawer title={drawer === 'market' ? b.drawerMarket : b.drawerIntel} onClose={() => setDrawer(null)}>{drawer === 'market' ? <><p className="drawer-note">{b.chestNote(game.miningCount ?? game.miningBag.length)}</p><Market game={game} /></> : <PlayerIntel game={game} selected={inspectedPlayer} opponent={opponent.id} me={room.me} onSelect={setInspectedPlayer} />}</Drawer>}
  </main>;
}
