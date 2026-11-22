# Muse 繆思

姿勢、服裝與人物參考圖庫，可以把三種參考組合起來一鍵生成角色圖。改編自開源專案 open-pose-costume（非官方版本）。

- 網站：https://muse.toai.tw/
- 原專案：https://github.com/hongye007/open-pose-costume（作者 hongye007 · [@HongyeMain](https://x.com/HongyeMain)）
- 原站：https://omilic.com/

## 跟原站的差別

- **介面三語**：簡／繁／EN 三個獨立按鈕切換；繁體由 `scripts/zh-hant.mjs`（OpenCC 片語級轉換＋台灣用語修正）產生，介面字典用 `scripts/gen-tw-copy.mjs`、素材清單用 `scripts/mirror-filter.mjs` 自動補上。
- **外觀改版（鼠尾草綠）**：淺鼠尾草綠底、墨綠主色、金色點綴、襯線大標；桌機改為上方導覽；首頁加入動畫主視覺、圖片跑馬燈、三大分類卡與三步驟圖解（`src/home-showcase.tsx`）。配色由 `scripts/apply-theme.py` 依 `scripts/theme-sage.json` 對應原站淺色樣式產生，新版面與動畫在 `src/theme-sage.css`。新名稱 Muse 繆思與新 Logo（`public/brand/logo-mark.svg`）。

- **Muse 自製素材（44 筆）**：男性人物 16、男性姿勢線稿 16、男裝 12（2026-11-06，Codex 與 Grok 生成的虛構成人角色與隱形人台服裝照，逐張檢查後上架），圖片在 `public/muse-assets/`、資料在 `data/muse-extras.json`，由 `scripts/mirror-filter.mjs` 併入素材清單。
- **不收錄原站自建素材**：原專案 `public/custom/` 的自建服飾、姿勢、人物圖片（及其衍生圖）授權條款禁止在其他倉庫或網站再發布，所以全部移除；首頁示意圖也改用上游圖庫的公開圖片。
- **不收錄擴展分類**：內衣、泳裝、曲線、雙人等擴展分類不收錄，對應的開關與「素材庫」篩選一併隱藏。
- **參考圖卡取代一鍵生圖（安全考量）**：網站不再呼叫任何生圖 API、不存任何金鑰，也沒有轉送伺服器。搭配台挑好姿勢／服裝／人物後，瀏覽器在本機把三張參考圖＋英文提示詞排成一張圖卡（`src/reference-card.ts`），使用者下載圖卡、複製提示詞，自己貼到 ChatGPT 生成。提示詞註明圖庫人物為 AI 生成的虛構成人角色、要求完整著裝，避免被平台擋下。舊版存在瀏覽器的金鑰與生成紀錄，開站時會自動清除。
- **內容安全政策（CSP）**：正式版只允許本站程式與五個上游圖庫的圖片；對外連線只多放行匿名使用次數統計服務，其他網站一律不准連。
- **匿名使用次數與熱門排行（2026-11-16）**：下載圖卡、下載原圖、複製提示詞時，只回報「哪張圖庫參考、哪個動作」到 Cloudflare Worker（`worker/`，D1 資料庫 `muse-stats`），不記 IP、不設 cookie，使用者上傳的圖不回報（`src/stats.ts`）。首頁「熱門參考」依「放進圖卡並下載」次數列姿勢／服裝／人物各前 10 名（某類被用過的參考不到 3 張就不列），圖庫排序多一個「熱門」。計數服務 3 秒沒回應就改用這台瀏覽器上次存的排行。只有正式網址會回報，本機開發與預覽不灌數字。
- **使用說明補兩段（2026-11-16）**：「讓 AI 每次生出同一張臉」四個做法（圖卡頁也有），以及「不得用來冒充真實人物」。
- **髮型參考與即時換色（2026-11-22）**：第四類「髮型」分頁（性別／長度／型態／瀏海／風格篩選，正面／側面／背面三視角），資料在 `data/muse-extras.json`（`kind: "hairstyle"`，每個角度附頭髮遮罩 `mask`）、篩選選項在 `data/hairstyle-facets.json`、16 色色票在 `data/hair-colors.json`（單一來源）。詳細頁與參考圖卡的髮型格有色票列，點了在瀏覽器裡用 image＋mask 即時換色（`src/hair-recolor.ts`，演算法照搬已驗證的 hair-recolor.js），選推薦色＝原圖；下載的髮型圖與圖卡都用換色後的圖（PNG 文字欄位記錄髮色）。參考圖卡第四格可挑髮型或上傳髮型照（上傳的只給髮色選單）；有髮型時提示詞改成不採用人物參考的髮型、加髮型句與髮色句，提示詞可切英文（預設）／繁中／簡中。隨機搭配會抽髮型，四格都可鎖定。人物詳細頁列出同一張臉的 5 種髮型。分享網址 `?hair=<髮型 id 或編號>&haircolor=<色票 key>`；人物髮長篩選改寫成 `?hairlen=`（舊連結的 `?hair=long` 照樣能用）。
- **不給搜尋引擎收錄**（`noindex`）。

素材清單由 `scripts/mirror-filter.mjs` 從原站清單過濾產生，並檢查所有圖片都指向上游圖庫。

## 授權與素材來源

- 程式碼：MIT（見 [LICENSE](LICENSE)，著作權屬原專案貢獻者）。
- 參考圖片：瀏覽時由瀏覽器直接從各原作者網站載入，本倉庫不存放這些圖檔；著作權屬原作者，僅供個人非商業用途。來源見 [SOURCES.md](SOURCES.md) 與 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 本機開發

```bash
npm ci
npm run dev        # http://127.0.0.1:5199/
npm run build      # 輸出到 dist/（網域根目錄）
```

推到 `main` 後由 GitHub Actions 自動建置並部署到 GitHub Pages。

## 匿名計數服務（worker/）

- 部署在 Cloudflare Workers：https://muse-stats.brian479974.workers.dev（`POST /hit` 回報、`GET /stats` 取排行）
- 資料表見 `worker/schema.sql`：`hits`（每張參考 × 動作的次數）、`daily`（每天每種動作的總次數，日期為 UTC）、`snapshot`（排行快照，5 分鐘重算一次）
- 改程式後重新部署：`npm run worker:deploy`（需先 `npx wrangler login`）
- 2026-11-22 起多收髮型（類型 `hairstyle`、`haircolor`；動作 `color`＝用到哪個髮色、`recolor`＝在哪款髮型試了別的顏色）。網站把髮型那筆分開送，計數服務重新部署前只有髮型那筆會被拒，姿勢／服裝／人物照常計數
