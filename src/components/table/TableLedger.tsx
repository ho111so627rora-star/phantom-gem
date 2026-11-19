import type { Game } from '../../game/types';
import { COLORS } from '../../game/constants';
import { useI18n, displayName } from '../../i18n';
import { score } from '../../game/engine';
import { Gem, DieFace } from '../Gem';

export function TableLedger({ game, me }: { game: Game; me: string }) {
  const { t } = useI18n(), lg = t.ledger, nm = (name: string) => displayName(t, name);
  const open = ['inspect', 'poison', 'result', 'over'].includes(game.phase);
  const activeColors = COLORS.filter(color => game.players.some(p => p.color === color));
  return <section className="table-ledger" aria-label={lg.aria}>
    {game.players.map(p => <article className={`ledger-seat ${p.color}`} key={p.id} data-ledger-player={p.id}>
      <header><Gem kind={p.color} /><b>{nm(p.name)}{p.id === me ? lg.youSuffix : ''}</b><strong>{score(p, game.phase === 'over').total}<small>pt</small></strong></header>
      {open && <><p className="ledger-label">{lg.played}</p><div className="ledger-plays" aria-label={lg.playedAria(nm(p.name))}>{game.selections[p.id]?.map((play, i) => <div key={i}><small>{t.hand.cupSide(i)}</small><DieFace play={play} /></div>)}</div></>}
      <p className="ledger-label">{lg.jewels}</p>
      <div className="ledger-jewels" aria-label={lg.breakdownAria(nm(p.name))}>{activeColors.map(color => {
        const jewels = p.jewels.filter(j => j.kind === color);
        return <div key={color}><Gem kind={color} /><span className={color}>{jewels.length ? [...new Set(jewels.map(j => j.value))].sort((a,b) => a-b).map(value => <b key={value} aria-label={t.intel.jewelAria(t.kinds[color], value, jewels.filter(j => j.value === value).length)}>{value}{jewels.filter(j => j.value === value).length > 1 && <small>×{jewels.filter(j => j.value === value).length}</small>}</b>) : <small>—</small>}</span></div>;
      })}</div>
      {open && game.phase !== 'inspect' && (game.visualEvents || []).filter(e => e.type === 'thief' && (e.player === p.id || e.from === p.id)).map(e => {
        const recipient = game.players.find(player => player.id === e.player)!;
        const sender = game.players.find(player => player.id === e.from)!;
        const awarded = recipient.jewels.find(j => j.id === e.die.id);
        return <div className="theft-receipt" key={e.die.id} data-theft-direction={p.id === e.player ? 'received' : 'lost'}><Gem kind="thief" /><span><b>{p.id === e.player ? lg.gotFrom(nm(sender.name)) : lg.lostTo(nm(recipient.name))}</b><span><Gem kind={e.die.kind} />{t.kinds[e.die.kind]} {e.die.value}</span><small>{awarded ? lg.scoredFor(nm(recipient.name), awarded.value) : lg.pending}</small></span></div>;
      })}
      {p.id === me && open && game.phase !== 'inspect' && (game.visualEvents || []).filter(e => e.type === 'mining' && e.player === me).map(e => <div className="mined-die" key={e.die.id} aria-label={lg.minedAria(nm(p.name), t.kinds[e.die.kind])}><div className={`mined-cube ${e.die.kind}`} aria-hidden="true"><i /><i /><i /><i /><i /></div><span><b>{lg.minedTitle}</b><small>{lg.minedAdded(t.kinds[e.die.kind])}</small><small>{lg.minedNote}</small></span></div>)}
    </article>)}
  </section>;
}
