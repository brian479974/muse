// 髮色色票（單一來源 data/hair-colors.json，16 色；hex 為「#深,#淺」兩色＝挑染／漸層）與髮型相關的小工具。
import colors from '../data/hair-colors.json';
import facets from '../data/hairstyle-facets.json';
import type { Lang, Reference } from './types';

export interface HairColor {
  key: string;
  zh_tw: string;
  zh_cn: string;
  en: string;
  hex: string;
  prompt: string;
}
export const hairColors: HairColor[] = colors;
const byKey = new Map(hairColors.map((color) => [color.key, color]));

export const isHairColorKey = (value: unknown): value is string =>
  typeof value === 'string' && byKey.has(value);
export const hairColorByKey = (key?: string | null) => (key ? byKey.get(key) : undefined);
/** 色票在該語言的名稱（提示詞「髮色為○○」也用它） */
export function hairColorName(color: HairColor, lang: Lang) {
  return lang === 'zh' ? color.zh_cn : lang === 'tw' ? color.zh_tw : color.en;
}
/** 色票圓點的底色：單色直接用，兩色畫成漸層 */
export function swatchBackground(color: HairColor) {
  const [a, b] = color.hex.split(',');
  return b ? `linear-gradient(135deg, ${a} 0 45%, ${b} 55% 100%)` : a;
}
/** 推薦色（資料裡的 recommendedColor；不在色票裡就當沒有） */
export function recommendedHairColor(item?: Pick<Reference, 'hairstyle'>) {
  return hairColorByKey(item?.hairstyle?.recommendedColor);
}
/** 這款髮型目前要顯示的色票：指定的有效就用，否則用推薦色 */
export function effectiveHairColor(item: Pick<Reference, 'hairstyle'>, key?: string | null) {
  return hairColorByKey(key) || recommendedHairColor(item);
}
/** 選的是推薦色（或沒選）＝直接顯示原圖，不換色 */
export function isOriginalHairColor(item: Pick<Reference, 'hairstyle'>, key?: string | null) {
  const color = effectiveHairColor(item, key);
  return !color || color.key === item.hairstyle?.recommendedColor;
}

/** 髮型篩選的欄位名稱、選項與固定順序（單一來源 data/hairstyle-facets.json，三語都寫在檔裡） */
export type HairstyleFacet = 'gender' | 'length' | 'type' | 'bangs' | 'styles';
export const hairstyleFacetKeys: HairstyleFacet[] = ['gender', 'length', 'type', 'bangs', 'styles'];
export const hairstyleFields: Record<
  HairstyleFacet,
  Record<Lang, string> & { all: Record<Lang, string> }
> = facets.fields;
export const hairstyleOptions: Record<HairstyleFacet, (Record<Lang, string> & { id: string })[]> = {
  gender: facets.gender,
  length: facets.length,
  type: facets.type,
  bangs: facets.bangs,
  styles: facets.styles,
};
export function hairstyleOptionLabel(key: HairstyleFacet, id: string, lang: Lang) {
  return hairstyleOptions[key].find((option) => option.id === id)?.[lang] || id;
}
export interface HairstyleFilters {
  gender?: string;
  length?: string;
  type?: string;
  bangs?: string;
  styles?: string;
}
export function matchesHairstyle(item: Reference, filters: HairstyleFilters) {
  const hair = item.hairstyle;
  const active = Object.entries(filters).filter(([, value]) => value && value !== 'all');
  if (!active.length) return true;
  if (item.kind !== 'hairstyle' || !hair) return false;
  return active.every(([key, value]) =>
    key === 'styles'
      ? hair.styles.includes(value!)
      : hair[key as Exclude<HairstyleFacet, 'styles'>] === value,
  );
}

/** Muse 自製人物「同一張臉 5 種髮型」：code 是 FFC-xx-1～5／MFC-xx-1～5，回傳同一張臉的其他編號（含自己，依髮型序號排） */
const FACE_CODE = /^([FM]FC-\d+)-(\d+)$/;
export function sameFaceSiblings(item: Reference, items: Reference[]): Reference[] {
  const match = item.kind === 'character' ? FACE_CODE.exec(item.code) : null;
  if (!match) return [];
  const prefix = `${match[1]}-`;
  return items
    .filter(
      (other) =>
        other.kind === 'character' && other.code.startsWith(prefix) && FACE_CODE.test(other.code),
    )
    .sort((a, b) => Number(FACE_CODE.exec(a.code)![2]) - Number(FACE_CODE.exec(b.code)![2]));
}

/** 網址的 ?hair= 可以是髮型 id 或編號（編號不分大小寫） */
export function findHairstyle(items: Reference[], value?: string | null) {
  if (!value) return undefined;
  const code = value.toUpperCase();
  return items.find(
    (item) => item.kind === 'hairstyle' && (item.id === value || item.code.toUpperCase() === code),
  );
}
/** 舊連結的 ?hair= 是人物「髮長」篩選（short／medium／medium-long／long），跟髮型編號分開 */
export const characterHairLengths = ['short', 'medium', 'medium-long', 'long'] as const;
export const isCharacterHairLength = (value: unknown) =>
  characterHairLengths.some((length) => length === value);

// ── 網址參數 ────────────────────────────────────────────────
/** 髮型篩選在網址的參數名 */
export const hairFilterParams: Record<HairstyleFacet, string> = {
  gender: 'hgender',
  length: 'hlength',
  type: 'htype',
  bangs: 'hbangs',
  styles: 'hstyle',
};
export interface HairUrlState {
  /** 人物分頁的「髮長」篩選（舊連結寫在 ?hair=，現在寫 ?hairlen=） */
  characterHairLength: string;
  /** ?hair=：髮型 id 或編號（還沒對到素材清單） */
  hairstyle: string | null;
  /** ?haircolor=：色票 key（不在色票裡就當沒有） */
  hairColor: string | null;
  filters: HairstyleFilters;
}
/** 讀網址：?hair= 是 short／medium／medium-long／long 時是舊連結的人物髮長，其他值是髮型 */
export function readHairParams(params: URLSearchParams): HairUrlState {
  const hair = params.get('hair');
  const legacyLength = isCharacterHairLength(hair);
  const color = params.get('haircolor');
  return {
    characterHairLength: params.get('hairlen') || (legacyLength ? hair! : 'all'),
    hairstyle: hair && !legacyLength ? hair : null,
    hairColor: isHairColorKey(color) ? color : null,
    filters: Object.fromEntries(
      (Object.keys(hairFilterParams) as HairstyleFacet[]).map((key) => [
        key,
        params.get(hairFilterParams[key]) || 'all',
      ]),
    ),
  };
}
/** 寫網址用的參數（不限＝不寫）；hairstyle 寫髮型編號 */
export function hairParamEntries(state: {
  characterHairLength: string;
  filters: HairstyleFilters;
  hairstyle?: string | null;
  hairColor?: string | null;
}): Record<string, string> {
  const entries: Record<string, string> = {};
  if (state.characterHairLength !== 'all') entries.hairlen = state.characterHairLength;
  for (const key of Object.keys(hairFilterParams) as HairstyleFacet[]) {
    const value = state.filters[key];
    if (value && value !== 'all') entries[hairFilterParams[key]] = value;
  }
  if (state.hairstyle) entries.hair = state.hairstyle;
  if (state.hairColor) entries.haircolor = state.hairColor;
  return entries;
}
