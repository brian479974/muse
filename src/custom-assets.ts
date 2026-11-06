import type { Catalog, Kind } from './types';

export function siteBase(): URL | undefined {
  return typeof location === 'undefined'
    ? undefined
    : new URL(import.meta.env.BASE_URL, location.origin);
}

/** Only shipped custom image files on this installation may join gallery references. */
export function isCustomAsset(value: string, kind?: Kind, base = siteBase()): boolean {
  if (!base) return false;
  try {
    const url = new URL(value);
    if (
      url.origin !== base.origin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !['http:', 'https:'].includes(url.protocol)
    )
      return false;
    const path = url.pathname.slice(base.pathname.length);
    return (
      url.pathname.startsWith(base.pathname) &&
      new RegExp(
        `^custom/${kind || '(pose|costume|character)'}/(originals|images|thumbnails)/[a-zA-Z0-9_-]+\\.(png|jpg|webp)$`,
      ).test(path)
    );
  } catch {
    return false;
  }
}

/** Muse 自製素材的圖片放在本站 /muse-assets/，清單裡存的是站內路徑，載入時轉成完整網址 */
function resolveMuseAssets(item: Catalog['items'][number], base: URL) {
  const abs = (value: string) => new URL(value.replace(/^\//, ''), base).href;
  return {
    ...item,
    variants: item.variants.map((variant) => ({
      ...variant,
      thumbnail: abs(variant.thumbnail),
      image: abs(variant.image),
      original: abs(variant.original),
    })),
  };
}

export function resolveCustomAssets(catalog: Catalog, base = siteBase()): Catalog {
  if (!base) return catalog;
  return {
    ...catalog,
    items: catalog.items.map((item) =>
      item.source === 'muse'
        ? resolveMuseAssets(item, base)
        : item.collection !== 'custom'
        ? item
        : {
            ...item,
            variants: item.variants.map((variant) => {
              const asset = (value: string) => {
                const url = new URL(value, base).href;
                if (!isCustomAsset(url, item.kind, base)) throw Error('Invalid custom asset');
                return url;
              };
              return {
                ...variant,
                thumbnail: asset(variant.thumbnail),
                image: asset(variant.image),
                original: asset(variant.original),
                ...(variant.depth
                  ? {
                      depth: {
                        thumbnail: asset(variant.depth.thumbnail),
                        image: asset(variant.depth.image),
                        original: asset(variant.depth.original),
                      },
                    }
                  : {}),
              };
            }),
          },
    ),
  };
}
