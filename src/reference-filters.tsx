import type { ReactNode } from 'react';
import { copy } from './i18n';
import {
  characterFacetOrder,
  filterReferences,
  isSubjectTag,
  referenceTagLabel,
  subjectTagIds,
} from './library';
import type { CharacterFacet, LibraryFilters } from './library';
import type { Kind, Lang, Reference } from './types';
import { FilterSelect } from './filter-select';

const kinds: Kind[] = ['pose', 'costume', 'character', 'hairstyle'];

export function CategoryFilter({
  items,
  filters,
  lang,
  onChange,
}: {
  items: Reference[];
  filters: LibraryFilters;
  lang: Lang;
  onChange: (value: string) => void;
}) {
  const t = copy[lang];
  const counts = new Map<string, number>();
  for (const item of filterReferences(items, { ...filters, category: 'all' }))
    counts.set(item.category.id, (counts.get(item.category.id) || 0) + 1);
  // 姿勢分類照固定順序排（2026-11-20：原本照資料先後出現，新分類會插在中間亂跳）；沒列到的照原順序排在後面
  const categories = [
    ...new Map(
      items
        .filter((item) => !filters.kind || filters.kind === 'all' || item.kind === filters.kind)
        .map((item) => [item.category.id, { ...item.category, kind: item.kind }]),
    ).values(),
  ]
    .map((value, index) => ({ value, index }))
    .sort((a, b) => categoryRank(a.value.id, a.index) - categoryRank(b.value.id, b.index))
    .map(({ value }) => value);
  return (
    <div className="reference-filter-field category-filter">
      <span>{t.categoryFilter}</span>
      <FilterSelect
        label={t.categoryFilter}
        lang={lang}
        value={filters.category || 'all'}
        onChange={onChange}
        options={[
          { value: 'all', label: t.allCategories },
          ...kinds.flatMap((kind) =>
            categories
              .filter((value) => value.kind === kind)
              .map((value) => ({
                value: value.id,
                label: value[lang],
                group: t[kind],
                count: counts.get(value.id) || 0,
                disabled: !counts.get(value.id) && filters.category !== value.id,
              })),
          ),
        ]}
      />
    </div>
  );
}

