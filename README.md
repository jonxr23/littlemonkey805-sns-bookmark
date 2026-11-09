# SNS文章收藏夾 V2.6.0

V2.6.0 以 V2.5.0 完整交付版本為唯一基底（V2.5.0 ← V2.4.0 ← V2.3.0 ← V2.2.0），完整保留 V2.4.0 圖片／GIF 處理、V2.5.0 管理中心與意見回饋。
Google 登入、Refresh Token、帳號 sub 綁定、Google Drive／Sheets 同步、衝突處理、圖片生命週期管理都沒有改；一般使用者的 OAuth 權限仍然只有 `drive.file`；`api/`、`admin-setup/` 與 V2.5.0 相同。

| 階段 | 版本 | 內容 | 狀態 |
|---|---|---|---|
| A 介面包 | V2.3.0 | 明細預覽、刪除確認彈窗、刪除資料夾、資料夾搜尋與樹狀收合、最近使用、桌機寬版布局、手機工具列、ⓘ 使用說明（靜態內容） | 已交付 |
| B 圖片／GIF 包 | V2.4.0 | JPG／PNG／GIF 格式驗證、壓縮規則、GIF 動畫 | 已交付 |
| C 管理中心包 | V2.5.0 | 管理者試算表、使用說明動態內容、使用者活動紀錄、OAuth 測試名單 | 已交付 |
| 介面改版＋外部圖片 | **V2.6.0** | 外部圖片網址、版本資訊、說明與明細／刪除彈窗改版、浮動快捷鈕、看板滑條、分類管理視窗、共用建立資料夾、手機版密度、設定選單智慧定位、編輯會清掉 ★／分組的問題修正 | 本包 |

## 資料夾結構（`sns-bookmark-v2.6.0` 資料夾的內容放在 Git 專案根目錄）

```
sns-bookmark-v2.6.0/
├─ index.html              ← V2.6.0 前端（內容與 sns-bookmarks-google-V2.6.0.html 相同）
├─ package.json            ← version 2.6.0（沒有任何套件依賴）
├─ vercel.json             ← 未變更
├─ .vercelignore           ← 新增：部署時不上傳 admin-setup/ 與說明文件
├─ api/
│  ├─ _lib/session.js      ← 未變更
│  ├─ _lib/admin.js        ← 新增：Service Account、管理試算表共用工具
│  ├─ auth/…               ← 未變更（callback、token、logout）
│  ├─ activity.js          ← 新增：POST /api/activity（寫入使用者活動紀錄）
│  └─ help.js              ← 新增：GET /api/help（讀取公開的使用說明）
├─ admin-setup/
│  ├─ ADMIN_SETUP.md       ← 管理中心第一次設定指南（Service Account、試算表、Vercel、Apps Script）
│  └─ Code.gs              ← 管理試算表的 Apps Script
├─ README.md／DEPLOY.md／CHANGELOG.md／USER_GUIDE.md
├─ TEST_REPORT.md          ← V2.6.0 測試報告
├─ TEST_REPORT-V2.5.0.md、-V2.4.0.md、-V2.3.0.md ← 前幾版測試報告（保留參考）
└─ HISTORY-V2.2.0.md       ← V2.2.0 原部署說明
```

## 這一版要另外設定什麼？

**不需要**：
- 新增或修改 Vercel 環境變數（與 V2.5.0 相同）。
- 修改 Google Cloud Console、OAuth 範圍。
- 動使用者的 Google Drive、`SNS_Bookmark_Data` 試算表或管理中心試算表。
- 重新執行 Apps Script（`admin-setup/Code.gs` 沒有改）。

**資料格式**：只新增一個選用欄位 `ximgs`（外部圖片網址陣列），跟 Drive 圖片 ID 的 `shots` 分開存。舊資料沒有這個欄位也完全正常。

**重要**：請在**所有裝置都更新到 V2.6.0 之後**才開始使用「外部圖片網址」。舊版頁面（V2.2.0～V2.5.0）在編輯收藏時會把它不認得的欄位清掉（這是本版修正的既有問題，見 `CHANGELOG.md`），所以如果用舊版頁面編輯一筆有外部圖片的收藏，外部圖片網址會遺失。

升級步驟請看 `DEPLOY.md`，所有修改的「原本問題／修改方式／測試／結果」請看 `CHANGELOG.md`，測試結果請看 `TEST_REPORT.md`。
