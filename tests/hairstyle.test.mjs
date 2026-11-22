// 髮型參考（2026-11-22）：建置流程、即時換色、提示詞四種情況（三語）、網址參數、統計、計數服務
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import sharp from 'sharp';
import { createServer } from 'vite';
import {
  hairColorProblems,
  hairFacetProblems,
  hairstyleProblems,
  loadHairstyleRules,
  withHairstyleFacets,
} from '../scripts/hairstyle-data.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const catalog = readJson('public/data/catalog.json');
const extras = readJson('data/muse-extras.json').items;
const hairExtras = extras.filter((item) => item.kind === 'hairstyle');
const rules = loadHairstyleRules(root);
const beforePrompts = readJson('tests/fixtures/prompts-before-hairstyle.json');

const vite = await createServer({
  root,
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
  logLevel: 'error',
});
const recolor = await vite.ssrLoadModule('/src/hair-recolor.ts');
const hair = await vite.ssrLoadModule('/src/hair-colors.ts');
const card = await vite.ssrLoadModule('/src/reference-card.ts');
const library = await vite.ssrLoadModule('/src/library.ts');
const stats = await vite.ssrLoadModule('/src/stats.ts');
const image = await vite.ssrLoadModule('/src/hair-image.ts');
after(() => vite.close());

// ── 建置流程 ────────────────────────────────────────────────

test('色票與篩選選項檔通過檢查；色票是 16 色、挑染與漸層是兩色', () => {
  assert.deepEqual(hairColorProblems(rules.colors), []);
  assert.deepEqual(hairFacetProblems(rules.facets), []);
  assert.equal(rules.colors.length, 16);
  assert.deepEqual(
    rules.colors.filter((color) => color.hex.includes(',')).map((color) => color.key),
    ['highlights', 'ombre'],
  );
  assert.match(hairColorProblems([...rules.colors, rules.colors[0]]).join(), /重複/);
  assert.match(hairColorProblems([{ ...rules.colors[0], hex: '#12345' }]).join(), /hex/);
});

test('髮型素材檢查：合格的過、欄位或遮罩有問題的擋下', () => {
  // 指定 fh041（空氣瀏海那款）當樣本，不取「第一筆」：資料從 5 款長到 100 款後第一筆會變（11-22）
  const sample = hairExtras.find((item) => item.id === 'muse-hair-fh041');
  assert.ok(sample, '資料裡要有 muse-hair-fh041');
  const ok = structuredClone(sample);
  assert.deepEqual(hairstyleProblems(ok, rules), []);
  const broken = (change) => {
    const extra = structuredClone(sample);
    change(extra);
    return hairstyleProblems(extra, rules).join('；');
  };
  assert.match(
    broken((x) => (x.hairstyle.length = 'shoulder')),
    /hairstyle\.length/,
  );
  assert.match(
    broken((x) => (x.hairstyle.styles = ['punk'])),
    /風格 punk/,
  );
  assert.match(
    broken((x) => (x.hairstyle.recommendedColor = 'teal')),
    /推薦色/,
  );
  assert.match(
    broken((x) => (x.hairstyle.prompt = '长发')),
    /英文/,
  );
  assert.match(
    broken((x) => (x.tags = x.tags.filter((tag) => tag.id !== 'female'))),
    /female/,
  );
  assert.match(
    broken((x) => delete x.variants[1].mask),
    /遮罩網址/,
  );
  assert.match(
    broken((x) => (x.variants[2].angle = 'diag')),
    /角度 diag/,
  );
  assert.match(
    broken((x) => (x.variants = x.variants.slice(1))),
    /沒有正面/,
  );
  assert.match(
    hairstyleProblems(ok, rules, (url) => !url.includes('front')).join(),
    /遮罩檔不存在/,
  );
  const labelled = withHairstyleFacets(structuredClone(ok), rules);
  assert.deepEqual(labelled.hairstyle.facets.bangs, {
    id: 'wispy',
    zh: '空气刘海',
    tw: '空氣瀏海',
    en: 'Wispy bangs',
  });
});

