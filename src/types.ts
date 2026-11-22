export type Lang = 'zh' | 'tw' | 'en';
/** 介面語言對應的 BCP 47 地區碼（數字、日期、排序用） */
export const localeOf = (lang: Lang) => (lang === 'zh' ? 'zh-CN' : lang === 'tw' ? 'zh-TW' : 'en');
export type Localized = Record<Lang, string>;
export type Kind = 'pose' | 'costume' | 'character' | 'hairstyle';
/** 多語選項（篩選欄位用）：id 加三語名稱 */
export type Facet = Localized & { id: string };
/** 髮型參考的欄位（data/muse-extras.json；選項在 data/hairstyle-facets.json，色票在 data/hair-colors.json） */
export interface HairstyleInfo {
  gender: 'f' | 'm';
  length: string;
  type: string;
  bangs: string;
  styles: string[];
  /** 英文髮型描述 */
  prompt: string;
  /** 推薦色票 key：網頁預設選它，選它時直接顯示原圖 */
  recommendedColor: string;
  bangsLabel?: Localized;
  /** mirror-filter 掛上的多語名稱 */
  facets?: {
    gender: Facet;
    length: Facet;
    type: Facet;
    bangs: Facet;
    styles: Facet[];
  };
}
export interface Variant {
  id: string;
  angle: string;
  label: Localized;
  thumbnail: string;
  image: string;
  original: string;
  depth?: { thumbnail: string; image: string; original: string };
  /** 髮型：頭髮遮罩 PNG（跟 image 同尺寸；R＝頭髮、G＝邊緣帶），網頁即時換色用 */
  mask?: string;
  /** Persists the selected depth representation in generation history. */
  depthMap?: boolean;
}
export interface Reference {
  id: string;
  kind: Kind;
  code: string;
  title: Localized;
  category: Localized & { id: string };
  series: Localized;
  extended: boolean;
  keywords: Localized;
  source: string;
  collection?: 'custom';
  tags?: (Localized & { id: string })[];
  /** 人物：年齡段與族裔（選項見 data/character-facets.json） */
  age?: Localized & { id: string };
  ethnicity?: Localized & { id: string };
  portrait?: { section: 'face' | 'styling'; hair: string };
  hairstyle?: HairstyleInfo;
  variants: Variant[];
}
export interface Catalog {
  items: Reference[];
  stats: {
    poseGroups: number;
    poseImages: number;
    costumes: number;
    characters: number;
    /** 舊版清單沒有這個欄位 */
    hairstyles?: number;
    references: number;
    images: number;
  };
}
