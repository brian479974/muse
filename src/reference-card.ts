// 參考圖卡：把搭配台選好的參考圖排成一張圖，並產生對應的英文提示詞。
// 使用者下載圖卡、複製提示詞，自己貼到 ChatGPT 生成；網站本身不連任何生圖服務。
// 提示詞刻意避開容易被平台擋下的寫法：註明圖庫人物是 AI 生成的虛構成人角色、
// 要求完整著裝、用「角色設計」描述臉部參考，而不是「複製某人身分」。
import type { ImageReference } from './generation';
import { isDepthVariant } from './pose-depth';
import type { Kind } from './types';

export const aspectKeys = ['portrait', 'square', 'landscape'] as const;
export type Aspect = (typeof aspectKeys)[number];
export type CardStyle = 'follow' | 'photo' | 'studio' | 'anime';

const kindOrder: Kind[] = ['pose', 'costume', 'character'];
const panelTitle: Record<Kind, string> = {
  pose: 'POSE',
  costume: 'OUTFIT',
  character: 'CHARACTER DESIGN',
};

export function orderedReferences(references: ImageReference[]): ImageReference[] {
  return kindOrder
    .map((kind) => references.find((ref) => ref.kind === kind))
    .filter((ref): ref is ImageReference => !!ref);
}

function panelRule(ref: ImageReference): string {
  if (ref.kind === 'pose')
    return isDepthVariant(ref.variant)
      ? 'Depth map of a body pose (brighter areas are closer to the camera). Use only the pose, perspective and overlapping limbs. Do not copy the grayscale look or the dark background.'
      : 'Line-art mannequin. Use only the body pose, weight balance, hand gestures and camera viewpoint, and keep the same framing. Do not draw mannequin lines or joints.';
  if (ref.kind === 'costume')
    return 'Use only the clothing, footwear and accessories: their design, colors, materials and how they are worn. Ignore the display stand, the layout and any model wearing them.';
  return "Use this character design for face shape, facial features, hairstyle, hair color and skin tone. Ignore this panel's pose, clothing and crop.";
}

const styleLine: Record<CardStyle, string> = {
  follow: 'Match the overall visual style of the references.',
  photo: 'Style: natural, photorealistic.',
  studio: 'Style: polished studio fashion photography with soft, even lighting.',
  anime: 'Style: clean, high-quality anime illustration.',
};
const aspectLine: Record<Aspect, string> = {
  portrait: 'Vertical 2:3 framing.',
  square: 'Square 1:1 framing.',
  landscape: 'Horizontal 3:2 framing.',
};

export function buildCardPrompt(
  references: ImageReference[],
  options: { style: CardStyle; aspect: Aspect; notes: string },
): string {
  const refs = orderedReferences(references);
  if (!refs.length) return '';
  const number = (kind: Kind) => refs.findIndex((ref) => ref.kind === kind) + 1;
  const hasCharacter = refs.some((ref) => ref.kind === 'character');
  const uploaded = refs.filter((ref) => 'file' in ref);
  const sourceNote = uploaded.length
    ? 'Panels taken from the Muse library show AI-generated, fictional adult characters; uploaded panels are my own design references. Everything is used only as character-design reference.'
    : 'All people shown are AI-generated, fictional adult characters, used only as character-design references.';
  const panels = refs.map(
    (ref, index) => `Panel ${index + 1} · ${panelTitle[ref.kind]}: ${panelRule(ref)}`,
  );
  const parts: string[] = [];
  if (number('costume')) parts.push(`wearing the outfit from Panel ${number('costume')}`);
  if (number('pose')) parts.push(`in the pose from Panel ${number('pose')}`);
  if (hasCharacter) parts.push(`with the character design from Panel ${number('character')}`);
  const result = [
    `Result: one single adult character, fully clothed, ${parts.join(', ')}.`,
    hasCharacter ? '' : 'No character design is given, so create an original adult character with a natural look.',
    'Let the fabric drape naturally with the pose. Plain, simple background.',
    styleLine[options.style],
    aspectLine[options.aspect],
  ]
    .filter(Boolean)
    .join(' ');
  const lines = [
    'Please create ONE new image based on the attached reference sheet.',
    '',
    `The sheet has ${refs.length} numbered panel${refs.length > 1 ? 's' : ''}. ${sourceNote}`,
    ...panels,
    '',
    result,
    'Avoid: text, logos, watermarks, borders, collages, split screens, extra views or extra people. Do not reproduce the reference sheet itself.',
  ];
  const notes = options.notes.trim();
  if (notes) lines.push('', `Additional notes: ${notes}`);
  return lines.join('\n');
}