/** 在暫存資料夾跑 mirror-filter（素材清單、自製素材清單都換成測試用的） */
function runMirrorFilter(items, input = { items: [], stats: {} }) {
  const dir = mkdtempSync(join(tmpdir(), 'muse-hair-'));
  try {
    mkdirSync(join(dir, 'data'));
    for (const file of [
      'character-facets.json',
      'character-attributes.json',
      'hairstyle-facets.json',
      'hair-colors.json',
    ])
      cpSync(join(root, 'data', file), join(dir, 'data', file));
    writeFileSync(join(dir, 'data/muse-extras.json'), JSON.stringify({ items }));
    symlinkSync(join(root, 'public'), join(dir, 'public'));
    writeFileSync(join(dir, 'catalog.json'), JSON.stringify(input));
    const run = spawnSync('node', [join(root, 'scripts/mirror-filter.mjs'), 'catalog.json'], {
      cwd: dir,
      encoding: 'utf8',
    });
    return {
      status: run.status,
      stderr: run.stderr,
      catalog:
        run.status === 0 ? JSON.parse(readFileSync(join(dir, 'catalog.json'), 'utf8')) : null,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('mirror-filter 接受髮型：併入、統計、三語篩選名稱；未知類型與缺遮罩會讓建置失敗', () => {
  const result = runMirrorFilter(hairExtras);
  assert.equal(result.status, 0, result.stderr);
  const items = result.catalog.items;
  assert.equal(items.length, hairExtras.length);
  assert.equal(result.catalog.stats.hairstyles, hairExtras.length);
  assert.equal(result.catalog.stats.images, hairExtras.length * 3);
  for (const item of items) {
    assert.equal(item.kind, 'hairstyle');
    assert.deepEqual(
      item.variants.map((variant) => variant.angle),
      ['front', 'side', 'back'],
    );
    assert.ok(
      item.variants.every((variant) => variant.mask.startsWith('/muse-assets/hairstyle/masks/')),
    );
    assert.ok(item.title.tw && item.category.tw && item.hairstyle.bangsLabel.tw);
    for (const key of ['gender', 'length', 'type', 'bangs'])
      assert.ok(item.hairstyle.facets[key].tw, `${item.id} ${key}`);
  }
  // 篩選選項的台灣用語直接取 hairstyle-facets.json，不被 OpenCC 改成「劉海」
  assert.ok(items.some((item) => item.hairstyle.facets.bangs.tw === '空氣瀏海'));

  const unknown = runMirrorFilter([{ ...structuredClone(hairExtras[0]), kind: 'wig' }]);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /未知的素材類型/);
  const noMask = structuredClone(hairExtras[0]);
  noMask.variants[0].mask = '/muse-assets/hairstyle/masks/not-there.png';
  const missing = runMirrorFilter([noMask]);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /遮罩檔不存在/);
});

test('正式素材清單：髮型都併入、統計正確，現有三類的數量不變', () => {
  const hairstyles = catalog.items.filter((item) => item.kind === 'hairstyle');
  assert.equal(hairstyles.length, hairExtras.length);
  assert.equal(catalog.stats.hairstyles, hairstyles.length);
  assert.deepEqual(
    {
      poseGroups: catalog.stats.poseGroups,
      costumes: catalog.stats.costumes,
      characters: catalog.stats.characters,
    },
    {
      poseGroups: catalog.items.filter((item) => item.kind === 'pose').length,
      costumes: catalog.items.filter((item) => item.kind === 'costume').length,
      characters: catalog.items.filter((item) => item.kind === 'character').length,
    },
  );
  assert.equal(catalog.stats.references, catalog.items.length);
  assert.deepEqual(
    new Set(catalog.items.map((item) => item.kind)),
    new Set(['pose', 'costume', 'character', 'hairstyle']),
  );
});

// ── 即時換色（純函式）──────────────────────────────────────

const W = 32;
/** 假圖：淺色背景；中間一塊頭髮（深棕、有明暗起伏），外圈兩像素是邊緣帶 */
function fakeHair() {
  const data = new Uint8ClampedArray(W * W * 4);
  const mask = new Uint8ClampedArray(W * W * 4);
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      const j = (y * W + x) * 4;
      const inHair = x >= 8 && x < 24 && y >= 6 && y < 28;
      const band = inHair && (x < 10 || x >= 22 || y < 8 || y >= 26);
      const shade = (x % 4) * 6 + (y % 3) * 4; // 髮絲明暗
      const px = inHair ? [70 + shade, 46 + shade / 2, 32] : [240, 238, 236];
      data.set([...px, 255], j);
      mask.set([inHair ? 255 : 0, band ? 255 : 0, 0, 255], j);
    }
  return { img: { data, width: W, height: W }, mask: { data: mask, width: W, height: W } };
}
function hue([r, g, b]) {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const hueDistance = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
const pixel = (img, x, y) => Array.from(img.data.slice((y * W + x) * 4, (y * W + x) * 4 + 3));
const coreAverage = (img) => {
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = 10; y < 24; y++)
    for (let x = 12; x < 20; x++) {
      pixel(img, x, y).forEach((v, i) => (sum[i] += v));
      n++;
    }
  return sum.map((v) => v / n);
};

