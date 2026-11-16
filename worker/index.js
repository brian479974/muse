// Muse 匿名使用次數統計（Cloudflare Worker ＋ D1）
// 網站回報「哪張參考被下載圖卡（card）／下載原圖（ref）／複製提示詞（prompt）」，
// 這裡只累加次數；不記 IP、不設 cookie、不收任何個人資料，使用者上傳的圖不會回報。
// GET /stats 回傳各參考「放進圖卡並下載」的次數，網站拿來排熱門與排行榜。
const ORIGINS = ['https://muse.markforged.tw', 'http://127.0.0.1:5199', 'http://localhost:5199'];
const ACTIONS = ['card', 'ref', 'prompt'];
const KINDS = ['pose', 'costume', 'character'];
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const SNAPSHOT_TTL = 300;

function cors(origin) {
  const headers = { Vary: 'Origin' };
  if (ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function empty(status, origin) {
  return new Response(null, { status, headers: cors(origin) });
}

async function hit(request, env, origin) {
  if (!ORIGINS.includes(origin)) return empty(403, origin);
  const text = await request.text();
  if (text.length > 1000) return empty(413, origin);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return empty(400, origin);
  }
  const action = body && body.action;
  const refs = body && body.refs;
  if (!ACTIONS.includes(action) || !Array.isArray(refs) || refs.length < 1 || refs.length > 3) {
    return empty(400, origin);
  }
  const clean = [];
  for (const ref of refs) {
    if (!ref || typeof ref.id !== 'string' || !ID.test(ref.id) || !KINDS.includes(ref.kind)) {
      return empty(400, origin);
    }
    if (!clean.some((item) => item.id === ref.id)) clean.push({ id: ref.id, kind: ref.kind });
  }
  const day = new Date().toISOString().slice(0, 10);
  const statements = clean.map((ref) =>
    env.DB.prepare(
      'INSERT INTO hits (ref, kind, action, n) VALUES (?1, ?2, ?3, 1) ' +
        'ON CONFLICT(ref, action) DO UPDATE SET n = n + 1',
    ).bind(ref.id, ref.kind, action),
  );
  statements.push(
    env.DB.prepare(
      'INSERT INTO daily (day, action, n) VALUES (?1, ?2, 1) ' +
        'ON CONFLICT(day, action) DO UPDATE SET n = n + 1',
    ).bind(day, action),
  );
  await env.DB.batch(statements);
  return empty(204, origin);
}

async function stats(env, origin) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT body, at FROM snapshot WHERE id = 1').first();
  let body = row && row.body;
  if (!row || now - row.at > SNAPSHOT_TTL) {
    const { results } = await env.DB.prepare(
      "SELECT ref, n FROM hits WHERE action = 'card' AND n > 0 ORDER BY n DESC",
    ).all();
    const counts = {};
    for (const item of results) counts[item.ref] = item.n;
    body = JSON.stringify({ updated: new Date(now * 1000).toISOString(), metric: 'card', counts });
    await env.DB.prepare(
      'INSERT INTO snapshot (id, body, at) VALUES (1, ?1, ?2) ' +
        'ON CONFLICT(id) DO UPDATE SET body = ?1, at = ?2',
    )
      .bind(body, now)
      .run();
  }
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      ...cors(origin),
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            ...cors(origin),
            'Access-Control-Allow-Methods': 'GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      if (url.pathname === '/hit' && request.method === 'POST') return await hit(request, env, origin);
      if (url.pathname === '/stats' && request.method === 'GET') return await stats(env, origin);
      return empty(404, origin);
    } catch {
      return empty(500, origin);
    }
  },
};
