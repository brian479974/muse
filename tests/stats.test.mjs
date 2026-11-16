// 匿名使用次數：排行計算、資料檢查、熱門排序（2026-11-16）
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
});
const { rankByKind, isStats, MIN_RANKED } = await vite.ssrLoadModule('/src/stats.ts');
const { sortItems } = await vite.ssrLoadModule('/src/library.ts');
after(async () => {
  await vite.close();
});

const title = (name) => ({ zh: name, tw: name, en: name });
const ref = (id, kind) => ({ id, kind, code: id, title: title(id), variants: [] });
const items = [
  ref('p1', 'pose'),
  ref('p2', 'pose'),
  ref('p3', 'pose'),
  ref('c1', 'costume'),
  ref('c2', 'costume'),
  ref('h1', 'character'),
];

test('rankByKind 依次數由高到低、同次數照原順序、沒用過的不列', () => {
  const ranks = rankByKind(items, { p3: 5, p1: 2, p2: 2, c2: 1 }, 10);
  assert.deepEqual(
    ranks.pose.map((e) => [e.item.id, e.count]),
    [
      ['p3', 5],
      ['p1', 2],
      ['p2', 2],
    ],
  );
  assert.deepEqual(ranks.costume.map((e) => e.item.id), ['c2']);
  assert.deepEqual(ranks.character, []);
});

test('rankByKind 只取前 n 名、不認得的編號忽略', () => {
  const ranks = rankByKind(items, { p1: 1, p2: 2, p3: 3, ghost: 99 }, 2);
  assert.deepEqual(ranks.pose.map((e) => e.item.id), ['p3', 'p2']);
});

test('排行榜門檻：某類型被用過的參考不到 3 張就不列', () => {
  assert.equal(MIN_RANKED, 3);
});

test('isStats 接受正常資料，擋掉壞資料', () => {
  assert.equal(isStats({ updated: '2026-11-16T00:00:00Z', counts: { a: 1 } }), true);
  assert.equal(isStats({ updated: '2026-11-16T00:00:00Z', counts: {} }), true);
  assert.equal(isStats(null), false);
  assert.equal(isStats({ counts: { a: 1 } }), false);
  assert.equal(isStats({ updated: 'x', counts: [] }), false);
  assert.equal(isStats({ updated: 'x', counts: { a: 0 } }), false);
  assert.equal(isStats({ updated: 'x', counts: { a: '3' } }), false);
});

test('熱門排序：次數高的在前，沒有次數的照交替瀏覽順序排在後面', () => {
  const curated = sortItems(items, 'curated', 'tw').map((i) => i.id);
  const popular = sortItems(items, 'popular', 'tw', { c2: 4, h1: 9 }).map((i) => i.id);
  assert.deepEqual(popular.slice(0, 2), ['h1', 'c2']);
  assert.deepEqual(
    popular.slice(2),
    curated.filter((id) => id !== 'h1' && id !== 'c2'),
  );
  // 沒有數據時，熱門排序等於交替瀏覽
  assert.deepEqual(sortItems(items, 'popular', 'tw').map((i) => i.id), curated);
});
