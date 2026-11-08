# SNS 文章收藏夾 V2.1.1 部署說明

## 資料夾結構（整包放在 Git 專案根目錄）

```
(專案根目錄)
├─ index.html                 ← V2.1.1 前端（內容同 sns-bookmarks-google-V2.1.1.html）
├─ package.json
├─ vercel.json
└─ api/
   ├─ _lib/session.js         ← 共用：Cookie 加密、CSRF 檢查
   └─ auth/
      ├─ callback.js          ← Google 授權完成後回來的地方（換 Token）
      ├─ token.js             ← 前端要 Access Token 時呼叫
      └─ logout.js            ← 登出（清除 Cookie）
```

## 一、Vercel 環境變數（Project → Settings → Environment Variables）

| 名稱 | 內容 |
|---|---|
| `GOOGLE_CLIENT_ID` | `840119973043-eo9lkljcu3bduvu9gae1ggri6i0hr4c7.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → API 和服務 → 憑證 → 你的 OAuth 用戶端 → 「用戶端密鑰」 |
| `SESSION_SECRET` | 自己產生一串 32 字元以上的隨機字串（用來加密 Cookie 裡的 Refresh Token） |
| `APP_URL` | `https://littlemonkey805-sns-bookmark.vercel.app`（結尾不要加斜線） |

產生 SESSION_SECRET 的方法（任選一種）：電腦終端機執行 `openssl rand -base64 32`，或用密碼管理員產生 40 字元隨機密碼。

設定完環境變數後，要**重新部署**（Deployments → 最新一筆 → Redeploy）才會生效。

**重要：** 用戶端密鑰只能放在 Vercel 環境變數，不可以貼進 HTML，也不要上傳到公開的 GitHub。

## 二、Google Cloud Console 要改的地方

OAuth 用戶端 → 「已授權的重新導向 URI」：

1. **新增** `https://littlemonkey805-sns-bookmark.vercel.app/api/auth/callback`
2. 舊的 `https://littlemonkey805-sns-bookmark.vercel.app/` 可以保留，也可以刪掉（V2.1.1 不再使用）。

「已授權的 JavaScript 來源」維持 `https://littlemonkey805-sns-bookmark.vercel.app`。

OAuth 同意畫面維持 openid、email、profile、`drive.file` 四個範圍，不需要增加。

## 三、部署步驟

1. 把上面整個資料夾的內容放進你的 Git 專案（取代舊的單一 HTML）。
2. 確認 `index.html` 在專案根目錄。
3. 在 Vercel 設好四個環境變數。
4. Push 或 Redeploy。
5. 打開網站 → 按「登入 Google」。

## 四、登入流程

1. 按「登入 Google」→ 先確認資料都已存到雲端 → 導向 Google 授權頁（官方 Google Identity Services，Authorization Code 模式）。
2. 授權後回到 `/api/auth/callback`，伺服器用 Client Secret 換取 Token。
3. Refresh Token 以 AES-256-GCM 加密後存在 HttpOnly + Secure Cookie，網頁的 JavaScript 讀不到。
4. 前端需要 Access Token（約 1 小時有效）時，呼叫 `/api/auth/token`，由伺服器換發新的；不再有隱藏 iframe。
   - 伺服器每次都會向 Google 確認換出來的 Token 屬於 Cookie 綁定的帳號（sub）；對不上就拒絕並清除 Cookie。
   - 每次成功換發，Cookie 會重新計算 180 天（滑動期限）；Google 若已撤銷或讓 Refresh Token 失效，不會延長，直接要求重新登入。
5. 測試狀態的應用程式，Google 會在約 7 天後讓 Refresh Token 失效，屆時會要求重新登入一次。

## 五、帳號安全規則（V2.1 起）

