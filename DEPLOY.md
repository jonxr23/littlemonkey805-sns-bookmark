# SNS文章收藏夾 V2.3.0 部署指南

> 本包只交付檔案，我沒有修改 GitHub、也沒有操作 Vercel。請你檢查 ZIP 與程式碼後再自行更新。

## 一、從 V2.2.0 升級到 V2.3.0（你目前的情況）

1. 解壓縮 `sns-bookmark-v2.3.0.zip`，會得到一個 `sns-bookmark-v2.3.0` 資料夾。
2. 把這個資料夾**裡面的所有檔案**複製到你的 Git 專案根目錄，覆蓋同名檔案：
   - 會被更新：`index.html`、`package.json`、`README.md`
   - 會新增：`DEPLOY.md`、`CHANGELOG.md`、`TEST_REPORT.md`、`USER_GUIDE.md`、`HISTORY-V2.2.0.md`
   - 內容沒有變：`vercel.json`、`api/` 底下全部檔案（覆蓋也沒關係）
3. 確認 `index.html` 仍在專案根目錄。
4. Commit、Push（或在 Vercel 按 Redeploy）。
5. 部署完成後，**每台裝置都重新整理一次頁面**；手機若把網頁加到主畫面，請完全關掉再打開。
6. 依照 `TEST_REPORT.md` 第三節「真實 Google 環境待驗證清單」逐項確認。

不需要做的事：
- **不用**新增或修改 Vercel 環境變數。
- **不用**修改 Google Cloud Console（重新導向 URI、JavaScript 來源、OAuth 範圍都不變）。
- **不用**刪除或重建 `SNS_Bookmark`、`SNS_Bookmark_Images`、`SNS_Bookmark_Data`。
- 既有收藏、資料夾、圖片 ID 完全不動，資料格式沒有改。

跨版本相容：還沒更新的 V2.2.0 頁面可以和 V2.3.0 同時使用同一份資料，不會出現空白卡片或壞資料。不過 V2.2.0 頁面沒有新功能（例如刪除資料夾），建議盡快全部更新。

### 如果要退回 V2.2.0

把 V2.2.0 的檔案放回專案並重新部署即可。V2.3.0 沒有新增任何資料欄位，退回後資料照常可用。（在 V2.3.0 刪除的資料夾、收藏不會因為退版而回來。）

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

1. 把 `sns-bookmark-v2.3.0` 資料夾裡的所有檔案放進 Git 專案根目錄。
2. 在 Vercel 設好四個環境變數。
3. Push 或 Redeploy。
4. 打開網站 → 按「登入 Google」。

登入流程、帳號安全規則、圖片生命週期管理的完整說明沒有變，請看 `HISTORY-V2.2.0.md` 第五～七節。
