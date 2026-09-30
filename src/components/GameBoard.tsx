'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Eye, Gem as GemIcon, Swords, Trophy, X } from 'lucide-react';
import type { RoomView } from '../server/types';
import type { Selection } from '../game/types';
import { schedule, score } from '../game/engine';
import { LABELS } from '../game/constants';
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
const TableCanvas = dynamic(() => import('./table/TableCanvas'), { ssr: false, loading: () => <div className="table-world world-loading">卓の準備をしています…</div> });

function Drawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useDialog(onClose);
  return <div className="table-drawer-backdrop" onClick={onClose}><section className="table-drawer" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}><div className="drawer-heading"><h2>{title}</h2><button className="icon-button" aria-label="卓に戻る" onClick={onClose}><X /></button></div>{children}</section></div>;
}
export function GameBoard({ room, busy, act, revealing }: { room: RoomView; busy: boolean; act: (action: string, data?: object) => Promise<void>; revealing: number | null }) {
  const mining = useMiningReveal(room.game!, room.me);
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
  return <main className="table-game"><div className="table-hud"><div className="table-turn"><span>TURN</span><b>{String(game.turn).padStart(2, '0')}</b><span>/ 10</span></div><div className="table-match"><Swords /><span>今回の相手 <b>{opponent.name}</b></span><Gem kind={opponent.color} /></div><button className={`view-button ${overhead ? 'active' : ''}`} aria-label={overhead ? '自分の視点に戻す' : '卓を上から見る'} aria-pressed={overhead} onClick={() => setOverhead(!overhead)}><Eye /><span>{overhead ? '自分の視点へ' : '卓を見渡す'}</span></button></div>
    {game.phase === 'select' && room.selectionDeadline && <TurnClock deadline={room.selectionDeadline} serverNow={room.serverNow} />}
    {!!room.timedOut?.length && game.phase !== 'select' && <p className="timeout-note">時間切れのため、{game.players.filter(p => room.timedOut!.includes(p.id)).map(p => p.name).join('・')}の駒をCPUが選択しました。</p>}
    {!final && game.phase !== 'select' && <section className="table-aftermath" aria-live="polite">
      {countdown ? <><span className="aftermath-label">EVERYONE READY</span><h2>手を添えて、その瞬間を待とう。</h2><p>全員のカップを同じ合図で持ち上げます。</p></> : game.phase === 'inspect' ? <><span className="aftermath-label">CUPS OPEN</span><h2>みんなの一手を確認しよう</h2><p>まもなく、採掘・泥棒・バッティングの処理が始まります。</p></> : !settled || mining.active ? <><span className="aftermath-label">ON THE TABLE</span><h2>宝石の行方を、見届けよう。</h2><p>採掘・泥棒・バッティングを卓上で処理しています。</p></> : game.phase === 'poison' && task ? <><span className="aftermath-label">POISON COUNTER</span><h2>{task.actor === room.me ? '失わせる宝石を選んでください' : `${game.players.find(p => p.id === task.actor)!.name}が劇薬の対象を選んでいます`}</h2>{task.actor === room.me && <div className="physical-poison-picks">{game.players.find(p => p.id === task.target)!.jewels.filter(j => task.candidates.includes(j.id)).map(j => <button key={j.id} aria-label={`${LABELS[j.kind]} ${j.value}を失わせる`} disabled={busy} onClick={() => { playSfx('poison'); void act('poison', { jewelId: j.id }); }}><DieFace play={j} /></button>)}</div>}</> : <><div className="aftermath-summary"><span className="aftermath-label">TURN {game.turn} COMPLETE</span><h2>次は、どんな一手を隠す？</h2><p>{game.logs.filter(log => log.startsWith(player.name)).slice(-2).join(' ') || '駆け引きは、まだ続く。'}</p></div><button className="primary next-hand" disabled={busy || room.ready.includes(room.me)} onClick={() => void act('ready')}>{room.ready.includes(room.me) ? `みんなの確認待ち ${room.ready.length}/${room.humanCount}` : game.turn === 10 ? '最終結果を見る' : '次のターンへ'}<ArrowRight /></button></>}
    </section>}
    <section className="table-stage" aria-label={game.players.length + '人で囲むゲーム卓'}>
      <TableCanvas state={{ game, me: room.me, draft: effectiveDraft, side, locked: room.locked, overhead, revealAt: room.revealAt, serverNow: room.serverNow, miningMixing: mining.mixing }} opponent={opponent.id} onSide={setSide} onChest={() => setDrawer('market')} onPlayer={id => { setInspectedPlayer(id); setDrawer('collection'); }} />
      <div className="turn-flash" key={game.turn} aria-hidden="true" />
      <div className="table-tools"><button onClick={() => setDrawer('market')}><GemIcon /><span>宝石の空き目</span></button><button onClick={() => { setInspectedPlayer(opponent.id); setDrawer('collection'); }}><Trophy /><span>みんなの持ち物</span></button></div>
      <MiningReveal events={mining.events} game={game} step={mining.step} />
      {countdown && <div className="table-countdown" role="status"><span>全員の準備がそろいました</span><strong key={revealing}>{revealing || 'せーの！'}</strong><h2>せーので、カップを公開。</h2></div>}
      {!settled && !mining.active && !countdown && game.phase !== 'select' && game.phase !== 'inspect' && <div className="table-event" role="status"><b>OPEN!</b><span>{lastEvent?.type === 'mining' ? '宝箱から、新しいサイコロがプレイヤーの席へ。' : lastEvent?.type === 'thief' ? '泥棒が動いた！ 宝石の行方は…' : lastEvent?.type === 'collision' ? '同じ宝石が重なった！ 宝箱へ戻ります。' : '4人の一手が、明らかに。'}</span></div>}
      {final && <div className="table-final"><Trophy /><p className="eyebrow">THE HUNT IS COMPLETE</p><h1>{winners.map(p => p.name).join(' ＆ ')}<span>{winners.length > 1 ? '同率優勝！' : 'の勝利！'}</span></h1><div className="table-ranking">{ranking.map(p => <div key={p.id}><Gem kind={p.color} /><b>{p.name}</b><small>宝石{score(p).base}{p.completionBonus !== false && <> ＋ ボーナス{score(p).bonus}</>}</small><strong>{score(p, true).total}pt</strong></div>)}</div>{room.host ? <button className="primary" disabled={busy} onClick={() => void act('rematch')}>もう一度、この卓で遊ぶ<ArrowRight /></button> : <p>ホストが次のゲームを開始できます。</p>}</div>}
    </section>
    {!final && game.phase === 'select' && <HandDock game={game} player={player} draft={effectiveDraft} side={side} locked={locked} busy={busy} onDraft={setDraft} onSide={setSide} onLock={() => void act('select', { selection: draft })} />}
    <TableLedger game={game} me={room.me} />
    {drawer && <Drawer title={drawer === 'market' ? '宝箱と宝石マーケット' : 'みんなの宝石と使用状況'} onClose={() => setDrawer(null)}>{drawer === 'market' ? <><p className="drawer-note">宝箱には{(game.miningCount ?? game.miningBag.length)}個のサイコロ。採掘権を使うと、ここから1個取って手持ちに加えます。</p><Market game={game} /></> : <PlayerIntel game={game} selected={inspectedPlayer} opponent={opponent.id} me={room.me} onSelect={setInspectedPlayer} />}</Drawer>}
  </main>;
}
