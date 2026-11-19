import type { Kind } from '../game/types';
import { ja, type Messages } from './locales/ja';

/** The server reports errors in Japanese; show them in the selected language when known. */
export function translateError(t: Messages, message: string) {
  return (t.errors as Record<string, string>)[message] ?? message;
}

/** Server-generated default names ("プレイヤー2", "参加を待っています") are shown in the selected language. */
export function displayName(t: Messages, name: string) {
  if (name === ja.waitingSeat) return t.waitingSeat;
  const match = /^プレイヤー(\d*)$/.exec(name);
  return match ? t.defaultPlayer + (match[1] ? ` ${match[1]}` : '') : name;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const JA_KIND = new Map(Object.entries(ja.kinds).map(([kind, label]) => [label, kind as Kind]));
const KIND = `(${[...JA_KIND.keys()].map(escape).join('|')})`;

/**
 * Game logs are generated in Japanese by the shared game engine (other players may use another language),
 * so they are matched against the Japanese templates here and re-rendered in the viewer's language.
 */
export function translateLog(t: Messages, log: string, names: string[]) {
  if (t === ja) return log;
  const N = `(${[...names].sort((a, b) => b.length - a.length).map(escape).join('|') || '.+'})`;
  const kind = (label: string) => t.kinds[JA_KIND.get(label)!];
  const name = (n: string) => displayName(t, n);
  const patterns: [string, (m: string[]) => string][] = [
    [`^${N}：ゾロ目！ 自分の宝石は得点になりません。$`, m => t.logs.doubles(name(m[1]))],
    [`^${KIND} (\\d+) がバッティング！ 採掘袋へ。$`, m => t.logs.clash(kind(m[1]), +m[2])],
    [`^${N}の泥棒！ ${N}の${KIND} (\\d+)を獲得。$`, m => t.logs.theft(name(m[1]), name(m[2]), kind(m[3]), +m[4])],
    [`^${N}：ゾロ目の宝石を採掘袋へ戻しました。$`, m => t.logs.doublesReturned(name(m[1]))],
    [`^${N}の劇薬：相手に宝石がなく不発。$`, m => t.logs.poisonFizzle(name(m[1]))],
    [`^${N}：採掘袋が空でした。$`, m => t.logs.miningEmpty(name(m[1]))],
    [`^${N}が採掘！ ${KIND}を袋に追加。$`, m => t.logs.mined(name(m[1]), kind(m[2]))],
    [`^${N}が採掘！ サイコロを1個獲得（色は本人だけに公開）。$`, m => t.logs.minedHidden(name(m[1]))],
    [`^${KIND} (\\d+)は獲得済みのため採掘袋へ戻りました。$`, m => t.logs.alreadyClaimed(kind(m[1]), +m[2])],
    [`^${N}：${KIND} (\\d+)点を獲得。$`, m => t.logs.scored(name(m[1]), kind(m[2]), +m[3])],
    [`^${KIND} (\\d+)が再び選べるようになりました。$`, m => t.logs.reopened(kind(m[1]), +m[2])],
    [`^${N}の劇薬！ ${N}は${KIND} (\\d+)点を失いました。$`, m => t.logs.poisoned(name(m[1]), name(m[2]), kind(m[3]), +m[4])],
  ];
  for (const [source, render] of patterns) {
    const match = new RegExp(source, 'u').exec(log);
    if (match) return render(match);
  }
  return log;
}
