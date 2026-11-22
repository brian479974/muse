// 髮型參考（kind: 'hairstyle'）的建置檢查與欄位補齊：mirror-filter.mjs 併入 data/muse-extras.json 時呼叫。
// 每款髮型有正面／側面／背面三張人台頭圖，每張另附頭髮遮罩（PNG，跟 image 同尺寸；R＝頭髮、G＝邊緣帶），
// 網頁用遮罩即時換色（src/hair-recolor.ts）。篩選選項在 data/hairstyle-facets.json，色票在 data/hair-colors.json。
import { existsSync, readFileSync } from 'node:fs';

export const HAIRSTYLE_ANGLES = ['front', 'side', 'back'];
const HEX = /^#[0-9a-f]{6}$/i;

export function loadHairstyleRules(root = '.') {
  return {
    facets: JSON.parse(readFileSync(`${root}/data/hairstyle-facets.json`, 'utf8')),
    colors: JSON.parse(readFileSync(`${root}/data/hair-colors.json`, 'utf8')),
  };
}

/** 色票檔檢查：key 不重複、三語名稱齊全、hex 是「#RRGGBB」或「#深,#淺」（挑染／漸層）。回傳問題清單，空＝合格 */
export function hairColorProblems(colors) {
  const problems = [];
  if (!Array.isArray(colors) || !colors.length) return ['色票清單是空的'];
  const keys = new Set();
  for (const color of colors) {
    const key = color?.key;
    if (typeof key !== 'string' || !/^[a-z_]+$/.test(key)) problems.push(`色票 key 不合格：${key}`);
    else if (keys.has(key)) problems.push(`色票 key 重複：${key}`);
    keys.add(key);
    for (const field of ['zh_tw', 'zh_cn', 'en', 'prompt'])
      if (typeof color?.[field] !== 'string' || !color[field].trim())
        problems.push(`色票 ${key} 缺 ${field}`);
    const hex = typeof color?.hex === 'string' ? color.hex.split(',') : [];
    if (!hex.length || hex.length > 2 || !hex.every((value) => HEX.test(value)))
      problems.push(`色票 ${key} 的 hex 不是 #RRGGBB 或 #深,#淺：${color?.hex}`);
  }
  return problems;
}

/** 篩選選項檔檢查：五個欄位都有名稱，每個選項 id 不重複、三語名稱齊全。回傳問題清單，空＝合格 */
export function hairFacetProblems(facets) {
  const problems = [];
  for (const key of ['gender', 'length', 'type', 'bangs', 'styles']) {
    const field = facets?.fields?.[key];
    if (!['zh', 'tw', 'en'].every((lang) => field?.[lang] && field?.all?.[lang]))
      problems.push(`欄位 ${key} 缺名稱`);
    const ids = new Set();
    for (const option of facets?.[key] || []) {
      if (ids.has(option.id)) problems.push(`${key} 選項重複：${option.id}`);
      ids.add(option.id);
      if (
        !['zh', 'tw', 'en'].every((lang) => typeof option[lang] === 'string' && option[lang].trim())
      )
        problems.push(`${key} 選項 ${option.id} 缺三語名稱`);
    }
    if (!ids.size) problems.push(`${key} 沒有選項`);
  }
  return problems;
}

/**
 * 檢查一筆髮型素材，回傳問題清單（空＝合格）。
 * exists(url) 確認圖檔在 public/ 底下真的存在（測試時可換成假的）。
 */
export function hairstyleProblems(
  extra,
  { facets, colors },
  exists = (url) => existsSync(`public${url}`),
) {
  const id = extra?.id;
  const problems = [];
  const hair = extra?.hairstyle;
  if (extra?.kind !== 'hairstyle') return [`${id} 不是髮型（kind=${extra?.kind}）`];
  if (!hair || typeof hair !== 'object') return [`${id} 缺 hairstyle 欄位`];
  const ids = (key) => new Set(facets[key].map((value) => value.id));
  for (const key of ['gender', 'length', 'type', 'bangs'])
    if (!ids(key).has(hair[key]))
      problems.push(`${id} hairstyle.${key}=${hair[key]} 不在 hairstyle-facets.json`);
  if (!Array.isArray(hair.styles) || !hair.styles.length)
    problems.push(`${id} hairstyle.styles 要至少一個風格`);
  else
    for (const style of hair.styles)
      if (!ids('styles').has(style))
        problems.push(`${id} 風格 ${style} 不在 hairstyle-facets.json`);
  if (typeof hair.prompt !== 'string' || !hair.prompt.trim())
    problems.push(`${id} 缺英文髮型描述 hairstyle.prompt`);
  else if (/[぀-ヿ㐀-鿿]/.test(hair.prompt)) problems.push(`${id} hairstyle.prompt 要是英文`);
  if (!colors.some((color) => color.key === hair.recommendedColor))
    problems.push(`${id} 推薦色 ${hair.recommendedColor} 不在 hair-colors.json`);
  // 性別標籤要跟 hairstyle.gender 一致：圖庫「人物標籤」篩選靠 tags 找男女
  const genderTag = hair.gender === 'f' ? 'female' : hair.gender === 'm' ? 'male' : '';
  if (genderTag && !extra.tags?.some((tag) => tag.id === genderTag))
    problems.push(`${id} tags 缺 ${genderTag}（hairstyle.gender=${hair.gender}）`);
  const angles = (extra.variants || []).map((variant) => variant.angle);
  if (!angles.includes('front')) problems.push(`${id} 沒有正面圖`);
  if (new Set(angles).size !== angles.length) problems.push(`${id} 角度重複：${angles.join(',')}`);
  for (const variant of extra.variants || []) {
    if (!HAIRSTYLE_ANGLES.includes(variant.angle))
      problems.push(`${id} 角度 ${variant.angle} 不是正面／側面／背面`);
    const mask = variant.mask;
    if (
      typeof mask !== 'string' ||
      !/^\/muse-assets\/hairstyle\/masks\/[a-z0-9_-]+\.png$/.test(mask)
    )
      problems.push(`${id} ${variant.angle} 遮罩網址不合格：${mask}`);
    else if (!exists(mask)) problems.push(`${id} ${variant.angle} 遮罩檔不存在：public${mask}`);
  }
  return problems;
}

/**
 * 五個篩選欄位的三語名稱掛到 hairstyle.facets。繁體直接取 hairstyle-facets.json 寫好的台灣用語
 *（mirror-filter 對已寫好 tw 的自製素材欄位不再用 OpenCC 重轉）。
 */
export function withHairstyleFacets(extra, { facets }) {
  const label = (key, id) => {
    const value = facets[key].find((option) => option.id === id);
    return { id: value.id, zh: value.zh, tw: value.tw, en: value.en };
  };
  const hair = extra.hairstyle;
  hair.facets = {
    gender: label('gender', hair.gender),
    length: label('length', hair.length),
    type: label('type', hair.type),
    bangs: label('bangs', hair.bangs),
    styles: hair.styles.map((style) => label('styles', style)),
  };
  return extra;
}
