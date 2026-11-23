// 首頁展示區：主視覺（姿勢、服裝、人物、髮型四張參考漂浮＋圖卡彈出）、圖片跑馬燈、四類參考卡、熱門排行、三步驟圖解。
// 圖片一律取自圖庫上游原站（瀏覽器直接載入），不使用自建素材。
import { museAssetUrl } from './custom-assets';
import { ArrowDown, ArrowRight } from 'lucide-react';
import type { Kind, Lang, Reference } from './types';
import { MIN_RANKED } from './stats';
import type { RankedReference } from './stats';
import { localeOf } from './types';

const showcaseCopy = {
  zh: {
    kicker: 'POSE · OUTFIT · CHARACTER · HAIR',
    titleA: '四种参考',
    titleB: '拼出你的角色',
    lead: '姿势、服装、人物、发型四种参考，都能筛选、收藏、下载。挑好组合，Muse 帮你排成一张参考图卡，交给 ChatGPT 就能生成。',
    explore: '开始探索',
    makeCard: '制作参考图卡',
    references: '组参考',
    images: '张图片',
    languages: '种语言',
    sheetTitle: 'REFERENCE CARD',
    sheetHint: '下载图卡＋复制提示词，交给 ChatGPT',
    libraryKicker: 'THE LIBRARY',
    libraryTitle: '四个参考库，各司其职',
    libraryText: '姿势定动作与重心，服装定穿搭，人物定长相，发型定剪裁与发色。每一种都能单独使用，也能放进同一张参考图卡。',
    pose: '姿势参考',
    poseHint: '定动作・五视角＋深度图',
    costume: '服装参考',
    costumeHint: '定穿搭・四季・派对・动漫',
    character: '人物参考',
    characterHint: '定长相・年龄・族裔',
    hairstyle: '发型参考',
    hairstyleHint: '定剪裁・16 色即时换色',
    stepsKicker: 'HOW IT WORKS',
    stepsTitle: '三步骤，交给 ChatGPT',
    stepsText: '不用 API 密钥。可以上传自己的图片，图片只留在你的浏览器里；图卡在本机排好，下载就能用。',
    step1: '挑选参考',
    step1Text: '姿势、服装各挑一个，人物、发型可选；也可以上传自己的服装、人物或发型照片。',
    step2: '下载参考图卡',
    step2Text: '选好的参考连同提示词，自动排成一张图，最多四格。',
    step3: '贴到 ChatGPT',
    step3Text: '上传图卡、贴上提示词，送出就生成。',
    chat: '（图卡）照这张参考图卡生成',
    collectionKicker: 'THE COLLECTION',
    popularKicker: 'MOST USED',
    popularTitle: '热门参考',
    popularText: '依「放进参考图卡并下载」的次数排名。只统计次数，不记录任何个人资料。',
  },
  tw: {
    kicker: 'POSE · OUTFIT · CHARACTER · HAIR',
    titleA: '四種參考',
    titleB: '拼出你的角色',
    lead: '姿勢、服裝、人物、髮型四種參考，都能篩選、收藏、下載。挑好組合，Muse 幫你排成一張參考圖卡，交給 ChatGPT 就能生成。',
    explore: '開始探索',
    makeCard: '製作參考圖卡',
    references: '組參考',
    images: '張圖片',
    languages: '種語言',
    sheetTitle: 'REFERENCE CARD',
    sheetHint: '下載圖卡＋複製提示詞，交給 ChatGPT',
    libraryKicker: 'THE LIBRARY',
    libraryTitle: '四個參考庫，各司其職',
    libraryText: '姿勢定動作與重心，服裝定穿搭，人物定長相，髮型定剪裁與髮色。每一種都能單獨使用，也能放進同一張參考圖卡。',
    pose: '姿勢參考',
    poseHint: '定動作・五視角＋深度圖',
    costume: '服裝參考',
    costumeHint: '定穿搭・四季・派對・動漫',
    character: '人物參考',
    characterHint: '定長相・年齡・族裔',
    hairstyle: '髮型參考',
    hairstyleHint: '定剪裁・16 色即時換色',
    stepsKicker: 'HOW IT WORKS',
    stepsTitle: '三步驟，交給 ChatGPT',
    stepsText: '不用 API 金鑰。可以上傳自己的圖片，圖片只留在你的瀏覽器裡；圖卡在本機排好，下載就能用。',
    step1: '挑選參考',
    step1Text: '姿勢、服裝各挑一個，人物、髮型可選；也可以上傳自己的服裝、人物或髮型照片。',
    step2: '下載參考圖卡',
    step2Text: '選好的參考連同提示詞，自動排成一張圖，最多四格。',
    step3: '貼到 ChatGPT',
    step3Text: '上傳圖卡、貼上提示詞，送出就生成。',
    chat: '（圖卡）照這張參考圖卡生成',
    collectionKicker: 'THE COLLECTION',
    popularKicker: 'MOST USED',
    popularTitle: '熱門參考',
    popularText: '依「放進參考圖卡並下載」的次數排名。只統計次數，不記錄任何個人資料。',
  },
  en: {
    kicker: 'POSE · OUTFIT · CHARACTER · HAIR',
    titleA: 'Four references,',
    titleB: 'one character',
    lead: 'Poses, outfits, characters and hairstyles, all filterable, savable and downloadable. Pick a combination and Muse lays it out as one reference card for ChatGPT.',
    explore: 'Start exploring',
    makeCard: 'Make a reference card',
    references: 'references',
    images: 'images',
    languages: 'languages',
    sheetTitle: 'REFERENCE CARD',
    sheetHint: 'Download the card + copy the prompt for ChatGPT',
    libraryKicker: 'THE LIBRARY',
    libraryTitle: 'Four libraries, one job each',
    libraryText: 'Poses set the action and balance, outfits the styling, characters the face, hairstyles the cut and color. Use any of them alone, or put them on one reference card.',
    pose: 'Poses',
    poseHint: 'The action · 5 views + depth',
    costume: 'Outfits',
    costumeHint: 'The styling · seasons · anime',
    character: 'Characters',
    characterHint: 'The face · age · ethnicity',
    hairstyle: 'Hairstyles',
    hairstyleHint: 'The cut · 16 instant colors',
    stepsKicker: 'HOW IT WORKS',
    stepsTitle: 'Three steps to ChatGPT',
    stepsText: 'No API key needed. Upload your own photos if you like — they stay in your browser. The card is laid out locally, ready to download.',
    step1: 'Pick references',
    step1Text: 'Pick a pose and an outfit, plus a character and a hairstyle if you like, or upload your own photos.',
    step2: 'Download the card',
    step2Text: 'Your references and the prompt, laid out as one image with up to four slots.',
    step3: 'Paste into ChatGPT',
    step3Text: 'Upload the card, paste the prompt and send.',
    chat: '(card) Generate from this reference card',
    collectionKicker: 'THE COLLECTION',
    popularKicker: 'MOST USED',
    popularTitle: 'Most used references',
    popularText: 'Ranked by how often each reference is put on a reference card and downloaded. Only counts are kept, never personal data.',
  },
};
export const showcaseText = (lang: Lang) => showcaseCopy[lang];

