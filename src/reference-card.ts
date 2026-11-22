// 參考圖卡：把搭配台選好的參考圖排成一張圖，並產生對應的提示詞（預設英文；可切繁中、簡中）。
// 使用者下載圖卡、複製提示詞，自己貼到 ChatGPT 生成；網站本身不連任何生圖服務。
// 提示詞刻意避開容易被平台擋下的寫法：註明圖庫人物是 AI 生成的虛構成人角色、
// 要求完整著裝、用「角色設計」描述臉部參考，而不是「複製某人身分」。
// 髮型（2026-11-22）：有髮型參考時，人物那句拿掉「髮型髮色」、改成不採用人物參考的髮型；
// 加髮型句（採用剪裁、長度、層次、瀏海、捲度、分線與輪廓，不採用人台頭本身）與髮色句（髮色為○○）。
import type { ImageReference } from './generation';
import { hairColorName } from './hair-colors';
import { isDepthVariant } from './pose-depth';
import type { Kind, Lang } from './types';

export const aspectKeys = ['portrait', 'square', 'landscape'] as const;
export type Aspect = (typeof aspectKeys)[number];
export type CardStyle = 'follow' | 'photo' | 'studio' | 'anime';
export const promptLangs = ['en', 'tw', 'zh'] as const;

const kindOrder: Kind[] = ['pose', 'costume', 'character', 'hairstyle'];
const panelTitle: Record<Kind, string> = {
  pose: 'POSE',
  costume: 'OUTFIT',
  character: 'CHARACTER DESIGN',
  hairstyle: 'HAIRSTYLE',
};

export function orderedReferences(references: ImageReference[]): ImageReference[] {
  return kindOrder
    .map((kind) => references.find((ref) => ref.kind === kind))
    .filter((ref): ref is ImageReference => !!ref);
}

