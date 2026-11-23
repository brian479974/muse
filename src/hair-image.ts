// 髮型範例圖的瀏覽器端換色：讀 image＋mask 的像素 → recolorPixels（src/hair-recolor.ts）→ 畫回 canvas。
// 詳細頁、合成台、參考圖卡、下載都用這裡產的同一張換色圖；選推薦色時呼叫端直接用原圖，不經過這裡。
import { useEffect, useState } from 'react';
import { recolorPixels } from './hair-recolor';
import type { PixelImage } from './hair-recolor';
import type { HairColor } from './hair-colors';
import type { Variant } from './types';

const pixelCache = new Map<string, Promise<ImageData>>();
const urlCache = new Map<string, Promise<string>>();
const PIXEL_CACHE = 8;
const URL_CACHE = 48;

function remember<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  limit: number,
  make: () => Promise<T>,
  drop?: (value: T) => void,
) {
  const hit = cache.get(key);
  if (hit) {
    // 最近用過的移到最後，最久沒用的先清掉
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const value = make();
  cache.set(key, value);
  value.catch(() => cache.delete(key));
  while (cache.size > limit) {
    const [oldKey, old] = cache.entries().next().value!;
    cache.delete(oldKey);
    // 晚一點再釋放：畫面上可能還在用這張
    if (drop)
      void old.then(
        (v) => setTimeout(() => drop(v), 60_000),
        () => {},
      );
  }
  return value;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    if (!src.startsWith('blob:') && !src.startsWith('data:')) image.crossOrigin = 'anonymous';   // 圖片在 R2（別的網域），要讀像素就得用 CORS 模式
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`image failed: ${src}`));
    image.src = src;
  });
}

/** 圖檔的像素（size 有給就縮放到那個尺寸；遮罩跟原圖尺寸不同時用） */
function pixels(src: string, size?: { width: number; height: number }): Promise<ImageData> {
  const key = size ? `${src}@${size.width}x${size.height}` : src;
  return remember(pixelCache, key, PIXEL_CACHE, async () => {
    const image = await loadImage(src);
    const width = size?.width || image.naturalWidth;
    const height = size?.height || image.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('canvas unavailable');
    ctx.drawImage(image, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  });
}

/** 換色後的畫布（尺寸＝variant.image） */
export async function recoloredCanvas(
  variant: Variant,
  color: HairColor,
): Promise<HTMLCanvasElement> {
  if (!variant.mask) throw new Error('hairstyle mask missing');
  const image = await pixels(variant.image);
  const mask = await pixels(variant.mask, { width: image.width, height: image.height });
  // 原版示範頁把色票的繁中名稱當 mode 傳入（含「漸層」＝上深下淺），這裡照用
  const out: PixelImage = recolorPixels(image, mask, color.hex, color.zh_tw);
  const canvas = document.createElement('canvas');
  canvas.width = out.width;
  canvas.height = out.height;
  canvas.getContext('2d')!.putImageData(new ImageData(out.data, out.width, out.height), 0, 0);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('export failed'))),
      type,
      quality,
    ),
  );

/** 換色圖的 blob 網址（JPEG；詳細頁、合成台、參考圖卡共用，同一張圖同一色只算一次） */
export function recoloredUrl(variant: Variant, color: HairColor): Promise<string> {
  return remember(
    urlCache,
    `${variant.image}|${color.key}`,
    URL_CACHE,
    async () =>
      URL.createObjectURL(await toBlob(await recoloredCanvas(variant, color), 'image/jpeg', 0.94)),
    (url) => URL.revokeObjectURL(url),
  );
}

/** 下載用：換色後的 PNG，並把髮色寫進圖檔的文字欄位（iTXt「Comment」） */
export async function recoloredPng(
  variant: Variant,
  color: HairColor,
  comment: string,
): Promise<Blob> {
  const png = new Uint8Array(
    await (await toBlob(await recoloredCanvas(variant, color), 'image/png')).arrayBuffer(),
  );
  return new Blob([withPngText(png, 'Comment', comment)], { type: 'image/png' });
}

// ── PNG 文字欄位 ────────────────────────────────────────────
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
/** 在 IHDR 後面插入一個 iTXt（UTF-8 文字）區塊；不是 PNG 就丟錯 */
export function withPngText(
  png: Uint8Array,
  keyword: string,
  text: string,
): Uint8Array<ArrayBuffer> {
  const ascii = (value: string) => Uint8Array.from(value, (char) => char.charCodeAt(0));
  if (
    png.length < 33 ||
    PNG_SIGNATURE.some((value, index) => png[index] !== value) ||
    String.fromCharCode(...png.slice(12, 16)) !== 'IHDR'
  )
    throw new Error('not a PNG');
  const insertAt = 8 + 4 + 4 + 13 + 4;
  // iTXt：關鍵字 \0 壓縮旗標(0) 壓縮法(0) 語言標籤 \0 翻譯關鍵字 \0 內文(UTF-8)
  const body = [...ascii(keyword), 0, 0, 0, 0, 0, ...new TextEncoder().encode(text)];
  const typed = new Uint8Array([...ascii('iTXt'), ...body]);
  const chunk = new Uint8Array(4 + typed.length + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, body.length);
  chunk.set(typed, 4);
  view.setUint32(4 + typed.length, crc32(typed));
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(png.subarray(insertAt), insertAt + chunk.length);
  return out;
}

/**
 * React：某張髮型圖換成某色的網址。enabled=false（推薦色或沒有遮罩）時不算，回傳 url=null。
 * 換色中 pending=true；呼叫端在等的時候先顯示原圖。
 */
export function useHairRecolor(
  variant: Variant | undefined,
  color: HairColor | undefined,
  enabled: boolean,
) {
  const key = enabled && variant?.mask && color ? `${variant.image}|${color.key}` : '';
  const [result, setResult] = useState<{ key: string; url: string } | null>(null);
  const [failedKey, setFailedKey] = useState('');
  useEffect(() => {
    if (!key || !variant || !color) return;
    let active = true;
    recoloredUrl(variant, color).then(
      (url) => {
        if (active) setResult({ key, url });
      },
      () => {
        if (active) setFailedKey(key);
      },
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const url = key && result?.key === key ? result.url : null;
  return { url, pending: !!key && !url && failedKey !== key, failed: !!key && failedKey === key };
}
