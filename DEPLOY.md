# SNS文章收藏夾 V2.6.0 部署指南

> 本包只交付檔案。我沒有修改 GitHub main、沒有部署到正式 Vercel、沒有修改環境變數或 Google Console。請檢查後再自行更新。

## 一、從 V2.5.0 升級到 V2.6.0

### 建議：先用預覽環境檢查

1. 在 GitHub 開一個新分支（例如 `v2.6.0-test`），把 ZIP 內容放上去；**不要直接改 main**。
2. Vercel 會為這個分支產生 Preview 網址，可以先看畫面。
   - 注意：Google 登入只允許正式網址（`APP_URL` 與 Google Console 的重新導向 URI 都是正式網址），所以 **Preview 網址無法登入**，只能檢查未登入時的版面；要完整測試登入後的功能，需要合併到正式分支。
3. 確認沒問題後，再合併到 main 讓正式環境更新。

### 更新步驟

1. 解壓縮 `sns-bookmark-v2.6.0.zip`，得到 `sns-bookmark-v2.6.0` 資料夾。
2. 把資料夾**裡面所有檔案**（含隱藏檔 `.vercelignore`）複製到 Git 專案根目錄，覆蓋同名檔案：
   - 會被更新：`index.html`、`package.json`、`README.md`、`DEPLOY.md`、`CHANGELOG.md`、`USER_GUIDE.md`、`TEST_REPORT.md`
   - 會新增：`TEST_REPORT-V2.5.0.md`
   - 沒有變：`vercel.json`、`.vercelignore`、`api/` 全部、`admin-setup/` 全部
3. Commit、Push。
4. **所有裝置**都重新整理一次頁面；手機加到主畫面的，請完全關掉再打開。確認左側資料夾欄（手機在 ☰ 抽屜）最底部顯示「版本：v2.6.0」。
5. 全部裝置都是 V2.6.0 之後，才開始使用「外部圖片網址」（原因見 README）。
6. 依 `TEST_REPORT.md` 第五節逐項實機驗證。

不需要：新增環境變數、修改 Google Console、重新執行 Apps Script、重建任何資料。

### 管理中心「使用說明與 Q&A」建議更新的兩列（選做）

App 內建說明已經改成 V2.6.0 的內容；如果你的管理試算表已經放了初始內容，可以把下面兩列的「內容」換掉（不需要重新部署）：

- 注意事項「圖片格式及容量」最後加一行：
  `外部圖片網址：可以直接引用公開的 http／https 圖片網址，不會下載或上傳到你的雲端硬碟；原網站刪除圖片後，卡片會顯示「外部圖片失效」，收藏的其他內容都還在。`
- Q&A「如何搜尋及選擇資料夾？」第三段改成：
  `新增／編輯收藏時，按「📁 管理分類」會打開分類視窗：有同樣的搜尋框、可以多選、上方「最近使用」可一鍵加入，也可以在裡面「＋新增資料夾」；搜尋或清除搜尋都不會取消已選的分類，選好按「完成」。`

### 版本資訊的更新時間

`index.html` 開頭的 `<meta name="app-build" content="YYYY-MM-DD HH:MM">` 是打包時寫入的台北時間，畫面上的「更新：」就是讀這一行。這個專案沒有建置流程，所以**之後若手動修改 index.html 再發布，請一起改這一行**（以及 `app-version`），不要沿用舊時間。

### 如果要退回 V2.5.0

把 V2.5.0 的檔案放回並重新部署即可；資料格式相容。注意：退回後，V2.6.0 加的外部圖片在 V2.5.0 不會顯示，而且用 V2.5.0 編輯那筆收藏時，外部圖片網址會被清掉。

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

- Environment：至少勾 **Production**。Preview 網址的 `APP_URL` 不同，登入本來就只在 Production 網址運作，所以 Preview 可以不勾。
- 新增或修改環境變數後都要 **Redeploy** 才會生效。
- 所有密鑰只放在 Vercel 環境變數；不要貼進 HTML、GitHub、Issue 或任何聊天對話。

## 二、全新安裝（第一次部署）

### 1. Vercel 環境變數（Project → Settings → Environment Variables）

| 名稱 | 內容 | Production／Preview |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `840119973043-eo9lkljcu3bduvu9gae1ggri6i0hr4c7.apps.googleusercontent.com` | Production 必填；Preview 網址不同，通常不用 |
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

1. 把 `sns-bookmark-v2.6.0` 資料夾裡的所有檔案（含 `.vercelignore`）放進 Git 專案根目錄。
2. 在 Vercel 設好四個環境變數。
3. Push 或 Redeploy。
4. 打開網站 → 按「登入 Google」。
5. 照 `admin-setup/ADMIN_SETUP.md` 設定管理中心（可以之後再做）。

登入流程、帳號安全規則、圖片生命週期管理的完整說明沒有變，請看 `HISTORY-V2.2.0.md` 第五～七節。