// 提示詞三語。英文沒有髮型時跟改版前一字不差（測試會比對）；中文的人物句沿用網站原本的
// 「保留所附人物的五官、臉型、髮型髮色、膚色、體型比例與畫風」。
const promptCopy = {
  en: {
    intro: 'Please create ONE new image based on the attached reference sheet.',
    sheet: (n: number) => `The sheet has ${n} numbered panel${n > 1 ? 's' : ''}.`,
    sourceMixed:
      'Panels taken from the Muse library show AI-generated, fictional adult characters; uploaded panels are my own design references. Everything is used only as character-design reference.',
    sourceLibrary:
      'All people shown are AI-generated, fictional adult characters, used only as character-design references.',
    panel: (n: number, kind: Kind, rule: string) => `Panel ${n} · ${panelTitle[kind]}: ${rule}`,
    depth:
      'Depth map of a body pose (brighter areas are closer to the camera). Use only the pose, perspective and overlapping limbs. Do not copy the grayscale look or the dark background.',
    lineArt:
      'Line-art mannequin. Use only the body pose, weight balance, hand gestures and camera viewpoint, and keep the same framing. Do not draw mannequin lines or joints.',
    costume:
      'Use only the clothing, footwear and accessories: their design, colors, materials and how they are worn. Ignore the display stand, the layout and any model wearing them.',
    character:
      "Use this character design for face shape, facial features, hairstyle, hair color and skin tone. Ignore this panel's pose, clothing and crop.",
    characterNoHair:
      "Use this character design for facial features, face shape, skin tone, body proportions and visual style, but not its hairstyle. Ignore this panel's pose, clothing and crop.",
    hairstyle:
      'Use this hairstyle reference for the cut, length, layers, bangs, curl, parting and silhouette, not the mannequin head itself.',
    hairstyleUpload:
      'Use this hairstyle reference for the cut, length, layers, bangs, curl, parting and silhouette, not the face or identity of the person in the photo.',
    hairColor: (name: string, panel?: number) =>
      `Hair color: ${name}${panel ? `, as shown in Panel ${panel}` : ''}.`,
    hairPhotoColor: 'Hair color: keep the color shown in the hairstyle photo.',
    wearing: (n: number) => `wearing the outfit from Panel ${n}`,
    posing: (n: number) => `in the pose from Panel ${n}`,
    designed: (n: number) => `with the character design from Panel ${n}`,
    styled: (n: number) => `with the hairstyle from Panel ${n}`,
    result: (parts: string[]) => `Result: one single adult character, fully clothed, ${parts.join(', ')}.`,
    original: 'No character design is given, so create an original adult character with a natural look.',
    drape: 'Let the fabric drape naturally with the pose. Plain, simple background.',
    style: {
      follow: 'Match the overall visual style of the references.',
      photo: 'Style: natural, photorealistic.',
      studio: 'Style: polished studio fashion photography with soft, even lighting.',
      anime: 'Style: clean, high-quality anime illustration.',
    },
    aspect: {
      portrait: 'Vertical 2:3 framing.',
      square: 'Square 1:1 framing.',
      landscape: 'Horizontal 3:2 framing.',
    },
    avoid:
      'Avoid: text, logos, watermarks, borders, collages, split screens, extra views or extra people. Do not reproduce the reference sheet itself.',
    notes: (notes: string) => `Additional notes: ${notes}`,
    join: ' ',
  },
  zh: {
    intro: '请依照附上的参考图卡，生成「一张」新的图片。',
    sheet: (n: number) => `图卡共有 ${n} 个编号区块。`,
    sourceMixed:
      '来自 Muse 图库的区块是 AI 生成的虚构成年角色；上传的区块是我自己的设计参考。全部只作为角色设计参考。',
    sourceLibrary: '图中人物都是 AI 生成的虚构成年角色，只作为角色设计参考。',
    panel: (n: number, kind: Kind, rule: string) =>
      `区块 ${n} · ${{ pose: '姿势', costume: '服装', character: '人物设计', hairstyle: '发型' }[kind]}：${rule}`,
    depth:
      '身体姿势的深度图（越亮越靠近镜头）。只采用姿势、透视与肢体前后关系；不要照搬灰阶效果或深色背景。',
    lineArt: '人偶线稿。只采用身体姿势、重心、手势与观察角度，并保持相同构图；不要画出人偶线条或关节。',
    costume:
      '只采用服装、鞋履与配件：设计、颜色、材质与穿法；忽略展示架、版面以及任何穿着它们的模特。',
    character: '保留所附人物的五官、脸型、发型发色、肤色、体型比例与画风；忽略这一格的姿势、服装与裁切。',
    characterNoHair:
      '保留所附人物的五官、脸型、肤色、体型比例与画风，不采用人物参考的发型；忽略这一格的姿势、服装与裁切。',
    hairstyle: '采用所附发型参考的剪裁、长度、层次、刘海、卷度、分线与轮廓，不采用人台头本身。',
    hairstyleUpload:
      '采用所附发型参考的剪裁、长度、层次、刘海、卷度、分线与轮廓，不采用照片中人物的五官与身份。',
    hairColor: (name: string, panel?: number) => `发色为${name}${panel ? `（同区块 ${panel}）` : ''}。`,
    hairPhotoColor: '发色沿用发型参考照片的颜色。',
    wearing: (n: number) => `穿着区块 ${n} 的服装`,
    posing: (n: number) => `摆出区块 ${n} 的姿势`,
    designed: (n: number) => `采用区块 ${n} 的人物设计`,
    styled: (n: number) => `梳着区块 ${n} 的发型`,
    result: (parts: string[]) => `成品：一位完整着装的成年角色，${parts.join('，')}。`,
    original: '没有提供人物设计，请创作一位外观自然的原创成年角色。',
    drape: '让布料随姿势自然垂坠。背景简洁素净。',
    style: {
      follow: '整体画风跟随参考图。',
      photo: '画风：自然、写实照片。',
      studio: '画风：精致的影棚时尚摄影，柔和均匀的打光。',
      anime: '画风：干净、高质量的动漫插画。',
    },
    aspect: {
      portrait: '直式 2:3 构图。',
      square: '方形 1:1 构图。',
      landscape: '横式 3:2 构图。',
    },
    avoid: '避免：文字、标志、水印、边框、拼贴、分割画面、多余的视角或多余的人物。不要重现参考图卡本身。',
    notes: (notes: string) => `补充说明：${notes}`,
    join: '',
  },
  tw: {
    intro: '請依照附上的參考圖卡，生成「一張」新的圖片。',
    sheet: (n: number) => `圖卡共有 ${n} 個編號區塊。`,
    sourceMixed:
      '來自 Muse 圖庫的區塊是 AI 生成的虛構成年角色；上傳的區塊是我自己的設計參考。全部只作為角色設計參考。',
    sourceLibrary: '圖中人物都是 AI 生成的虛構成年角色，只作為角色設計參考。',
    panel: (n: number, kind: Kind, rule: string) =>
      `區塊 ${n} · ${{ pose: '姿勢', costume: '服裝', character: '人物設計', hairstyle: '髮型' }[kind]}：${rule}`,
    depth:
      '身體姿勢的深度圖（越亮越靠近鏡頭）。只採用姿勢、透視與肢體前後關係；不要照搬灰階效果或深色背景。',
    lineArt: '人偶線稿。只採用身體姿勢、重心、手勢與觀察角度，並保持相同構圖；不要畫出人偶線條或關節。',
    costume:
      '只採用服裝、鞋履與配件：設計、顏色、材質與穿法；忽略展示架、版面以及任何穿著它們的模特兒。',
    character: '保留所附人物的五官、臉型、髮型髮色、膚色、體型比例與畫風；忽略這一格的姿勢、服裝與裁切。',
    characterNoHair:
      '保留所附人物的五官、臉型、膚色、體型比例與畫風，不採用人物參考的髮型；忽略這一格的姿勢、服裝與裁切。',
    hairstyle: '採用所附髮型參考的剪裁、長度、層次、瀏海、捲度、分線與輪廓，不採用人台頭本身。',
    hairstyleUpload:
      '採用所附髮型參考的剪裁、長度、層次、瀏海、捲度、分線與輪廓，不採用照片中人物的五官與身分。',
    hairColor: (name: string, panel?: number) => `髮色為${name}${panel ? `（同區塊 ${panel}）` : ''}。`,
    hairPhotoColor: '髮色沿用髮型參考照片的顏色。',
    wearing: (n: number) => `穿著區塊 ${n} 的服裝`,
    posing: (n: number) => `擺出區塊 ${n} 的姿勢`,
    designed: (n: number) => `採用區塊 ${n} 的人物設計`,
    styled: (n: number) => `梳著區塊 ${n} 的髮型`,
    result: (parts: string[]) => `成品：一位完整著裝的成年角色，${parts.join('，')}。`,
    original: '沒有提供人物設計，請創作一位外觀自然的原創成年角色。',
    drape: '讓布料隨姿勢自然垂墜。背景簡潔素淨。',
    style: {
      follow: '整體畫風跟隨參考圖。',
      photo: '畫風：自然、寫實照片。',
      studio: '畫風：精緻的影棚時尚攝影，柔和均勻的打光。',
      anime: '畫風：乾淨、高品質的動漫插畫。',
    },
    aspect: {
      portrait: '直式 2:3 構圖。',
      square: '方形 1:1 構圖。',
      landscape: '橫式 3:2 構圖。',
    },
    avoid: '避免：文字、標誌、浮水印、邊框、拼貼、分割畫面、多餘的視角或多餘的人物。不要重現參考圖卡本身。',
    notes: (notes: string) => `補充說明：${notes}`,
    join: '',
  },
} satisfies Record<Lang, unknown>;

