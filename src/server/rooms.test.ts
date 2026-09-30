import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const files = vi.hoisted(() => new Map<string, string>());
vi.mock('node:fs', () => ({
  mkdirSync: () => {}, existsSync: (path: string) => files.has(path),
  readFileSync: (path: string) => files.get(path), writeFileSync: (path: string, value: string) => files.set(path, value),
  renameSync: (from: string, to: string) => { files.set(to, files.get(from)!); files.delete(from); },
}));
import { act, createRoom, getRoom, joinRoom, REVEAL_DELAY_MS, THINK_TIME_MS } from './rooms';
import { chooseCpu } from '../game/engine';

beforeEach(() => { files.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-11T01:00:00Z')); });
afterEach(() => vi.useRealTimers());
describe('1分の思考時間', () => {
  it('59秒では未確定、60秒でCPUが確定し、公開前の秘密を守る', () => {
    const host = createRoom(1, 'ホスト');
    const start = act(host.code, host.token, 'start', {});
    expect(start.selectionDeadline).toBe(Date.now() + THINK_TIME_MS);
    vi.advanceTimersByTime(59_000);
    const before = getRoom(host.code, host.token);
    expect(before.game!.phase).toBe('select'); expect(before.locked).not.toContain('p0');
    expect(before.selectionDeadline).toBe(start.selectionDeadline);
    vi.advanceTimersByTime(1000);
    const expired = getRoom(host.code, host.token);
    expect(expired.game!.phase).toBe('reveal'); expect(expired.timedOut).toEqual(['p0']);
    expect(Object.keys(expired.game!.selections)).toEqual(['p0']);
    expect(expired.game!.players[0].jewels).toEqual([]);
    vi.advanceTimersByTime(REVEAL_DELAY_MS + 100_000);
    expect(getRoom(host.code, host.token).game!.phase).not.toBe('inspect');
    const next = act(host.code, host.token, 'ready', {});
    expect(next.game!.turn).toBe(2); expect(next.selectionDeadline).toBe(Date.now() + THINK_TIME_MS);
    expect(next.timedOut).toEqual([]);
  });
  it('全員で同じ期限を共有し、確定済みの選択を上書きしない', () => {
    const host = createRoom(2, 'ホスト'), guest = joinRoom(host.code, 'ゲスト');
    const start = act(host.code, host.token, 'start', {});
    const selection = chooseCpu(start.game!, host.playerId, () => .5);
    act(host.code, host.token, 'select', { selection });
    expect(getRoom(guest.code, guest.token).selectionDeadline).toBe(start.selectionDeadline);
    vi.advanceTimersByTime(THINK_TIME_MS);
    const expired = getRoom(host.code, host.token);
    expect(expired.timedOut).toEqual(['p1']); expect(expired.game!.selections.p0).toEqual(selection);
    expect(() => act(guest.code, guest.token, 'select', { selection })).toThrow();
    vi.advanceTimersByTime(REVEAL_DELAY_MS);
    expect(getRoom(host.code, host.token).game!.selections.p0).toEqual(selection);
  });
  it('期限後のPOSTでも自動確定を保存し、遅れた選択を受け付けない', () => {
    const host = createRoom(1, 'ホスト'), start = act(host.code, host.token, 'start', {});
    const selection = chooseCpu(start.game!, host.playerId, () => .5);
    vi.advanceTimersByTime(THINK_TIME_MS);
    expect(() => act(host.code, host.token, 'select', { selection })).toThrow();
    expect(getRoom(host.code, host.token).timedOut).toEqual(['p0']);
  });
});
describe('デュエルモード', () => {
  it('席は2人分のみで、共有の採掘袋も使用する2色分だけになる', () => {
    const host = createRoom(1, 'ホスト', 'duel');
    const room = getRoom(host.code, host.token);
    expect(room.seats).toHaveLength(2);
    const started = act(host.code, host.token, 'start', {});
    expect(started.game!.players).toHaveLength(2);
    expect(started.game!.miningCount).toBe(8);
  });
});
