'use client';
import { roomFetch } from '../lib/api';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BoxCover } from './BoxCover';
import './front.css';
import type { Session } from '../server/types';
import { useI18n, translateError } from '../i18n';
export function Home({ onSession, onRules }: { onSession: (s: Session) => void; onRules: () => void }) {
  const [count, setCount] = useState(1), [name, setName] = useState(''), [code, setCode] = useState('');
  const [mode, setMode] = useState<'standard' | 'duel'>('standard');
  const [tab, setTab] = useState('create'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const { t } = useI18n(), h = t.home;
  const maxHuman = mode === 'duel' ? 2 : 4;
  function selectMode(next: 'standard' | 'duel') { setMode(next); setCount(c => Math.min(c, next === 'duel' ? 2 : 4)); }
  async function submit() {
    setBusy(true); setError('');
    try {
      const response = await roomFetch('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: tab, humanCount: count, name, code, mode }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error); onSession(result);
    } catch (e) { setError(e instanceof Error ? e.message : h.connectFailed); } finally { setBusy(false); }
  }
  return <main className="home">
    <section className="hero"><div className="hero-copy"><p className="cover-kicker">{h.kicker}</p><h1 className="hero-title">{h.title}<span>PHANTOM GEM</span></h1><p className="hero-tagline">{h.tagline}</p><p className="hero-description">{h.descLine1}<br />{h.descLine2}</p></div><BoxCover /><p className="box-specs"><span>{h.specPlayers}</span><span>{h.specTime}</span></p></section>
    <section className="setup-panel"><div className="panel-heading"><h2>{h.setupTitle}</h2><p>{h.setupSub}</p></div>
      <div className="tabs"><button className={tab === 'create' ? 'active' : ''} onClick={() => { setTab('create'); setError(''); }}>{h.tabCreate}</button><button className={tab === 'join' ? 'active' : ''} onClick={() => { setTab('join'); setError(''); }}>{h.tabJoin}</button></div>
      <form onSubmit={e => { e.preventDefault(); void submit(); }}><label className="field-label" htmlFor="hunter-name">{h.nameLabel}<span>{h.nameLimit}</span></label><input id="hunter-name" maxLength={16} placeholder={h.namePlaceholder} value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" />
        {tab === 'create' ? <><label className="field-label">{h.modeLabel}</label><div className="player-count cols-2"><button type="button" aria-pressed={mode === 'standard'} className={mode === 'standard' ? 'selected' : ''} onClick={() => selectMode('standard')}><b>{h.modeStandardCount}</b><span>{h.modeStandard}</span></button><button type="button" aria-pressed={mode === 'duel'} className={mode === 'duel' ? 'selected' : ''} onClick={() => selectMode('duel')}><b>{h.modeDuelCount}</b><span>{h.modeDuel}</span></button></div><div className="cpu-note"><span>{mode === 'duel' ? h.duelNote : h.standardNote}</span></div>
        <label className="field-label">{h.countLabel}<span>{h.countSub}</span></label><div className={`player-count ${mode === 'duel' ? 'cols-2' : ''}`}>{Array.from({ length: maxHuman }, (_, i) => i + 1).map(n => <button type="button" key={n} aria-pressed={count === n} className={count === n ? 'selected' : ''} onClick={() => setCount(n)}><b>{n}</b><span>{h.countUnit(n)}</span></button>)}</div><div className="cpu-note"><span>{count === maxHuman ? h.countFull(maxHuman) : h.countWithCpu(count, maxHuman - count)}</span></div></> : <><label className="field-label" htmlFor="room-code">{h.roomCode}</label><input className="code-input" id="room-code" maxLength={6} placeholder="ABC123" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))} autoCapitalize="characters" autoComplete="off" required /></>}
        {error && <p role="alert" className="error">{translateError(t, error)}</p>}<button className="primary start-button" disabled={busy || (tab === 'join' && code.length !== 6)}>{busy ? h.connecting : tab === 'create' ? h.start : h.join}<ArrowRight /></button>
      </form><p className="setup-footnote">{h.footnote}</p>
    </section>
    <section className="home-bottom"><p>{h.firstTime}<br /><span>{h.firstTimeSub}</span></p><button className="rules-link" onClick={onRules}>{h.readRules} <ArrowRight /></button></section>
  </main>;
}
