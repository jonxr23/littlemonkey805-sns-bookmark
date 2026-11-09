# SNS文章收藏夾 V2.8.1 部署指南（正式替換 V2.6.0）

> 本包只交付檔案。小克沒有 commit、沒有 push GitHub、沒有部署 Vercel、沒有修改環境變數、Google Console、Service Account 或管理試算表。下面是你確認後要做的正式替換步驟。

## 一、正式部署方式（已確認）

- **不建立 Git 分支、不使用 Preview、不維持兩個版本並行。**
- 直接以 **V2.8.1 替換目前正式網站 V2.6.0**：更新 GitHub `main` → Vercel 自動部署 **Production**。
- 只有一個正式網址：**https://littlemonkey805-sns-bookmark.vercel.app/**
- 部署後直接在這個正式網址做桌機、手機與真實 Google 整合測試（清單見 `TEST_REPORT.md` 第五節）。
- 保留回復方式（第五節）。

V2.7.0、V2.8.0 沒有單獨上線，這一次是 **V2.6.0 → V2.8.1** 一次到位。

## 二、部署前準備（約 5 分鐘，建議都做）

1. **記下目前正式版**：Vercel → 專案 → Deployments，找到目前標示 Production 的那一筆（V2.6.0），記下它的時間或網址；GitHub `main` 最新一筆 commit 也記下來。出問題時用這一筆回復。
2. **備份收藏**：用平常的帳號打開正式網站，按右上「備份」下載一份備份檔。
3. **備份管理試算表**：開啟 `SNS_Bookmark_Admin` → 檔案 → 建立副本（副本只是保險，不會被程式使用）。
4. **備份目前的 Apps Script**：管理試算表 → 擴充功能 → Apps Script，把現在的 `Code.gs` 全選複製，貼到記事本存起來。

## 三、先更新管理試算表（必須先完成；此時不要部署網站）

> **順序不可顛倒：先完成本節的管理端升級與驗證，再進行第四節的 GitHub `main`／Vercel Production 更新。不要先部署網站。** V2.8.1 的公告 API 需要「公告管理」工作表；如果網站先部署、管理表還沒有這張工作表，公告 API 會回傳 `502 sheet_missing`，公告中心無法正常載入。

### A. 更新 Apps Script

1. 開啟 `SNS_Bookmark_Admin` →「擴充功能」→「Apps Script」。
2. 先依第二節備份目前的 `Code.gs`；再把 ZIP 內 `admin-setup/Code.gs` 的**完整內容**取代舊內容並儲存。
3. 函式選單選 `setupAdminSheet`，執行一次並完成授權（若 Google 顯示授權畫面）。
4. 回到試算表並重新整理。此時應有 **五個工作表**：原本四個工作表，加上「公告管理」。原有四張表的資料、公式與自動化應保留。

### B. 把意見回饋 Google 表單連到管理試算表

1. 開啟既有 Google 表單 →「回覆」，記下目前回覆總數。
2. 若表單目前連到另一份試算表，先把舊回覆工作表複製到 `SNS_Bookmark_Admin`，命名為 `意見回饋_舊回覆`，作為歷史資料比對備份；不要刪除原本的舊試算表。
3. 在 Google 表單 →「回覆」→ 綠色試算表圖示旁「⋮」→「選取回應目的地」→「選取現有的試算表」→ 選 `SNS_Bookmark_Admin`。
4. 回到 `SNS_Bookmark_Admin`，使用「SNS_Bookmark 管理」→「重新套用格式」。Google 表單建立的回應工作表會改名為 `意見回饋紀錄`，並在原始欄位右側加入管理者處理欄位。
5. 使用「檢查意見回饋歷史筆數」核對回覆數；若有舊回覆缺漏，再使用「匯入舊回覆（不重複）」補齊。
6. 使用「檢查設定」，確認六個工作表全部顯示 ✅，並顯示 `意見回饋紀錄：已連結 Google 表單`。

### C. 管理端完成檢查