test('換色：頭髮色相換成色票、遮罩外像素一個都不變、輸入不被改動', () => {
  const { img, mask } = fakeHair();
  const before = new Uint8ClampedArray(img.data);
  // 用霧藍：跟原本的棕色在色相環上差很遠（玫瑰粉跟棕色只差約 40 度，不好分辨）
  const blue = hair.hairColorByKey('mistblue');
  const out = recolor.recolorPixels(img, mask, blue.hex, blue.zh_tw);
  assert.deepEqual(img.data, before, '輸入的像素不能被改');
  assert.equal(out.width, W);
  assert.equal(out.height, W);
  const blueHue = hue([0x6f, 0x86, 0xa6]);
  const oldHue = hue(coreAverage(img));
  const newHue = hue(coreAverage(out));
  assert.ok(hueDistance(oldHue, blueHue) > 120, `原本色相 ${oldHue} 要跟霧藍 ${blueHue} 差很多`);
  assert.ok(hueDistance(newHue, blueHue) < 20, `換色後色相 ${newHue} 要接近霧藍 ${blueHue}`);
  // 玫瑰粉也一樣靠近目標色相
  const rose = hair.hairColorByKey('rose');
  const roseOut = recolor.recolorPixels(img, mask, rose.hex, rose.zh_tw);
  assert.ok(hueDistance(hue(coreAverage(roseOut)), hue([0xd9, 0x8a, 0x9c])) < 20);
  for (let i = 0; i < W * W; i++)
    if (mask.data[i * 4] / 255 < 0.02)
      assert.deepEqual(
        Array.from(out.data.slice(i * 4, i * 4 + 4)),
        Array.from(img.data.slice(i * 4, i * 4 + 4)),
        `遮罩外第 ${i} 個像素被改了`,
      );
  // 髮絲明暗起伏留著：原本較亮的髮絲換色後仍較亮
  const bright = pixel(out, 15, 10),
    dark = pixel(out, 12, 12);
  assert.ok(bright.reduce((a, b) => a + b) > dark.reduce((a, b) => a + b));
});

test('換色：漸層上深下淺、挑染讓原本較亮的髮絲變淺；沒有頭髮的遮罩原樣回傳', () => {
  const { img, mask } = fakeHair();
  const luma = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  const ombre = hair.hairColorByKey('ombre');
  const out = recolor.recolorPixels(img, mask, ombre.hex, ombre.zh_tw);
  assert.ok(luma(pixel(out, 14, 25)) > luma(pixel(out, 14, 9)) + 40, '漸層：下面要比上面亮很多');
  // 同一組兩色、mode 不是漸層＝挑染：不分上下
  const streaks = recolor.recolorPixels(img, mask, ombre.hex, '挑染');
  assert.ok(Math.abs(luma(pixel(streaks, 14, 25)) - luma(pixel(streaks, 14, 9))) < 40);
  const empty = { ...mask, data: new Uint8ClampedArray(mask.data.length) };
  assert.deepEqual(recolor.recolorPixels(img, empty, '#ff0000').data, img.data);
});