// 主視覺固定用這四張（姿勢、髮型＝Muse 自製，服裝與人物＝上游圖庫）
const hero = {
  pose: {
    thumb: museAssetUrl('muse-assets/pose/thumbnails/full_single_P021_front.webp'),
    image: museAssetUrl('muse-assets/pose/images/full_single_P021_front.webp'),
  },
  costume: {
    thumb: 'https://ai-costume-gallery.pages.dev/thumbs/SPR-0083.webp',
    image: 'https://ai-costume-gallery.pages.dev/img/SPR-0083.webp',
  },
  character: {
    thumb: 'https://ai-portrait-gallery.pages.dev/img/thumb/f6cf9feabd2.webp',
    image: 'https://ai-portrait-gallery.pages.dev/img/full/f6cf9feabd2.png',
  },
  hairstyle: {
    thumb: museAssetUrl('muse-assets/hairstyle/thumbnails/muse-hair-fh031-front.webp'),
    image: museAssetUrl('muse-assets/hairstyle/images/muse-hair-fh031-front.webp'),
  },
};

/** 固定種子的洗牌：每次開站挑到同一組圖，畫面穩定 */
function pickStable<T>(list: T[], count: number, seed: number): T[] {
  const arr = [...list];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}
const thumb = (item: Reference) => item.variants[0]?.thumbnail;
const byKind = (items: Reference[], kind: Reference['kind']) => items.filter((i) => i.kind === kind);
const isPhoto = (item: Reference) => !!item.tags?.some((tag) => tag.id === 'photo');

function Img({ src, alt = '', className }: { src?: string; alt?: string; className?: string }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}

