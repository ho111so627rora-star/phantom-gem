'use client';
import { roomFetch, homePath, basePath } from '../lib/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleHelp, LogOut, Gem as GemIcon, X, ArrowLeft, Languages } from 'lucide-react';
import type { RoomView, Session } from '../server/types';
import { Home } from '../components/Home';
import { Lobby } from '../components/Lobby';
import { GameBoard } from '../components/GameBoard';
import { Rules } from '../components/Rules';
import { Bgm } from '../components/Bgm';
import { LanguagePicker } from '../components/LanguagePicker';
import { useI18n, translateError } from '../i18n';

export default function Page() {
  const [session, setSession] = useState<Session | null>(null), [room, setRoom] = useState<RoomView | null>(null);
  const [rules, setRules] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [revealing, setRevealing] = useState<number | null>(null), [leave, setLeave] = useState(false), [language, setLanguage] = useState(false);
  const { t } = useI18n();
  const previous = useRef<string | null>(null), requestVersion = useRef(0);
  useEffect(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type !== 'reload') {
      try { sessionStorage.removeItem('jewel-hunt-session'); } catch { /* Storage may be unavailable. */ }
      return;
    }
    try { const saved = sessionStorage.getItem('jewel-hunt-session'); if (saved) { const s = JSON.parse(saved) as Session; setSession(s); } } catch { /* Storage may be unavailable in private browsers. */ }
  }, []);
  const accept = useCallback((view: RoomView) => {
    const phase = view.game ? `${view.game.turn}:${view.game.phase}` : 'lobby';
    if (view.game?.phase === 'reveal') setRevealing(Math.max(0, Math.ceil(((view.revealAt || 0) - (view.serverNow || Date.now())) / 1000)));
    else setRevealing(null);
    previous.current = phase; setRoom(view);
  }, []);
  useEffect(() => {
    if (revealing === null) return;
    const timeout = setTimeout(() => setRevealing(revealing > 0 ? revealing - 1 : 0), 1000);
    return () => clearTimeout(timeout);
  }, [revealing]);
  useEffect(() => {
    if (!session) return;
    let stopped = false; let timer: ReturnType<typeof setTimeout>; const controller = new AbortController();
    const poll = async () => {
      const version = requestVersion.current;
      try {
        const response = await roomFetch(`?code=${session.code}`, { headers: { Authorization: `Bearer ${session.token}` }, cache: 'no-store', signal: controller.signal });
        const view = await response.json(); if (!response.ok) throw new Error(view.error);
        if (!stopped && version === requestVersion.current) { accept(view); setError(''); }
      } catch (e) { if (!stopped) setError(e instanceof Error ? e.message : '再接続しています…'); }
      if (!stopped) timer = setTimeout(poll, 550);
    };
    void poll(); return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [session, accept]);
  function saveSession(s: Session) {
    try { sessionStorage.setItem('jewel-hunt-session', JSON.stringify(s)); } catch { /* The session remains usable in memory. */ }
    previous.current = null; setRoom(null); setSession(s); setError('');
  }
  async function act(action: string, data: object = {}) {
    if (!session || busy) return;
    requestVersion.current++; setBusy(true); setError('');
    try {
      const response = await roomFetch('', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ action, code: session.code, ...data }) });
      const view = await response.json(); if (!response.ok) throw new Error(view.error); accept(view);
    } catch (e) { setError(e instanceof Error ? e.message : '操作に失敗しました'); } finally { requestVersion.current++; setBusy(false); }
  }
  function home() {
    try { sessionStorage.removeItem('jewel-hunt-session'); } catch { /* Storage may be unavailable. */ }
    setSession(null); setRoom(null); setLeave(false); setRevealing(null); setError(''); previous.current = null; history.replaceState({}, '', homePath); }
  return <div className={`app-shell ${room?.game ? 'at-the-table' : 'front-room'}`}><header className="site-header"><button className="brand" onClick={() => session ? setLeave(true) : home()} aria-label={t.header.homeAria}><GemIcon /><span>PHANTOM GEM<small>{t.header.brandSub}</small></span></button><div className="header-actions"><Bgm inBattle={!!room?.game} />{room &&<span className="header-room">{t.header.room} <b>{room.code}</b></span>}<button className="help-button" aria-label={t.header.help} onClick={() => setRules(true)}><CircleHelp /><span>{t.header.help}</span></button><button className="help-button language-button" aria-label={t.header.languageAria} aria-haspopup="dialog" onClick={() => setLanguage(true)}><Languages /><span>{t.header.language}</span></button>{session && <button className="icon-button" onClick={() => setLeave(true)} aria-label={t.header.backHomeAria}><LogOut /></button>}</div></header>
    {error && <div className="error-banner" role="alert">{translateError(t, error)}<button className="icon-button" onClick={() => setError('')} aria-label={t.app.closeNotice}><X /></button></div>}
    {!session ? <Home onSession={saveSession} onRules={() => setRules(true)} /> : !room ? <main className="loading"><GemIcon /><h2>{t.app.connectingTable}</h2><button className="text-button" onClick={home}><ArrowLeft />{t.app.backHome}</button></main> : !room.game ? <Lobby room={room} act={act} busy={busy} /> : <GameBoard room={room} act={act} busy={busy} revealing={revealing} />}
    <footer className="site-footer"><span>PHANTOM GEM</span><span>{t.app.footerTagline}</span><span className="footer-links"><a href={basePath + '/support/'}>{t.app.support}</a><a href={basePath + '/privacy/'}>{t.app.privacy}</a></span></footer>
    {rules && <Rules onClose={() => setRules(false)} />}
    {language && <LanguagePicker onClose={() => setLanguage(false)} />}
    {leave && <div className="modal-backdrop"><section className="modal leave-modal" role="dialog" aria-modal="true" aria-labelledby="leave-title"><h2 id="leave-title">{t.app.leaveTitle}</h2><p>{t.app.leaveBody}</p><button className="primary" onClick={home}>{t.app.leaveConfirm}</button><button className="text-button" onClick={() => setLeave(false)}>{t.app.leaveCancel}</button></section></div>}
  </div>;
}
