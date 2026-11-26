import { defineConfig, loadEnv, type Plugin } from 'vite';
import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { countShown } from './src/shown-counts';

// 正式版加上內容安全政策：只允許本站程式、本站資料與 Muse 自製素材圖片主機（R2），
// 對外連線只多放行匿名使用次數統計服務（worker/，見 src/stats.ts），其他網站一律不准連。
// 2026-11-26 起網站上的圖片全部自製，五個上游圖庫的網域已從白名單拿掉（Brian：「連到別的網站的，我們都要擺脫掉」）
const statsService = 'https://muse-stats.brian479974.workers.dev';
// Muse 自製素材圖片主機：Cloudflare R2（bucket muse-assets）前面的 muse-img Worker，原始碼 worker-img/，上傳用 scripts/r2-sync.py（2026-11-23 起）
export const MUSE_ASSET_HOST = 'https://muse-img.brian479974.workers.dev/';
// assetHost＝Muse 自製素材圖片主機（MUSE_ASSET_HOST），換色、圖卡、打包下載都要讀
const cspFor = (assetHost: string) =>
  [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${assetHost}`.trim(),
  `connect-src 'self' ${statsService} ${assetHost}`.trim(),
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');
function contentSecurityPolicy(assetHost: string): Plugin {
  const csp = cspFor(assetHost);
  return {
    name: 'muse-csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
  };
}

// 正式網址 https://muse.toai.tw/ 在網域根目錄；要部署到子路徑時用 VITE_BASE 指定。
// 圖片放 R2 時（有設 VITE_MUSE_ASSET_BASE），建置完把 dist/muse-assets 拿掉：發布檔只剩程式與清單，不再受 GitHub Pages 1 GB 限制
function dropLocalMuseAssets(enabled: boolean): Plugin {
  return {
    name: 'muse-drop-local-assets',
    apply: 'build',
    closeBundle() {
      if (enabled) rmSync(resolve(process.cwd(), 'dist/muse-assets'), { recursive: true, force: true });
    },
  };
}

// 建置當下的參考數量：從要發布的 public/data/catalog.json 算，寫進程式當「清單還沒下載完」時的數字。
// CI 先跑 mirror-filter 再 build，所以讀到的就是發布出去的那份清單；讀不到就讓建置失敗，不要默默發布沒有數字的版本
function builtShownCounts() {
  const catalog = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/catalog.json'), 'utf8'));
  const counts = countShown(catalog.items || []);
  if (!counts.references || !counts.images) throw Error('public/data/catalog.json 沒有參考，算不出網站數字');
  return counts;
}

export default defineConfig(({ command, isPreview, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // 正式版（build）圖片一律從 R2 讀；開發（npm run dev）讀本機 public/muse-assets。要改主機設 VITE_MUSE_ASSET_BASE，設成空字串＝讀本站
  const assetBase = env.VITE_MUSE_ASSET_BASE ?? (command === 'build' || isPreview ? MUSE_ASSET_HOST : '');
  return {
    base: command === 'build' || isPreview ? process.env.VITE_BASE || '/' : '/',
    define: {
      'import.meta.env.VITE_MUSE_ASSET_BASE': JSON.stringify(assetBase),
      __MUSE_BUILT_COUNTS__: JSON.stringify(builtShownCounts()),
    },
    plugins: [react(), contentSecurityPolicy(assetBase ? new URL(assetBase).origin : ''), dropLocalMuseAssets(!!assetBase)],
  };
});
