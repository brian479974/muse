import { useState } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { Modal } from './ui';
import type { Lang } from './types';

// 鏡像版：首頁示意改用上游圖庫的公開圖片（瀏覽器直接從原站載入，與圖庫瀏覽相同），
// 不使用原站自建素材與其衍生的生成示例。
const heroImages = {
  pose: {
    thumbnail: 'https://ai-pose-gallery.pages.dev/thumbs/full_single_P021_front.jpg',
    image: 'https://ai-pose-gallery.pages.dev/img/full_single_P021_front.png',
  },
  costume: {
    thumbnail: 'https://ai-costume-gallery.pages.dev/thumbs/SPR-0083.webp',
    image: 'https://ai-costume-gallery.pages.dev/img/SPR-0083.webp',
  },
  character: {
    thumbnail: 'https://ai-portrait-gallery.pages.dev/img/thumb/f6cf9feabd2.webp',
    image: 'https://ai-portrait-gallery.pages.dev/img/full/f6cf9feabd2.png',
  },
} as const;

const labels = {
  zh: {
    title: '三种参考，一个角色',
    pose: '姿势',
    costume: '服饰',
    character: '人物',
    result: '生成结果',
    resultHint: '选好三种参考，在搭配台一键生成',
    resultAction: '前往搭配台',
    open: '放大查看',
    close: '关闭',
  },
  tw: {
    title: '三種參考，一個角色',
    pose: '姿勢',
    costume: '服飾',
    character: '人物',
    result: '生成結果',
    resultHint: '選好三種參考，在搭配台一鍵生成',
    resultAction: '前往搭配台',
    open: '放大檢視',
    close: '關閉',
  },
  en: {
    title: 'Three references. One character.',
    pose: 'Pose',
    costume: 'Costume',
    character: 'Character',
    result: 'Generated result',
    resultHint: 'Pick three references and generate in the studio',
    resultAction: 'Open studio',
    open: 'View larger',
    close: 'Close',
  },
};
type ImageKind = keyof typeof heroImages;

export function HeroStudy({ lang, onOpenStudio }: { lang: Lang; onOpenStudio: () => void }) {
  const t = labels[lang];
  const [selected, setSelected] = useState<ImageKind | null>(null);
  return (
    <section className="hero-study" aria-label={t.title}>
      <div className="hero-study-heading">
        <span>{t.title}</span>
        <Sparkles size={14} />
      </div>
      <div className="hero-equation">
        <div className="hero-inputs">
          {(['pose', 'costume', 'character'] as const).map((kind, index) => (
            <div className="hero-input-group" key={kind}>
              {index > 0 && (
                <span className="hero-plus" aria-hidden="true">
                  +
                </span>
              )}
              <button
                type="button"
                className="hero-input"
                onClick={() => setSelected(kind)}
                aria-label={`${t.open}: ${t[kind]}`}
              >
                <img
                  src={heroImages[kind].thumbnail}
                  alt={t[kind]}
                  width={60}
                  height={72}
                  referrerPolicy="no-referrer"
                />
                <span>
                  {t[kind]}
                  <small>{kind.toUpperCase()}</small>
                </span>
              </button>
            </div>
          ))}
        </div>
        <span className="hero-equals" aria-hidden="true">
          =
        </span>
        <button
          type="button"
          className="hero-result hero-result-empty"
          onClick={onOpenStudio}
          aria-label={t.resultAction}
        >
          <span className="hero-result-placeholder">
            <Sparkles size={26} />
            <span>{t.resultHint}</span>
          </span>
          <span>
            <span>
              {t.result}
              <small>{t.resultAction}</small>
            </span>
            <ArrowRight size={13} />
          </span>
        </button>
      </div>
      {selected && (
        <Modal onClose={() => setSelected(null)} label={t[selected]} className="hero-study-modal">
          <div className="panel-heading">
            <h2>{t[selected]}</h2>
            <button className="icon-button" onClick={() => setSelected(null)} aria-label={t.close}>
              <X size={21} />
            </button>
          </div>
          <img src={heroImages[selected].image} alt={t[selected]} referrerPolicy="no-referrer" />
        </Modal>
      )}
    </section>
  );
}

