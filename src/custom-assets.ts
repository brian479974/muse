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

/** Muse 自製素材的圖片主機：2026-11-23 起正式版放 Cloudflare R2（GitHub Pages 有 1 GB 上限），開發時讀本站 public/muse-assets/ */
export const MUSE_ASSET_BASE = import.meta.env.VITE_MUSE_ASSET_BASE || '';

/** 清單裡存的是 /muse-assets/... 站內路徑；有設圖片主機就指到那裡，否則指到本站 */
export function museAssetUrl(value: string, base = siteBase()): string {
  const path = value.replace(/^\//, '');
  if (MUSE_ASSET_BASE && path.startsWith('muse-assets/')) return new URL(path, MUSE_ASSET_BASE).href;
  return base ? new URL(path, base).href : `${import.meta.env.BASE_URL}${path}`;
}

function resolveMuseAssets(item: Catalog['items'][number], base: URL) {
  const abs = (value: string) => museAssetUrl(value, base);
  return {
    ...item,
    variants: item.variants.map((variant) => ({
      ...variant,
      thumbnail: abs(variant.thumbnail),
      image: abs(variant.image),
      original: abs(variant.original),
      ...(variant.mask ? { mask: abs(variant.mask) } : {}),
      ...(variant.depth
        ? {
            depth: {
              thumbnail: abs(variant.depth.thumbnail),
              image: abs(variant.depth.image),
              original: abs(variant.depth.original),
            },
          }
        : {}),
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