// ── 圖卡繪製 ───────────────────────────────────────────────

const CARD_WIDTH = 2048;
const MARGIN = 72;
const GAP = 40;
const FONT = '-apple-system, "Helvetica Neue", "Segoe UI", Arial, sans-serif';
const INK = '#16171b';
const MUTED = '#6d6f76';
const GOLD = '#b08a3e';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // 圖庫原站回應 Access-Control-Allow-Origin: *，用匿名跨來源載入，畫布才可以匯出
    if (!src.startsWith('blob:') && !src.startsWith('data:')) image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`image failed: ${src}`));
    image.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

/** 畫出參考圖卡，回傳 JPEG。圖片載入失敗會丟錯，由呼叫端顯示訊息。 */
export async function renderReferenceCard(
  references: ImageReference[],
  prompt: string,
): Promise<Blob> {
  const refs = orderedReferences(references);
  const images = await Promise.all(refs.map((ref) => loadImage(ref.variant.original)));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  const inner = CARD_WIDTH - MARGIN * 2;
  const ratios = images.map((image) => image.naturalWidth / image.naturalHeight);
  const panelHeight = Math.min(
    1150,
    Math.floor((inner - GAP * (images.length - 1)) / ratios.reduce((a, b) => a + b, 0)),
  );
  const widths = ratios.map((ratio) => Math.floor(panelHeight * ratio));
  const rowWidth = widths.reduce((a, b) => a + b, 0) + GAP * (images.length - 1);

  const bodyFont = `400 31px ${FONT}`;
  ctx.font = bodyFont;
  const lines = wrapLines(ctx, prompt, inner);
  const lineHeight = 46;

  const headerH = 120;
  const labelH = 64;
  const textTop = headerH + labelH + panelHeight + 64;
  const footerH = 90;
  canvas.width = CARD_WIDTH;
  canvas.height = textTop + 40 + lines.length * lineHeight + footerH;

  ctx.fillStyle = '#f7f6f2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 頁首
  ctx.fillStyle = INK;
  ctx.font = `700 30px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('MUSE  ·  CHARACTER REFERENCE SHEET', MARGIN, 60);
  ctx.font = `400 24px ${FONT}`;
  ctx.fillStyle = MUTED;
  const tagline = 'Use together with the prompt below';
  ctx.fillText(tagline, CARD_WIDTH - MARGIN - ctx.measureText(tagline).width, 60);
  ctx.fillStyle = GOLD;
  ctx.fillRect(MARGIN, headerH - 8, inner, 3);

  // 參考圖欄位
  let x = MARGIN + Math.floor((inner - rowWidth) / 2);
  refs.forEach((ref, index) => {
    const w = widths[index];
    const top = headerH + labelH;
    ctx.fillStyle = INK;
    ctx.font = `700 30px ${FONT}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${index + 1} · ${panelTitle[ref.kind]}`, x, headerH + labelH - 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, top, w, panelHeight);
    ctx.drawImage(images[index], x, top, w, panelHeight);
    ctx.strokeStyle = '#d9d6cd';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, top + 1, w - 2, panelHeight - 2);
    x += w + GAP;
  });

  // 提示詞
  ctx.fillStyle = GOLD;
  ctx.fillRect(MARGIN, textTop - 32, 120, 3);
  ctx.fillStyle = INK;
  ctx.font = bodyFont;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, index) => {
    ctx.fillText(line, MARGIN, textTop + 30 + index * lineHeight);
  });

  // 頁尾
  ctx.fillStyle = MUTED;
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText(
    'Reference images © their original creators · personal, non-commercial use only',
    MARGIN,
    canvas.height - 40,
  );

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('export failed'))),
      'image/jpeg',
      0.93,
    ),
  );
}