/** 參考圖卡上髮型那一格的標題後面附上髮色名稱（圖卡上一律英文） */
export function panelLabel(ref: ImageReference): string {
  const color = ref.kind === 'hairstyle' ? ref.hairColor : null;
  return color ? `${panelTitle[ref.kind]} · ${color.en}` : panelTitle[ref.kind];
}

export function buildCardPrompt(
  references: ImageReference[],
  options: { style: CardStyle; aspect: Aspect; notes: string; lang?: Lang },
): string {
  const refs = orderedReferences(references);
  if (!refs.length) return '';
  const lang = options.lang || 'en';
  const c = promptCopy[lang];
  const number = (kind: Kind) => refs.findIndex((ref) => ref.kind === kind) + 1;
  const hasCharacter = refs.some((ref) => ref.kind === 'character');
  const hair = refs.find((ref) => ref.kind === 'hairstyle');
  const uploaded = refs.filter((ref) => 'file' in ref);
  const rule = (ref: ImageReference) => {
    if (ref.kind === 'pose') return isDepthVariant(ref.variant) ? c.depth : c.lineArt;
    if (ref.kind === 'costume') return c.costume;
    if (ref.kind === 'character') return hair ? c.characterNoHair : c.character;
    return 'file' in ref ? c.hairstyleUpload : c.hairstyle;
  };
  const panels = refs.map((ref, index) => c.panel(index + 1, ref.kind, rule(ref)));
  const parts: string[] = [];
  if (number('costume')) parts.push(c.wearing(number('costume')));
  if (number('pose')) parts.push(c.posing(number('pose')));
  if (hasCharacter) parts.push(c.designed(number('character')));
  if (hair) parts.push(c.styled(number('hairstyle')));
  // 髮色句：圖庫髮型的圖已換成這個顏色（附「同第 N 格」）；上傳的髮型照沒選色票＝沿用照片原色
  const hairColor = !hair
    ? ''
    : hair.hairColor
      ? c.hairColor(hairColorName(hair.hairColor, lang), 'file' in hair ? undefined : number('hairstyle'))
      : c.hairPhotoColor;
  const result = [
    c.result(parts),
    hairColor,
    hasCharacter ? '' : c.original,
    c.drape,
    c.style[options.style],
    c.aspect[options.aspect],
  ]
    .filter(Boolean)
    .join(c.join);
  const lines = [
    c.intro,
    '',
    `${c.sheet(refs.length)}${c.join}${uploaded.length ? c.sourceMixed : c.sourceLibrary}`,
    ...panels,
    '',
    result,
    c.avoid,
  ];
  const notes = options.notes.trim();
  if (notes) lines.push('', c.notes(notes));
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

const CJK = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/;
function wrapLines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) {
      out.push('');
      continue;
    }
    // 中文提示詞沒有空格可斷：逐字（英文、數字整段）量寬度換行；純英文段落照原本的逐字詞換行
    if (CJK.test(paragraph)) {
      let line = '';
      for (const token of paragraph.match(/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]|[^\s\u3000-\u303f\u3400-\u9fff\uff00-\uffef]+|\s+/g) || []) {
        const next = line + token;
        if (ctx.measureText(next).width > width && line.trim()) {
          out.push(line.trimEnd());
          line = token.trimStart();
        } else line = next;
      }
      out.push(line);
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
    // 標題放不下這一格的寬度就縮小字（四格時每格較窄；髮型那格另附髮色名稱）
    const label = `${index + 1} · ${panelLabel(ref)}`;
    let size = 30;
    ctx.font = `700 ${size}px ${FONT}`;
    while (size > 18 && ctx.measureText(label).width > w) ctx.font = `700 ${--size}px ${FONT}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, x, headerH + labelH - 18);
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
