// 匿名使用次數統計：回報「哪張參考被下載圖卡（card）／下載原圖（ref）／複製提示詞（prompt）」，
// 並取回各參考「放進圖卡並下載」的次數，用來排熱門與排行榜。
// 只送參考編號、類型、動作；不設 cookie、不送任何個人資料，使用者上傳的圖不會回報。
// 服務原始碼在 worker/（Cloudflare Worker ＋ D1）。
import { storageGet, storageSet } from './library';
import type { Kind, Reference } from './types';

export const STATS_ORIGIN = 'https://muse-stats.brian479974.workers.dev';
export type StatsAction = 'card' | 'ref' | 'prompt';
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
  typeof window !== 'undefined' && window.location.hostname === 'muse.markforged.tw';

export function track(action: StatsAction, refs: (Reference | undefined)[]) {
  if (!reporting()) return;
  const list = refs
    .filter((ref): ref is Reference => !!ref)
    .map((ref) => ({ id: ref.id, kind: ref.kind }));
  if (!list.length) return;
  try {
    // text/plain 不會觸發預檢；keepalive 讓下載跳頁時請求照樣送出
    void fetch(`${STATS_ORIGIN}/hit`, {
      method: 'POST',
      body: JSON.stringify({ action, refs: list }),
      headers: { 'Content-Type': 'text/plain' },
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* 統計失敗不影響使用 */
  }
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
  const result: Record<Kind, RankedReference[]> = { pose: [], costume: [], character: [] };
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
