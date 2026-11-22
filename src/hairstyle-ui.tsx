// 髮型分頁與合成台共用的小元件：五個篩選欄位、色票列、上傳髮型照的髮色選單。
import type { KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { FilterSelect } from './filter-select';
import {
  hairColorName,
  hairColors,
  hairstyleFacetKeys,
  hairstyleFields,
  hairstyleOptions,
  swatchBackground,
} from './hair-colors';
import type { HairstyleFacet, HairstyleFilters } from './hair-colors';
import { copy } from './i18n';
import { filterReferences } from './library';
import type { LibraryFilters } from './library';
import type { Lang, Reference } from './types';

/** 性別、長度、型態、瀏海、風格：選項照 data/hairstyle-facets.json 的順序，只列清單裡有的 */
export function HairstyleFilterFields({
  items,
  filters,
  lang,
  onChange,
}: {
  items: Reference[];
  filters: LibraryFilters;
  lang: Lang;
  onChange: (key: HairstyleFacet, value: string) => void;
}) {
  const current = filters.hairstyle || {};
  const present = (key: HairstyleFacet) =>
    new Set(
      items.flatMap((item) =>
        item.kind !== 'hairstyle' || !item.hairstyle
          ? []
          : key === 'styles'
            ? item.hairstyle.styles
            : [item.hairstyle[key]],
      ),
    );
  const count = (key: HairstyleFacet, value: string) =>
    filterReferences(items, { ...filters, hairstyle: { ...current, [key]: value } }).length;
  return (
    <>
      {hairstyleFacetKeys.map((key) => {
        const value = current[key as keyof HairstyleFilters] || 'all';
        const ids = present(key);
        const field = hairstyleFields[key];
        return (
          <div className="reference-filter-field" key={key}>
            <span>{field[lang]}</span>
            <FilterSelect
              label={field[lang]}
              lang={lang}
              value={value}
              onChange={(next) => onChange(key, next)}
              options={[
                { value: 'all', label: field.all[lang] },
                ...hairstyleOptions[key]
                  .filter((option) => ids.has(option.id) || value === option.id)
                  .map((option) => {
                    const n = count(key, option.id);
                    return {
                      value: option.id,
                      label: option[lang],
                      count: n,
                      disabled: !n && value !== option.id,
                    };
                  }),
              ]}
            />
          </div>
        );
      })}
    </>
  );
}

/** 16 色色票列。選推薦色＝原圖；目前選的打勾，推薦色另有小標 */
export function HairColorSwatches({
  value,
  recommended,
  onChange,
  lang,
  compact = false,
}: {
  value?: string;
  recommended?: string;
  onChange: (key: string) => void;
  lang: Lang;
  compact?: boolean;
}) {
  const t = copy[lang];
  const selected = hairColors.find((color) => color.key === value);
  const index = Math.max(
    0,
    hairColors.findIndex((color) => color.key === value),
  );
  // 單選群組：只有選中的那一顆能用 Tab 進來，方向鍵換色（WAI-ARIA radiogroup）
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    const target =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? hairColors.length - 1
          : step
            ? (index + step + hairColors.length) % hairColors.length
            : -1;
    if (target < 0) return;
    event.preventDefault();
    onChange(hairColors[target].key);
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('.hair-swatch');
    buttons[target]?.focus();
  }
  return (
    <div className={`hair-swatches ${compact ? 'compact' : ''}`}>
      <div
        className="hair-swatch-row"
        role="radiogroup"
        aria-label={t.hairColor}
        onKeyDown={onKeyDown}
      >
        {hairColors.map((color, position) => {
          const name = hairColorName(color, lang);
          const active = color.key === value;
          return (
            <button
              key={color.key}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={position === index ? 0 : -1}
              aria-label={color.key === recommended ? `${name}（${t.hairColorRecommended}）` : name}
              title={name}
              className={`hair-swatch ${active ? 'active' : ''} ${color.key === recommended ? 'recommended' : ''}`}
              data-color={color.key}
              style={{ background: swatchBackground(color) }}
              onClick={() => onChange(color.key)}
            >
              {active && <Check size={compact ? 11 : 13} strokeWidth={3} />}
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="hair-swatch-name" aria-live="polite">
          <span>{hairColorName(selected, lang)}</span>
          {selected.key === recommended && <small>{t.hairColorRecommended}</small>}
        </p>
      )}
    </div>
  );
}

/** 上傳的髮型照不能換色：只給髮色選單，選的寫進提示詞（「照片原色」＝不指定） */
export function HairColorSelect({
  value,
  onChange,
  lang,
  photoLabel,
  label,
  id,
}: {
  value: string;
  onChange: (key: string) => void;
  lang: Lang;
  photoLabel: string;
  label: string;
  id?: string;
}) {
  return (
    <select
      id={id}
      className="studio-select hair-color-select"
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{photoLabel}</option>
      {hairColors.map((color) => (
        <option key={color.key} value={color.key}>
          {hairColorName(color, lang)}
        </option>
      ))}
    </select>
  );
}