test('推薦色＝原圖（不換色）；其他色才換；網址或舊資料的無效色票退回推薦色', () => {
  const item = catalog.items.find((value) => value.code === 'FHS-41');
  assert.equal(item.hairstyle.recommendedColor, 'milktea');
  assert.equal(hair.effectiveHairColor(item).key, 'milktea');
  assert.equal(hair.isOriginalHairColor(item), true);
  assert.equal(hair.isOriginalHairColor(item, 'milktea'), true);
  assert.equal(hair.isOriginalHairColor(item, 'rose'), false);
  assert.equal(hair.effectiveHairColor(item, 'not-a-color').key, 'milktea');
  assert.equal(hair.hairColorName(hair.hairColorByKey('silver'), 'zh'), '灰银');
  assert.equal(hair.hairColorName(hair.hairColorByKey('silver'), 'tw'), '灰銀');
  assert.equal(hair.hairColorName(hair.hairColorByKey('silver'), 'en'), 'Silver gray');
});

test('TypeScript 版換色跟已驗證的原版 hair-recolor.js 逐位元相同（真實髮型圖＋遮罩，16 色）', async () => {
  const context = { window: {} };
  context.ImageData = class {
    constructor(data, width, height) {
      Object.assign(this, { data, width, height });
    }
  };
  vm.runInNewContext(
    readFileSync(join(root, 'tests/fixtures/hair-recolor.original.js'), 'utf8'),
    context,
  );
  const original = context.window.MuseHairRecolor.recolor;
  const raw = async (path) => {
    const { data, info } = await sharp(join(root, 'public', path))
      .resize(300, 300)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
  };
  for (const code of ['FHS-41', 'MHS-05']) {
    const variant = catalog.items.find((item) => item.code === code).variants[0];
    const img = await raw(variant.image);
    const mask = await raw(variant.mask);
    for (const color of rules.colors) {
      original.mode = color.zh_tw;
      const expected = original(img, mask, color.hex);
      const actual = recolor.recolorPixels(img, mask, color.hex, color.zh_tw);
      assert.ok(
        Buffer.from(actual.data).equals(Buffer.from(expected.data)),
        `${code} ${color.key} 跟原版不同`,
      );
    }
  }
});

test('下載的換色 PNG 把髮色寫進圖檔文字欄位，圖檔仍然有效', async () => {
  const png = new Uint8Array(
    await sharp({ create: { width: 2, height: 2, channels: 3, background: '#d98a9c' } })
      .png()
      .toBuffer(),
  );
  const text = 'Muse hairstyle FHS-41 · hair color: Rose pink / 玫瑰粉';
  const out = image.withPngText(png, 'Comment', text);
  assert.equal(out.length, png.length + 12 + 'Comment'.length + 5 + Buffer.byteLength(text));
  assert.equal(Buffer.from(out.slice(37, 41)).toString('latin1'), 'iTXt');
  assert.ok(Buffer.from(out).includes(Buffer.from(text, 'utf8')));
  const meta = await sharp(Buffer.from(out)).metadata();
  assert.equal(meta.width, 2);
  // CRC：sharp/libpng 讀得過就代表 CRC 正確；另外直接算一次
  const length = new DataView(out.buffer).getUint32(33);
  const crc = new DataView(out.buffer).getUint32(41 + length);
  assert.equal(crc, image.crc32(out.slice(37, 41 + length)));
  assert.throws(() => image.withPngText(new Uint8Array([1, 2, 3]), 'Comment', 'x'), /not a PNG/);
});

// ── 提示詞：四種情況 × 三語 ─────────────────────────────────

