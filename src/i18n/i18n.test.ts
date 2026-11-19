import { describe, expect, it } from 'vitest';
import { applyPoison, createGame, nextTurn, resolveTurn } from '../game/engine';
import { chooseCpu } from '../game/cpu';
import { publicGame } from '../server/publicGame';
import { ja } from './locales/ja';
import { en } from './locales/en';
import { ko } from './locales/ko';
import { zh } from './locales/zh';
import { es } from './locales/es';
import { pt } from './locales/pt';
import { displayName, translateError, translateLog } from './translate';

const KANA = /[぀-ヿ]/;
const others = { en, ko, zh, es, pt };

describe('i18n', () => {
  it('translates every log line produced by real games', () => {
    let seed = 99; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const logs = new Set<string>(); let names: string[] = [];
    for (let n = 0; n < 40; n++) {
      let g = createGame(['ルビーの怪盗', 'Ana'], 2, n % 4 === 0 ? 'duel' : 'standard');
      names = g.players.map(p => p.name);
      for (let t = 1; t <= 10; t++) {
        g = resolveTurn(g, Object.fromEntries(g.players.map(p => [p.id, chooseCpu(g, p.id, random)])), random);
        g.logs.forEach(l => logs.add(l));
        g.players.forEach(p => publicGame(g, p.id).logs.forEach(l => logs.add(l)));
        while (g.phase === 'poison') { g = applyPoison(g, g.poisonTasks[0].actor, g.poisonTasks[0].candidates[0]); g.logs.forEach(l => logs.add(l)); }
        g = nextTurn(g);
      }
    }
    expect(logs.size).toBeGreaterThan(10);
    for (const [lang, t] of Object.entries(others)) {
      for (const log of logs) {
        const out = translateLog(t, log, names);
        expect(out.replace('ルビーの怪盗', ''), `${lang}: ${log}`).not.toMatch(KANA);
      }
    }
    for (const log of logs) expect(translateLog(ja, log, names)).toBe(log);
  });

  it('translates every known server error', () => {
    for (const key of Object.keys(ja.errors)) for (const t of Object.values(others)) expect(translateError(t, key)).not.toMatch(KANA);
    expect(translateError(en, 'Failed to fetch')).toBe('Failed to fetch');
  });

  it('localizes server default names only', () => {
    expect(displayName(en, 'プレイヤー')).toBe('Player');
    expect(displayName(ko, 'プレイヤー3')).toBe('플레이어 3');
    expect(displayName(es, '参加を待っています')).toBe(es.waitingSeat);
    expect(displayName(en, 'CPU 2')).toBe('CPU 2');
    expect(displayName(en, 'さくら')).toBe('さくら');
  });
});
