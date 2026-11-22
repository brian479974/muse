// 鏡像版素材清單過濾：移除原站自建擴展（collection === 'custom'）與姿勢的擴展分類（extended === true），
// 並重新計算統計數字。自建素材的授權禁止在其他倉庫或網站再發布；服裝的擴展分類 2026-11-22 起收錄。
// 另外檢查每張圖都指向上游圖庫，有任何其他來源就中止；所有 {zh, en} 文字欄位補上繁體 tw。
// 用法：node scripts/mirror-filter.mjs [catalog.json 路徑]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { toTw } from './zh-hant.mjs';
import {
  hairColorProblems,
  hairFacetProblems,
  hairstyleProblems,
  loadHairstyleRules,
  withHairstyleFacets,
} from './hairstyle-data.mjs';

const path = process.argv[2] || 'public/data/catalog.json';
const catalog = JSON.parse(readFileSync(path, 'utf8'));
const before = catalog.items.length;
const extrasPath = 'data/muse-extras.json';
const extras = existsSync(extrasPath) ? JSON.parse(readFileSync(extrasPath, 'utf8')).items : [];
// 取代上游同編號的自製素材：清單裡那個位置（上游原版或上次併入的自製版）先留著當佔位，下面原位換成最新自製版
const replaceIds = new Set(
  extras.filter((extra) => extra.replaces === 'upstream').map((extra) => extra.id),
);
// 其他自製素材（source === 'muse'）先拿掉，下面再從 data/muse-extras.json 重新併入，重跑結果一致
const items = catalog.items.filter(
  (item) =>
    item.collection !== 'custom' &&
    // 擴展分類：服裝的內衣、泳裝、魅力穿搭 2026-11-22 Brian 核准收錄（網站已搬離公司網址）；
    // 網站只在訪客選了那個分類時才列出。姿勢的擴展分類照舊不收（姿勢已全部改用自製）
    (!item.extended || item.kind === 'costume') &&
    (item.source !== 'muse' || replaceIds.has(item.id)),
);