const L = (v) => ({ zh: v, tw: v, en: v });
const variant = (id, original, extra = {}) => ({
  id,
  angle: 'front',
  label: L('front'),
  thumbnail: original,
  image: original,
  original,
  ...extra,
});
const pose = {
  kind: 'pose',
  title: L('pose'),
  keywords: L('pose'),
  variant: variant('p', 'https://ai-pose-gallery.pages.dev/img/p.png'),
};
const depthPose = {
  kind: 'pose',
  title: L('pose'),
  keywords: L('pose'),
  variant: variant('p', 'https://ai-pose-depth-gallery.pages.dev/img/p.png'),
};
const costume = {
  kind: 'costume',
  title: L('c'),
  keywords: L('c'),
  variant: variant('c', 'https://ai-costume-gallery.pages.dev/img/c.png'),
};
const character = {
  kind: 'character',
  title: L('h'),
  keywords: L('h'),
  variant: variant('h', 'https://ai-portrait-gallery.pages.dev/img/h.png'),
};
const libraryHair = (key) => ({
  kind: 'hairstyle',
  title: L('hair'),
  keywords: L('hair'),
  variant: variant('muse-hair-fh041_front', 'blob:recolored'),
  hairColor: hair.hairColorByKey(key),
});
const uploadedHair = (key) => ({
  ...libraryHair(key),
  hairColor: key ? hair.hairColorByKey(key) : null,
  file: {},
});
const prompt = (refs, lang, extra = {}) =>
  card.buildCardPrompt(refs, { style: 'follow', aspect: 'portrait', notes: '', lang, ...extra });

const sentences = {
  zh: {
    character: '保留所附人物的五官、脸型、发型发色、肤色、体型比例与画风',
    characterNoHair: '保留所附人物的五官、脸型、肤色、体型比例与画风，不采用人物参考的发型',
    hairstyle: '采用所附发型参考的剪裁、长度、层次、刘海、卷度、分线与轮廓，不采用人台头本身',
    upload: '不采用照片中人物的五官与身份',
    original: '原创成年角色',
  },
  tw: {
    character: '保留所附人物的五官、臉型、髮型髮色、膚色、體型比例與畫風',
    characterNoHair: '保留所附人物的五官、臉型、膚色、體型比例與畫風，不採用人物參考的髮型',
    hairstyle: '採用所附髮型參考的剪裁、長度、層次、瀏海、捲度、分線與輪廓，不採用人台頭本身',
    upload: '不採用照片中人物的五官與身分',
    original: '原創成年角色',
  },
  en: {
    character: 'face shape, facial features, hairstyle, hair color and skin tone',
    characterNoHair:
      'facial features, face shape, skin tone, body proportions and visual style, but not its hairstyle',
    hairstyle:
      'cut, length, layers, bangs, curl, parting and silhouette, not the mannequin head itself',
    upload: 'not the face or identity of the person in the photo',
    original: 'create an original adult character',
  },
};

test('沒有髮型時，英文提示詞跟改版前一字不差', () => {
  assert.equal(prompt([character, costume, pose]), beforePrompts.full);
  assert.equal(
    card.buildCardPrompt([costume, depthPose], { style: 'photo', aspect: 'square', notes: '' }),
    beforePrompts.noCharacterDepth,
  );
  assert.equal(
    card.buildCardPrompt([pose, costume, { ...character, file: {} }], {
      style: 'anime',
      aspect: 'landscape',
      notes: '  rainy street at night  ',
    }),
    beforePrompts.uploadedNotes,
  );
});

