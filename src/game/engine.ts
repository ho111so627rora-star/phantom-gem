import { COLORS, COMPLETE_BONUS, LABELS, SPECIAL_COUNTS, TURNS, isJewel } from './constants';
import { facingCup } from './cups';
import type { Color, Game, GameMode, Kind, Play, Player, Selection } from './types';

export function createGame(names: string[], humanCount: number, mode: GameMode = 'standard'): Game {
  return {
    mode, turn: 1, phase: 'select', market: Object.fromEntries(COLORS.map(c => [c, Array(6).fill(null)])) as Game['market'],
    miningBag: COLORS.flatMap(c => Array.from({ length: 4 }, (_, i) => ({ id: `mine-${c}-${i}`, kind: c }))),
    discard: [], selections: {}, poisonTasks: [], pendingAwards: [], logs: [],
    players: COLORS.slice(0, mode === 'duel' ? 2 : 4).map((color, i) => ({
      completionBonus: mode !== 'duel', id: `p${i}`, name: names[i] || (i < humanCount ? `プレイヤー${i + 1}` : `CPU ${i + 1}`), color, cpu: i >= humanCount, jewels: [],
      bag: ([...Array<Kind>(6).fill(color), ...Array<Kind>(SPECIAL_COUNTS.thief).fill('thief'), ...Array<Kind>(SPECIAL_COUNTS.mining).fill('mining'), ...Array<Kind>(SPECIAL_COUNTS.poison).fill('poison')]).map((kind, j) => ({ id: `p${i}-${j}`, kind })),
    })),
  };
}

export function schedule(turn: number, playerCount = 4): [number, number][] {
  if (playerCount === 2) return [[0, 1]];
  return ([[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]] as [number, number][][])[(turn - 1) % 3];
}
export function values(game: Game, color: Color): number[] {
  const open = game.market[color].flatMap((owner, i) => owner === null ? [i + 1] : []);
  return open.length ? open : [1];
}
// A duplicate 1 (or the last available number) remains playable so a hand cannot deadlock.
export function selectableValues(game: Game, color: Color, other: Play | null): number[] {
  const available = values(game, color);
  const filtered = available.filter(value => value === 1 || available.length === 1 || other?.kind !== color || other.value !== value);
  // Only one number left to claim, and it's already sold: let the paired same-color die use 1 instead of forcing a self-duplicate.
  if (available.length === 1 && available[0] !== 1 && other?.kind === color && game.market[color][0] !== null) return [...filtered, 1];
  return filtered;
}
// A jewel is slot-free (scores a flat 1 point, doesn't occupy/vacate a market slot) once the whole
// color is sold out, or once its own value-1 slot is sold (the paired-duplicate escape hatch).
function isSlotFree(source: Game, color: Color, value: number): boolean {
  return source.market[color].every(Boolean) || (value === 1 && source.market[color][0] !== null);
}
export function score(player: Player, final = false) {
  const base = player.jewels.reduce((s, j) => s + j.value, 0);
  const bonus = player.completionBonus !== false && new Set(player.jewels.map(j => j.kind)).size === 4 ? COMPLETE_BONUS : 0;
  return { base, bonus, total: base + (final ? bonus : 0) };
}
export function detectDoubles(selections: Game['selections']): Set<string> {
  return new Set(Object.entries(selections).filter(([, [a, b]]) => a && b && isJewel(a.kind) && isJewel(b.kind) && a.kind === b.kind && a.value === b.value).map(([id]) => id));
}
export function detectCollisions(selections: Game['selections'], doubles = detectDoubles(selections)): Set<string> {
  const groups = new Map<string, string[]>();
  Object.entries(selections).forEach(([id, plays]) => {
    if (doubles.has(id)) return;
    plays.forEach(p => { if (p && isJewel(p.kind)) { const key = `${p.kind}-${p.value}`; groups.set(key, [...(groups.get(key) || []), p.id]); } });
  });
  return new Set([...groups.values()].filter(ids => ids.length > 1).flat());
}
export function validateSelection(game: Game, playerId: string, selection: Selection, enforceDuplicateChoice = true) {
  const player = game.players.find(p => p.id === playerId);
  if (!player || game.phase !== 'select' || !Array.isArray(selection) || selection.length !== 2) throw new Error('選択できません');
  const selected = selection.filter((p): p is Play => p !== null);
  if (selected.length !== Math.min(2, player.bag.length) || new Set(selected.map(p => p.id)).size !== selected.length) throw new Error('異なるサイコロを2個選んでください');
  if (enforceDuplicateChoice && selected.some((play, i) => isJewel(play.kind) && !selectableValues(game, play.kind, selected[1 - i] || null).includes(play.value))) throw new Error('同じ色の2〜6は左右で別の数字を選んでください');
  for (const play of selected) {
    const die = player.bag.find(d => d.id === play.id);
    if (!die || die.kind !== play.kind) throw new Error('無効なサイコロまたは数字です');
    if (!isJewel(play.kind)) { if (play.value !== 0) throw new Error('無効なサイコロまたは数字です'); continue; }
    const legalValues = values(game, play.kind);
    if (legalValues.includes(play.value)) continue;
    const pairedSameColor = selected.some(p => p !== play && p.kind === play.kind);
    if (play.value === 1 && pairedSameColor && legalValues.length === 1 && game.market[play.kind][0] !== null) continue;
    throw new Error('無効なサイコロまたは数字です');
  }
}