for (const item of items)
  if (!replaceIds.has(item.id))
    for (const variant of item.variants)
      for (const url of [
        variant.thumbnail,
        variant.image,
        variant.original,
        ...(variant.depth ? Object.values(variant.depth) : []),
      ])
        if (!/^https:\/\/ai-[a-z-]+-gallery\.pages\.dev\//.test(url))
          throw new Error(`非上游圖庫網址：${item.id} ${url}`);

// 併入 Muse 自製素材（data/muse-extras.json）：圖片放在 public/muse-assets/，網址必須是 /muse-assets/ 開頭且檔案存在
// 素材類型只收姿勢、服裝、人物、髮型（2026-11-22 加髮型）；髮型另外檢查篩選欄位、推薦色與每個角度的頭髮遮罩
const KINDS = ['pose', 'costume', 'character', 'hairstyle'];
const hairRules = loadHairstyleRules();
const colorProblems = hairColorProblems(hairRules.colors);
if (colorProblems.length)
  throw new Error(`色票檔 data/hair-colors.json 有問題：${colorProblems.join('；')}`);
const facetProblems = hairFacetProblems(hairRules.facets);
if (facetProblems.length)
  throw new Error(`髮型篩選選項 data/hairstyle-facets.json 有問題：${facetProblems.join('；')}`);
const known = new Set(items.map((item) => item.id));
// Muse 自製取代上游同編號素材（replaces === 'upstream'）：沿用原編號、原位置，收藏與使用次數不受影響
const position = new Map(items.map((item, index) => [item.id, index]));
for (const extra of extras) {
  if (extra.replaces === 'upstream' && !position.has(extra.id))
    throw new Error(`要取代的素材不在清單裡（上游原版或先前自製版都沒有）：${extra.id}`);
  if (known.has(extra.id) && extra.replaces !== 'upstream')
    throw new Error(`自製素材 id 重複：${extra.id}`);
  if (!KINDS.includes(extra.kind))
    throw new Error(`未知的素材類型：${extra.id} kind=${extra.kind}`);
  if (extra.kind === 'hairstyle') {
    const problems = hairstyleProblems(extra, hairRules);
    if (problems.length) throw new Error(`髮型素材有問題：${problems.join('；')}`);
    withHairstyleFacets(extra, hairRules);
  }
  for (const variant of extra.variants)
    for (const url of [
      variant.thumbnail,
      variant.image,
      variant.original,
      ...(variant.mask ? [variant.mask] : []),
      ...(variant.depth
        ? [variant.depth.thumbnail, variant.depth.image, variant.depth.original]
        : []),
    ]) {
      if (!url.startsWith('/muse-assets/'))
        throw new Error(`自製素材網址不在 /muse-assets/：${extra.id} ${url}`);
      if (!existsSync(`public${url}`)) throw new Error(`自製素材檔案不存在：public${url}`);
    }
  if (extra.replaces === 'upstream') items[position.get(extra.id)] = extra;
  else items.push(extra);
  known.add(extra.id);
}

// 人物的「年齡」「族裔」：選項在 data/character-facets.json，每張的標註在 data/character-attributes.json。
// 舊的「國家」欄位（上游一律寫日本，自製的沒寫）拿掉；任何人物沒標到或標了不存在的選項就中止，不讓沒分類的人物上線
const facets = JSON.parse(readFileSync('data/character-facets.json', 'utf8'));
const attributes = JSON.parse(readFileSync('data/character-attributes.json', 'utf8')).items;
const facetLabel = Object.fromEntries(
  ['age', 'ethnicity'].map((key) => [key, new Map(facets[key].map((value) => [value.id, value]))]),
);
const unlabeled = [];
for (const item of items) {
  delete item.country;
  if (item.kind !== 'character') continue;
  const attr = attributes[item.id];
  for (const key of ['age', 'ethnicity']) {
    const value = attr && facetLabel[key].get(attr[key]);
    if (!value) unlabeled.push(`${item.id} ${key}=${attr?.[key]}`);
    else item[key] = { id: value.id, zh: value.zh, en: value.en };
  }
}
if (unlabeled.length)
  throw new Error(
    `人物缺年齡／族裔標註（data/character-attributes.json）：${unlabeled.length} 筆，例如 ${unlabeled.slice(0, 5).join('、')}`,
  );

// 每個同時有 zh 與 en 字串的物件（標題、分類、關鍵字、標籤、視角名稱…）補上繁體 tw。
// data/muse-extras.json 裡已經寫好 tw 的欄位照用（自製素材可以直接給台灣用語，例如「鮑伯」「瀏海」，OpenCC 轉不出來）；
// 其他一律由簡體重轉，重跑結果一致
let converted = 0;
const cache = new Map();
const authoredTw = new WeakSet();
(function markAuthored(node) {
  if (Array.isArray(node)) return node.forEach(markAuthored);
  if (!node || typeof node !== 'object') return;
  if (typeof node.tw === 'string' && node.tw.trim()) authoredTw.add(node);
  for (const value of Object.values(node)) markAuthored(value);
})(extras);
function addTw(node) {
  if (Array.isArray(node)) return node.forEach(addTw);
  if (!node || typeof node !== 'object') return;
  if (typeof node.zh === 'string' && typeof node.en === 'string' && !authoredTw.has(node)) {
    if (!cache.has(node.zh)) cache.set(node.zh, toTw(node.zh));
    node.tw = cache.get(node.zh);
    converted++;
  }
  for (const value of Object.values(node)) addTw(value);
}
addTw(items);

const poses = items.filter((item) => item.kind === 'pose');
const stats = {
  poseGroups: poses.length,
  poseImages: poses.reduce((sum, item) => sum + item.variants.length, 0),
  costumes: items.filter((item) => item.kind === 'costume').length,
  characters: items.filter((item) => item.kind === 'character').length,
  hairstyles: items.filter((item) => item.kind === 'hairstyle').length,
  references: items.length,
  images: items.reduce((sum, item) => sum + item.variants.length, 0),
};
writeFileSync(path, JSON.stringify({ ...catalog, items, stats }));
console.log(
  `catalog: ${before} → ${items.length} items（含自製 ${extras.length}）· 繁體欄位 ${converted} 個`,
  stats,
);
