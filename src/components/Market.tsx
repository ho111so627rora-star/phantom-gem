import { Gem } from './Gem';
import { COLORS } from '../game/constants';
import { useI18n, displayName } from '../i18n';
import type { Game } from '../game/types';
export function Market({ game }: { game: Game }) {
  const { t } = useI18n(), m = t.market;
  const activeColors = COLORS.filter(color => game.players.some(p => p.color === color));
  return <section className="market"><div className="section-heading"><div><p className="eyebrow">JEWEL MARKET</p><h2>{m.title}</h2></div><span>{m.sub}</span></div><div className="market-rows">{activeColors.map(color => <div className={`market-row ${color}`} key={color}><div className="market-name"><Gem kind={color} /><span>{t.kinds[color]}</span></div><div className="market-numbers">{game.market[color].map((owner, i) => <div key={i} className={`market-slot ${owner ? 'claimed' : ''}`} title={owner ? m.claimedBy(displayName(t, game.players.find(p => p.id === owner)?.name ?? '')) : m.unclaimed(i + 1)}><b>{i + 1}</b>{owner && <span className={game.players.find(p => p.id === owner)!.color}>{game.players.findIndex(p => p.id === owner) + 1}</span>}</div>)}</div>{game.market[color].every(Boolean) && <span className="sold-label">{m.soldOut}</span>}</div>)}</div></section>;
}