export { chooseCpu, choosePoisonTarget } from './cpu';
export function chooseCasualCpu(game: Game, playerId: string, random: () => number): Selection {
  const player = game.players.find(p => p.id === playerId)!;
  const pair = schedule(game.turn, game.players.length).find(p => p.includes(game.players.indexOf(player)))!;
  const opponent = game.players[pair.find(i => game.players[i].id !== playerId)!];
  const pool = [...player.bag];
  const result: Selection = [null, null];
  for (let side = 0; side < Math.min(2, player.bag.length); side++) {
    const weighted = pool.map(die => {
      const weight = isJewel(die.kind) ? 3 : die.kind === 'mining' ? (game.turn < 7 ? 2.5 : 0.3) : die.kind === 'poison' ? (opponent.jewels.length ? 1 : 0.2) : 1.8;
      return { die, priority: random() * weight };
    }).sort((a, b) => b.priority - a.priority);
    const die = weighted[0].die;
    pool.splice(pool.findIndex(d => d.id === die.id), 1);
    const options = isJewel(die.kind) ? selectableValues(game, die.kind, result[0]) : [0];
    result[side] = { ...die, value: options[Math.floor(random() * options.length)] };
  }
  return result;
}

export function resolveTurn(source: Game, selections: Game['selections'], random: () => number): Game {
  if (Object.keys(selections).length !== source.players.length) throw new Error('全員の選択が必要です');
  source.players.forEach(p => validateSelection(source, p.id, selections[p.id], false));
  const game = structuredClone(source);
  game.history = [...(source.history || []), structuredClone(selections)];
  game.visualEvents = [];
  game.selections = structuredClone(selections); game.logs = []; game.pendingAwards = []; game.poisonTasks = [];
  const doubles = detectDoubles(selections), collisions = detectCollisions(selections, doubles);
  const oldJewels = new Map(game.players.map(p => [p.id, p.jewels.map(j => j.id)]));
  game.players.forEach(p => {
    if (doubles.has(p.id)) game.logs.push(`${p.name}：ゾロ目！ 自分の宝石は得点になりません。`);
    selections[p.id].forEach(play => {
      if (!play) return;
      p.bag = p.bag.filter(d => d.id !== play.id);
      if (!isJewel(play.kind)) game.discard.push({ id: play.id, kind: play.kind });
      if (collisions.has(play.id)) {
        game.visualEvents!.push({ type: 'collision', player: p.id, die: play });
        game.miningBag.push({ id: play.id, kind: play.kind });
        game.logs.push(`${LABELS[play.kind]} ${play.value} がバッティング！ 採掘袋へ。`);
      }
    });
  });
  for (const [a, b] of schedule(game.turn, game.players.length)) {
    for (const side of [0, 1]) {
      for (const [own, other] of [[a, b], [b, a]]) {
        const player = game.players[own], opponent = game.players[other];
        const play = selections[player.id][side], enemy = selections[opponent.id][facingCup(side)];
        if (!play || collisions.has(play.id)) continue;
        if (isJewel(play.kind)) {
          if (enemy?.kind === 'thief') {
            game.visualEvents!.push({ type: 'thief', player: opponent.id, from: player.id, die: play });
            game.pendingAwards.push({ player: opponent.id, play, postSellout: isSlotFree(source, play.kind, play.value) });
            game.logs.push(`${opponent.name}の泥棒！ ${player.name}の${LABELS[play.kind]} ${play.value}を獲得。`);
          } else if (!doubles.has(player.id)) game.pendingAwards.push({ player: player.id, play, postSellout: isSlotFree(source, play.kind, play.value) });
          else {
            game.miningBag.push({ id: play.id, kind: play.kind });
            game.visualEvents!.push({ type: 'collision', player: player.id, die: play });
            game.logs.push(player.name + '：ゾロ目の宝石を採掘袋へ戻しました。');
          }
        }
        if (play.kind === 'poison' && enemy?.kind === 'thief') {
          const candidates = oldJewels.get(opponent.id)!;
          if (candidates.length) game.poisonTasks.push({ actor: player.id, target: opponent.id, candidates });
          else game.logs.push(`${player.name}の劇薬：相手に宝石がなく不発。`);
        }
      }
    }
  }
  // Mining draws happen before scoring; newly mined dice are available next turn.
  game.players.forEach(p => selections[p.id].forEach(play => {
    if (play?.kind !== 'mining') return;
    if (!game.miningBag.length) { game.logs.push(`${p.name}：採掘袋が空でした。`); return; }
    const [die] = game.miningBag.splice(Math.floor(random() * game.miningBag.length), 1);
    game.visualEvents!.push({ type: 'mining', player: p.id, die: { ...die, value: 1 } });
    p.bag.push(die); game.logs.push(`${p.name}が採掘！ ${LABELS[die.kind]}を袋に追加。`);
  }));
  game.phase = game.poisonTasks.length ? 'poison' : 'result';
  return game.poisonTasks.length ? game : finishScoring(game);
}