export function HomeHero({
  lang,
  references,
  images,
  onOpenStudio,
}: {
  lang: Lang;
  references: number;
  images: number;
  onOpenStudio: () => void;
}) {
  const t = showcaseText(lang);
  const num = (n: number) => (n ? n.toLocaleString(localeOf(lang)) : '—');
  return (
    <section className="home-hero" aria-label={t.titleB}>
      <div className="home-hero-copy">
        <span className="home-kicker rise">{t.kicker}</span>
        <h1 className="rise" style={{ animationDelay: '.12s' }}>
          {t.titleA}
          <br />
          <em>{t.titleB}</em>
          {lang === 'en' ? '.' : '。'}
        </h1>
        <p className="home-lead rise" style={{ animationDelay: '.24s' }}>
          {t.lead}
        </p>
        <div className="home-actions rise" style={{ animationDelay: '.36s' }}>
          <a className="home-cta" href="#collection">
            {t.explore}
            <ArrowDown size={16} />
          </a>
          <button className="home-ghost" onClick={onOpenStudio}>
            {t.makeCard}
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="home-stats rise" style={{ animationDelay: '.48s' }}>
          <div>
            <b>{num(references)}</b>
            <span>{t.references}</span>
          </div>
          <div>
            <b>{num(images)}</b>
            <span>{t.images}</span>
          </div>
          <div>
            <b>3</b>
            <span>{t.languages}</span>
          </div>
        </div>
      </div>
      <div className="home-stage" aria-hidden="true">
        <div className="home-shot s1">
          <Img src={hero.pose.image} />
          <label>POSE</label>
        </div>
        <div className="home-shot s2">
          <Img src={hero.costume.image} />
          <label>OUTFIT</label>
        </div>
        <div className="home-shot s3">
          <Img src={hero.character.image} />
          <label>CHARACTER</label>
        </div>
        <div className="home-shot s4">
          <Img src={hero.hairstyle.image} />
          <label>HAIR</label>
        </div>
        <button className="home-sheet" onClick={onOpenStudio} tabIndex={-1}>
          <b>{t.sheetTitle}</b>
          <span className="row">
            <Img src={hero.pose.thumb} />
            <Img src={hero.costume.thumb} />
            <Img src={hero.character.thumb} />
            <Img src={hero.hairstyle.thumb} />
          </span>
          <span className="lines">
            <i />
            <i />
            <i />
          </span>
          <small>{t.sheetHint}</small>
        </button>
        <i className="spark" style={{ left: '46%', top: '8%' }} />
        <i className="spark" style={{ left: '1%', top: '56%', animationDelay: '1s' }} />
        <i className="spark" style={{ right: '42%', bottom: '4%', animationDelay: '2s' }} />
      </div>
    </section>
  );
}

export function HomeMarquee({
  items,
  onOpen,
}: {
  items: Reference[];
  onOpen: (item: Reference) => void;
}) {
  const costumes = byKind(items, 'costume').filter(isPhoto);
  const rowA = [
    ...pickStable(costumes, 8, 7),
    ...pickStable(byKind(items, 'character'), 5, 11),
  ];
  const rowB = [
    ...pickStable(byKind(items, 'character'), 5, 23),
    ...pickStable(costumes, 6, 31),
    ...pickStable(byKind(items, 'pose'), 3, 5),
  ];
  if (!rowA.length) return null;
  const row = (list: Reference[], reverse = false) => (
    <div className={`home-track ${reverse ? 'rev' : ''}`}>
      {[...list, ...list].map((item, index) => (
        <button
          key={`${item.id}-${index}`}
          className={`home-tile ${item.kind}`}
          onClick={() => onOpen(item)}
          tabIndex={index >= list.length ? -1 : 0}
          aria-label={item.title.en}
        >
          <Img src={thumb(item)} alt="" />
        </button>
      ))}
    </div>
  );
  return (
    <div className="home-marquee">
      {row(rowA)}
      {row(rowB, true)}
    </div>
  );
}

