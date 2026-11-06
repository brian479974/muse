// 一次性產生器：把介面字典裡的 zh（簡體）區塊轉成 tw（繁體）區塊，插在 zh 後面。
// 已有 tw 區塊的檔案會先移除舊的再重產，所以改了簡體文案後可以重跑。
// 用法：node scripts/gen-tw-copy.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { toTw } from './zh-hant.mjs';

const files = ['src/i18n.ts', 'src/generation-copy.ts', 'src/studio-copy.ts', 'src/home-showcase.tsx'];

function blockEnd(src, open) {
  const [o, c] = src[open] === '[' ? ['[', ']'] : ['{', '}'];
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === o) depth++;
    else if (src[i] === c && --depth === 0) return i;
  }
  throw new Error('區塊沒有結束括號');
}

for (const file of files) {
  let src = readFileSync(file, 'utf8');
  // 移除先前產生的 tw 區塊
  for (let m; (m = /\n(\s*)tw: [{[]/.exec(src)); ) {
    const open = m.index + m[0].length - 1;
    const end = blockEnd(src, open);
    const tail = src[end + 1] === ',' ? 2 : 1;
    src = src.slice(0, m.index) + src.slice(end + tail);
  }
  let count = 0;
  let from = 0;
  for (let m; (m = /\n(\s*)zh: [{[]/g), (m.lastIndex = from), (m = m.exec(src)); ) {
    const indent = m[1];
    const open = m.index + m[0].length - 1;
    const end = blockEnd(src, open);
    const body = src.slice(open, end + 1);
    const insert = `,\n${indent}tw: ${toTw(body)}`;
    const after = src[end + 1] === ',' ? end + 1 : end + 1;
    src = src.slice(0, after) + insert + src.slice(after);
    from = after + insert.length;
    count++;
  }
  writeFileSync(file, src);
  console.log(`${file}: ${count} 個 tw 區塊`);
}
