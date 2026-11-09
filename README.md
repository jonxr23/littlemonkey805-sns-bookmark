# SNS文章收藏夾 V2.4.0

V2.4.0 是三階段升級的第二階段「B 圖片／GIF 包」，以 V2.3.0 完整專案為唯一基礎製作（V2.3.0 又是以 V2.2.0 為基礎）。
Google 登入、Refresh Token、帳號 sub 綁定、Google Drive／Sheets 同步、衝突處理、圖片生命週期管理、收藏資料格式全部沿用 V2.2.0，沒有改動。

| 階段 | 版本 | 內容 | 狀態 |
|---|---|---|---|
| A 介面包 | V2.3.0 | 明細預覽、刪除確認彈窗、刪除資料夾、資料夾搜尋與樹狀收合、最近使用、桌機寬版布局、手機工具列、ⓘ 使用說明（靜態內容） | 已交付 |
| B 圖片／GIF 包 | **V2.4.0** | JPG／PNG／GIF 格式驗證、壓縮規則、GIF 動畫 | 本包 |
| C 管理中心包 | V2.5.0 | 管理者試算表、使用說明動態內容、使用者活動紀錄、OAuth 測試名單 | 尚未開始 |

## 資料夾結構（整個 `sns-bookmark-v2.4.0` 資料夾的內容放在 Git 專案根目錄）

```
sns-bookmark-v2.4.0/
├─ index.html            ← V2.4.0 前端（內容與 sns-bookmarks-google-V2.4.0.html 相同）
├─ package.json          ← version 2.4.0
├─ vercel.json           ← 未變更
├─ api/                  ← 未變更（與 V2.2.0 完全相同）
│  ├─ _lib/session.js
│  └─ auth/callback.js、token.js、logout.js
├─ README.md             ← 本檔
├─ DEPLOY.md             ← 部署指南（全新安裝、從 V2.2.0／V2.3.0 升級）
├─ CHANGELOG.md          ← 更新紀錄
├─ TEST_REPORT.md        ← V2.4.0 測試報告（模擬測試結果＋真實 Google 待驗證清單）
├─ TEST_REPORT-V2.3.0.md ← V2.3.0 測試報告（保留參考）
├─ USER_GUIDE.md         ← 使用者操作說明
└─ HISTORY-V2.2.0.md     ← V2.2.0 原部署說明（保留參考：OAuth 流程、帳號安全規則、圖片生命週期細節）
```

## 這一版有沒有要另外設定的東西？

沒有。
- **不需要**新增或修改 Vercel 環境變數（仍是 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET`、`APP_URL` 四個）。
- **不需要**修改 Google Cloud Console，OAuth 範圍仍是 `openid`、`email`、`profile`、`drive.file`。
- **不需要**動使用者 Google Drive 的 `SNS_Bookmark`／`SNS_Bookmark_Images`／`SNS_Bookmark_Data`。
- 收藏資料欄位與格式沒有改變；V2.2.0、V2.3.0、V2.4.0 的頁面可以讀同一份資料。
- 新功能完全在瀏覽器裡執行（GIF 用 Web Worker），沒有新增伺服器程式，也沒有載入任何外部函式庫。

升級步驟請看 `DEPLOY.md`，新功能說明請看 `CHANGELOG.md`，測試結果請看 `TEST_REPORT.md`。
