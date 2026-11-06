// 參考素材的型別與上傳檔驗證。
// 網站不再直接呼叫任何生圖 API：使用者在搭配台挑好參考後，下載參考圖卡＋複製提示詞，
// 自行貼到 ChatGPT 生成。因此這裡沒有金鑰、服務網址或網路請求。
import type { Kind, Reference, Variant } from './types';

interface ReferenceDetails {
  title: Reference['title'];
  keywords: Reference['keywords'];
  variant: Variant;
}
export interface GalleryImageReference extends ReferenceDetails {
  kind: Kind;
}
export interface UploadedImageReference extends ReferenceDetails {
  kind: 'character' | 'costume';
  file: File;
}
export type ImageReference = GalleryImageReference | UploadedImageReference;

export class ImageGenerationError extends Error {
  constructor(
    public code: string,
    message = '',
  ) {
    super(message);
  }
}

/** 只接受真的是 PNG／JPEG／WebP（看檔頭，不只看副檔名）且不超過 10 MB 的檔案。 */
export async function validateReferenceFile(
  file: File,
  kind: 'character' | 'costume',
): Promise<void> {
  if (file.size > 10 * 1024 * 1024) throw new ImageGenerationError(`${kind}TooLarge`);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const signature = String.fromCharCode(...bytes);
  const mime = signature.startsWith('\x89PNG\r\n\x1a\n')
    ? 'image/png'
    : signature.startsWith('\xff\xd8\xff')
      ? 'image/jpeg'
      : signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP'
        ? 'image/webp'
        : '';
  if (!mime || mime !== file.type) throw new ImageGenerationError(`${kind}Invalid`);
}
