/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IMAGE_PROXY_URL?: string;
  readonly VITE_IMAGE_JOB_API_URL?: string;
  /** Muse 自製素材的圖片主機（正式版由 vite.config.ts 的 MUSE_ASSET_HOST 帶入）；沒設就讀本站 /muse-assets/ */
  readonly VITE_MUSE_ASSET_BASE?: string;
}

/** 建置當下算好的首頁／「關於」數字（vite.config.ts 由 public/data/catalog.json 算出），清單下載完前先顯示這組 */
declare const __MUSE_BUILT_COUNTS__: import('./shown-counts').ShownCounts;