function finishScoring(game: Game): Game {
  const soldOut = new Set(COLORS.filter(color => game.market[color].every(Boolean)));
  for (const { player, play, postSellout: originallySoldOut } of game.pendingAwards) {
    if (!isJewel(play.kind)) continue;
    const owner = game.players.find(p => p.id === player)!;
    // Sold-out status is from the beginning of this resolution, before awards.
    const postSellout = originallySoldOut ?? soldOut.has(play.kind);
    if (!postSellout && game.market[play.kind][play.value - 1] !== null) {
      game.miningBag.push({ id: play.id, kind: play.kind });
      game.visualEvents = [...(game.visualEvents || []).filter(event => event.die.id !== play.id), { type: 'collision', player, die: play }];
      game.logs.push(`${LABELS[play.kind]} ${play.value}は獲得済みのため採掘袋へ戻りました。`); continue;
    }
    if (!postSellout) game.market[play.kind][play.value - 1] = player;
    owner.jewels.push({ ...play, value: postSellout ? 1 : play.value, obtainedTurn: game.turn, postSellout });
    if (!game.visualEvents?.some(event => event.type === 'thief' && event.die.id === play.id)) {
      game.visualEvents = [...(game.visualEvents || []), { type: 'score', player: owner.id, die: play }];
    }
    game.logs.push(`${owner.name}：${LABELS[play.kind]} ${postSellout ? 1 : play.value}点を獲得。`);
  }
  game.pendingAwards = []; game.phase = 'result';
  return game;
}
export function applyPoison(source: Game, actor: string, jewelId: string): Game {
  const game = structuredClone(source), task = game.poisonTasks[0];
  if (game.phase !== 'poison' || !task || task.actor !== actor || !task.candidates.includes(jewelId)) throw new Error('劇薬の対象が無効です');
  const target = game.players.find(p => p.id === task.target)!;
  const index = target.jewels.findIndex(j => j.id === jewelId);
  if (index < 0) throw new Error('その宝石は既に失われています');
  const [jewel] = target.jewels.splice(index, 1);
  // Extra 1-point jewels earned after sellout do not own a numbered market slot.
  if (isJewel(jewel.kind) && !jewel.postSellout && game.market[jewel.kind][jewel.value - 1] === target.id) {
    game.market[jewel.kind][jewel.value - 1] = null;
    game.logs.push(`${LABELS[jewel.kind]} ${jewel.value}が再び選べるようになりました。`);
  }
  game.visualEvents = [...(game.visualEvents || []), { type: 'poison', player: actor, from: target.id, die: jewel }];
  game.miningBag.push({ id: jewel.id, kind: jewel.kind });
  game.logs.push(`${game.players.find(p => p.id === actor)!.name}の劇薬！ ${target.name}は${LABELS[jewel.kind]} ${jewel.value}点を失いました。`);
  game.poisonTasks.shift();
  game.poisonTasks = game.poisonTasks.map(t => ({ ...t, candidates: t.candidates.filter(id => game.players.find(p => p.id === t.target)!.jewels.some(j => j.id === id)) })).filter(t => t.candidates.length);
  return game.poisonTasks.length ? game : finishScoring(game);
}
export function nextTurn(source: Game): Game {
  if (source.phase !== 'result') throw new Error('まだ結果が確定していません');
  const game = structuredClone(source);
  if (game.turn === TURNS) game.phase = 'over';
  else { game.turn++; game.phase = 'select'; game.selections = {}; game.logs = []; }
  return game;
}
