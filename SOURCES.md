# Sources / 素材来源

## Muse 繆思現況（2026-11-22）— 以這段為準

網站上「關於與聲明」的「網站聲明」是給訪客看的完整版（三語，文案在 `src/i18n.ts` 的 `legalSections`，連結在 `src/site-notice.tsx`）。這裡是給維護者的對照：

- **非營利**：個人發起，免費、不用註冊、無廣告、不販售素材或服務。
- **開源**：程式碼 MIT（見 `LICENSE`），改建自 [hongye007/open-pose-costume](https://github.com/hongye007/open-pose-costume)。開源只涵蓋程式碼，不涵蓋參考圖片。
- **外部圖庫（圖片由原站直接載入，不轉存、不修改）**
  - 寫實服裝 [AI Costume Gallery](https://ai-costume-gallery.pages.dev/)、動漫服裝 [AI Costume Anime Gallery](https://ai-costume-anime-gallery.pages.dev/) — 作者 ギア（https://x.com/giaaibusi）
  - 人物 [AI Portrait Gallery](https://ai-portrait-gallery.pages.dev/) — 作者 あぎ（https://x.com/agi_aibusi），原站標示 CC0 1.0，同時請求不要轉載、再散布
  - 姿勢編號與名稱沿用 [AI Pose Gallery](https://ai-pose-gallery.pages.dev/)（ギア）；中文名稱參考 [anhao/ai-pose-gallery-zh](https://github.com/anhao/ai-pose-gallery-zh)（MIT，資料部分屬原作者，見 `THIRD_PARTY_NOTICES.md`）
  - 原站規則：可免費用於作品創作（含商業、編輯、參考）；禁止圖片本身（含加工後）轉載、再散布、販售；部分原站另禁止整批下載（含程式自動抓取）
- **Muse 自製（`public/muse-assets/`，每張的工具與日期記在 `data/muse-extras.json` 的 `provenance`）**
  - 姿勢：全部自製。線稿 OpenAI GPT Image（6 組早期用 Grok）；深度圖 Depth Anything V2 **Large**
  - 服裝：隱形人台照，OpenAI GPT Image／Z-Image Turbo（Apache-2.0）／少數 Grok
  - 人物：虛構成年人，Z-Image Turbo、FLUX.2 klein 4B（Apache-2.0）、Qwen Image（Apache-2.0）、OpenAI GPT Image、Grok
  - 髮型：OpenAI GPT Image 三視角，頭髮遮罩 SAM 3
  - 使用規則比照原站：可免費用於作品創作（含商業）；禁止圖片本身整批下載、轉載、再散布、販售
- ⚠️ **深度圖限非商業**：Depth Anything V2 Large 權重是 CC BY-NC 4.0（Small 才是 Apache-2.0），網站聲明寫明深度圖只供非商業用途。若要解除，得用 Small 重產全部深度圖（畫面會變，需 Brian 決定）。
- **隱私**：無帳號、無 cookie、不存 IP；匿名計數只存「參考編號 × 動作 × 次數」與每日總數（`worker/schema.sql`）。上傳圖只在瀏覽器裡用。
- **移除申請**：GitHub Issues（https://github.com/brian479974/muse/issues），確認後儘快移除。
- 下方以 hongye007 原專案的紀錄為主，其中「自建扩展」那批（Atomflow 重繪的 42 套服飾、24 組姿勢、28 張人物）**Muse 沒有收錄**；`data/custom/`、`public/custom/` 在 Muse 不存在。

---

## 原專案紀錄（open-pose-costume，保留供查）

Portrait metadata, WebP thumbnails and PNG originals: https://ai-portrait-gallery.pages.dev/ — creator: あぎ · https://x.com/agi_aibusi

| Dataset                                                          | Source                                      | Creator                        |
| ---------------------------------------------------------------- | ------------------------------------------- | ------------------------------ |
| Pose metadata (IDs, names, categories)                           | https://ai-pose-gallery.pages.dev/          | ギア · https://x.com/giaaibusi |
| Pose line art and depth maps (since 2026-11-19)                  | Muse-made, `public/muse-assets/pose/`       | Muse (AI-generated mannequins) |
| Costume metadata, thumbnails, WebP previews, PNG originals       | https://ai-costume-gallery.pages.dev/       | ギア · https://x.com/giaaibusi |
| Anime costume metadata, thumbnails, WebP previews, PNG originals | https://ai-costume-anime-gallery.pages.dev/ | ギア · https://x.com/giaaibusi |
| Chinese pose names                                               | https://github.com/anhao/ai-pose-gallery-zh | Anhao                          |

## What is stored

The metadata synchronization/build scripts store IDs, names, categories and remote image URLs. Browsers load visible reference images directly from the original sites, with lazy loading and `no-referrer`; there is no proxy or cache for browsing source images. The optional generation API Worker transports only user-initiated Atomflow generation requests and does not cache source images. This project does not alter the source images.

Git 保存元数据、翻译、远程图片地址及下述图片归档。同步脚本不请求缩略图、预览图或原图。用户浏览时由浏览器直接加载原站图片，网页不使用素材图片代理或仓库归档地址，也没有对图片做弱化处理。可选的生图 API Worker 只转发用户主动发起的 Atomflow 生图请求，不缓存素材图片。

The separate, explicitly invoked `npm run images:download` command archives covers and original PNGs under `pose/` and `costume/`. It includes all existing pose angles and extended categories. The 5,692 covers and originals are tracked in Git, while download manifests remain ignored. The archive is excluded from the website build; the website continues to use upstream image URLs.

用户单独调用 `npm run images:download` 可将封面与 PNG 原图归档到本机 `pose/`、`costume/` 目录。下载清单记录远程地址、编号、视角和 SHA-256；本地归档不改变下述素材权利。

## Additional permission for this repository

On 2026-10-30 (Asia/Shanghai), the maintainer confirmed that they obtained additional permission from the original creator to publicly redistribute the covers and original images in this GitHub repository, and requested their upload. This records the maintainer's confirmation, not an independently verified license document. It does not grant downstream users redistribution rights or place the images under the code's MIT license. The source sites' general terms below remain documented for reference.

2026-10-30（Asia/Shanghai），维护者确认已取得原作者允许将封面与原图公开上传到本 GitHub 仓库的额外授权，并要求上传。本记录依据维护者确认，未独立核验授权文件；不表示下游用户自动获得再分发授权，图片也不适用代码的 MIT 许可。以下保留原站一般使用条款。

`data/sync-manifest.json` records the crawl timestamp, source URLs, source row counts and SHA-256 hashes. Pose variants are grouped by their original pose ID. All available angles are retained; a missing angle is not fabricated.

## Source usage terms

The source sites' usage panels, read on 2026-10-30 (Asia/Shanghai), say:

> 無償で利用できます（作品制作での商用利用・編集・参考利用OK）。
>
> 画像データそのもの（元サイズ・加工後を含む）の再配布・転載・再販は禁止です。
>
> クレジット表記は不要です（任意）。画像のメタデータは削除済みです。無保証でご利用ください。

They allow free use for producing works, including commercial work, editing and reference; they prohibit redistribution, republication and resale of the image data itself, including edited images. Credit is optional in their terms. The images are supplied without warranties. Refer to the original websites for the full, current terms. Outfits are AI-generated fictional clothing, and poses depict mannequins. The source sites also restrict uses depicting real people or minors and uses contrary to public order and morals.

原站允许作品制作中的商用、编辑和参考使用，但禁止图片数据本身（包括加工后）的再分发、转载或转售。原站提供的人偶与虚构服装不保证准确性或无第三方权利问题。完整条款及更新以原站为准。本项目的代码许可证不授予素材权利。

The Chinese adaptation repository's original license is preserved in `THIRD_PARTY_NOTICES.md`. Its code license explicitly excludes the original source images/data and does not replace the original creator's terms.

## Portrait library / 人物参考库

Read on 2026-10-30 (Asia/Shanghai). The portrait source describes 893 face and 606 styling images as fictional AI-generated people and labels them CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/ . It permits commercial use, editing and reference, makes attribution optional, and supplies images without warranties. The page also states:

> 実在人物のなりすましや公序良俗に反する用途は不可
>
> 画像データそのものの再配布・転載はご遠慮ください（お願い）。

The second statement is worded as a request to avoid redistributing or republishing image data alongside the CC0 statement. Both are recorded here. Refer to the source for the full current wording. The additional permission above concerns pose/costume archives only and does not cover this new source.

人物库原站标注 CC0 1.0，允许商用、编辑和参考，署名自愿且无保证；同时要求不冒充真实人物、不用于违背公序良俗的用途，并以“请求”方式表达希望避免图片数据再分发、转载。此处保留两处表述。上文关于公开归档的额外授权仅针对姿势与服饰，不适用于新增人物来源。

Only portrait metadata and locally authored Chinese/English labels are stored. Portrait images remain at their original URLs and are excluded from the pose/costume archive download command. During reference generation, the browser retrieves the selected original and uploads it with the pose and costume to the user's configured image service. This project does not execute the source site's scripts or analytics.

项目仅保存人物元数据和本地编写的中英文标签，缩略图与原图均使用原站链接，不纳入图片归档下载命令。参考生成时，浏览器读取所选人物原图，与姿势、服饰一同发送至用户配置的生图服务；本项目不执行来源站的脚本或统计代码。

## Pose depth maps / 姿势深度图

Read on 2026-10-31 (Asia/Shanghai). The depth gallery has the same 1,439 variant IDs and image paths as the existing pose catalog. The optional depth toggle changes the remote origin while preserving pose IDs, angles, filters and saved references. Only images being viewed or explicitly selected for generation/download are requested. Depth images are not stored in this repository or included in the archive download command. A selected depth original is uploaded as an ordinary reference image to the configured image service; this does not enable a dedicated ControlNet depth input.

深度图库与现有姿势库的 1,439 个视角 ID 及图片路径一致。深度开关仅切换远程图片来源，保留姿势编号、视角、筛选和收藏；图片仅在浏览或用户选择生成、单张下载时请求，不保存到仓库，不纳入图片归档脚本。生成时将所选深度原图作为普通参考图上传，不代表启用 ControlNet 深度控制。

The source permits individual reference use for creating works, including commercial works, and explicitly prohibits bulk downloads (including automated retrieval), redistribution, republication and resale of its images. The earlier pose/costume archive permission is not assumed to cover depth maps. Full current terms are available at the source site.

原站允许单张用于作品制作参考（含商业作品），明确禁止批量下载（含自动获取）、图片再分发、转载与转售。现有姿势与服饰归档授权不视为自动覆盖深度图，完整现行条款以原站为准。

## Anime costume library / 动漫服饰库

Read on 2026-11-02 (Asia/Shanghai). The anime costume source contains 1,320 outfits across eight categories. Only JSON metadata, locally translated labels and upstream image URLs are indexed. Internal IDs use `anime_costume_` and visible codes use `ANIME-` to avoid collisions with photographic outfits. Images remain on the source site and are excluded from `images:download`. Individual references selected in the browser may be loaded for preview or submitted to the user's configured image service.

The source allows individual reference use for creating works, including commercial work, and prohibits bulk downloads (including automated retrieval), redistribution, republication and resale of image data. Earlier archive permission is not assumed to cover this new source. Full current terms are available at the source site.

本批仅索引 1,320 套动漫服饰的元数据、中英文标签与源站图片地址。使用独立编号避免与写实服饰冲突；图片不纳入仓库或批量归档命令。浏览器按需读取展示或用户选中的单张原图，用于预览及发送到用户配置的生图服务。原站允许单张参考创作（含商业作品），禁止批量下载、图片再分发、转载和转售；此前归档授权不自动覆盖此新增来源，完整现行条款以原站为准。

## 自建扩展 / Custom extensions

自建素材清单位于 `data/custom/`，图片独立位于 `public/custom/{costume,pose,character}/`，随网站发布，不混入上游快照或根目录图片归档。首批包含 30 套动漫服饰和 1 套月纹服饰提取图，均使用维护者提供的参考素材通过 Atomflow `gpt-image-2` 重绘或提取。AI 重绘不是原始细节恢复；批次、模型和原图哈希见各条目的 `provenance`。这些图片不自动适用代码的 MIT 授权。原有上游条目的图片链接保持原样。

截至 2026-11-02，自建扩展包含 42 套服饰、24 组五视角姿势（120 张线稿及 120 张配套深度图）、28 张虚构成年人物参考。新服饰采用去除人物的隐形人台展示；补充鞋履等原照片未展示的部分在条目中注明。自建深度图通过原始线稿由 AI 推断生成，不取自上游深度图库，也不是精确三维测量；人物国家／地区仅为编辑分组，不推定真实国籍或代表性外貌。原始用户人物照片不随网站收录，具体批次与使用说明见 [自建扩展指南](data/custom/README.md)。

As of November 2, 2026, the custom collection contains 42 outfits, 24 five-view pose groups (120 line-art images and 120 paired depth maps), and 28 fictional adult portraits. Extracted outfits use ghost-mannequin styling with the person removed; provenance identifies additions absent from the source, such as shoes. Custom depth maps are AI-inferred from the line art, not obtained from the upstream depth gallery or calibrated 3D measurements. Portrait countries/regions are editorial groups, not inferred nationalities or representative appearances. Original user-supplied person photos are not shipped with the website. See the [custom extension guide](data/custom/README.md) for batches and usage notes.

自建素材需单独授权：可自由学习和个人使用，但不可商用。未经事先书面授权，拒绝任何形式的分发、再分发、转载、打包、下载提供或转售；限制也适用于编辑或生成的衍生图片。需要在其他项目、网站、模型或数据集中使用时，请先联系维护者。

Custom metadata and shipped assets are stored separately from upstream snapshots and archives. The first collection contains 30 anime outfits and one extracted moon-pattern outfit, reconstructed or extracted from maintainer-supplied references using Atomflow `gpt-image-2`. This is AI reconstruction, not recovery of original details. Per-item provenance records the batch, model and original-image hash. Images are separate from the MIT code license. Existing upstream image URLs remain unchanged. See [custom extension instructions](data/custom/README.md).

Custom assets require separate permission: learning and personal use are free, but commercial use is prohibited. Without prior written permission, distribution, redistribution, republication, packaging, download provision or resale is prohibited, including edited or generated derivatives. Contact the maintainer before using them in another project, website, model or dataset.
