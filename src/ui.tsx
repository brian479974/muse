import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { copy } from './i18n';
import type { Lang } from './types';

export function RemoteImage({
  src,
  alt,
  lang,
  className = '',
  eager = false,
  retryable = false,
}: {
  src: string;
  alt: string;
  lang: Lang;
  className?: string;
  eager?: boolean;
  retryable?: boolean;
}) {
  // 手機網路一閃斷就會讓單張圖失敗；先自動重試兩次（間隔 0.6、1.2 秒，網址加 retry 參數避開快取到的失敗），
  // 還是不行才顯示「圖片暫時無法載入」。2026-11-20 選擇器小圖卡在失敗畫面、但伺服器上的檔案其實是好的。
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    setFailed(false);
    setAttempt(0);
    setWaiting(false);
    window.clearTimeout(timer.current);
  }, [src]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const url = attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}retry=${attempt}`;
  const onError = () => {
    if (attempt < AUTO_RETRIES) {
      setWaiting(true);
      timer.current = window.setTimeout(() => {
        setWaiting(false);
        setAttempt((v) => v + 1);
      }, 600 * (attempt + 1));
    } else setFailed(true);
  };
  return failed ? (
    <div className={`image-fallback ${className}`}>
      <Info size={22} />
      <span>{copy[lang].imageError}</span>
      {retryable && (
        <button
          onClick={() => {
            setFailed(false);
            setAttempt((v) => v + 1);
          }}
        >
          {copy[lang].retryImage}
        </button>
      )}
    </div>
  ) : (
    <img
      key={`${src}-${attempt}`}
      className={className}
      src={url}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      style={waiting ? { visibility: 'hidden' } : undefined}
      onError={onError}
    />
  );
}

const AUTO_RETRIES = 2;

export function Modal({
  children,
  onClose,
  label,
  className = '',
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current!;
    const originalOverflow = document.body.style.overflow;
    dialog.showModal();
    // showModal 會把焦點移到第一個按鈕並捲過去；內容比視窗高時（例如髮型、同臉髮型的詳細頁）
    // 那顆按鈕在大圖下方，一打開就看不到圖上半部 → 打開時一律從頂端開始
    dialog.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = originalOverflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={className}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close.current();
      }}
    >
      <div className="modal-inner">{children}</div>
    </dialog>
  );
}
