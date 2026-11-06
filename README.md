# Muse 繆思

姿勢、服裝與人物參考圖庫，可以把三種參考組合起來一鍵生成角色圖。改編自開源專案 open-pose-costume（非官方版本）。

- 網站：https://brian479974.github.io/muse/
- 原專案：https://github.com/hongye007/open-pose-costume（作者 hongye007 · [@HongyeMain](https://x.com/HongyeMain)）
- 原站：https://omilic.com/

## 跟原站的差別

- **介面三語**：簡／繁／EN 三個獨立按鈕切換；繁體由 `scripts/zh-hant.mjs`（OpenCC 片語級轉換＋台灣用語修正）產生，介面字典用 `scripts/gen-tw-copy.mjs`、素材清單用 `scripts/mirror-filter.mjs` 自動補上。
- **外觀改版**：暗色藝廊配色（顏色由 `scripts/apply-theme.py` 依 `scripts/theme-gallery-dark.json` 整批對應產生）、新名稱 Muse 繆思與新 Logo（`public/brand/logo-mark.svg`）。

- **不收錄原站自建素材**：原專案 `public/custom/` 的自建服飾、姿勢、人物圖片（及其衍生圖）授權條款禁止在其他倉庫或網站再發布，所以全部移除；首頁示意圖也改用上游圖庫的公開圖片。
- **不收錄擴展分類**：內衣、泳裝、曲線、雙人等擴展分類不收錄，對應的開關與「素材庫」篩選一併隱藏。
- **參考圖卡取代一鍵生圖（安全考量）**：網站不再呼叫任何生圖 API、不存任何金鑰，也沒有轉送伺服器。搭配台挑好姿勢／服裝／人物後，瀏覽器在本機把三張參考圖＋英文提示詞排成一張圖卡（`src/reference-card.ts`），使用者下載圖卡、複製提示詞，自己貼到 ChatGPT 生成。提示詞註明圖庫人物為 AI 生成的虛構成人角色、要求完整著裝，避免被平台擋下。舊版存在瀏覽器的金鑰與生成紀錄，開站時會自動清除。
- **內容安全政策（CSP）**：正式版只允許本站程式與五個上游圖庫的圖片，不允許連到其他網站。
- **不給搜尋引擎收錄**（`noindex`）。

素材清單由 `scripts/mirror-filter.mjs` 從原站清單過濾產生，並檢查所有圖片都指向上游圖庫。

## 授權與素材來源

- 程式碼：MIT（見 [LICENSE](LICENSE)，著作權屬原專案貢獻者）。
- 參考圖片：瀏覽時由瀏覽器直接從各原作者網站載入，本倉庫不存放這些圖檔；著作權屬原作者，僅供個人非商業用途。來源見 [SOURCES.md](SOURCES.md) 與 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 本機開發

```bash
npm ci
npm run dev        # http://127.0.0.1:5199/
npm run build      # 輸出到 dist/，子路徑 /muse/
```

推到 `main` 後由 GitHub Actions 自動建置並部署到 GitHub Pages。
