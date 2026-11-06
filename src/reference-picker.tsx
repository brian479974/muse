import { useEffect, useMemo, useRef, useState } from 'react';
import { PersonStanding, Search, Shirt, UserRound, X } from 'lucide-react';
import { generationCopy } from './generation-copy';
import { studioCopy } from './studio-copy';
import type { ImageReference } from './generation';
import { filterReferences } from './library';
import { ReferenceFilters, ReferenceBadges, CategoryFilter } from './reference-filters';
import { copy } from './i18n';
import { hasPoseDepth } from './pose-depth';
import { Modal, RemoteImage } from './ui';
import type { Kind, Lang, Reference } from './types';
import { localeOf } from './types';

// 搭配台與參考圖卡共用的常數
export const kinds: Kind[] = ['pose', 'costume', 'character'];
export const referenceIcons = { pose: PersonStanding, costume: Shirt, character: UserRound };
export const styleKeys = ['follow', 'photo', 'studio', 'anime'] as const;
export type Style = (typeof styleKeys)[number];
export const referenceFingerprint = (references: ImageReference[]) =>
  references.map((ref) => `${ref.kind}:${ref.variant.original}`).join('|');


export function ReferencePicker({
  kind,
  items,
  lang,
  poseDepth,
  onDepth,
  depthDisabled,
  onChoose,
  onClose,
}: {
  kind: Kind;
  items: Reference[];
  lang: Lang;
  poseDepth: boolean;
  onDepth: (value: boolean) => void;
  depthDisabled: boolean;
  onChoose: (item: Reference, angle?: string) => void;
  onClose: () => void;
}) {
  const t = studioCopy[lang];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [collection, setCollection] = useState('all');
  const [tag, setTag] = useState('all');
  const [style, setStyle] = useState('all');
  const [country, setCountry] = useState('all');
  const [limit, setLimit] = useState(24);
  const [cardAngles, setCardAngles] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const Icon = referenceIcons[kind];
  const available = useMemo(() => items.filter((item) => item.kind === kind), [items, kind]);
  const filters = { category, collection, tag, style, country, query };
  const filtered = filterReferences(available, filters);
  const hasMore = filtered.length > limit;
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setLimit((current) => Math.min(current + 24, filtered.length));
      },
      { root: scrollRef.current, rootMargin: '0px 0px 160px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, limit, filtered.length, query, category, collection, tag, style, country]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setLimit(24);
  }, [query, category, collection, tag, style, country]);
  return (
    <Modal
      onClose={onClose}
      label={`${t.choose} ${generationCopy[lang][kind]}`}
      className="studio-picker-modal"
    >
      <header className="studio-picker-header">
        <div className="panel-heading">
          <div className="studio-picker-title">
            <span className="studio-picker-icon">
              <Icon size={21} />
            </span>
            <div>
              <h2>
                {t.choose} {generationCopy[lang][kind]}
              </h2>
              <p>{kind === 'pose' ? t.posePickerHint : t.pickerHint}</p>
            </div>
          </div>
          <button className="icon-button" aria-label={generationCopy[lang].close} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="studio-picker-filters">
          <label className="studio-picker-search">
            <Search size={16} />
            <input
              autoFocus
              value={query}
              placeholder={t.search}
              aria-label={t.search}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(24);
              }}
            />
          </label>
          {kind === 'pose' && (
            <label className="pose-depth-switch studio-picker-depth" title={t.depthHint}>
              <span>{t.depthMap}</span>
              <input
                type="checkbox"
                checked={poseDepth}
                disabled={depthDisabled || (!poseDepth && !filtered.some(hasPoseDepth))}
                onChange={(e) => onDepth(e.target.checked)}
              />
              <span className="switch-track" aria-hidden="true" />
            </label>
          )}
        </div>
        {kind === 'pose' && filtered.some((item) => !hasPoseDepth(item)) && (
          <p className="depth-availability-note">{copy[lang].depthPartial}</p>
        )}
        <ReferenceFilters
          items={available}
          lang={lang}
          filters={filters}
          onCollection={setCollection}
          onTag={setTag}
          onStyle={setStyle}
          onCountry={setCountry}
        >
          <CategoryFilter items={available} filters={filters} lang={lang} onChange={setCategory} />
        </ReferenceFilters>
        <p className="studio-picker-count" role="status">
          {filtered.length.toLocaleString(localeOf(lang))} {t.referenceCount}
        </p>
      </header>
      <div className="studio-picker-scroll" ref={scrollRef}>
        <div className="studio-picker-grid">
          {filtered.slice(0, limit).map((item) => {
            const variant =
              item.variants.find((value) => value.angle === cardAngles[item.id]) ||
              item.variants.find((value) => value.angle === 'front') ||
              item.variants[0];
            return (
              <article key={item.id} className={`studio-picker-card studio-picker-card-${kind}`}>
                <button
                  className="studio-picker-select"
                  title={item.title[lang]}
                  aria-label={`${t.choose} ${item.title[lang]}${kind === 'pose' ? ` · ${variant.label[lang]}` : ''}`}
                  onClick={() => onChoose(item, variant.angle)}
                >
                  <RemoteImage
                    className="studio-picker-preview"
                    src={variant.thumbnail}
                    alt={`${item.title[lang]} · ${variant.label[lang]}`}
                    lang={lang}
                  />
                  <span className="studio-picker-card-title">{item.title[lang]}</span>
                </button>
                {kind === 'pose' && item.variants.length > 1 && (
                  <div
                    className="studio-picker-angles"
                    role="group"
                    aria-label={`${item.title[lang]} · ${t.angle}`}
                  >
                    {item.variants.map((view) => (
                      <button
                        key={view.id}
                        type="button"
                        aria-label={view.label[lang]}
                        aria-pressed={view.angle === variant.angle}
                        title={view.label[lang]}
                        onClick={() =>
                          setCardAngles((current) => ({ ...current, [item.id]: view.angle }))
                        }
                      >
                        <RemoteImage src={view.thumbnail} alt="" lang={lang} />
                        <span>{view.label[lang]}</span>
                      </button>
                    ))}
                  </div>
                )}
                <ReferenceBadges item={item} lang={lang} />
              </article>
            );
          })}
        </div>
        {!filtered.length && <p className="studio-picker-empty">{t.noMatches}</p>}
        {hasMore && (
          <div ref={loadMoreRef} className="studio-picker-more">
            <button
              className="secondary-button"
              onClick={() => setLimit((current) => Math.min(current + 24, filtered.length))}
            >
              {t.more}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
