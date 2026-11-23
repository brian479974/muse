import { defineConfig, loadEnv, type Plugin } from 'vite';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';

// 正式版加上內容安全政策：只允許本站程式、本站資料與五個上游圖庫的圖片，
// 對外連線只多放行匿名使用次數統計服務（worker/，見 src/stats.ts），其他網站一律不准連。
const galleries = [
  'https://ai-pose-gallery.pages.dev',
  'https://ai-pose-depth-gallery.pages.dev',
  'https://ai-costume-gallery.pages.dev',
  'https://ai-costume-anime-gallery.pages.dev',
  'https://ai-portrait-gallery.pages.dev',
].join(' ');
const statsService = 'https://muse-stats.brian479974.workers.dev';
// Muse 自製素材圖片主機：Cloudflare R2（bucket muse-assets）前面的 muse-img Worker，原始碼 worker-img/，上傳用 scripts/r2-sync.py（2026-11-23 起）
export const MUSE_ASSET_HOST = 'https://muse-img.brian479974.workers.dev/';
// assetHost＝Muse 自製素材圖片主機（MUSE_ASSET_HOST），換色、圖卡、打包下載都要讀
const cspFor = (assetHost: string) =>
  [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${galleries} ${assetHost}`.trim(),
  `connect-src 'self' ${galleries} ${statsService} ${assetHost}`.trim(),
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

export default defineConfig(({ command, isPreview, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // 正式版（build）圖片一律從 R2 讀；開發（npm run dev）讀本機 public/muse-assets。要改主機設 VITE_MUSE_ASSET_BASE，設成空字串＝讀本站
  const assetBase = env.VITE_MUSE_ASSET_BASE ?? (command === 'build' || isPreview ? MUSE_ASSET_HOST : '');
  return {
    base: command === 'build' || isPreview ? process.env.VITE_BASE || '/' : '/',
    define: { 'import.meta.env.VITE_MUSE_ASSET_BASE': JSON.stringify(assetBase) },
    plugins: [react(), contentSecurityPolicy(assetBase ? new URL(assetBase).origin : ''), dropLocalMuseAssets(!!assetBase)],
  };
});
