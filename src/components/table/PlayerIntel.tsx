import { COLORS } from '../../game/constants';
import { useI18n, displayName } from '../../i18n';
import { score } from '../../game/engine';
import { specialUsage } from '../../game/playerStats';
import type { Game } from '../../game/types';
import { Gem } from '../Gem';
export function PlayerIntel({ game, selected, opponent, me, onSelect }: { game: Game; selected: string; opponent: string; me: string; onSelect: (id: string) => void }) {
  const player = game.players.find(p => p.id === selected) || game.players[0];
  const { t } = useI18n(), x = t.intel;
  const points = score(player, game.phase === 'over');
  const activeColors = COLORS.filter(color => game.players.some(p => p.color === color));
  return <div className="player-intel"><div className="intel-tabs" role="tablist" aria-label={x.tablistAria}>{game.players.map(p => <button key={p.id} role="tab" id={`intel-tab-${p.id}`} aria-controls="intel-panel" aria-selected={p.id === player.id} onClick={() => onSelect(p.id)}><Gem kind={p.color} /><span>{displayName(t, p.name)}</span></button>)}</div>
    <section id="intel-panel" role="tabpanel" aria-labelledby={`intel-tab-${player.id}`}><div className="intel-heading"><div><span>{player.id === me ? x.yourSeat : player.id === opponent ? x.thisOpponent : x.publicInfo}</span><h3><Gem kind={player.color} />{displayName(t, player.name)}</h3></div><strong>{points.total}<small>pt</small></strong></div>
      <h4>{x.jewelsHeading}</h4><div className="intel-jewels">{activeColors.map(color => {
        const jewels = player.jewels.filter(j => j.kind === color).sort((a, b) => b.value - a.value);
        const counts = new Map<number, number>(); jewels.forEach(j => counts.set(j.value, (counts.get(j.value) || 0) + 1));
        return <div className={`intel-color-row ${color}`} key={color}><span><Gem kind={color} />{t.kinds[color]}</span><div>{counts.size ? [...counts].map(([value, count]) => <b key={value} aria-label={x.jewelAria(t.kinds[color], value, count)}>{value}{count > 1 && <small>×{count}</small>}</b>) : <small className="intel-none">{x.none}</small>}</div><strong>{jewels.reduce((sum, j) => sum + j.value, 0)}<small>pt</small></strong></div>;
      })}</div>
      <div className="intel-bonus"><span>{x.baseTotal} <b>{x.points(points.base)}</b></span>{player.completionBonus !== false && <span>{x.bonus}{game.phase === 'over' ? '' : x.bonusAtEnd} <b>＋{x.points(points.bonus)}</b></span>}</div>
      <h4>{x.specialsHeading}</h4><p className="intel-note">{x.specialsNote}</p><div className="intel-specials">{specialUsage(player).map(item => <div key={item.kind} data-special={item.kind}><Gem kind={item.kind} /><b>{item.kind === 'mining' ? t.miningRight : t.kinds[item.kind]}</b><span>{x.used} <strong>{item.used}</strong> / {item.initial}</span><small>{x.remaining(item.remaining)}</small><div className="usage-pips" aria-hidden="true">{Array.from({ length: item.initial }, (_, i) => <i key={i} className={i < item.used ? 'spent' : ''} />)}</div></div>)}</div>
      <p className="intel-note">{x.lostNote}</p>
    </section></div>;
}
