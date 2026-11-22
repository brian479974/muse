// 網站聲明（非營利、開源、立場、資料來源、使用規則、隱私、免責、移除申請）
// 文案在 i18n.ts 的 legalSections；文中的 {鍵} 換成下面的外部連結。
// 連結名稱是專有名詞，三種語言共用。
import { copy } from './i18n';
import type { Lang } from './types';
import './site-notice.css';

export const SITE_NOTICE_ID = 'muse-site-notice';

const LINKS: Record<string, [string, string]> = {
  repo: ['GitHub', 'https://github.com/brian479974/muse'],
  issues: ['GitHub Issues', 'https://github.com/brian479974/muse/issues'],
  upstream: ['open-pose-costume', 'https://github.com/hongye007/open-pose-costume'],
  mit: ['MIT', 'https://opensource.org/license/mit'],
  aiPose: ['AI Pose Gallery', 'https://ai-pose-gallery.pages.dev/'],
  aiCostume: ['AI Costume Gallery', 'https://ai-costume-gallery.pages.dev/'],
  aiCostumeAnime: ['AI Costume Anime Gallery', 'https://ai-costume-anime-gallery.pages.dev/'],
  aiPortrait: ['AI Portrait Gallery', 'https://ai-portrait-gallery.pages.dev/'],
  gia: ['ギア', 'https://x.com/giaaibusi'],
  agi: ['あぎ', 'https://x.com/agi_aibusi'],
  poseZh: ['anhao/ai-pose-gallery-zh', 'https://github.com/anhao/ai-pose-gallery-zh'],
  dav2: ['Depth Anything V2', 'https://github.com/DepthAnything/Depth-Anything-V2'],
  ccbync: ['CC BY-NC 4.0', 'https://creativecommons.org/licenses/by-nc/4.0/'],
  cc0: ['CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/'],
};

export function withLinks(text: string) {
  return text.split(/(\{\w+\})/).map((part, index) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    const link = key ? LINKS[key] : undefined;
    if (!link) {
      if (key) throw new Error(`網站聲明缺少連結：${key}`);
      return part;
    }
    return (
      <a key={index} href={link[1]} target="_blank" rel="noopener noreferrer">
        {link[0]}
      </a>
    );
  });
}

export function SiteNotice({ lang }: { lang: Lang }) {
  const t = copy[lang];
  return (
    <section className="project-section site-notice" id={SITE_NOTICE_ID}>
      <h3>{t.legalTitle}</h3>
      {t.legalSections.map(({ title, items }) => (
        <div className="site-notice-block" key={title}>
          <h4>{title}</h4>
          <ul>
            {items.map((item) =>
              Array.isArray(item) ? (
                <li key={item[0]}>
                  <strong>{item[0]}</strong>
                  <span>{withLinks(item[1])}</span>
                </li>
              ) : (
                <li key={item}>
                  <span>{withLinks(item)}</span>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </section>
  );
}
