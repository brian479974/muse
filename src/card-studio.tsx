// 參考圖卡工作台：挑姿勢／服裝／人物 → 即時預覽圖卡 → 下載圖卡＋複製英文提示詞，
// 拿去 ChatGPT 生成。整個流程只在瀏覽器裡完成，不連任何生圖服務、不需要金鑰。
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ClipboardCopy,
  Download,
  ImagePlus,
  LoaderCircle,
  Lock,
  LockOpen,
  Plus,
  RotateCcw,
  Shuffle,
  X,
} from 'lucide-react';
import { generationCopy } from './generation-copy';
import { studioCopy } from './studio-copy';
import type { ImageReference, UploadKind } from './generation';
import { copy } from './i18n';
import { genderCompatible, genderOf } from './library';
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
import { aspectKeys, buildCardPrompt, promptLangs, renderReferenceCard } from './reference-card';
import type { Aspect } from './reference-card';
import { track, trackHairColor } from './stats';
import { HairColorSelect, HairColorSwatches } from './hairstyle-ui';
import { recommendedHairColor } from './hair-colors';

const optionalKinds: Kind[] = ['character', 'hairstyle'];
const noLocks: Record<Kind, boolean> = { pose: false, costume: false, character: false, hairstyle: false };
/** 髮型性別（f／m）對人物性別（female／male） */
const hairGender = (item: Reference) =>
  item.hairstyle?.gender === 'f' ? 'female' : item.hairstyle?.gender === 'm' ? 'male' : null;

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
  hairstyleItem,
  hairColorKey,
  onHairColor,
  hairUploadColor,
  onHairUploadColor,
  hairAngle,
  onHairAngle,
  hairPending,
  pickerRequest,
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
  onUpload: (file: File, kind: UploadKind) => void;
  notify: (message: string) => void;
  /** 搭配台上的圖庫髮型（上傳的髮型照不算） */
  hairstyleItem?: Reference;
  /** 圖庫髮型目前的色票（預設推薦色） */
  hairColorKey?: string;
  onHairColor: (key: string) => void;
  /** 上傳髮型照選的髮色（''＝照片原色） */
  hairUploadColor: string;
  onHairUploadColor: (key: string) => void;
  hairAngle: string;
  onHairAngle: (angle: string) => void;
  /** 髮型換色中：圖卡等換好再排 */
  hairPending: boolean;
  /** 外面要求打開某類挑選視窗（人物詳細頁「放進搭配台，髮型另挑」） */
  pickerRequest?: { kind: Kind; nonce: number };
}) {
  const t = studioCopy[lang],
    g = generationCopy[lang];
  const [picker, setPicker] = useState<Kind | null>(null);
  const [style, setStyle] = useState<Style>('follow');
  const [aspect, setAspect] = useState<Aspect>('portrait');
  const [promptLang, setPromptLang] = useState<Lang>('en');
  const [locks, setLocks] = useState<Record<Kind, boolean>>(noLocks);
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
  const fileInputs = useRef<Partial<Record<UploadKind, HTMLInputElement | null>>>({});
  useEffect(() => {
    if (pickerRequest) setPicker(pickerRequest.kind);
  }, [pickerRequest]);

  const missing = kinds.filter(
    (kind) => !optionalKinds.includes(kind) && !references.some((ref) => ref.kind === kind),
  );
  const hairRef = references.find((ref) => ref.kind === 'hairstyle');
  // 髮色也算進指紋：上傳的髮型照換髮色選單時，提示詞要跟著重算
  const fingerprint = `${referenceFingerprint(references)}|${hairRef?.hairColor?.key || ''}`;
  const autoPrompt = useMemo(
    () => buildCardPrompt(references, { style, aspect, notes, lang: promptLang }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fingerprint, style, aspect, notes, promptLang],
  );
  const customActive = customPrompt?.references === fingerprint;
  const prompt = customActive ? customPrompt.text : autoPrompt;
  const ready = missing.length === 0 && !!prompt.trim() && !characterLoading && !hairPending;
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
    // 匿名統計：圖卡裡的圖庫參考各 +1（使用者上傳的圖不回報）；有髮型時另記用到的髮色
    track('card', kinds.map(boardItem));
    trackHairColor(hairRef?.hairColor?.key);
  }
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      track('prompt', kinds.map(boardItem));
      trackHairColor(hairRef?.hairColor?.key);
      setCopied(true);
      notify(t.promptCopied);
    } catch {
      window.prompt(t.copyPrompt, prompt);
    }
  }
  // 目前搭配台上的圖庫項目（上傳的圖沒有性別資訊，回傳 undefined）
  function boardItem(kind: Kind): Reference | undefined {
    const ref = references.find((value) => value.kind === kind);
    if (!ref || 'file' in ref) return undefined;
    return items.find(
      (item) =>
        item.kind === kind &&
        item.variants.some((v) => v.id === ref.variant.id || v.original === ref.variant.original),
    );
  }
  const currentCharacter = boardItem('character');
  const currentCostume = boardItem('costume');
  // 挑選視窗只列出能跟對方搭配的項目
  const pickerItems =
    picker === 'costume' && currentCharacter
      ? items.filter((item) => item.kind !== 'costume' || genderCompatible(item, currentCharacter))
      : picker === 'character' && currentCostume
        ? items.filter((item) => item.kind !== 'character' || genderCompatible(item, currentCostume))
        : items;
  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
  // 隨機搭配：先抽人物，再從能搭配的服裝、同性別的姿勢與髮型裡抽；鎖定的格子保持不變（空的也不補）
  function randomize() {
    const others = (kind: Kind) => {
      const current = references.find((reference) => reference.kind === kind);
      const all = items.filter((item) => item.kind === kind);
      const rest = all.filter(
        (item) =>
          !item.variants.some(
            (variant) =>
              variant.original === current?.variant.original || variant.id === current?.variant.id,
          ),
      );
      return rest.length ? rest : all;
    };
    // 鎖住的服裝是圖庫的，抽人物時只抽能搭配的（不然換人物會把鎖住的服裝移掉）
    const lockedCostume = locks.costume ? currentCostume : undefined;
    const candidates = others('character').filter(
      (item) => !lockedCostume || genderCompatible(item, lockedCostume),
    );
    const character = locks.character ? currentCharacter : pick(candidates);
    if (!locks.character && !character) return;
    const gender = character ? genderOf(character) : null;
    if (!locks.character && character) onChoose(character);
    if (!locks.costume) {
      const costumes = others('costume').filter(
        (item) => !character || genderCompatible(item, character),
      );
      if (costumes.length) onChoose(pick(costumes));
    }
    if (!locks.pose) {
      const sameGenderPoses = others('pose').filter((item) => !gender || genderOf(item) === gender);
      const poses = sameGenderPoses.length ? sameGenderPoses : others('pose');
      if (poses.length) onChoose(pick(poses));
    }
    if (!locks.hairstyle) {
      const sameGenderHair = others('hairstyle').filter(
        (item) => !gender || gender === 'unisex' || hairGender(item) === gender,
      );
      const hairstyles = sameGenderHair.length ? sameGenderHair : others('hairstyle');
      if (hairstyles.length) onChoose(pick(hairstyles));
    }
    setCustomPrompt(null);
  }
  const toggleLock = (kind: Kind) => setLocks((current) => ({ ...current, [kind]: !current[kind] }));

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
              const locked = locks[kind];
              return (
                <div
                  className={`studio-reference-slot ${locked ? 'locked' : ''}`}
                  key={kind}
                  data-kind={kind}
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
                    {kind === 'hairstyle' && hairPending && (
                      <span className="studio-slot-busy" role="status" aria-label={copy[lang].recoloring}>
                        <LoaderCircle size={18} className="spinner" />
                      </span>
                    )}
                    <span className="studio-slot-replace">
                      <Plus size={12} />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`studio-slot-lock ${locked ? 'active' : ''}`}
                    aria-pressed={locked}
                    aria-label={`${locked ? t.unlock : t.lock}: ${g[kind]}`}
                    title={locked ? t.unlock : t.lock}
                    onClick={() => toggleLock(kind)}
                  >
                    {locked ? <Lock size={12} /> : <LockOpen size={12} />}
                  </button>
                  <div className="studio-slot-label">
                    <strong>{g[kind]}</strong>
                    <small>{optionalKinds.includes(kind) ? t.optional : t.required}</small>
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
                        {kind === 'costume'
                          ? t.uploadCostume
                          : kind === 'hairstyle'
                            ? t.uploadHairstyle
                            : t.upload}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {hairRef && (
            <div className="studio-hair-options">
              {hairstyleItem ? (
                <>
                  <div className="studio-hair-heading">
                    <strong>{t.hairColor}</strong>
                    {hairstyleItem.variants.length > 1 && (
                      <label className="studio-angle">
                        {t.hairAngle}
                        <select
                          aria-label={t.hairAngle}
                          value={hairAngle}
                          onChange={(e) => {
                            onHairAngle(e.target.value);
                            setCustomPrompt(null);
                          }}
                        >
                          {hairstyleItem.variants.map((variant) => (
                            <option key={variant.id} value={variant.angle}>
                              {variant.label[lang]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <HairColorSwatches
                    compact
                    lang={lang}
                    value={hairColorKey}
                    recommended={recommendedHairColor(hairstyleItem)?.key}
                    onChange={(key) => {
                      onHairColor(key);
                      setCustomPrompt(null);
                    }}
                  />
                </>
              ) : (
                <>
                  <label className="studio-hair-heading" htmlFor="studio-hair-upload-color">
                    <strong>{t.hairColor}</strong>
                  </label>
                  <HairColorSelect
                    id="studio-hair-upload-color"
                    lang={lang}
                    label={t.hairColor}
                    photoLabel={t.hairPhotoColor}
                    value={hairUploadColor}
                    onChange={(key) => {
                      onHairUploadColor(key);
                      setCustomPrompt(null);
                    }}
                  />
                  <p className="studio-upload-note">{t.hairUploadColorHint}</p>
                </>
              )}
            </div>
          )}
          <p className="studio-upload-note">{t.uploadHint}</p>
          <p className="studio-upload-note">{t.genderHint}</p>
          <p className="studio-upload-note">{t.randomizeHint}</p>
          <p className="studio-upload-note">{t.uploadConsent}</p>
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
          <label className="studio-field-label" htmlFor="studio-prompt-lang">
            {t.promptLanguage}
          </label>
          <select
            id="studio-prompt-lang"
            className="studio-select"
            value={promptLang}
            onChange={(e) => {
              setPromptLang(e.target.value as Lang);
              setCustomPrompt(null);
            }}
          >
            {promptLangs.map((key) => (
              <option key={key} value={key} lang={key === 'zh' ? 'zh-CN' : key === 'tw' ? 'zh-TW' : 'en'}>
                {key === 'en' ? 'English' : key === 'tw' ? '繁體中文' : '简体中文'}
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
              {promptLang === 'en' ? t.promptLabel : t.promptLabelLocal}
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
          <details className="studio-face-tips">
            <summary>{copy[lang].aboutFaceTitle}</summary>
            <ul>
              {copy[lang].aboutFaceTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </details>
          <p className="studio-settings-note">{t.privacyNote}</p>
        </section>
      </div>
      {picker && (
        <ReferencePicker
          kind={picker}
          items={pickerItems}
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