for (const lang of ['zh', 'tw', 'en']) {
  const s = sentences[lang];
  test(`提示詞（${lang}）情況一：只挑人物＝照舊（人物句保留髮型髮色，沒有髮型句與髮色句）`, () => {
    const text = prompt([pose, costume, character], lang);
    assert.ok(text.includes(s.character), text);
    assert.ok(!text.includes(s.characterNoHair));
    assert.ok(!text.includes(s.hairstyle));
    assert.doesNotMatch(text, /HAIRSTYLE|髮型：|发型：|髮色為|发色为|Hair color/);
  });

  test(`提示詞（${lang}）情況二：人物＋髮型＋髮色`, () => {
    const color = hair.hairColorByKey('silver');
    const text = prompt([character, libraryHair('silver'), costume, pose], lang);
    assert.ok(text.includes(s.characterNoHair), text);
    assert.ok(!text.includes(s.character));
    assert.ok(text.includes(s.hairstyle));
    const name = hair.hairColorName(color, lang);
    assert.ok(
      text.includes(
        lang === 'en'
          ? `Hair color: ${name}, as shown in Panel 4.`
          : lang === 'tw'
            ? `髮色為${name}（同區塊 4）。`
            : `发色为${name}（同区块 4）。`,
      ),
      text,
    );
    assert.ok(
      text.includes(
        lang === 'en'
          ? 'The sheet has 4 numbered panels.'
          : lang === 'tw'
            ? '圖卡共有 4 個編號區塊。'
            : '图卡共有 4 个编号区块。',
      ),
    );
    assert.ok(!text.includes(s.original));
  });

  test(`提示詞（${lang}）情況三：只挑髮型、沒挑人物＝髮型句＋髮色句`, () => {
    const text = prompt([pose, costume, libraryHair('rose')], lang);
    assert.ok(text.includes(s.hairstyle), text);
    assert.ok(!text.includes(s.character) && !text.includes(s.characterNoHair));
    assert.ok(text.includes(s.original));
    assert.ok(
      text.includes(
        lang === 'en'
          ? 'Hair color: Rose pink, as shown in Panel 3.'
          : lang === 'tw'
            ? '髮色為玫瑰粉（同區塊 3）。'
            : '发色为玫瑰粉（同区块 3）。',
      ),
      text,
    );
  });

  test(`提示詞（${lang}）情況四：上傳的自訂髮型照（不能換色，只寫髮色選單）`, () => {
    const chosen = prompt([pose, costume, character, uploadedHair('black')], lang);
    assert.ok(chosen.includes(s.upload), chosen);
    assert.ok(
      !chosen.includes('人台頭') &&
        !chosen.includes('人台头') &&
        !chosen.includes('mannequin head'),
    );
    assert.ok(chosen.includes(s.characterNoHair));
    assert.ok(
      chosen.includes(
        lang === 'en'
          ? 'Hair color: Natural black.'
          : lang === 'tw'
            ? '髮色為自然黑。'
            : '发色为自然黑。',
      ),
      chosen,
    );
    assert.match(chosen, /uploaded panels|上傳的區塊|上传的区块/);
    const photo = prompt([pose, costume, uploadedHair(null)], lang);
    assert.match(
      photo,
      /keep the color shown in the hairstyle photo|髮色沿用髮型參考照片|发色沿用发型参考照片/,
    );
  });
}

test('圖卡：髮型排第四格，標題附上髮色英文名稱', () => {
  const refs = card.orderedReferences([libraryHair('mint'), character, pose, costume]);
  assert.deepEqual(
    refs.map((ref) => ref.kind),
    ['pose', 'costume', 'character', 'hairstyle'],
  );
  assert.equal(card.panelLabel(refs[3]), 'HAIRSTYLE · Mint green');
  assert.equal(card.panelLabel(refs[2]), 'CHARACTER DESIGN');
  assert.equal(card.panelLabel(uploadedHair(null)), 'HAIRSTYLE');
});

// ── 網址參數 ────────────────────────────────────────────────

