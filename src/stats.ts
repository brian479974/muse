// 匿名使用次數統計：回報「哪張參考被下載圖卡（card）／下載原圖（ref）／複製提示詞（prompt）」，
// 並取回各參考「放進圖卡並下載」的次數，用來排熱門與排行榜。
// 髮型（2026-11-22）：髮型參考照樣算 card／ref／prompt；另加兩個動作——
//   color：用到哪個髮色（圖卡、髮型圖下載、複製提示詞時，參考是色票 key，類型 haircolor）
//   recolor：在哪款髮型上試了推薦色以外的顏色（同一款同一色每次開站只算一次）
// 只送參考編號、類型、動作；不設 cookie、不送任何個人資料，使用者上傳的圖不會回報。
// 服務原始碼在 worker/（Cloudflare Worker ＋ D1）。
import { storageGet, storageSet } from './library';
import type { Kind, Reference } from './types';

export const STATS_ORIGIN = 'https://muse-stats.brian479974.workers.dev';
export type StatsAction = 'card' | 'ref' | 'prompt' | 'color' | 'recolor';
export interface Hit {
  action: StatsAction;
  refs: { id: string; kind: Kind | 'haircolor' }[];
}
export interface Stats {
  updated: string;
  counts: Record<string, number>;
}
export interface RankedReference {
  item: Reference;
  count: number;
}

const CACHE_KEY = 'muse-stats-cache';
/** 一個類型至少要有幾張參考被用過，排行榜才顯示（剛上線還沒數據時不顯示） */
export const MIN_RANKED = 3;

export const isStats = (value: unknown): value is Stats =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as Stats).updated === 'string' &&
  !!(value as Stats).counts &&
  typeof (value as Stats).counts === 'object' &&
  !Array.isArray((value as Stats).counts) &&
  Object.values((value as Stats).counts).every((n) => Number.isInteger(n) && n > 0);

/** 只在正式網站回報，本機開發與預覽不灌數字 */
const reporting = () =>
  typeof window !== 'undefined' &&
  ['muse.toai.tw', 'muse.markforged.tw'].includes(window.location.hostname);

/**
 * 要送出的請求內容（純函式，測試用）。髮型參考另外送一筆：計數服務還沒更新到認得髮型時，
 * 只有髮型那筆會被拒，姿勢／服裝／人物的次數照算（2026-11-22 加髮型時的相容做法）。
 */
export function buildHits(action: StatsAction, refs: (Reference | undefined)[]): Hit[] {
  const list = refs
    .filter((ref): ref is Reference => !!ref)
    .map((ref) => ({ id: ref.id, kind: ref.kind }));
  const core = list.filter((ref) => ref.kind !== 'hairstyle');
  const hair = list.filter((ref) => ref.kind === 'hairstyle');
  return [core, hair].filter((group) => group.length).map((group) => ({ action, refs: group }));
}

function send(hit: Hit) {
  try {
    // text/plain 不會觸發預檢；keepalive 讓下載跳頁時請求照樣送出
    void fetch(`${STATS_ORIGIN}/hit`, {
      method: 'POST',
      body: JSON.stringify(hit),
      headers: { 'Content-Type': 'text/plain' },
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* 統計失敗不影響使用 */
  }
}

export function track(action: StatsAction, refs: (Reference | undefined)[]) {
  if (!reporting()) return;
  for (const hit of buildHits(action, refs)) send(hit);
}

/** 用到的髮色（色票 key）；沒有色票（例如上傳的髮型照沿用照片原色）就不送 */
export function trackHairColor(colorKey?: string | null) {
  if (!reporting() || !colorKey) return;
  send({ action: 'color', refs: [{ id: colorKey, kind: 'haircolor' }] });
}

/** 在某款髮型上試了推薦色以外的顏色：同一款同一色每次開站只送一次 */
const recolored = new Set<string>();
export function trackRecolor(item: Reference, colorKey: string) {
  const key = `${item.id}|${colorKey}`;
  if (!reporting() || recolored.has(key)) return;
  recolored.add(key);
  send({ action: 'recolor', refs: [{ id: item.id, kind: item.kind }] });
}

/** 取排行；3 秒內沒回應或失敗，就改用這台瀏覽器上次存下的排行（沒有就回傳 null） */
export async function loadStats(timeoutMs = 3000): Promise<Stats | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${STATS_ORIGIN}/stats`, { signal: controller.signal });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!isStats(data)) throw Error('Invalid stats');
    storageSet(CACHE_KEY, data);
    return data;
  } catch {
    return storageGet<Stats | null>(CACHE_KEY, null, (v): v is Stats | null => v === null || isStats(v));
  } finally {
    clearTimeout(timer);
  }
}

/** 各類型依次數由高到低取前 n 名；同次數照圖庫原本順序 */
export function rankByKind(
  items: Reference[],
  counts: Record<string, number>,
  limit = 10,
): Record<Kind, RankedReference[]> {
  const result: Record<Kind, RankedReference[]> = {
    pose: [],
    costume: [],
    character: [],
    hairstyle: [],
  };
  for (const item of items) {
    const count = counts[item.id];
    if (count) result[item.kind].push({ item, count });
  }
  for (const kind of Object.keys(result) as Kind[]) {
    result[kind] = result[kind]
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => b.entry.count - a.entry.count || a.index - b.index)
      .slice(0, limit)
      .map(({ entry }) => entry);
  }
  return result;
}
