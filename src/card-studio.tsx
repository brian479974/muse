// 參考圖卡工作台：挑姿勢／服裝／人物 → 即時預覽圖卡 → 下載圖卡＋複製英文提示詞，
// 拿去 ChatGPT 生成。整個流程只在瀏覽器裡完成，不連任何生圖服務、不需要金鑰。
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ClipboardCopy,
  Download,
  ImagePlus,
  LoaderCircle,
  Plus,
  RotateCcw,
  Shuffle,
  X,
} from 'lucide-react';
import { generationCopy } from './generation-copy';
import { studioCopy } from './studio-copy';
import type { ImageReference } from './generation';
import { copy } from './i18n';
import { hasPoseDepth } from './pose-depth';
import { Modal, RemoteImage } from './ui';
import type { Kind, Lang, Reference } from './types';
import {
  kinds,
  referenceFingerprint,
  referenceIcons,
  ReferencePicker,
  styleKeys,
} from './reference-picker';
import type { Style } from './reference-picker';
import { aspectKeys, buildCardPrompt, renderReferenceCard } from './reference-card';
import type { Aspect } from './reference-card';

export function CardStudio({
  lang,
  references,
  items,
  poseItem,
  characterLoading,
  characterError,
  poseDepth,
  onDepth,
  onChoose,
  onRemove,
  onAngle,
  onUpload,
  notify,
}: {
  lang: Lang;
  references: ImageReference[];
  items: Reference[];
  poseItem?: Reference;
  characterLoading: boolean;
  characterError: string;
  poseDepth: boolean;
  onDepth: (value: boolean) => void;
  onChoose: (item: Reference, angle?: string) => void;
  onRemove: (kind: Kind) => void;
  onAngle: (angle: string) => void;
  onUpload: (file: File, kind: 'character' | 'costume') => void;
  notify: (message: string) => void;
}) {
  const t = studioCopy[lang],
    g = generationCopy[lang];
  const [picker, setPicker] = useState<Kind | null>(null);
  const [style, setStyle] = useState<Style>('follow');
  const [aspect, setAspect] = useState<Aspect>('portrait');
  const [notes, setNotes] = useState('');
  const [customPrompt, setCustomPrompt] = useState<{ text: string; references: string } | null>(
    null,
  );
  const [card, setCard] = useState<{ url: string; blob: Blob; key: string } | null>(null);
  const [rendering, setRendering] = useState(false);
  const [cardError, setCardError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);
  const fileInputs = useRef<Partial<Record<'character' | 'costume', HTMLInputElement | null>>>({});

  const missing = kinds.filter(
    (kind) => kind !== 'character' && !references.some((ref) => ref.kind === kind),
  );
  const fingerprint = referenceFingerprint(references);
  const autoPrompt = useMemo(
    () => buildCardPrompt(references, { style, aspect, notes }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fingerprint, style, aspect, notes],
  );
  const customActive = customPrompt?.references === fingerprint;
  const prompt = customActive ? customPrompt.text : autoPrompt;
  const ready = missing.length === 0 && !!prompt.trim() && !characterLoading;
  const cardKey = `${fingerprint}\n${prompt}\n${retry}`;

  // 參考或提示詞變動後，停 0.4 秒再重畫圖卡，避免連續輸入時一直重畫
  useEffect(() => {
    if (!ready) {
      setCard(null);
      setRendering(false);
      setCardError(false);
      return;
    }
    let cancelled = false;
    setRendering(true);
    setCardError(false);
    const timer = setTimeout(() => {
      renderReferenceCard(references, prompt)
        .then((blob) => {
          if (cancelled) return;
          setCard({ url: URL.createObjectURL(blob), blob, key: cardKey });
        })
        .catch(() => {
          if (!cancelled) setCardError(true);
        })
        .finally(() => {
          if (!cancelled) setRendering(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey, ready]);
  // 換新圖卡或離開頁面時釋放舊的預覽網址
  useEffect(
    () => () => {
      if (card) URL.revokeObjectURL(card.url);
    },
    [card],
  );
  useEffect(() => setCopied(false), [prompt]);

  function downloadCard() {
    if (!card) return;
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    link.href = card.url;
    link.download = `muse-reference-card-${stamp}.jpg`;
    link.click();
  }
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      notify(t.promptCopied);
    } catch {
      window.prompt(t.copyPrompt, prompt);
    }
  }
  function randomize() {
    for (const kind of kinds) {
      const candidates = items.filter((item) => item.kind === kind);
      const current = references.find((reference) => reference.kind === kind);
      const alternatives = candidates.filter(
        (item) => !item.variants.some((variant) => variant.original === current?.variant.original),
      );
      const pool = alternatives.length ? alternatives : candidates;
      if (pool.length) onChoose(pool[Math.floor(Math.random() * pool.length)]);
    }
    setCustomPrompt(null);
  }

  return (
    <section className="image-studio card-studio" aria-label={t.title}>
      <div className="studio-heading">
        <div>
          <span className="section-kicker">REFERENCE CARD</span>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
      </div>
      <div className="studio-layout">
        <section className="studio-controls" aria-label={t.references}>
          <div className="studio-section-heading">
            <h2>{t.references}</h2>
            <button
              type="button"
              className="studio-randomize"
              disabled={characterLoading}
              onClick={randomize}
            >
              <Shuffle size={13} />
              {t.randomize}
            </button>
          </div>
          <div className="studio-reference-slots">
            {kinds.map((kind) => {
              const ref = references.find((value) => value.kind === kind),
                Icon = referenceIcons[kind];
              const upload = (file: File | undefined) => {
                if (kind === 'pose' || !file) return;
                onUpload(file, kind);
                setCustomPrompt(null);
              };
              return (
                <div
                  className="studio-reference-slot"
                  key={kind}
                  onDragOver={(event) => {
                    if (kind !== 'pose') event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    upload(event.dataTransfer.files[0]);
                  }}
                  onPaste={(event) => {
                    const file = event.clipboardData.files[0];
                    if (kind !== 'pose' && file) {
                      event.preventDefault();
                      upload(file);
                    }
                  }}
                >
                  <button
                    className={`studio-slot-image ${ref ? 'filled' : ''}`}
                    aria-label={`${t.choose} ${g[kind]}`}
                    onClick={() => setPicker(kind)}
                  >
                    {ref ? (
                      <RemoteImage src={ref.variant.thumbnail} alt={ref.title[lang]} lang={lang} eager />
                    ) : (
                      <span>
                        <Icon size={27} strokeWidth={1.3} />
                        <Plus size={13} />
                      </span>
                    )}
                    <span className="studio-slot-replace">
                      <Plus size={12} />
                    </span>
                  </button>
                  <div className="studio-slot-label">
                    <strong>{g[kind]}</strong>
                    <small>{kind === 'character' ? t.optional : t.required}</small>
                  </div>
                  <div className="studio-slot-caption">
                    <span>{ref ? ref.title[lang] : t.choose}</span>
                    {ref && (
                      <button
                        className="icon-button"
                        aria-label={`${t.remove}: ${g[kind]}`}
                        onClick={() => {
                          onRemove(kind);
                          setCustomPrompt(null);
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  {kind !== 'pose' && (
                    <>
                      <input
                        ref={(input) => {
                          fileInputs.current[kind] = input;
                        }}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        disabled={characterLoading}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          upload(file);
                        }}
                      />
                      <button
                        className="studio-upload-button"
                        disabled={characterLoading}
                        onClick={() => fileInputs.current[kind]?.click()}
                      >
                        <ImagePlus size={12} />
                        {kind === 'costume' ? t.uploadCostume : t.upload}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <p className="studio-upload-note">{t.uploadHint}</p>
          {characterError && (
            <p className="studio-inline-error" role="alert">
              {g[characterError as keyof typeof g] || characterError}
            </p>
          )}
          <div className="studio-pose-options">
            <label className="studio-depth" title={copy[lang].depthHint}>
              <input
                type="checkbox"
                checked={poseDepth}
                disabled={!poseDepth && (!poseItem || !hasPoseDepth(poseItem))}
                onChange={(e) => {
                  onDepth(e.target.checked);
                  setCustomPrompt(null);
                }}
              />
              <span>{t.depth}</span>
            </label>
            {poseItem && !hasPoseDepth(poseItem) && (
              <small className="depth-availability-note">{copy[lang].noDepth}</small>
            )}
            {poseItem && poseItem.variants.length > 1 && (
              <label className="studio-angle">
                {t.angle}
                <select
                  aria-label={t.angle}
                  value={references.find((ref) => ref.kind === 'pose')?.variant.angle || 'front'}
                  onChange={(e) => {
                    onAngle(e.target.value);
                    setCustomPrompt(null);
                  }}
                >
                  {poseItem.variants.map((variant) => (
                    <option key={variant.id} value={variant.angle}>
                      {variant.label[lang]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="studio-controls-divider" />
          <div className="studio-section-heading">
            <h2>{t.style}</h2>
            <span>{t.optional}</span>
          </div>
          <div className="studio-styles">
            {styleKeys.map((key) => (
              <button
                key={key}
                aria-pressed={style === key}
                onClick={() => {
                  setStyle(key);
                  setCustomPrompt(null);
                }}
              >
                {t[key]}
              </button>
            ))}
          </div>
          <label className="studio-field-label" htmlFor="studio-aspect">
            {t.aspect}
          </label>
          <select
            id="studio-aspect"
            className="studio-select"
            value={aspect}
            onChange={(e) => {
              setAspect(e.target.value as Aspect);
              setCustomPrompt(null);
            }}
          >
            {aspectKeys.map((key) => (
              <option key={key} value={key}>
                {t[key]}
              </option>
            ))}
          </select>
          <label className="studio-field-label" htmlFor="studio-extra">
            {t.extra}
            <small>{t.optional}</small>
          </label>
          <textarea
            id="studio-extra"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setCustomPrompt(null);
            }}
            placeholder={t.extraHint}
            rows={3}
          />
          <details className="studio-advanced">
            <summary>
              {t.advanced}
              {customActive && <small>{t.customPrompt}</small>}
            </summary>
            <label className="studio-field-label" htmlFor="studio-prompt">
              {t.promptLabel}
            </label>
            <textarea
              id="studio-prompt"
              value={prompt}
              rows={9}
              onChange={(e) => setCustomPrompt({ text: e.target.value, references: fingerprint })}
            />
            <button className="text-action" onClick={() => setCustomPrompt(null)}>
              <RotateCcw size={13} />
              {t.resetPrompt}
            </button>
          </details>
        </section>

        <section className="studio-result card-result" aria-label={t.cardPreview}>
          <div className="card-preview">
            {!ready ? (
              <div className="studio-placeholder studio-empty">
                <div className="studio-empty-composition">
                  {kinds.map((kind, index) => {
                    const ref = references.find((value) => value.kind === kind),
                      Icon = referenceIcons[kind];
                    return (
                      <div key={kind}>
                        {index > 0 && <Plus size={14} />}
                        <button onClick={() => setPicker(kind)} aria-label={`${t.choose} ${g[kind]}`}>
                          {ref ? (
                            <RemoteImage src={ref.variant.thumbnail} alt={ref.title[lang]} lang={lang} />
                          ) : (
                            <Icon size={29} strokeWidth={1.2} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <h2>{t.emptyTitle}</h2>
                <p>
                  {missing.length
                    ? `${t.missing}${missing.map((kind) => g[kind]).join('、')}`
                    : t.emptyHint}
                </p>
              </div>
            ) : cardError ? (
              <div className="studio-placeholder studio-failed" role="alert">
                <h2>{t.cardFailed}</h2>
                <p>{t.cardFailedHint}</p>
                <button className="secondary-button" onClick={() => setRetry((n) => n + 1)}>
                  <RotateCcw size={15} />
                  {t.cardRetry}
                </button>
              </div>
            ) : card ? (
              <button
                className={`card-preview-image ${rendering ? 'is-updating' : ''}`}
                onClick={() => setPreview(true)}
                aria-label={t.cardPreview}
              >
                <img src={card.url} alt={t.cardPreview} />
              </button>
            ) : (
              <div className="studio-placeholder" role="status">
                <LoaderCircle size={31} className="spinner" />
                <h2>{t.cardRendering}</h2>
              </div>
            )}
          </div>
          <div className="card-actions">
            <button
              className="primary-button"
              disabled={!card || rendering || cardError}
              onClick={downloadCard}
            >
              {rendering ? <LoaderCircle size={17} className="spinner" /> : <Download size={17} />}
              {t.downloadCard}
            </button>
            <button className="secondary-button" disabled={!ready} onClick={() => void copyPrompt()}>
              {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
              {copied ? t.promptCopied : t.copyPrompt}
            </button>
          </div>
          <ol className="card-steps">
            <li>{t.step1}</li>
            <li>{t.step2}</li>
            <li>{t.step3}</li>
          </ol>
          <p className="studio-settings-note">{t.privacyNote}</p>
        </section>
      </div>
      {picker && (
        <ReferencePicker
          kind={picker}
          items={items}
          lang={lang}
          poseDepth={poseDepth}
          depthDisabled={false}
          onDepth={(value) => {
            onDepth(value);
            setCustomPrompt(null);
          }}
          onChoose={(item, angle) => {
            onChoose(item, angle);
            setCustomPrompt(null);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {preview && card && (
        <Modal onClose={() => setPreview(false)} label={t.cardPreview} className="card-lightbox">
          <div className="panel-heading">
            <h2>{t.cardPreview}</h2>
            <button className="icon-button" aria-label={g.close} onClick={() => setPreview(false)}>
              <X size={21} />
            </button>
          </div>
          <img src={card.url} alt={t.cardPreview} />
        </Modal>
      )}
    </section>
  );
}
