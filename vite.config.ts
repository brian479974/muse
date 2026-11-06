import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// 正式版加上內容安全政策：只允許本站程式、本站資料與五個上游圖庫的圖片，
// 不允許連到任何其他網站（網站已經沒有生圖 API，用不到對外連線）。
const galleries = [
  'https://ai-pose-gallery.pages.dev',
  'https://ai-pose-depth-gallery.pages.dev',
  'https://ai-costume-gallery.pages.dev',
  'https://ai-costume-anime-gallery.pages.dev',
  'https://ai-portrait-gallery.pages.dev',
].join(' ');
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${galleries}`,
  `connect-src 'self' ${galleries}`,
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');
function contentSecurityPolicy(): Plugin {
  return {
    name: 'muse-csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
  };
}

// 正式網址 https://muse.markforged.tw/ 在網域根目錄；要部署到子路徑時用 VITE_BASE 指定。
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? process.env.VITE_BASE || '/' : '/',
  plugins: [react(), contentSecurityPolicy()],
}));