export function ReferenceFilters({
  items,
  lang,
  filters,
  onCollection,
  onTag,
  onStyle,
  onAge,
  onEthnicity,
  children,
}: {
  items: Reference[];
  lang: Lang;
  filters: LibraryFilters;
  onCollection: (value: string) => void;
  onTag: (value: string) => void;
  onStyle: (value: string) => void;
  onAge: (value: string) => void;
  onEthnicity: (value: string) => void;
  children?: ReactNode;
}) {
  const t = copy[lang];
  const { collection = 'all', tag = 'all', style = 'all' } = filters;
  // 髮型的風格標籤（韓系、日系…）由髮型分頁自己的「風格」篩選處理，不混進「畫面風格」
  const tags = [
    ...new Map(
      items
        .filter((item) => item.kind !== 'hairstyle')
        .flatMap((item) => item.tags || [])
        .map((value) => [value.id, value]),
    ).values(),
  ];
  const subjects = subjectTagIds.filter(
    (id) => tags.some((value) => value.id === id) || tag === id,
  );
  const styles = tags.filter((value) => !isSubjectTag(value.id));
  const count = (key: 'collection' | 'tag' | 'style' | CharacterFacet, value: string) =>
    filterReferences(items, { ...filters, [key]: value }).length;
  // 人物的「族裔」「年齡」：只有清單裡有人物時才出現，選項照固定順序（不照資料先後）
  const facetField = (key: CharacterFacet, onChange: (value: string) => void) => {
    const current = filters[key] || 'all';
    const labels = new Map(
      items.flatMap((item) => (item[key] ? [[item[key]!.id, item[key]![lang]] as const] : [])),
    );
    if (!labels.size && current === 'all') return null;
    const label = key === 'age' ? t.ageFilter : t.ethnicityFilter;
    return (
      <div className="reference-filter-field">
        <span>{label}</span>
        <FilterSelect
          label={label}
          lang={lang}
          value={current}
          onChange={onChange}
          options={[
            { value: 'all', label: key === 'age' ? t.allAges : t.allEthnicities },
            ...characterFacetOrder[key]
              .filter((id) => labels.has(id))
              .map((id) => ({
                value: id,
                label: labels.get(id)!,
                count: count(key, id),
                disabled: !count(key, id) && current !== id,
              })),
            ...(current !== 'all' && !labels.has(current)
              ? [{ value: current, label: current, count: 0 }]
              : []),
          ]}
        />
      </div>
    );
  };
  return (
    <div className="reference-filter-wrap">
      <div className="reference-filters">
        {children}
        {/* 鏡像版沒有自建擴展素材：只有目錄裡真的有自建條目時才顯示「素材庫」篩選 */}
        {(count('collection', 'custom') > 0 || collection !== 'all') && (
          <div className="reference-filter-field">
            <span>{t.collection}</span>
            <FilterSelect
              label={t.collection}
              lang={lang}
              value={collection}
              onChange={onCollection}
              options={[
                ['all', t.allCollections],
                ['builtin', t.builtinCollection],
                ['custom', t.customCollection],
              ].map(([key, label]) => ({
                value: key,
                label,
                count: count('collection', key),
                disabled: key !== 'all' && !count('collection', key) && collection !== key,
              }))}
            />
          </div>
        )}
        {(subjects.length > 0 || tag !== 'all') && (
          <div className="reference-filter-field" title={t.tagHint}>
            <span>{t.tag}</span>
            <FilterSelect
              label={t.tag}
              lang={lang}
              value={tag}
              onChange={onTag}
              options={[
                { value: 'all', label: t.allTags },
                ...subjects.map((id) => ({
                  value: id,
                  label: referenceTagLabel(id, lang),
                  count: count('tag', id),
                  disabled: !count('tag', id) && tag !== id,
                })),
              ]}
            />
          </div>
        )}
        {(styles.length > 0 || style !== 'all') && (
          <div className="reference-filter-field" title={t.styleHint}>
            <span>{t.styleFilter}</span>
            <FilterSelect
              label={t.styleFilter}
              lang={lang}
              value={style}
              onChange={onStyle}
              options={[
                { value: 'all', label: t.allStyles },
                ...styles.map((value) => ({
                  value: value.id,
                  label: referenceTagLabel(value.id, lang, value[lang]),
                  count: count('style', value.id),
                  disabled: !count('style', value.id) && style !== value.id,
                })),
                ...(style !== 'all' && !styles.some((value) => value.id === style)
                  ? [{ value: style, label: style, count: 0 }]
                  : []),
              ]}
            />
          </div>
        )}
        {facetField('ethnicity', onEthnicity)}
        {facetField('age', onAge)}
      </div>
      {collection === 'custom' && (
        <details className="custom-usage-disclosure">
          <summary>{t.assetUsage}</summary>
          <p>{t.customUsageNotice}</p>
        </details>
      )}
    </div>
  );
}

export function ReferenceBadges({ item, lang }: { item: Reference; lang: Lang }) {
  if (!item.collection && !item.tags?.length && !item.ethnicity && !item.age) return null;
  return (
    <div className="reference-badges">
      {item.collection === 'custom' && <span>{copy[lang].customCollection}</span>}
      {item.tags?.map((tag) => (
        <span key={tag.id}>{referenceTagLabel(tag.id, lang, tag[lang])}</span>
      ))}
      {item.ethnicity && <span>{item.ethnicity[lang]}</span>}
      {item.age && <span>{item.age[lang]}</span>}
    </div>
  );
}

const POSE_CATEGORY_ORDER = [
  'standing',
  'action',
  'sitting',
  'side-sitting',
  'kneeling',
  'crouching',
  'lying',
  'leaning',
  'arching',
  'twisting',
  'gestures',
];

function categoryRank(id: string, index: number) {
  const rank = POSE_CATEGORY_ORDER.indexOf(id);
  return rank === -1 ? 1000 + index : rank;
}