- `g_rt` Cookie 內容是 `{Refresh Token, 這個 Token 所屬的 Google sub}`，整包 AES-256-GCM 加密。
- 登入完成時（callback），伺服器用剛拿到的 Access Token 向 Google 查「實際授權的是哪個 sub」：
  - Google 有給新的 Refresh Token → 綁定這次的 sub 後取代舊的。
  - Google 沒給新的，但瀏覽器裡舊 Token 的 sub 與這次相同 → 沿用並延長期限。
  - Google 沒給新的，且舊 Token 屬於別的帳號 → 舊 Token 直接清除，只發一個綁定這次 sub 的短效 Access Token（約 1 小時，過期後需重新登入）。
- 前端收到 Token 時會比對帳號：頁面上已登入的帳號與 Token 的帳號不同（例如在另一個分頁切換了帳號），會鎖定同步並要求重新整理，不會把資料寫到錯的帳號。

## 六、V2.1.1 修改紀錄

相對於 V2.1，只改了下面三件事，其餘（UI、CSS、RWD、收藏資料結構、Google OAuth、sub 綁定、180 天滑動期限、雲端同步、衝突處理）沒有動。

1. **資料太大時的安全處理（`ser()` 改為 `serialize()`）**
   - 不再直接把 JSON 字串截斷（舊作法可能留下不完整的 JSON，之後讀取整列會解析失敗）。
   - 超過 49,000 字元時，只縮短 `text`（貼文文字）欄位，再重新序列化並用 `JSON.parse` 驗證，確保輸出一定是完整有效的 JSON；縮短時不會切在表情符號的中間。
   - 縮短後仍然太大（例如備註、標籤本身就超過上限）：這一筆不寫入 Google 試算表，畫面上方顯示原因與最長的欄位名稱；本機的修改保留，不會被刪除，也不會被同步覆蓋。
   - 這種「固定性錯誤」不會自動重試。網路類的暫時性錯誤仍會自動重試，間隔改為逐步拉長（最長 60 秒）。
   - 太大的那一筆會讓登出、切換帳號前的儲存檢查失敗並提示（登出可再按一次放棄修改），不會默默丟掉。
   - 儲存視窗按「儲存」時，遇到這種錯誤視窗不會關閉，並顯示原因。
2. **意見回饋的提示文字**：改為「已送出請求（無法確認 Google 表單是否收到）」。因為 `mode:'no-cors'` 讀不到 Google 表單的回應，不再宣稱成功。表單網址與三組 Entry ID（暱稱 936790019、回饋內容 540307403、Google 顯示名稱 1631816990）完全沒有更換。
3. **版本資訊統一**：`package.json` 為 2.1.1（V2.1 漏改，仍是 2.0.0）、前端加入版本標記（`<meta name="app-version">` 與 `window.SNS_VERSION`）、README 章節編號補上第五節。

## 七、測試結果

### 程式模擬測試（已完成，使用假的 Google 服務）
- 資料太大：一般長度、text 超長（含大量引號、換行、反斜線、表情符號、中文）都能縮短成完整有效的 JSON 且長度不超過限制；非 text 欄位太大時被擋下、不寫入；本機資料保留（含按重新整理後）；7.5 秒內沒有自動重試；使用者縮短內容後可正常儲存。
- 寫入失敗時，未同步的資料保留，恢復後可正常寫入。
- 新增、修改、刪除、同步、衝突視窗、儲存失敗時擋下切換帳號、Access Token 到期換發、登出。
- 意見回饋送出的欄位與 Entry ID。
- 雙帳號隔離、Refresh Token 與 sub 綁定、切換帳號不沿用舊 Token、180 天 Cookie 滑動延期、被撤銷的 Token 不延期、清除 Cookie 後要求重新登入。

### 尚未經過真實 Google 環境驗證
- 真實的 Google 授權畫面與重新導向。
- Google 是否在重新授權時給新的 Refresh Token。
- 測試狀態下 Refresh Token 約 7 天失效的實際行為。
- 在你的 Vercel 網域上 Cookie 的實際寫入。
- 真實 Google 試算表的讀寫、速度與額度限制，以及單格 50,000 字元上限的實際反應。
- Google 表單是否真的收到回饋（請到表單「回覆」頁確認）。