test('網址：?hair=／?haircolor= 還原髮型與髮色；舊連結的 ?hair=long 仍是人物髮長', () => {
  const read = (query) => hair.readHairParams(new URLSearchParams(query));
  assert.deepEqual(read('view=character&hair=long'), {
    characterHairLength: 'long',
    hairstyle: null,
    hairColor: null,
    filters: { gender: 'all', length: 'all', type: 'all', bangs: 'all', styles: 'all' },
  });
  const state = read(
    'view=studio&hair=fhs-41&haircolor=rose&hairlen=short&hgender=f&hstyle=kr&hbangs=wispy',
  );
  assert.equal(state.hairstyle, 'fhs-41');
  assert.equal(state.hairColor, 'rose');
  assert.equal(state.characterHairLength, 'short');
  assert.deepEqual(state.filters, {
    gender: 'f',
    length: 'all',
    type: 'all',
    bangs: 'wispy',
    styles: 'kr',
  });
  assert.equal(read('hair=FHS-41&haircolor=pinkish').hairColor, null);
  // 髮型 id 或編號（不分大小寫）都對得到；不是髮型的編號對不到
  assert.equal(hair.findHairstyle(catalog.items, state.hairstyle)?.id, 'muse-hair-fh041');
  assert.equal(hair.findHairstyle(catalog.items, 'muse-hair-mh005')?.code, 'MHS-05');
  assert.equal(hair.findHairstyle(catalog.items, 'muse-char-ff01-1'), undefined);
  assert.equal(hair.findHairstyle(catalog.items, 'nope'), undefined);
  // 寫回網址再讀一次，得到同一組
  const entries = hair.hairParamEntries({ ...state, hairstyle: 'FHS-41' });
  assert.deepEqual(entries, {
    hairlen: 'short',
    hgender: 'f',
    hbangs: 'wispy',
    hstyle: 'kr',
    hair: 'FHS-41',
    haircolor: 'rose',
  });
  const again = read(new URLSearchParams(entries).toString());
  assert.deepEqual({ ...again, hairstyle: again.hairstyle?.toLowerCase() }, state);
  assert.deepEqual(hair.hairParamEntries({ characterHairLength: 'all', filters: {} }), {});
});

// ── 圖庫：篩選、搜尋、排序、同一張臉 ───────────────────────

test('髮型篩選、搜尋與交替排序；現有三類的先後不變', () => {
  const hairstyles = catalog.items.filter((item) => item.kind === 'hairstyle');
  const pick = (filters) =>
    library
      .filterReferences(hairstyles, { hairstyle: filters })
      .map((item) => item.code)
      .sort();
  // 預期值從資料欄位直接算，不寫死編號（資料會長）；同時確認每個條件真的有篩掉東西、也有留下東西
  const expectCodes = (pred) => hairstyles.filter((item) => pred(item.hairstyle)).map((item) => item.code).sort();
  const cases = [
    [{ gender: 'm' }, (h) => h.gender === 'm'],
    [{ gender: 'f', length: 'long' }, (h) => h.gender === 'f' && h.length === 'long'],
    [{ bangs: 'blunt' }, (h) => h.bangs === 'blunt'],
    [{ styles: 'retro' }, (h) => h.styles.includes('retro')],
    [{ type: 'men', styles: 'kr' }, (h) => h.type === 'men' && h.styles.includes('kr')],
  ];
  for (const [filters, pred] of cases) {
    const got = pick(filters);
    assert.deepEqual(got, expectCodes(pred), JSON.stringify(filters));
    assert.ok(got.length > 0 && got.length < hairstyles.length, `${JSON.stringify(filters)} 應該篩掉一部分：${got.length}`);
  }
  assert.ok(pick({ bangs: 'blunt' }).includes('FHS-02'));
  assert.deepEqual(pick({ gender: 'all', styles: 'all' }).length, hairstyles.length);
  // 髮型篩選不影響其他類型（沒選＝不限）
  const others = catalog.items.filter((item) => item.kind !== 'hairstyle');
  assert.equal(library.filterReferences(others, { hairstyle: {} }).length, others.length);
  assert.ok(
    library.matchesQuery(
      hairstyles.find((item) => item.code === 'FHS-41'),
      '空氣瀏海',
    ),
  );
  assert.ok(
    library.matchesQuery(
      hairstyles.find((item) => item.code === 'MHS-04'),
      'korean',
    ),
  );
  const curated = library.sortItems(catalog.items, 'curated', 'tw');
  assert.equal(curated.length, catalog.items.length);
  assert.deepEqual(
    curated.slice(0, 8).map((item) => item.kind),
    ['pose', 'costume', 'character', 'hairstyle', 'pose', 'costume', 'character', 'hairstyle'],
  );
  const withoutHair = library.sortItems(others, 'curated', 'tw').map((item) => item.id);
  assert.deepEqual(
    curated.filter((item) => item.kind !== 'hairstyle').map((item) => item.id),
    withoutHair,
  );
});