**只有在以下條件全部成立後，才進行第四節網站部署：**
- 六個工作表都存在：使用者總覽、使用者活動紀錄、OAuth 測試名單、使用說明與 Q&A、公告管理、意見回饋紀錄。
- `公告管理` 工作表已建立，公告 API 不會因缺表而回傳 `sheet_missing`。
- Google 表單已連到 `SNS_Bookmark_Admin`，`意見回饋紀錄` 已建立，歷史回覆筆數已核對。
- 「檢查設定」顯示六個 ✅。

詳細操作及歷史回覆處理方式另見 `admin-setup/ADMIN_SETUP.md`「V2.8.0 更新步驟」。

## 四、更新網站（GitHub main → Vercel Production；管理端驗證完成後才做）

1. 解壓縮 `sns-bookmark-v2.8.1-complete.zip`，得到唯一最外層資料夾 `sns-bookmark-v2.8.1`。
2. 把資料夾**裡面所有檔案與資料夾**（含隱藏檔 `.vercelignore`）複製到 Git 專案根目錄，覆蓋同名檔案。不要把外層資料夾整個再套一層：
   - 會被更新：`index.html`、`package.json`、`.vercelignore`、`admin-setup/Code.gs`、`admin-setup/ADMIN_SETUP.md`、各說明文件。
   - **會新增**：`api/announcements.js`、`assets/`、`brand-assets/`、`manifest.webmanifest` 及歷史測試報告。
   - `brand-assets/` 是原始素材封存資料夾，`.vercelignore` 會排除它，不會作為網站公開檔案部署。
   - 沒有變：`vercel.json`、`api/_lib/`、`api/auth/`、`api/activity.js`、`api/help.js`。
3. 直接 commit 到 GitHub `main` 並 Push。**不建立分支、不使用 Preview、不維持兩個版本並行。** Vercel 會自動部署 Production；不需要修改任何環境變數。
4. Vercel → Deployments 確認最新一筆是 **Ready** 且標示 **Production**。
5. 打開唯一正式網址 `https://littlemonkey805-sns-bookmark.vercel.app/`，左側資料夾欄（手機在 ☰ 抽屜）最底部應顯示「版本：v2.8.1」。桌機、手機都在這個正式網址驗收；手機加到主畫面的請完全關掉再打開。

## 五、正式版回復方式（出問題時）

**網站**（擇一）：
- **最快**：Vercel → Deployments → 找到第二節記下的 V2.6.0 那一筆 → 「⋯」→ **Promote to Production**（或 Instant Rollback）。幾秒內正式網址就回到 V2.6.0。之後再把 GitHub `main` 也還原（下一點），避免下次 push 又部署 V2.8.1。
- **GitHub**：在 `main` 對 V2.8.1 那一筆 commit 做 Revert（GitHub Desktop：History → 右鍵那一筆 → Revert changes in commit）→ Push，Vercel 會自動部署回 V2.6.0。

**資料相容性**：V2.7.0～V2.8.1 都沒有改收藏資料格式，V2.6.0 可以直接讀取。回復後：
- 「品牌桃」變回「可愛」、相簿模式與 📢 公告入口消失；分組選擇器新增的分組仍然存在。
- 主題：V2.6.0 只會讀取裝置上的主題設定，已經被轉成品牌桃的裝置會顯示「可愛」主題，可以手動切回。

**管理試算表**：新的「公告管理」「意見回饋紀錄」可以保留，V2.6.0 不會讀取它們；新版 Code.gs 也不需要退回（原本四個工作表的功能相同）。真的要退回時，把第二節備份的舊 Code.gs 貼回去即可。

## 六、其他注意事項

### 瀏覽器分頁圖示（Favicon）沒有立刻換掉？

瀏覽器會把舊的分頁圖示快取很久。電腦版按 Ctrl＋F5（Mac：⌘＋Shift＋R）強制重新整理；手機已加到主畫面的捷徑，要**刪掉捷徑再重新「加入主畫面」**才會換成 Fav小。

### 之後要替換品牌圖檔（不用改程式）

網站讀的是 `assets/` 裡固定檔名的圖片，用同樣檔名覆蓋即可：

