// Muse 髮型範例圖即時換色（瀏覽器端，不另外生圖）。
// 移植自 Bella 2026-11-22 寫好、已在真瀏覽器驗證的 hair-recolor.js（每張約 3 毫秒、髮絲邊緣無亮邊／黑邊）：
// 演算法、數值、邊緣帶處理一律照搬，只改成 TypeScript，並改成不碰 DOM 的純函式（輸入輸出都是 {data, width, height}），
// 才能在 Node 單元測試；原版用 recolor.mode 屬性傳「漸層」，這裡改成第四個參數，判斷式不變。
//
// 輸入：髮型原圖＋頭髮遮罩（SAM3 以文字「hair」切出；R＝頭髮、G＝邊緣帶）＋色票 hex（單色，或「深,淺」兩色＝挑染／漸層）
// 邊緣帶：髮絲跟背景混在同一個像素 → 依明度估算髮絲佔比 a，換色後再跟背景色重新混合（不估會出現亮邊或深色描邊）
// 前提：範例圖頭髮要比背景暗（推薦色平均明度 ≤ 70，量產閘檢查）
// 做法：在 CIELAB 換色 —— 保留原圖頭髮的明暗起伏（L 相對值）＝髮絲、光澤、層次都留著；整體明度與色相換成色票

export interface PixelImage {
  data: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
}

function s2l(c: number) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function l2s(c: number) {
  c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}
function f(t: number) {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}
function fi(t: number) {
  return t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787;
}
export function rgb2lab(r: number, gg: number, b: number): [number, number, number] {
  r = s2l(r);
  gg = s2l(gg);
  b = s2l(b);
  const x = (r * 0.4124 + gg * 0.3576 + b * 0.1805) / 0.95047,
    y = r * 0.2126 + gg * 0.7152 + b * 0.0722,
    z = (r * 0.0193 + gg * 0.1192 + b * 0.9505) / 1.08883;
  const fx = f(x),
    fy = f(y),
    fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
export function lab2rgb(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116,
    fx = fy + a / 500,
    fz = fy - b / 200;
  const x = fi(fx) * 0.95047,
    y = fi(fy),
    z = fi(fz) * 1.08883;
  return [
    l2s(x * 3.2406 - y * 1.5372 - z * 0.4986),
    l2s(-x * 0.9689 + y * 1.8758 + z * 0.0415),
    l2s(x * 0.0557 - y * 0.204 + z * 1.057),
  ];
}
export function hexLab(h: string): [number, number, number] {
  h = h.replace('#', '');
  return rgb2lab(
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  );
}

/**
 * 換色。img：原圖像素；mask：遮罩像素（同尺寸）；hex："#RRGGBB" 或 "#深,#淺"；
 * mode：兩色時用來分辨漸層（含「漸層」或 ombre＝上深下淺）與挑染（其他＝較亮的髮絲漸進變淺色）。
 * 回傳新的像素陣列，不改動輸入。遮罩外（R < 0.02）的像素原樣保留。
 */
export function recolorPixels(
  img: PixelImage,
  mask: PixelImage,
  hex: string,
  mode = '',
): PixelImage {
  const d = img.data,
    m = mask.data,
    n = d.length / 4,
    out: PixelImage = { data: new Uint8ClampedArray(d), width: img.width, height: img.height },
    o = out.data;
  const Ls = new Float32Array(n);
  let sw = 0,
    sL = 0,
    sL2 = 0,
    y0 = 1e9,
    y1 = -1;
  for (let i = 0; i < n; i++) {
    const w = m[i * 4] / 255;
    if (w < 0.02) continue;
    const L = rgb2lab(d[i * 4], d[i * 4 + 1], d[i * 4 + 2])[0];
    Ls[i] = L;
    sw += w;
    sL += w * L;
    sL2 += w * L * L;
    const y = Math.floor(i / img.width);
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (!sw) return out;
  const L0 = sL / sw,
    sd0 = Math.sqrt(Math.max(1, sL2 / sw - L0 * L0));
  // 背景色：取四個角落 16×16 的平均
  let br = 0,
    bg = 0,
    bb = 0,
    bn = 0;
  const W = img.width,
    Hh = img.height;
  for (const [cx, cy] of [
    [0, 0],
    [W - 16, 0],
    [0, Hh - 16],
    [W - 16, Hh - 16],
  ])
    for (let y = cy; y < cy + 16; y++)
      for (let x = cx; x < cx + 16; x++) {
        const j = (y * W + x) * 4;
        br += d[j];
        bg += d[j + 1];
        bb += d[j + 2];
        bn++;
      }
  br /= bn;
  bg /= bn;
  bb /= bn;
  const Lbg = rgb2lab(br, bg, bb)[0],
    Lcore = Math.min(L0, Lbg - 10);
  const cols = hex.split(',').map(hexLab),
    two = cols.length > 1,
    ombre = two && /漸層|ombre/i.test(mode || '');
  for (let i = 0; i < n; i++) {
    const w = m[i * 4] / 255;
    if (w < 0.02) continue;
    const band = m[i * 4 + 1] > 127;
    const a = band ? Math.max(0, Math.min(1, (Lbg - Ls[i]) / Math.max(5, Lbg - Lcore))) : 1; // 髮絲佔比
    const Lh = band ? Math.min(Ls[i], L0) : Ls[i];
    let t = cols[0];
    if (two) {
      const k = ombre
        ? Math.min(
            1,
            Math.max(0, ((Math.floor(i / img.width) - y0) / Math.max(1, y1 - y0) - 0.35) / 0.5),
          ) // 漸層：上深下淺
        : 0.8 / (1 + Math.exp(-(Ls[i] - (L0 + 0.6 * sd0)) / (0.18 * sd0))); // 挑染：原本較亮的髮絲漸進變淺色（硬切會變色塊）
      t = [
        cols[0][0] + (cols[1][0] - cols[0][0]) * k,
        cols[0][1] + (cols[1][1] - cols[0][1]) * k,
        cols[0][2] + (cols[1][2] - cols[0][2]) * k,
      ];
    }
    const spread = Math.min(1.3, Math.max(0.6, 14 / sd0)); // 原本明暗差太大或太小都收斂到合理範圍
    const L = Math.max(2, Math.min(97, t[0] + (Lh - L0) * spread));
    const rgb = lab2rgb(L, t[1], t[2]),
      j = i * 4;
    const nr = a * rgb[0] + (1 - a) * br,
      ng = a * rgb[1] + (1 - a) * bg,
      nb = a * rgb[2] + (1 - a) * bb;
    o[j] = d[j] * (1 - w) + nr * w;
    o[j + 1] = d[j + 1] * (1 - w) + ng * w;
    o[j + 2] = d[j + 2] * (1 - w) + nb * w;
  }
  return out;
}