test('同一張臉的其他髮型：FFC／MFC 同組 5 張依序；上游人物沒有', () => {
  const face = catalog.items.find((item) => item.code === 'FFC-01-3');
  assert.deepEqual(
    hair.sameFaceSiblings(face, catalog.items).map((item) => item.code),
    ['FFC-01-1', 'FFC-01-2', 'FFC-01-3', 'FFC-01-4', 'FFC-01-5'],
  );
  const male = catalog.items.find((item) => item.code === 'MFC-07-1');
  assert.ok(
    hair.sameFaceSiblings(male, catalog.items).every((item) => item.code.startsWith('MFC-07-')),
  );
  const upstream = catalog.items.find(
    (item) => item.kind === 'character' && item.source !== 'muse',
  );
  assert.deepEqual(hair.sameFaceSiblings(upstream, catalog.items), []);
});

// ── 匿名統計與計數服務 ──────────────────────────────────────

test('統計：髮型另外送一筆（計數服務沒更新前不連累其他參考）、排行多髮型一欄', () => {
  const ref = (id, kind) => ({ id, kind });
  assert.deepEqual(
    stats.buildHits('card', [
      ref('p', 'pose'),
      ref('c', 'costume'),
      undefined,
      ref('h', 'hairstyle'),
    ]),
    [
      {
        action: 'card',
        refs: [
          { id: 'p', kind: 'pose' },
          { id: 'c', kind: 'costume' },
        ],
      },
      { action: 'card', refs: [{ id: 'h', kind: 'hairstyle' }] },
    ],
  );
  assert.deepEqual(stats.buildHits('ref', [ref('p', 'pose')]), [
    { action: 'ref', refs: [{ id: 'p', kind: 'pose' }] },
  ]);
  assert.deepEqual(stats.buildHits('prompt', [undefined]), []);
  const ranks = stats.rankByKind(
    [ref('h1', 'hairstyle'), ref('h2', 'hairstyle'), ref('p1', 'pose')],
    { h2: 3, h1: 1, p1: 2 },
  );
  assert.deepEqual(
    ranks.hairstyle.map((entry) => entry.item.id),
    ['h2', 'h1'],
  );
  assert.deepEqual(
    ranks.pose.map((entry) => entry.item.id),
    ['p1'],
  );
});

test('計數服務接受髮型、色票與兩個新動作，其他照舊擋', async () => {
  const { default: worker } = await import('../worker/index.js');
  const writes = [];
  const env = {
    DB: {
      prepare: (sql) => ({ bind: (...args) => ({ sql, args }) }),
      batch: async (statements) => writes.push(...statements),
    },
  };
  const hit = (body) =>
    worker.fetch(
      new Request('https://muse-stats.example/hit', {
        method: 'POST',
        headers: { Origin: 'https://muse.toai.tw' },
        body: JSON.stringify(body),
      }),
      env,
    );
  assert.equal(
    (await hit({ action: 'card', refs: [{ id: 'muse-hair-fh041', kind: 'hairstyle' }] })).status,
    204,
  );
  assert.equal(
    (await hit({ action: 'color', refs: [{ id: 'rose', kind: 'haircolor' }] })).status,
    204,
  );
  assert.equal(
    (await hit({ action: 'recolor', refs: [{ id: 'muse-hair-fh041', kind: 'hairstyle' }] })).status,
    204,
  );
  assert.equal(
    (
      await hit({
        action: 'card',
        refs: [
          { id: 'p', kind: 'pose' },
          { id: 'c', kind: 'costume' },
          { id: 'h', kind: 'character' },
          { id: 'x', kind: 'hairstyle' },
        ],
      })
    ).status,
    204,
  );
  assert.equal((await hit({ action: 'card', refs: [{ id: 'x', kind: 'wig' }] })).status, 400);
  assert.equal((await hit({ action: 'paint', refs: [{ id: 'x', kind: 'pose' }] })).status, 400);
  assert.ok(
    writes.some((write) => write.args.includes('haircolor') && write.args.includes('color')),
  );
});
