// 首頁展示區：主視覺（三張參考漂浮＋圖卡彈出）、圖片跑馬燈、三大分類卡、三步驟圖解。
// 圖片一律取自圖庫上游原站（瀏覽器直接載入），不使用自建素材。
import { ArrowDown, ArrowRight } from 'lucide-react';
import type { Lang, Reference } from './types';
import { localeOf } from './types';

const showcaseCopy = {
  zh: {
    kicker: 'POSE · OUTFIT · CHARACTER',
    titleA: '从姿势、服装',
    titleB: '到你的角色',
    lead: '三千多组姿势、服装与人物参考。挑好三张，Muse 帮你排成一张参考图卡，交给 ChatGPT 就能生成。',
    explore: '开始探索',
    makeCard: '制作参考图卡',
    references: '组参考',
    images: '张图片',
    languages: '种语言',
    sheetTitle: 'REFERENCE CARD',
    sheetHint: '下载图卡＋复制提示词，交给 ChatGPT',
    libraryKicker: 'THE LIBRARY',
    libraryTitle: '三种参考，一个角色',
    libraryText: '姿势有五个视角与深度图，服装有四季与动漫系列，人物可以按发型、国家筛选。',
    pose: '姿势参考',
    poseHint: '站姿・坐姿・动态・五视角',
    costume: '服装参考',
    costumeHint: '四季穿搭・派对・动漫',
    character: '人物参考',
    characterHint: '发型・脸型・国家',
    stepsKicker: 'HOW IT WORKS',
    stepsTitle: '三步骤，交给 ChatGPT',
    stepsText: '不用 API 密钥，也不上传任何资料。图卡在你的浏览器里排好，下载就能用。',
    step1: '挑选参考',
    step1Text: '从图库挑一个姿势、一套服装，人物可选。',
    step2: '下载参考图卡',
    step2Text: '三张参考加上英文提示词，自动排成一张图。',
    step3: '贴到 ChatGPT',
    step3Text: '上传图卡、贴上提示词，送出就生成。',
    chat: '（图卡）照这张参考图卡生成',
    collectionKicker: 'THE COLLECTION',
  },
  tw: {
    kicker: 'POSE · OUTFIT · CHARACTER',
    titleA: '從姿勢、服裝',
    titleB: '到你的角色',
    lead: '三千多組姿勢、服裝與人物參考。挑好三張，Muse 幫你排成一張參考圖卡，交給 ChatGPT 就能生成。',
    explore: '開始探索',
    makeCard: '製作參考圖卡',
    references: '組參考',
    images: '張圖片',
    languages: '種語言',
    sheetTitle: 'REFERENCE CARD',
    sheetHint: '下載圖卡＋複製提示詞，交給 ChatGPT',
    libraryKicker: 'THE LIBRARY',
    libraryTitle: '三種參考，一個角色',
    libraryText: '姿勢有五個視角與深度圖，服裝有四季與動漫系列，人物可以按髮型、國家篩選。',
    pose: '姿勢參考',
    poseHint: '站姿・坐姿・動態・五視角',
    costume: '服裝參考',
    costumeHint: '四季穿搭・派對・動漫',
    character: '人物參考',
    characterHint: '髮型・臉型・國家',
    stepsKicker: 'HOW IT WORKS',
    stepsTitle: '三步驟，交給 ChatGPT',
    stepsText: '不用 API 金鑰，也不上傳任何資料。圖卡在你的瀏覽器裡排好，下載就能用。',
    step1: '挑選參考',
    step1Text: '從相簿挑一個姿勢、一套服裝，人物可選。',
    step2: '下載參考圖卡',
    step2Text: '三張參考加上英文提示詞，自動排成一張圖。',
    step3: '貼到 ChatGPT',
    step3Text: '上傳圖卡、貼上提示詞，送出就生成。',
    chat: '（圖卡）照這張參考圖卡生成',
    collectionKicker: 'THE COLLECTION',
  },
  en: {
    kicker: 'POSE · OUTFIT · CHARACTER',
    titleA: 'From pose and outfit',
    titleB: 'to your character',
    lead: 'Thousands of pose, outfit and character references. Pick three, and Muse lays them out as one reference card for ChatGPT.',
    explore: 'Start exploring',
    makeCard: 'Make a reference card',
    references: 'references',
    images: 'images',
    languages: 'languages',
    sheetTitle: 'REFERENCE CARD',
    sheetHint: 'Download the card + copy the prompt for ChatGPT',
    libraryKicker: 'THE LIBRARY',
    libraryTitle: 'Three references, one character',
    libraryText: 'Poses come in five viewpoints with depth maps, outfits across four seasons and anime, characters filterable by hair and country.',
    pose: 'Poses',
    poseHint: 'Standing · sitting · motion · 5 views',
    costume: 'Outfits',
    costumeHint: 'Four seasons · party · anime',
    character: 'Characters',
    characterHint: 'Hair · face · country',
    stepsKicker: 'HOW IT WORKS',
    stepsTitle: 'Three steps to ChatGPT',
    stepsText: 'No API key and nothing uploaded. The card is laid out in your browser, ready to download.',
    step1: 'Pick references',
    step1Text: 'Choose a pose and an outfit; a character is optional.',
    step2: 'Download the card',
    step2Text: 'Three references plus an English prompt, laid out as one image.',
    step3: 'Paste into ChatGPT',
    step3Text: 'Upload the card, paste the prompt and send.',
    chat: '(card) Generate from this reference card',
    collectionKicker: 'THE COLLECTION',
  },
};
export const showcaseText = (lang: Lang) => showcaseCopy[lang];

