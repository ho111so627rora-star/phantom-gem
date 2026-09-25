import { describe, it, expect } from 'vitest';
import { applyPoison, chooseCpu, createGame, detectCollisions, detectDoubles, nextTurn, resolveTurn, schedule, score, selectableValues, validateSelection, values } from './engine';
import type { Game, Kind, Play, Selection } from './types';
import { COLORS } from './constants';
const rng = () => 0.25;
function play(g: Game, p: number, kind: Kind, value = 0, nth = 0): Play {
  return { ...g.players[p].bag.filter(d => d.kind === kind)[nth], value };
}
function selections(g: Game): Record<string, Selection> {
  return Object.fromEntries(g.players.map((p, i) => [p.id, [play(g, i, 'poison'), play(g, i, 'poison', 0, 1)]]));
}
describe('ゲームエンジン', () => {
  it.each([1, 2, 3])('ターン%d：全席の左右とも、相手の反対側の泥棒だけが宝石を奪う', turn => {
    for (let seat = 0; seat < 4; seat++) for (const side of [0, 1]) for (const mirrored of [true, false]) {
      const g = createGame([], 4); g.turn = turn;
      const pair = schedule(turn).find(pair => pair.includes(seat))!;
      const rival = pair.find(index => index !== seat)!;
      const s = selections(g), jewel = play(g, seat, g.players[seat].color, 6);
      s[`p${seat}`][side] = jewel;
      s[`p${rival}`][mirrored ? 1 - side : side] = play(g, rival, 'thief');
      const r = resolveTurn(g, s, rng);
      expect(score(r.players[seat]).total).toBe(mirrored ? 0 : 6);
      expect(score(r.players[rival]).total).toBe(mirrored ? 6 : 0);
      expect(r.players[mirrored ? rival : seat].jewels[0].id).toBe(jewel.id);
    }
  });
  it.each([1, 2, 3])('ターン%d：劇薬も自分の右と相手の左で対決する', turn => {
    const g = createGame([], 4); g.turn = turn;
    const rival = schedule(turn).find(pair => pair.includes(0))!.find(index => index !== 0)!;
    g.players[rival].jewels.push({ id: 'owned', kind: 'ruby', value: 6, obtainedTurn: 1, postSellout: false });
    const s = selections(g);
    s.p0 = [play(g, 0, 'mining'), play(g, 0, 'poison')];
    s[`p${rival}`][0] = play(g, rival, 'thief');
    const r = resolveTurn(g, s, rng);
    expect(r.poisonTasks).toEqual([{ actor: 'p0', target: `p${rival}`, candidates: ['owned'] }]);
    expect(applyPoison(r, 'p0', 'owned').players[rival].jewels).toHaveLength(0);
  });
  it('4人に16個ずつ配り、採掘袋に16個入れる', () => {
    const g = createGame([], 2); expect(g.players.map(p => p.bag.length)).toEqual([16, 16, 16, 16]);
    expect(g.players.filter(p => p.cpu)).toHaveLength(2); expect(g.miningBag).toHaveLength(16);
  });
  it('10ターンの対戦が3パターンで循環', () => {
    expect(schedule(1)).toEqual([[0, 1], [2, 3]]); expect(schedule(2)).toEqual([[0, 2], [1, 3]]);
    expect(schedule(3)).toEqual([[0, 3], [1, 2]]); expect(schedule(10)).toEqual(schedule(1));
  });
  it('異色の同じ数字はゾロ目ではなく、同色同数だけ衝突する', () => {
    const s: Record<string, Selection> = { p0: [{ id: 'a', kind: 'ruby', value: 6 }, { id: 'b', kind: 'sapphire', value: 6 }], p2: [{ id: 'c', kind: 'ruby', value: 6 }, null] };
    expect(detectDoubles(s).has('p0')).toBe(false); expect([...detectCollisions(s)].sort()).toEqual(['a', 'c']);
  });
  it.each([1, 6])('異なる色の%dを2個出すと、両方が自分の得点になる', value => {
    const g = createGame([], 1); g.players[0].bag[1].kind = 'sapphire';
    const s = selections(g); s.p0 = [play(g, 0, 'ruby', value), play(g, 0, 'sapphire', value)];
    const r = resolveTurn(g, s, rng);
    expect(score(r.players[0]).total).toBe(value * 2);
    expect(r.players[0].jewels.map(j => j.kind).sort()).toEqual(['ruby', 'sapphire']);
  });
  it('同色の1を2個出すと自分の得点にはならない', () => {
    const g = createGame([], 1), s = selections(g);
    s.p0 = [play(g, 0, 'ruby', 1), play(g, 0, 'ruby', 1, 1)];
    const r = resolveTurn(g, s, rng);
    expect(score(r.players[0]).total).toBe(0);
    expect(detectDoubles(s).has('p0')).toBe(true);
  });
  it('赤1と青1を出し、別の人も赤1を出した場合、青1だけ得点になる', () => {
    const g = createGame([], 1); g.players[0].bag[1].kind = 'sapphire'; g.players[2].bag[0].kind = 'ruby';
    const s = selections(g); s.p0 = [play(g, 0, 'ruby', 1), play(g, 0, 'sapphire', 1)]; s.p2[0] = play(g, 2, 'ruby', 1);
    const r = resolveTurn(g, s, rng);
    expect(r.players[0].jewels.map(j => [j.kind, j.value])).toEqual([['sapphire', 1]]);
    expect(score(r.players[2]).total).toBe(0);
    expect(r.miningBag).toHaveLength(g.miningBag.length + 2);
  });
  it('対戦相手以外の一致も衝突し、両方が採掘袋へ移動', () => {
    const g = createGame([], 1); g.players[2].bag[0].kind = 'ruby'; const s = selections(g);
    s.p0[0] = play(g, 0, 'ruby', 6); s.p2[0] = play(g, 2, 'ruby', 6);
    const result = resolveTurn(g, s, rng); expect(result.miningBag).toHaveLength(18);
    expect(result.players[0].jewels).toHaveLength(0); expect(g.miningBag).toHaveLength(16);
  });
  it('通常宝石は数字分を獲得し、使用した宝石は袋から除く', () => {
    const g = createGame([], 1), s = selections(g); s.p0[0] = play(g, 0, 'ruby', 6);
    const r = resolveTurn(g, s, rng); expect(score(r.players[0]).total).toBe(6); expect(r.players[0].bag).toHaveLength(14);
  });
  it('宝石の向かいが泥棒なら、色と出目を維持して泥棒側の得点になる', () => {
    const g = createGame([], 2), s = selections(g);
    const ruby = play(g, 0, 'ruby', 6);
    s.p0[0] = ruby; s.p1[1] = play(g, 1, 'thief');
    const r = resolveTurn(g, s, rng);
    expect(score(r.players[0]).total).toBe(0);
    expect(score(r.players[1]).total).toBe(6);
    expect(r.players[1].jewels).toContainEqual({ ...ruby, obtainedTurn: 1, postSellout: false });
    expect(r.players.flatMap(p => p.bag).some(d => d.id === ruby.id)).toBe(false);
    expect(r.market.ruby[5]).toBe('p1');
    expect(r.visualEvents).toContainEqual({ type: 'thief', player: 'p1', from: 'p0', die: ruby });
  });
  it('ゾロ目でも泥棒は盗める。残るゾロ目宝石は採掘場へ戻す', () => {
    const g = createGame([], 1), s = selections(g);
    s.p0 = [play(g, 0, 'ruby', 6), play(g, 0, 'ruby', 6, 1)]; s.p1[1] = play(g, 1, 'thief');
    const r = resolveTurn(g, s, rng); expect(score(r.players[1]).total).toBe(6); expect(score(r.players[0]).total).toBe(0); expect(r.players[0].bag).toHaveLength(14); expect(r.miningBag).toHaveLength(17);
  });
  it('劇薬で赤6を失うと枠が空き、全員が再び赤6を選べる', () => {
    const g = createGame([], 1), s = selections(g);
    g.players[1].jewels.push({ id: 'owned', kind: 'ruby', value: 6, obtainedTurn: 1, postSellout: false }); g.market.ruby[5] = 'p1';
    s.p1[1] = play(g, 1, 'thief');
    const r = resolveTurn(g, s, rng); expect(r.phase).toBe('poison');
    const done = applyPoison(r, 'p0', 'owned'); expect(done.players[1].jewels).toHaveLength(0);
    expect(done.market.ruby[5]).toBeNull(); expect(done.miningBag.some(d => d.id === 'owned')).toBe(true);
    expect(g.market.ruby[5]).toBe('p1');
    const next = nextTurn(done);
    next.players.forEach(p => {
      p.bag[0].kind = 'ruby';
      const second = p.bag.find(d => d.kind === 'mining')!;
      expect(() => validateSelection(next, p.id, [{ ...p.bag[0], value: 6 }, { ...second, value: 0 }])).not.toThrow();
    });
  });
  it('完売中に選んだ追加1点は、そのターンの劇薬で6が空いても得点になる', () => {
    const g = createGame([], 1), s = selections(g); g.market.ruby.fill('p1');
    g.players[1].jewels.push({ id: 'red6', kind: 'ruby', value: 6, obtainedTurn: 1, postSellout: false });
    s.p0 = [play(g, 0, 'poison'), play(g, 0, 'ruby', 1)]; s.p1[1] = play(g, 1, 'thief');
    const done = applyPoison(resolveTurn(g, s, rng), 'p0', 'red6');
    expect(done.market.ruby[5]).toBeNull();
    expect(values(done, 'ruby')).toEqual([6]);
    expect(done.players[0].jewels[0]).toMatchObject({ kind: 'ruby', value: 1, postSellout: true });
  });
  it('完売後に追加獲得した1点を失っても、元の1の獲得枠は空けない', () => {
    const g = createGame([], 1), s = selections(g); g.market.ruby.fill('p1');
    g.players[1].jewels.push({ id: 'extra1', kind: 'ruby', value: 1, obtainedTurn: 1, postSellout: true });
    s.p1[1] = play(g, 1, 'thief');
    const done = applyPoison(resolveTurn(g, s, rng), 'p0', 'extra1');
    expect(done.market.ruby[0]).toBe('p1');
  });
  it('採掘は相手に関係なく発動し、特殊サイコロを消費する', () => {
    const g = createGame([], 1), s = selections(g); s.p0[0] = play(g, 0, 'mining');
    const r = resolveTurn(g, s, rng); expect(r.miningBag).toHaveLength(15); expect(r.players[0].bag).toHaveLength(15); expect(r.discard).toHaveLength(8);
  });
  it('空の採掘袋でも進行可能', () => {
    const g = createGame([], 1), s = selections(g); g.miningBag = []; s.p0[0] = play(g, 0, 'mining');
    expect(resolveTurn(g, s, rng).players[0].bag).toHaveLength(14);
  });
  it('完売前の獲得済み数字は選べず、完売後は1点のみ', () => {
    const g = createGame([], 1); g.market.ruby[5] = 'p0'; expect(values(g, 'ruby')).toEqual([1, 2, 3, 4, 5]);
    g.market.ruby.fill('p0'); expect(values(g, 'ruby')).toEqual([1]);
    const s = selections(g); s.p0[0] = play(g, 0, 'ruby', 1); expect(resolveTurn(g, s, rng).players[0].jewels[0].postSellout).toBe(true);
  });
  it('同じ実物のサイコロを二重使用できない', () => {
    const g = createGame([], 1), p = play(g, 0, 'ruby', 6); expect(() => validateSelection(g, 'p0', [p, p])).toThrow();
  });
  it('4色コンプリートで最後に5点加算', () => {
    const g = createGame([], 1); g.players[0].jewels = COLORS.map((kind, i) => ({ id: String(i), kind, value: 1, obtainedTurn: 1, postSellout: false }));
    expect(score(g.players[0], true)).toEqual({ base: 4, bonus: 5, total: 9 });
  });

  it.each([1, 2, 3, 4, 5, 6])('同色%dのゾロ目は2個とも採掘場へ戻り、手持ちが2個減る（旧クライアントの確定済み手も処理）', value => {
    const g = createGame([], 1), s = selections(g);
    s.p0 = [play(g, 0, 'ruby', value), play(g, 0, 'ruby', value, 1)];
    const r = resolveTurn(g, s, rng);
    expect(r.players[0].bag).toHaveLength(14);
    expect(r.players[0].jewels).toHaveLength(0);
    expect(r.miningBag).toHaveLength(18);
    for (const die of s.p0) {
      expect(r.miningBag.some(d => d.id === die!.id)).toBe(true);
      expect(r.visualEvents).toContainEqual({type:'collision',player:'p0',die});
    }
    expect(r.market.ruby.every(v => v === null)).toBe(true);
  });
  it.each([2,3,4,5,6])('同色%dの重複選択はAPIでも拒否する', value => {
    const g=createGame([],1), pair:Selection=[play(g,0,'ruby',value),play(g,0,'ruby',value,1)];
    expect(()=>validateSelection(g,'p0',pair)).toThrow('別の数字');
    expect(selectableValues(g,'ruby',pair[0])).not.toContain(value);
    expect(selectableValues(g,'sapphire',pair[0])).toContain(value);
  });
  it('完売後の1・1も両方採掘場へ戻す',()=>{
    const g=createGame([],1), s=selections(g);g.market.ruby.fill('p1');
    s.p0=[play(g,0,'ruby',1),play(g,0,'ruby',1,1)];
    expect(()=>validateSelection(g,'p0',s.p0)).not.toThrow();
    const r=resolveTurn(g,s,rng);
    expect(r.players[0].bag).toHaveLength(14);
    expect(r.miningBag).toHaveLength(18);
    expect(r.players[0].jewels).toHaveLength(0);
  });
  it('最後に同色の同じ数字しか残っていなくてもCPUと人間の手が成立する',()=>{
    const g=createGame([],1);g.market.ruby.fill('p1');g.market.ruby[5]=null;
    g.players[0].bag=g.players[0].bag.filter(d=>d.kind==='ruby').slice(0,2);
    const pair=chooseCpu(g,'p0',rng);
    expect(pair.map(d=>d!.value)).toEqual([6,6]);
    expect(()=>validateSelection(g,'p0',pair)).not.toThrow();
    const s=selections(createGame([],1));s.p0=pair;
    const r=resolveTurn(g,s,rng);
    expect(r.players[0].bag).toHaveLength(0);
    expect(r.miningBag).toHaveLength(18);
  });
  it('1が完売済みで残り1数字のみのとき、同色ペアは1をもう一方に選んで自滅ゾロ目を避けられる',()=>{
    const g=createGame([],1);g.market.ruby.fill('p1');g.market.ruby[5]=null;
    const six=play(g,0,'ruby',6), one=play(g,0,'ruby',1,1);
    expect(selectableValues(g,'ruby',six)).toEqual(expect.arrayContaining([1]));
    expect(()=>validateSelection(g,'p0',[six,one])).not.toThrow();
    const s=selections(g);s.p0=[six,one];
    const r=resolveTurn(g,s,rng);
    expect(r.players[0].jewels.map(j=>j.value).sort()).toEqual([1,6]);
  });
  it('数字が2つ以上残っているときは1を余分な選択肢として提示しない',()=>{
    const g=createGame([],1);g.market.ruby[0]='p1';
    const three=play(g,0,'ruby',3);
    expect(selectableValues(g,'ruby',three)).not.toContain(1);
  });
  it('同色の相方がいない単独出しでは、1が埋まっていても残り数字のみ選べる',()=>{
    const g=createGame([],1);g.market.ruby.fill('p1');g.market.ruby[5]=null;
    expect(selectableValues(g,'ruby',null)).toEqual([6]);
  });
  it('1・1を泥棒2個に盗まれても手持ちへ戻らず、獲得できない2個目は採掘場へ',()=>{
    const g=createGame([],1),s=selections(g);
    s.p0=[play(g,0,'ruby',1),play(g,0,'ruby',1,1)];
    s.p1=[play(g,1,'thief'),play(g,1,'thief',0,1)];
    const r=resolveTurn(g,s,rng);
    expect(r.players[0].bag).toHaveLength(14);
    expect(r.players[1].bag).toHaveLength(14);
    expect(r.players[1].jewels).toHaveLength(1);
    expect(r.miningBag).toHaveLength(17);
  });

  it('100試合が10ターンを完走し、サイコロ総数を保存する', () => {
    let seed = 1234; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let n = 0; n < 100; n++) {
      let g = createGame([], 0);
      for (let t = 1; t <= 10; t++) {
        g = resolveTurn(g, Object.fromEntries(g.players.map(p => [p.id, chooseCpu(g, p.id, random)])), random);
        while (g.phase === 'poison') g = applyPoison(g, g.poisonTasks[0].actor, g.poisonTasks[0].candidates[0]);
        const ids = [...g.miningBag, ...g.discard, ...g.players.flatMap(p => [...p.bag, ...p.jewels])].map(d => d.id);
        expect(ids.length).toBe(80); expect(new Set(ids).size).toBe(80); g = nextTurn(g);
      }
      expect(g.phase).toBe('over'); expect(g.turn).toBe(10);
    }
  });
});
