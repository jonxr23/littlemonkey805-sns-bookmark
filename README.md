# SNS文章收藏夾 V2.8.1

**SNS文章收藏夾 / SNS Bookmark / by littlemonkey805**

V2.8.1 以 V2.8.0 完整版為基底，將預設主題改為「品牌桃」，並依最終需求把 Facebook、Dcard、PTT 改為使用者自行新增的平台；V2.8.0 以 V2.7.0 完整安裝包為基底（V2.7.0 ← V2.6.0 ← V2.5.0 ← V2.4.0 ← V2.3.0 ← V2.2.0），V2.7.0 六大功能全部保留。
Google 登入、帳號綁定、Google Drive／Sheets 同步、圖片／GIF／外部網址、收藏資料格式都沒有改；一般使用者的 OAuth 權限仍然只有 `drive.file`；沒有新增任何環境變數。
從正式版 V2.6.0 升級時，**必須先完成管理試算表升級**：更新 Apps Script（V2.8.0 的 Code.gs；V2.8.1 沒有再改）、執行 `setupAdminSheet`，並把 Google 表單回覆連到管理試算表。確認六個工作表都完成後，才部署網站到 Production（見 `DEPLOY.md` 第三、四節及 `admin-setup/ADMIN_SETUP.md` 最後的「V2.8.0 更新步驟」）。

| 階段 | 版本 | 內容 | 狀態 |
|---|---|---|---|
| A 介面包 | V2.3.0 | 明細預覽、刪除確認、資料夾搜尋與樹狀、桌機寬版、手機工具列、使用說明 | 已交付 |
| B 圖片／GIF 包 | V2.4.0 | JPG／PNG／GIF 驗證、壓縮、GIF 動畫 | 已交付 |
| C 管理中心包 | V2.5.0 | 管理試算表、動態使用說明、活動紀錄 | 已交付 |
| 介面改版＋外部圖片 | V2.6.0 | 外部圖片網址、彈窗改版、浮動快捷鈕、看板滑條、分類管理視窗等 | 正式版 |
| 品牌與檢視升級 | V2.7.0 | ① 五種主題＋蜜桃品牌官方配色 ② 品牌 Logo／Favicon ③ 相簿模式 ④ 時間軸依日期分組 ⑤ 分組選擇器直接新增 ⑥ 浮動按鈕放大與 Q&A 答案區 | 併入 V2.8.1 一起驗收 |
| 批次、公告、回饋 | V2.8.0 | ① 批次選取（整張卡片選取、滑鼠框選、Ctrl／Shift、手機長按拖曳）② 📢 公告中心 ③「公告管理」工作表 ④ 公告 API ⑤ 意見回饋整合到「意見回饋紀錄」 | 併入 V2.8.1 一起驗收 |
| 品牌預設 | **V2.8.1** | 預設主題改為「品牌桃」（舊裝置的暖米綠一次性轉換，其他主題保留） | 本包（待統一驗收） |

## 資料夾結構（`sns-bookmark-v2.8.1` 資料夾的內容放在 Git 專案根目錄）

```
sns-bookmark-v2.8.1/
├─ index.html              ← V2.8.1 前端（與另附的 `sns-bookmarks-google-V2.8.1-updated.html` 單檔版功能相同）
├─ manifest.webmanifest    ← 新增：手機「加到主畫面」的名稱與圖示
├─ assets/                 ← 新增：網站實際讀取的品牌圖檔
│  ├─ logo-light.png       ← ＝ SNS文章收藏夾-主題適應版-淺色.png（逐位元相同）
│  ├─ logo-dark.png        ← ＝ SNS文章收藏夾-主題適應版-深色.png（逐位元相同）
│  ├─ logo-custom.png      ← ＝ SNS文章收藏夾-主題適應版-自訂背景.png（逐位元相同）
│  ├─ favicon.png          ← Fav小.png 左右各補 1px 透明成 109×109（圖案像素不動）
│  └─ apple-touch-icon.png ← 同上，透明處補純白（iPhone 主畫面用）
├─ brand-assets/           ← 新增：你提供的原始品牌素材（存檔，不部署）
├─ package.json            ← version 2.8.1
├─ vercel.json             ← 未變更
├─ .vercelignore           ← 與 V2.7.0 相同（brand-assets/ 原始素材不上傳到網站）
├─ api/
│  ├─ announcements.js     ← V2.8.0 新增：GET /api/announcements（只讀公告）
│  └─ 其他檔案             ← 與 V2.7.0 相同
├─ admin-setup/
│  ├─ Code.gs              ← V2.8.0 更新：公告管理、意見回饋紀錄、六個工作表檢查
│  └─ ADMIN_SETUP.md       ← 新增「V2.8.0 更新步驟」
├─ README.md／DEPLOY.md／CHANGELOG.md／USER_GUIDE.md
├─ TEST_REPORT.md          ← V2.8.1 測試報告
├─ TEST_REPORT-V2.8.0.md   ← V2.8.0 整合測試報告（435 項逐項結果）
├─ TEST_REPORT-V2.7.0.md 等 ← 前幾版測試報告（保留參考）
└─ HISTORY-V2.2.0.md       ← V2.2.0 原部署說明
```

## V2.8.1 重點

- 全新使用者第一次開啟就是「品牌桃」；舊裝置原本的「暖米綠」（舊版自動存的）一次性轉為品牌桃，深色／簡約／自訂不動；之後使用者自己選的主題都會保留。
- **預設平台**：系統內建平台只保留 IG、Threads、X、YouTube。Facebook、Dcard、PTT 不再預設出現，也不會自動辨識；第一次貼上這些網站的網址時，請從「新增平台」建立，建立後才會記錄該網域並自動辨識。
- **Code.gs：相對 V2.8.0 免更新（兩版完全相同）；但目前正式環境的 Apps Script 是 V2.5.0，這次升級必須首次更新到這份 Code.gs，並執行一次 `setupAdminSheet`**（`DEPLOY.md` 第三節）。

## 這一版要另外設定什麼？（V2.8.0 起）

**需要（管理者，一次）**：
1. 把 `admin-setup/Code.gs` 貼進管理試算表的 Apps Script，執行一次 `setupAdminSheet`（新增「公告管理」）。
2. 在 Google 表單把回覆目的地改成 `SNS_Bookmark_Admin`，再執行一次「重新套用格式」（產生「意見回饋紀錄」）。

**不需要**：新增或修改 Vercel 環境變數、Google Cloud Console、OAuth 範圍、Service Account、重建管理試算表、新增 Apps Script 觸發條件；使用者的 Google Drive／`SNS_Bookmark_Data` 完全不動。

**資料格式**：收藏資料沒有任何變更；公告與意見回饋只存在管理試算表。

**品牌素材**：淺色／深色／自訂背景 Logo 依你確認的對應（深色與自訂背景刻意共用同一張）。`brand-assets/` 內容與來源見 `brand-assets/素材清單.md`。

升級步驟請看 `DEPLOY.md`，所有修改請看 `CHANGELOG.md`，測試結果請看 `TEST_REPORT.md`。
