// Muse 圖片服務：從 R2 讀 muse-assets/... 回傳給網站（muse.toai.tw 在 GitHub Pages，圖片放 Cloudflare R2）
// 2026-11-23 Brian：「用R2」「DNS 可以不要換嗎」「由github 轉址」→ 不搬 DNS，圖片走這支 Worker 的 workers.dev 網址
// GET／HEAD：公開讀圖（CORS 全開：網頁換色、參考圖卡、打包下載都要在 canvas／fetch 讀像素）
// PUT /_upload/<key>：上傳，需 X-Upload-Secret（只有 Bella 的上傳腳本用）；DELETE 同
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Max-Age': '86400' };
const TYPES = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', json: 'application/json' };
const KEY_OK = /^muse-assets\/[a-z]+\/[a-z0-9_]+(\/[a-z0-9_]+)?\/[A-Za-z0-9._+-]+\.(webp|jpg|jpeg|png)$|^_manifest\.json$/;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname.startsWith('/_upload/')) return upload(req, env, decodeURIComponent(url.pathname.slice('/_upload/'.length)));
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('method not allowed', { status: 405, headers: CORS });
    const key = decodeURIComponent(url.pathname.slice(1));
    if (!key.startsWith('muse-assets/') || !KEY_OK.test(key)) return new Response('not found', { status: 404, headers: CORS });
    const obj = await env.BUCKET.get(key, { onlyIf: req.headers, range: req.headers });
    if (!obj) return new Response('not found', { status: 404, headers: CORS });
    const h = new Headers(CORS);
    obj.writeHttpMetadata(h);
    h.set('ETag', obj.httpEtag);
    if (!h.get('Content-Type')) h.set('Content-Type', TYPES[key.split('.').pop().toLowerCase()] || 'application/octet-stream');
    h.set('Cache-Control', 'public, max-age=86400');   // 同檔名重畫過的圖一天內會更新（GitHub Pages 原本是 10 分鐘）
    h.set('Accept-Ranges', 'bytes');
    if (!('body' in obj)) return new Response(null, { status: 304, headers: h });   // onlyIf 條件成立＝沒變
    if (obj.range) {
      const { offset = 0, length = obj.size - offset } = obj.range;
      h.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${obj.size}`);
      return new Response(req.method === 'HEAD' ? null : obj.body, { status: 206, headers: h });
    }
    return new Response(req.method === 'HEAD' ? null : obj.body, { status: 200, headers: h });
  },
};

async function upload(req, env, key) {
  if (!env.UPLOAD_SECRET || req.headers.get('X-Upload-Secret') !== env.UPLOAD_SECRET) return new Response('forbidden', { status: 403 });
  if (!KEY_OK.test(key)) return new Response('bad key', { status: 400 });
  if (req.method === 'DELETE') { await env.BUCKET.delete(key); return Response.json({ deleted: key }); }
  if (req.method === 'GET') { const o = await env.BUCKET.get(key); return o ? new Response(o.body, { headers: { 'Content-Type': 'application/json' } }) : new Response('{}', { status: 404 }); }
  if (req.method === 'HEAD') { const o = await env.BUCKET.head(key); return new Response(null, { status: o ? 200 : 404, headers: o ? { 'X-Sha256': o.customMetadata?.sha256 || '', 'Content-Length': String(o.size) } : {} }); }
  if (req.method !== 'PUT') return new Response('method not allowed', { status: 405 });
  const sha = req.headers.get('X-Sha256') || '';
  const type = TYPES[key.split('.').pop().toLowerCase()] || 'application/octet-stream';
  const o = await env.BUCKET.put(key, req.body, { httpMetadata: { contentType: type }, customMetadata: { sha256: sha } });
  return Response.json({ key, size: o.size, etag: o.etag });
}