// 主視覺固定用這三張（上游圖庫）
const hero = {
  pose: {
    thumb: 'https://ai-pose-gallery.pages.dev/thumbs/full_single_P021_front.jpg',
    image: 'https://ai-pose-gallery.pages.dev/img/full_single_P021_front.png',
  },
  costume: {
    thumb: 'https://ai-costume-gallery.pages.dev/thumbs/SPR-0083.webp',
    image: 'https://ai-costume-gallery.pages.dev/img/SPR-0083.webp',
  },
  character: {
    thumb: 'https://ai-portrait-gallery.pages.dev/img/thumb/f6cf9feabd2.webp',
    image: 'https://ai-portrait-gallery.pages.dev/img/full/f6cf9feabd2.png',
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
        <button className="home-sheet" onClick={onOpenStudio} tabIndex={-1}>
          <b>{t.sheetTitle}</b>
          <span className="row">
            <Img src={hero.pose.thumb} />
            <Img src={hero.costume.thumb} />
            <Img src={hero.character.thumb} />
          </span>
          <span className="lines">
            <i />
            <i />
            <i />
          </span>
          <small>{t.sheetHint}</small>
        </button>
        <i className="spark" style={{ left: '46%', top: '8%' }} />
        <i className="spark" style={{ left: '6%', bottom: '14%', animationDelay: '1s' }} />
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
  counts: Record<'pose' | 'costume' | 'character', number>;
  onView: (view: 'pose' | 'costume' | 'character') => void;
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
      <div className="home-cats">
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

export function HomeSteps({ lang, onOpenStudio }: { lang: Lang; onOpenStudio: () => void }) {
  const t = showcaseText(lang);
  const trio = (
    <>
      <Img className="contain" src={hero.pose.thumb} />
      <Img src={hero.costume.thumb} />
      <Img src={hero.character.thumb} />
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
          <span className="vis">{trio}</span>
        </button>
        <button className="home-step" onClick={onOpenStudio}>
          <span className="no">02</span>
          <strong>{t.step2}</strong>
          <small>{t.step2Text}</small>
          <span className="vis">
            <span className="mini">
              <span className="row">{trio}</span>
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