| 用途 | 網站讀取的檔案 | 對應原始素材 |
|---|---|---|
| 淺色背景 Logo | `assets/logo-light.png` | SNS文章收藏夾-主題適應版-淺色.png |
| 深色背景 Logo | `assets/logo-dark.png` | SNS文章收藏夾-主題適應版-深色.png |
| 自訂上傳背景 Logo | `assets/logo-custom.png` | SNS文章收藏夾-主題適應版-自訂背景.png（與深色版同一張，刻意共用） |
| 分頁圖示 | `assets/favicon.png` | Fav小.png（左右各補 1px 透明成正方形，圖案像素不動） |
| iPhone 主畫面圖示 | `assets/apple-touch-icon.png` | Fav小.png（同上，透明處補純白） |

### 版本資訊的更新時間

`index.html` 開頭的 `<meta name="app-build" content="YYYY-MM-DD HH:MM">` 是打包時寫入的台北時間。之後若手動修改 index.html 再發布，請一起改這一行（以及 `app-version`）。

### Vercel 環境變數總表

| 名稱 | 版本 | 用途 | 必填 |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | 既有 | Google 登入 | 是 |
| `GOOGLE_CLIENT_SECRET` | 既有 | Google 登入（只在伺服器） | 是 |
| `SESSION_SECRET` | 既有 | 加密登入 Cookie | 是 |
| `APP_URL` | 既有 | 網站網址（結尾不加斜線） | 是 |
| `ADMIN_SHEET_ID` | **V2.5.0 新增** | 管理試算表 `SNS_Bookmark_Admin` 的 ID | 管理中心需要 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | **V2.5.0 新增** | Service Account 的 Email | 管理中心需要（或改用 JSON） |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | **V2.5.0 新增** | Service Account 的私鑰 | 管理中心需要（或改用 JSON） |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | V2.5.0 新增（選用） | 整份 Service Account JSON，取代上面兩個 | 二擇一 |
| `ACTIVITY_KEY_SECRET` | **V2.5.0 新增** | 產生不可逆的使用者識別 Key；設定後不要更改 | 建議 |

- Environment：勾 **Production**（本專案只使用 Production 正式網址）。
- 新增或修改環境變數後都要 **Redeploy** 才會生效。
- 所有密鑰只放在 Vercel 環境變數；不要貼進 HTML、GitHub、Issue 或任何聊天對話。

## 七、全新安裝（第一次部署，參考用）

### 1. Vercel 環境變數（Project → Settings → Environment Variables）

| 名稱 | 內容 | 環境 |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `840119973043-eo9lkljcu3bduvu9gae1ggri6i0hr4c7.apps.googleusercontent.com` | Production 必填 |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → API 和服務 → 憑證 → 你的 OAuth 用戶端 →「用戶端密鑰」 | 同上 |
| `SESSION_SECRET` | 自己產生 32 字元以上的隨機字串（加密 Cookie 裡的 Refresh Token） | 同上 |
| `APP_URL` | `https://littlemonkey805-sns-bookmark.vercel.app`（結尾不要加斜線） | 同上 |

產生 `SESSION_SECRET`：終端機執行 `openssl rand -base64 32`，或用密碼管理員產生 40 字元隨機密碼。
設定或修改環境變數後，要到 Deployments → 最新一筆 → **Redeploy** 才會生效。
用戶端密鑰只能放在 Vercel 環境變數，不可以貼進 HTML、GitHub 或任何對話。

### 2. Google Cloud Console

- OAuth 用戶端 →「已授權的重新導向 URI」：`https://littlemonkey805-sns-bookmark.vercel.app/api/auth/callback`
- 「已授權的 JavaScript 來源」：`https://littlemonkey805-sns-bookmark.vercel.app`
- OAuth 同意畫面範圍：`openid`、`email`、`profile`、`drive.file`（不需要增加）

### 3. 部署

1. 把 `sns-bookmark-v2.8.1` 資料夾裡的所有檔案（含 `.vercelignore`）放進 Git 專案根目錄。
2. 在 Vercel 設好四個環境變數。
3. Push 或 Redeploy。
4. 打開網站 → 按「登入 Google」。
5. 照 `admin-setup/ADMIN_SETUP.md` 設定管理中心（可以之後再做）。

登入流程、帳號安全規則、圖片生命週期管理的完整說明沒有變，請看 `HISTORY-V2.2.0.md` 第五～七節。
