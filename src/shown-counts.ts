// 首頁與「關於」的數字：只算預設看得到的參考（擴展分類要選了該分類才出現，不算），跟「全部參考」清單同一套算法。
// 網站和建置（vite.config.ts）共用這一支：建置時先算好寫進程式，打開網站不用等 11 MB 的清單下載完就有數字（2026-11-24 手機上「關於」全是「—」）
export type ShownCounts = {
  references: number;
  images: number;
  pose: number;
  costume: number;
  character: number;
  hairstyle: number;
};

type CountableItem = { kind: string; extended?: boolean; variants: unknown[] };

export function countShown(items: readonly CountableItem[]): ShownCounts {
  const shown = items.filter((item) => !item.extended);
  const count = (kind: string) => shown.filter((item) => item.kind === kind).length;
  return {
    references: shown.length,
    images: shown.reduce((sum, item) => sum + item.variants.length, 0),
    pose: count('pose'),
    costume: count('costume'),
    character: count('character'),
    hairstyle: count('hairstyle'),
  };
}
