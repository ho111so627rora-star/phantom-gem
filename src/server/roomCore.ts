import { applyPoison, chooseCpu, choosePoisonTarget, createGame, nextTurn, resolveTurn, validateSelection } from '../game/engine';
import { COLORS } from '../game/constants';
import type { Color, Game, Kind, Selection } from '../game/types';
import type { RoomView, Session } from './types';
import { publicGame } from './publicGame';

export type Seat = { id: string; token: string; name: string; color: Color; lastSeen: number };
export type Room = { code: string; humanCount: number; mode?: 'standard' | 'duel'; seats: Seat[]; game: Game | null; locked: Record<string, Selection>; ready: string[]; revealAt?: number; beforeReveal?: Game; selectionDeadline?: number; timedOut?: string[] };
export const REVEAL_DELAY_MS = 2800;
export const THINK_TIME_MS = 60_000;
export interface RoomStore { exists(code: string): boolean; read(code: string): Room; write(room: Room): void; }
export function validateCode(code: string) { if (!/^[A-Z2-9]{6}$/.test(code)) throw new Error('ルームコードは6文字です'); }
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
const secureToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
export function createRoomService(store: RoomStore) {
function save(room: Room) { store.write(room); }
function read(code: string): Room { validateCode(code); if (!store.exists(code)) throw new Error('ルームが見つかりません。コードを確認してください'); return store.read(code); }
function seat(room: Room, token: string) {
  const own = room.seats.find(s => s.token === token);
  if (!own) throw new Error('このルームへの参加情報がありません');
  return own;
}
function session(room: Room, own: Seat): Session { return { code: room.code, token: own.token, playerId: own.id }; }
function nameOf(name: unknown) { return typeof name === 'string' && name.trim() ? name.trim().slice(0, 16) : 'プレイヤー'; }
function createRoom(humanCount: number, name: unknown, mode: unknown = 'standard'): Session {
  if (mode !== 'standard' && mode !== 'duel') throw new Error('対戦モードが無効です');
  if (!(mode === 'duel' ? [1, 2] : [1, 2, 3, 4]).includes(humanCount)) throw new Error('プレイ人数を選んでください');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do { code = Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join(''); } while (store.exists(code));
  const own: Seat = { id: 'p0', name: nameOf(name), color: 'ruby', token: secureToken(), lastSeen: Date.now() };
  const room: Room = { code, humanCount, mode, seats: [own], game: null, locked: {}, ready: [] };
  save(room); return session(room, own);
}
function joinRoom(code: string, name: unknown): Session {
  const room = read(code);
  if (room.game || room.seats.length >= room.humanCount) throw new Error('このルームは満員、または対戦中です');
  const color = COLORS.find(c => !room.seats.some(s => s.color === c))!;
  const own = { id: `p${room.seats.length}`, name: nameOf(name), color, token: secureToken(), lastSeen: Date.now() };
  room.seats.push(own); save(room); return session(room, own);
}
function runCpuPoison(room: Room) {
  while (room.game?.phase === 'poison') {
    const task = room.game.poisonTasks[0], actor = room.game.players.find(p => p.id === task.actor)!;
    if (!actor.cpu) break;
    room.game = applyPoison(room.game, actor.id, choosePoisonTarget(room.game, task.target, task.candidates));
  }
}
function primeCpu(room: Room) {
  room.locked = {}; room.ready = [];
  room.revealAt = undefined; room.beforeReveal = undefined;
  room.game!.players.filter(p => p.cpu).forEach(p => { room.locked[p.id] = chooseCpu(room.game!, p.id, random); });
  room.selectionDeadline = Date.now() + THINK_TIME_MS; room.timedOut = [];
}
function openCups(room: Room) {
  room.beforeReveal = structuredClone(room.game!);
  room.game!.selections = structuredClone(room.locked);
  room.game!.visualEvents = []; room.game!.phase = 'inspect';
  room.revealAt = Date.now() + REVEAL_DELAY_MS;
}
function enforceDeadline(room: Room) {
  if (room.game?.phase !== 'select') return;
  // Existing rooms acquire a shared deadline on their first request after this update.
  room.selectionDeadline ??= Date.now() + THINK_TIME_MS;
  if (Date.now() < room.selectionDeadline) return;
  room.timedOut = [];
  for (const player of room.game.players) {
    if (room.locked[player.id]) continue;
    room.locked[player.id] = chooseCpu(room.game, player.id, random);
    room.timedOut.push(player.id);
  }
  openCups(room);
}
function advanceInspect(room: Room) {
  // Once every seat's cups have finished opening, the shared board (mining bag, collisions,
  // scoring) resolves on its own — players only watch, they don't gate it with a tap.
  if (room.game?.phase !== 'inspect' || !room.revealAt || Date.now() < room.revealAt) return;
  const source = structuredClone(room.game); source.phase = 'select';
  room.game = resolveTurn(source, room.locked, random); runCpuPoison(room);
}
function getRoom(code: string, token: string): RoomView {
  const room = read(code), own = seat(room, token);
  if (Date.now() - own.lastSeen >= 10_000) own.lastSeen = Date.now(); enforceDeadline(room); advanceInspect(room); save(room);
  const waitingReveal = !!room.revealAt && Date.now() < room.revealAt;
  const game = room.game ? structuredClone(waitingReveal && room.beforeReveal ? room.beforeReveal : room.game) : null;
  if (waitingReveal && game) game.phase = 'reveal';
  // The only selections sent before reveal are the requesting player's own.
  if (game?.phase === 'select' || game?.phase === 'reveal') game.selections = room.locked[own.id] ? { [own.id]: room.locked[own.id] } : {};
  if (game) { game.pendingAwards = []; }
  const unusedColors = COLORS.filter(c => !room.seats.some(s => s.color === c));
  return {
    code, mode: room.mode || 'standard', humanCount: room.humanCount, me: own.id, host: own.id === 'p0', game: game ? publicGame(game, own.id) : null, revealAt: room.revealAt, serverNow: Date.now(),
    locked: Object.keys(room.locked), ready: room.ready, selectionDeadline: room.selectionDeadline, timedOut: room.timedOut || [],
    seats: COLORS.slice(0, room.mode === 'duel' ? 2 : 4).map((_, i) => {
      const s = room.seats[i];
      return { id: `p${i}`, name: s?.name || (i >= room.humanCount ? `CPU ${i - room.humanCount + 1}` : '参加を待っています'),
        color: s?.color || unusedColors[i - room.seats.length], cpu: i >= room.humanCount, joined: !!s || i >= room.humanCount, online: !!s && Date.now() - s.lastSeen < 20_000 };
    }),
  };
}
function act(code: string, token: string, action: string, payload: unknown) {
  const room = read(code), own = seat(room, token); own.lastSeen = Date.now();
  enforceDeadline(room); advanceInspect(room); save(room);
  if (room.revealAt && Date.now() < room.revealAt) throw new Error('全員のカップを公開するまでお待ちください');
  const data = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  if (action === 'color') {
    if (room.game || !COLORS.includes(data.color as Color) || room.seats.some(s => s.id !== own.id && s.color === data.color)) throw new Error('その色は選べません');
    own.color = data.color as Color;
  } else if (action === 'start' || action === 'rematch') {
    if (own.id !== 'p0' || room.seats.length !== room.humanCount || (room.game && room.game.phase !== 'over')) throw new Error('全員の参加後、ホストが開始できます');
    room.game = createGame(room.seats.map(s => s.name), room.humanCount, room.mode);
    const unused = COLORS.filter(c => !room.seats.some(s => s.color === c));
    room.game.players.forEach((p, i) => {
      const color = room.seats[i]?.color || unused[i - room.humanCount];
      p.bag.forEach(d => { if (d.kind === p.color) d.kind = color; }); p.color = color;
      if (p.cpu) p.name = `CPU ${i - room.humanCount + 1}`;
    });
    // The shared mining pool should only hold colors actually in play (all 4 in standard, 2 in duel).
    const activeColors = new Set<Kind>(room.game.players.map(p => p.color));
    room.game.miningBag = room.game.miningBag.filter(d => activeColors.has(d.kind));
    primeCpu(room);
  } else {
    if (!room.game) throw new Error('ゲームが始まっていません');
    if (action === 'select') {
      if (room.locked[own.id]) throw new Error('選択は確定済みです');
      const selection = data.selection as Selection; validateSelection(room.game, own.id, selection);
      room.locked[own.id] = selection;
      if (Object.keys(room.locked).length === room.game.players.length) {
        openCups(room);
      }
    } else if (action === 'poison') {
      room.game = applyPoison(room.game, own.id, String(data.jewelId)); runCpuPoison(room);
    } else if (action === 'ready') {
      if (room.game.phase !== 'result') throw new Error('結果を確認してから進んでください');
      if (!room.ready.includes(own.id)) room.ready.push(own.id);
      if (room.ready.length === room.humanCount) { room.game = nextTurn(room.game); if (room.game.phase === 'select') primeCpu(room); }
    } else throw new Error('不明な操作です');
  }
  save(room);
  return getRoom(code, token);
}

return { createRoom, joinRoom, getRoom, act };
}