export function HomeLibrary({
  lang,
  items,
  counts,
  onView,
}: {
  lang: Lang;
  items: Reference[];
  counts: Record<Kind, number>;
  onView: (view: Kind) => void;
}) {
  const t = showcaseText(lang);
  const tiles = [
    { kind: 'pose' as const, title: t.pose, hint: t.poseHint, pics: pickStable(byKind(items, 'pose'), 3, 41) },
    {
      kind: 'costume' as const,
      title: t.costume,
      hint: t.costumeHint,
      pics: pickStable(byKind(items, 'costume').filter(isPhoto), 3, 43),
    },
    {
      kind: 'character' as const,
      title: t.character,
      hint: t.characterHint,
      pics: pickStable(byKind(items, 'character'), 3, 47),
    },
    // 髮型（2026-11-22）：清單裡有髮型才出現
    ...(counts.hairstyle
      ? [
          {
            kind: 'hairstyle' as const,
            title: t.hairstyle,
            hint: t.hairstyleHint,
            pics: pickStable(byKind(items, 'hairstyle'), 3, 53),
          },
        ]
      : []),
  ];
  return (
    <section className="home-block">
      <div className="home-heading">
        <div>
          <span className="home-kicker">{t.libraryKicker}</span>
          <h2>{t.libraryTitle}</h2>
        </div>
        <p>{t.libraryText}</p>
      </div>
      <div className={`home-cats ${tiles.length > 3 ? 'four' : ''}`}>
        {tiles.map((tile) => (
          <button key={tile.kind} className={`home-cat ${tile.kind}`} onClick={() => onView(tile.kind)}>
            <span className="pics">
              {tile.pics.map((item) => (
                <Img key={item.id} src={thumb(item)} />
              ))}
            </span>
            <span className="label">
              <strong>{tile.title}</strong>
              <small>{tile.hint}</small>
            </span>
            <b className="n">{counts[tile.kind].toLocaleString(localeOf(lang))}</b>
          </button>
        ))}
      </div>
    </section>
  );
}

/** 熱門排行：姿勢、服裝、人物、髮型各列前 10 名；某類型被用過的參考不到 MIN_RANKED 張就不列，全部不到就整區不顯示 */
export function HomePopular({
  lang,
  ranks,
  onOpen,
}: {
  lang: Lang;
  ranks: Record<Kind, RankedReference[]>;
  onOpen: (item: Reference) => void;
}) {
  const t = showcaseText(lang);
  const columns = (['pose', 'costume', 'character', 'hairstyle'] as const).filter(
    (kind) => ranks[kind].length >= MIN_RANKED,
  );
  if (!columns.length) return null;
  const titles = { pose: t.pose, costume: t.costume, character: t.character, hairstyle: t.hairstyle };
  const times = (n: number) =>
    lang === 'en'
      ? `${n.toLocaleString('en')} ${n === 1 ? 'use' : 'uses'}`
      : `${n.toLocaleString(localeOf(lang))} 次`;
  return (
    <section className="home-block home-popular" aria-labelledby="home-popular-title">
      <div className="home-heading">
        <div>
          <span className="home-kicker">{t.popularKicker}</span>
          <h2 id="home-popular-title">{t.popularTitle}</h2>
        </div>
        <p>{t.popularText}</p>
      </div>
      <div className="popular-columns">
        {columns.map((kind) => (
          <div className={`popular-column ${kind}`} key={kind}>
            <h3>{titles[kind]}</h3>
            <ol>
              {ranks[kind].map(({ item, count }, index) => (
                <li key={item.id}>
                  <button type="button" onClick={() => onOpen(item)}>
                    <span className="rank">{index + 1}</span>
                    <Img src={thumb(item)} />
                    <span className="name">{item.title[lang]}</span>
                    <small>{times(count)}</small>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeSteps({ lang, onOpenStudio }: { lang: Lang; onOpenStudio: () => void }) {
  const t = showcaseText(lang);
  const four = (
    <>
      <Img className="contain" src={hero.pose.thumb} />
      <Img src={hero.costume.thumb} />
      <Img src={hero.character.thumb} />
      <Img src={hero.hairstyle.thumb} />
    </>
  );
  return (
    <section className="home-block">
      <div className="home-heading">
        <div>
          <span className="home-kicker">{t.stepsKicker}</span>
          <h2>{t.stepsTitle}</h2>
        </div>
        <p>{t.stepsText}</p>
      </div>
      <div className="home-steps">
        <button className="home-step" onClick={onOpenStudio}>
          <span className="no">01</span>
          <strong>{t.step1}</strong>
          <small>{t.step1Text}</small>
          <span className="vis">{four}</span>
        </button>
        <button className="home-step" onClick={onOpenStudio}>
          <span className="no">02</span>
          <strong>{t.step2}</strong>
          <small>{t.step2Text}</small>
          <span className="vis">
            <span className="mini">
              <span className="row">{four}</span>
              <i />
              <i style={{ width: '78%' }} />
              <i style={{ width: '52%' }} />
            </span>
          </span>
        </button>
        <button className="home-step" onClick={onOpenStudio}>
          <span className="no">03</span>
          <strong>{t.step3}</strong>
          <small>{t.step3Text}</small>
          <span className="vis">
            <span className="chat">
              <span className="bub">{t.chat}</span>
              <span className="bub l typing">
                <i />
                <i />
                <i />
              </span>
            </span>
          </span>
        </button>
      </div>
    </section>
  );
}
