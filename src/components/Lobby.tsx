'use client';
import { useState } from 'react';
import { Check, Copy, Bot, UserRound, ArrowRight } from 'lucide-react';
import type { RoomView } from '../server/types';
import { COLORS } from '../game/constants';
import { useI18n, displayName } from '../i18n';
import { Gem } from './Gem';
export function Lobby({ room, act, busy }: { room: RoomView; act: (action: string, data?: object) => Promise<void>; busy: boolean }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n(), l = t.lobby;
  const full = room.seats.every(s => s.joined);
  const myColor = room.seats.find(s => s.id === room.me)?.color || 'ruby';
  async function copy() { try { await navigator.clipboard.writeText(room.code); setCopied(true); } catch { setCopied(false); } }
  return <main className="lobby">
    <div className="tavern-scene" aria-hidden="true"><i className="tavern-lantern lantern-a" /><i className="tavern-lantern lantern-b" /><i className="tavern-lantern lantern-c" /></div>
    <p className="lobby-caption">{l.caption}</p><h1>{l.title}</h1><p className="muted">{room.humanCount === 1 ? l.cpuReady : l.inviteFriends}</p>
    <div className="room-ticket"><span className="ticket-seal" aria-hidden="true"><Gem kind={myColor} /></span><span>{l.inviteCode}</span><strong>{room.code}</strong><button className="icon-button" onClick={copy} aria-label={l.copyAria}>{copied ? <Check /> : <Copy />}</button></div>{copied && <p role="status" className="muted">{l.copied}</p>}
    <div className="tavern-table">
      <div className="lobby-seats">{room.seats.map(s => <div className={`lobby-seat ${s.color} ${s.joined ? '' : 'vacant'}`} key={s.id}><span className="seat-type">{s.cpu ? <Bot /> : <UserRound />}{s.cpu ? 'CPU' : s.id === room.me ? l.you : l.participant}</span><Gem kind={s.color} /><h3>{displayName(t, s.name)}</h3><span className="seat-ready">{s.joined ? <><Check />{l.ready}</> : l.waiting}</span></div>)}</div>
    </div>
    <div className="color-picker"><span>{l.yourGem}</span>{COLORS.map(c => <button key={c} aria-label={t.kinds[c]} aria-pressed={room.seats.find(s => s.id === room.me)?.color === c} disabled={busy || room.seats.some(s => s.id !== room.me && !s.cpu && s.joined && s.color === c)} onClick={() => void act('color', { color: c })}><Gem kind={c} /><span>{t.kinds[c]}</span></button>)}</div>
    {room.host ? <button className="primary lobby-start" disabled={!full || busy} onClick={() => void act('start')}>{full ? l.startAll : l.waitingFriends}<ArrowRight /></button> : <p className="waiting-message">{l.waitHost}</p>}
  </main>;
}
