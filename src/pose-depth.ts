import type { Reference, Variant } from './types';

// 姿勢全部是 Muse 自製（2026-11-19 起），深度圖跟著每個角度一起存在 variant.depth；
// 2026-11-26 起不再支援上游圖庫（ai-pose-gallery／ai-pose-depth-gallery）的深度圖網址，網站不連任何外部圖庫
export function hasPoseDepth(item: Reference): boolean {
  return item.kind === 'pose' && item.variants.length > 0 && item.variants.every((variant) => !!variant.depth);
}

export function isDepthVariant(variant: Variant): boolean {
  return !!variant.depthMap;
}

export function withPoseDepth(item: Reference): Reference {
  if (!hasPoseDepth(item)) return item;
  return {
    ...item,
    variants: item.variants.map((variant) => ({ ...variant, ...variant.depth!, depthMap: true })),
  };
}
