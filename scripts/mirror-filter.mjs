// 鏡像版素材清單過濾：移除原站自建擴展（collection === 'custom'）與擴展分類（extended === true），
// 並重新計算統計數字。自建素材的授權禁止在其他倉庫或網站再發布；擴展分類依鏡像維護者決定不收錄。
// 另外檢查每張圖都指向上游圖庫，有任何其他來源就中止。
// 用法：node scripts/mirror-filter.mjs [catalog.json 路徑]
import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2] || 'public/data/catalog.json';
const catalog = JSON.parse(readFileSync(path, 'utf8'));
const before = catalog.items.length;
const items = catalog.items.filter((item) => item.collection !== 'custom' && !item.extended);

for (const item of items)
  for (const variant of item.variants)
    for (const url of [
      variant.thumbnail,
      variant.image,
      variant.original,
      ...(variant.depth ? Object.values(variant.depth) : []),
    ])
      if (!/^https:\/\/ai-[a-z-]+-gallery\.pages\.dev\//.test(url))
        throw new Error(`非上游圖庫網址：${item.id} ${url}`);

const poses = items.filter((item) => item.kind === 'pose');
const stats = {
  poseGroups: poses.length,
  poseImages: poses.reduce((sum, item) => sum + item.variants.length, 0),
  costumes: items.filter((item) => item.kind === 'costume').length,
  characters: items.filter((item) => item.kind === 'character').length,
  references: items.length,
  images: items.reduce((sum, item) => sum + item.variants.length, 0),
};
writeFileSync(path, JSON.stringify({ ...catalog, items, stats }));
console.log(`catalog: ${before} → ${items.length} items`, stats);
