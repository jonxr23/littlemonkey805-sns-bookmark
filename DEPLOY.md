# SNS文章收藏夾 V3.0.0 部署指南（**等你驗收安裝包後再安排正式部署**）

> **部署紀錄**：小克只完成開發、測試與安裝包。**沒有** commit、**沒有** push、**沒有**開分支、**沒有** Preview、**沒有**觸發 Vercel。沒有修改環境變數、Google Console、Service Account、管理試算表或 Apps Script。

## 一、基準與回復版本

| 項目 | 內容 |
|---|---|
| GitHub Repository | `jonxr23/littlemonkey805-sns-bookmark` |
| 開發基準 | 猴猴提供的 `sns-bookmark-v2.10.4-complete.zip`（app-version 2.10.4、build 2026-11-11 05:34；尚未上傳 `main`）。**V3.0.0 已包含 V2.10.3、V2.10.4 的全部修改**，可以直接上傳 V3.0.0 |
| GitHub `main` 目前 | `b29db6d8260baf080a2dda0962219c78f50ce6e2`（V2.10.2） |
| 回復版本 | V2.10.2 ＝ `b29db6d`（再往前：V2.10.1 ＝ `cc14411`） |
| 正式網址 | https://littlemonkey805-sns-bookmark.vercel.app/（不變） |

## 二、要不要另外設定？

| 項目 | 結果 |
|---|---|
| Apps Script `Code.gs`／管理試算表 | **免更新**（與 V2.10.4 逐位元相同） |
| Vercel 環境變數 | **不用新增或修改**。新的 `api/resolve.js` 只用既有的 `APP_URL` 檢查請求來源 |
| Vercel 專案設定 | **不用改**。`api/resolve.js` 放進 `api/` 就會自動成為 Serverless Function；`vercel.json` 原本對 `/api/(.*)` 的 `no-store` 同樣適用 |
| Google Cloud Console／OAuth 範圍／Service Account | **不用動**（仍只有 `drive.file`） |
| 使用者資料 | **不需要轉換**。收藏、資料夾、分組、設定、備份格式都沒有改 |

## 三、上傳步驟（驗收後；GitHub main → Vercel Production）

1. Vercel → Deployments：確認目前 Production 是 `b29db6d` / V2.10.2，出問題用它回復。
2. 解壓縮 `sns-bookmark-v3.0.0-complete.zip`，把 `sns-bookmark-v3.0.0` 資料夾**裡面**所有檔案（含隱藏檔 `.vercelignore`）複製到 Git 專案根目錄覆蓋。
   - 和 `main`（V2.10.2）比，網站檔案：`index.html`、`package.json` 有變，**新增 `api/resolve.js`（一定要一起上傳，不然短網址都會顯示「無法檢查」）**。
   - 說明文件：`CHANGELOG.md`、`README.md`、`DEPLOY.md`、`USER_GUIDE.md`、`TEST_REPORT.md`（新）、`TEST_REPORT-V2.10.2.md`、`TEST_REPORT-V2.10.3.md`、`TEST_REPORT-V2.10.4.md`（舊報告改名，**新檔要一起上傳**）、`admin-setup/ADMIN_SETUP.md`、`brand-assets/素材清單.md`。
3. commit 到 `main`（建議訊息：`Release SNS Bookmark V3.0.0`），Vercel 會自動部署。
4. Vercel 最新一筆 **Ready**＋**Production** 後，Deployments → 該筆 → Functions 應看到 `api/resolve`。
5. 正式網址側邊欄最底部應顯示 `版本：v3.0.0 / 更新：2026-11-12 00:48`。舊版本號就按 Ctrl＋F5，手機完全關掉分頁再開。
6. 實機驗收清單見 `TEST_REPORT.md` 第六節（特別是短網址解析，必須在正式網址實測）。

## 四、回復

- Vercel → Deployments → `b29db6d` 那一筆 → **Promote to Production**（或 Instant Rollback），再在 GitHub Revert V3.0.0 的 commit。
- **資料相容性**：V3.0.0 沒有改收藏資料格式，回到 V2.10.2 不影響收藏。V3.0.0 新增的 localStorage（`tbx3`、`tblw3`、`shs.wall`、`shp.wall`、`surl3`）舊版會忽略。回到舊版後：「薰衣紫」會變回舊的黑白「簡約」；選了「奶霜綠」的裝置會顯示品牌桃（舊版不認得 `mint`），可以手動再選。

## 五、更新時間的來源（沒有改）

畫面上的更新時間來自 `index.html` 的 `<meta name="app-build">`（小克打包時寫入的台北時間 2026-11-12 00:48）。

---

# 附錄：V2.10.4 部署說明（保留參考）

> **部署紀錄**：小克只完成開發、測試與安裝包。**沒有** push、**沒有**開分支、**沒有** Preview、**沒有**觸發 Vercel。沒有修改環境變數、Google Console、Service Account、管理試算表或 Apps Script。

## 一、基準與回復版本

| 項目 | 內容 |
|---|---|
| GitHub Repository | `jonxr23/littlemonkey805-sns-bookmark` |
| 開發基準 | V2.10.3 最終安裝包（build 2026-11-11 04:13；尚未上傳 `main`）。GitHub `main` 目前是 `b29db6d8260baf080a2dda0962219c78f50ce6e2`（V2.10.2）；**V2.10.4 已包含 V2.10.3 的全部修改**，可以直接上傳 V2.10.4，不必先上 V2.10.3 |
| 回復版本 | V2.10.2 ＝ `b29db6d`（再往前：V2.10.1 ＝ `cc14411`） |
| 正式網址 | https://littlemonkey805-sns-bookmark.vercel.app/（不變） |

## 二、管理試算表／Apps Script：**免更新**

`admin-setup/Code.gs` 和 V2.10.2 逐位元相同；API、OAuth、環境變數、Service Account、試算表欄位都沒有改。

## 三、上傳步驟（驗收後；GitHub main → Vercel Production）

1. Vercel → Deployments：確認目前 Production 是 `b29db6d` / V2.10.2。
2. 解壓縮 `sns-bookmark-v2.10.4-complete.zip`，把 `sns-bookmark-v2.10.4` 資料夾**裡面**所有檔案（含隱藏檔 `.vercelignore`）複製到 Git 專案根目錄覆蓋。
   - 和 `main`（V2.10.2）比，網站檔案只有 `index.html`、`package.json` 有變；沒有新增或刪除網站檔案。
   - 說明文件：`CHANGELOG.md`、`README.md`、`DEPLOY.md`、`USER_GUIDE.md`、`TEST_REPORT.md`（新）、`TEST_REPORT-V2.10.2.md`、`TEST_REPORT-V2.10.3.md`（舊報告改名，**新檔要一起上傳**）、`admin-setup/ADMIN_SETUP.md`、`brand-assets/素材清單.md`。
3. commit 到 `main`（建議訊息：`Release SNS Bookmark V2.10.4`），Vercel 會自動部署。
4. 正式網址側邊欄最底部應顯示 `版本：v2.10.4 / 更新：2026-11-11 05:34`。

## 四、回復

- Vercel → Deployments → `b29db6d` 那一筆 → **Promote to Production**（或 Instant Rollback），再在 GitHub Revert V2.10.4 的 commit。
- V2.10.3、V2.10.4 都沒有改任何資料格式，回到 V2.10.2 不影響資料。

## 五、更新時間的來源（沒有改）

畫面上的更新時間來自 `index.html` 的 `<meta name="app-build">`（小克打包時寫入的台北時間 2026-11-11 05:34）。

---

# 附錄：V2.10.1 部署說明（保留參考）

## V2.10.1 部署指南（**由你自行上傳 GitHub `main`，Vercel 自動部署 Production**）

> **部署紀錄**：小克只完成開發、檢查、測試與安裝包。依 V2.10.1 指令，**沒有** push、**沒有**開分支、**沒有** Preview 或支線包、**沒有**觸發 Vercel。沒有修改環境變數、Google Console、Service Account、管理試算表或 Apps Script。

## 一、基準與回復版本

| 項目 | 內容 |
|---|---|
| GitHub Repository | `jonxr23/littlemonkey805-sns-bookmark` |
| 開發基準 | GitHub `main` commit `1b778e59b7c41a9189f407bdce22af5ad8e1b59a`（Production 的 V2.10.0；和小克交付的 V2.10.0 安裝包逐檔相同） |
| 回復版本 | V2.10.0 ＝ `1b778e5`（再往前：V2.8.3 ＝ `ae7f77e`） |
| 正式網址 | https://littlemonkey805-sns-bookmark.vercel.app/（不變） |

## 二、管理試算表／Apps Script：**免更新**

`admin-setup/Code.gs` 和 V2.10.0 逐位元相同；API、OAuth 範圍、環境變數、Service Account、試算表欄位都沒有改。

## 三、上傳步驟（GitHub main → Vercel Production）

1. Vercel → Deployments：確認目前 Production 是 `1b778e5` / V2.10.0，出問題用它回復。
2. 解壓縮 `sns-bookmark-v2.10.1-complete.zip`，把 `sns-bookmark-v2.10.1` 資料夾**裡面**所有檔案（含隱藏檔 `.vercelignore`）複製到 Git 專案根目錄覆蓋。
   - 和 `main`（V2.10.0）比，網站檔案只有 `index.html`、`package.json` 有變；沒有新增或刪除網站檔案。
   - 說明文件：`CHANGELOG.md`、`README.md`、`DEPLOY.md`、`USER_GUIDE.md`、`TEST_REPORT.md`（新）、`TEST_REPORT-V2.10.0.md`（由原本的 `TEST_REPORT.md` 改名）、`admin-setup/ADMIN_SETUP.md`、`brand-assets/素材清單.md`。
   - 如果是用 GitHub 網頁上傳：`TEST_REPORT-V2.10.0.md` 是新檔，`TEST_REPORT.md` 會被新內容覆蓋，兩個都要上傳。
3. commit 到 `main`（建議訊息：`Release SNS Bookmark V2.10.1`）。Vercel 會自動部署 Production。
4. Vercel 最新一筆 **Ready**＋**Production** 後，打開正式網址，側邊欄最底部應顯示 `版本：v2.10.1 / 更新：2026-11-11 01:09`。舊版本號就按 Ctrl＋F5，手機完全關掉分頁再開。

### 部署紀錄（上線後請填）

| 項目 | 內容 |
|---|---|
| 部署前 Production | （應為 1b778e5 / V2.10.0） |
| V2.10.1 `main` commit | （填） |
| Vercel Production 狀態 | （Ready／Error） |
| 正式網址顯示版本 | （應為 v2.10.1 / 更新：2026-11-11 01:09） |

## 四、回復

- **回到 V2.10.0（最快）**：Vercel → Deployments → `1b778e5` 那一筆 →「⋯」→ **Promote to Production**（或 Instant Rollback）。之後在 GitHub `main` Revert V2.10.1 那一筆 commit。
- **資料相容性**：V2.10.1 沒有改任何資料格式。排序設定仍是 V2.10.0 的 `settings.sort`（同樣格式），回到 V2.10.0 時排序照樣能讀；V2.10.0 沒有「全部／未讀／未下載」互斥，那只是畫面上的篩選，不存資料。localStorage 沒有新增項目。

## 五、更新時間的來源（沒有改）

畫面上的更新時間來自 `index.html` 的 `<meta name="app-build">`，是小克打包時寫入的台北時間（2026-11-11 01:09），不是 Vercel 建置時間。

---

# 附錄：V2.10.0 部署說明（保留參考）

## V2.10.0 部署指南（**尚未部署，等你實機驗收並同意後再上線**）

> **部署紀錄**：小克只完成開發、檢查、測試與安裝包。依 V2.10.0 指令，未經你明確同意**沒有** push GitHub `main`、**沒有**觸發 Vercel Production、**沒有**覆蓋正式網站，也沒有開分支或 Preview。沒有修改環境變數、Google Console、Service Account、管理試算表或 Apps Script。

## 一、基準與回復版本

| 項目 | 內容 |
|---|---|
| GitHub Repository | `jonxr23/littlemonkey805-sns-bookmark` |
| 開發基準 | 你提供的 V2.9.0 ZIP（和小克交付的 V2.9.0 安裝包逐檔相同） |
| GitHub `main` 目前 | V2.8.3 ＝ commit `ae7f77e58d43196542b72ecc3c8f81b169186d45`（V2.9.0 尚未上線） |
| 回復版本 | 正式網站：V2.8.3 `ae7f77e`；安裝包：V2.9.0 `sns-bookmark-v2.9.0-complete.zip` 保留作為基準參考 |
| 正式網址 | https://littlemonkey805-sns-bookmark.vercel.app/（不變） |

Vercel 專案狀態：小克沒有 Vercel 權限，**沒有確認** Production 目前狀態；部署前請在 Vercel → Deployments 看一下目前 Production 是哪一筆。

## 二、管理試算表／Apps Script：**免更新**

`admin-setup/Code.gs` 和 V2.9.0、V2.8.3 逐位元相同；API、OAuth 範圍、環境變數、Service Account、試算表欄位都沒有改。
（如果你在管理試算表的「使用說明」工作表寫過「📁 管理分類」「🗂 分組」，可以自行改成「📁 選擇資料夾」「📚 分組」；不改也不影響功能。）

## 三、你驗收同意後的上線步驟（GitHub main → Vercel Production；不開分支、不用 Preview）

1. Vercel → Deployments：記下目前 Production 那一筆（應該是 `ae7f77e` / V2.8.3），出問題用它回復。
2. 正式網站按「備份」下載一份收藏備份。
3. 解壓縮 `sns-bookmark-v2.10.0-complete.zip`，把 `sns-bookmark-v2.10.0` 資料夾**裡面**所有檔案（含隱藏檔 `.vercelignore`）複製到 Git 專案根目錄覆蓋。
   - 和 V2.9.0 比，網站檔案只有 `index.html`、`package.json` 有變；沒有新增或刪除網站檔案（和 `main` 上的 V2.8.3 比，也只有這兩個網站檔案不同）。
   - 說明文件：`CHANGELOG.md`、`README.md`、`DEPLOY.md`、`USER_GUIDE.md`、`TEST_REPORT.md`（新）、`TEST_REPORT-V2.9.0.md`、`TEST_REPORT-V2.8.3.md`、`admin-setup/ADMIN_SETUP.md`、`brand-assets/素材清單.md`。
4. commit 到 `main` 並 Push（建議訊息：`Release SNS Bookmark V2.10.0`）。Vercel 會自動部署 Production。
5. Vercel 最新一筆 **Ready**＋**Production** 後，打開正式網址，側邊欄最底部應顯示 `版本：v2.10.0 / 更新：2026-11-10 20:53`。舊版本號就按 Ctrl＋F5，手機完全關掉分頁再開。

### 部署紀錄（上線後請填）

| 項目 | 內容 |
|---|---|
| 部署前 Production | （應為 ae7f77e / V2.8.3） |
| V2.10.0 `main` commit | （填） |
| Vercel Production 狀態 | （Ready／Error） |
| 正式網址顯示版本 | （應為 v2.10.0 / 更新：2026-11-10 20:53） |

## 四、回復

- **回到 V2.8.3（最快）**：Vercel → Deployments → `ae7f77e` 那一筆 →「⋯」→ **Promote to Production**（或 Instant Rollback）。之後在 GitHub `main` Revert V2.10.0 那一筆 commit 並 Push。
- **回到 V2.9.0**：用 `sns-bookmark-v2.9.0-complete.zip` 照第三節步驟覆蓋、commit、Push。
- **資料相容性**：V2.10.0 沒有改收藏資料、資料夾清單、分組、備份格式。只在雲端 `settings` 多一個 `sort`（排序設定）欄位，舊版會忽略它；但在舊版改平台或分組設定時會把 `sort` 覆蓋掉，之後再升回 V2.10.0 排序就回到預設（資料夾 A→Z、分組原順序）。localStorage 沒有新增項目。

## 五、更新時間的來源（沒有改）

和 V2.9.0 一樣：畫面上的更新時間來自 `index.html` 的 `<meta name="app-build">`，是小克打包時寫入的台北時間（2026-11-10 20:53），不是 Vercel 建置時間。
---

# 附錄 A：V2.8.3 部署說明（保留參考）


> **部署紀錄**：本包只交付檔案。小克**沒有** commit、push GitHub 或部署 Vercel，因為這個工作環境連不到你的 GitHub 專案和 Vercel 帳號，也沒有你的權限。下面第四節的部署紀錄請你推送後自己填。小克也沒有修改環境變數、Google Console、Service Account 或管理試算表。

### 一、正式部署方式（已確認）

- **不建立 Git 分支、不使用 Vercel Preview、不另外開測試網址、不平行部署多個版本。**
- V2.8.2 是這次程式修改的唯一基底；完成後直接更新 GitHub `main` → Vercel 自動部署 **Production**，以 **V2.8.3 直接取代目前正式版**。
- 正式網址不變：**https://littlemonkey805-sns-bookmark.vercel.app/**
- 你 11/10 的截圖裡，正式網站已經顯示 `v2.8.1`。所以這次是 **V2.8.1（或你已部署的 V2.8.2）→ V2.8.3**。
- 部署後直接在正式網址做桌機、手機與真實 Google 驗收（`TEST_REPORT.md` 第五節）。

### 二、部署前準備（約 3 分鐘）

1. **記下目前正式版**：Vercel → 專案 → Deployments，記下目前標示 Production 的那一筆（時間或網址）；GitHub `main` 最新一筆 commit 也記下來。出問題時用這一筆回復。
2. **保留 V2.8.2 完整備份**：`sns-bookmark-v2.8.2-complete.zip` 先留著不要刪。只是備份，**不要**另外部署它。
3. **備份收藏**：用平常的帳號打開正式網站，按右上「備份」下載一份備份檔。

### 三、管理試算表／Apps Script：**免更新**

- V2.8.3 的 `admin-setup/Code.gs` 和 V2.8.2、V2.8.1 逐位元相同，這次沒有改 API、Apps Script、OAuth 範圍、環境變數、Service Account 或試算表欄位。
- **只有一個前提**：上 V2.8.1 時，你已經照舊版說明貼上這份 Code.gs、執行過 `setupAdminSheet`，「檢查設定」有六個 ✅。如果當時還沒做，請先做 `admin-setup/ADMIN_SETUP.md` 最後的「V2.8.0 更新步驟」，不然公告會載入失敗（`502 sheet_missing`）。

### 四、更新網站（GitHub main → Vercel Production）

1. 解壓縮 `sns-bookmark-v2.8.3-complete.zip`，得到唯一最外層資料夾 `sns-bookmark-v2.8.3`。
2. 把資料夾**裡面所有檔案與資料夾**（含隱藏檔 `.vercelignore`）複製到 Git 專案根目錄，覆蓋同名檔案。不要把外層資料夾整個再套一層。
   - 這次真正變動的網站檔案：`index.html`、`package.json`，**新增** `assets/monkey-logo.png`（漢堡選單小猴 Logo，一定要一起上傳，否則選單頂端會缺圖）。
   - 說明文件：`CHANGELOG.md`、`TEST_REPORT.md`（新）、`TEST_REPORT-V2.8.2.md`（舊報告改名）、`README.md`、`DEPLOY.md`、`USER_GUIDE.md`、`admin-setup/ADMIN_SETUP.md`、`brand-assets/素材清單.md`。
   - 沒有變：`api/` 全部、`admin-setup/Code.gs`、`vercel.json`、`.vercelignore`、`manifest.webmanifest`、其他 `assets/` 圖檔。
3. 確認 GitHub Desktop 的變更清單有 `assets/monkey-logo.png`，再直接 commit 到 `main` 並 Push。commit 訊息建議：`V2.8.3：分組管理入口、新增資料夾流程、手機選單品牌標頭、作者署名、預設主題背景圖修正`。
4. Vercel → Deployments：確認最新一筆是 **Ready** 且標示 **Production**。
5. 打開正式網址，左側資料夾欄（手機在 ☰ 選單）最底部應顯示：
   - 電腦：`作者：littlemonkey805`，下一行 `版本：v2.8.3 / 更新：2026-11-10 14:21`
   - 手機：`作者：littlemonkey805 / 版本：v2.8.3 / 更新：2026-11-10 14:21`（同一行）
   如果還是舊版本號：電腦按 Ctrl＋F5，手機把分頁或主畫面捷徑完全關掉再開。

### 部署紀錄（請推送後填寫）

| 項目 | 內容 |
|---|---|
| 部署前 Production（回復用） | （填 Vercel 那一筆的時間／網址） |
| 部署前 `main` commit | （填） |
| V2.8.3 `main` commit | （填） |
| Vercel Production 狀態 | （Ready／Error） |
| 正式網址顯示版本 | （應為 v2.8.3 / 更新：2026-11-10 14:21） |

### 關於「更新時間」

專案沒有建置步驟（Vercel 直接發布靜態檔案），所以畫面上的更新時間來自 `index.html` 開頭的 `<meta name="app-build">`，是**小克打包時寫入的台北時間**，不是使用者開網頁的時間，也不會寫死成舊日期。它**不是** Vercel 實際建置的時間；要改成 Vercel 自動寫入，就得在 `vercel.json` 加建置指令，會動到部署架構，這版沒有做（見 CHANGELOG）。之後手動改了 index.html 再發布，請一起改這一行和 `app-version`。

### 五、正式版回復方式（出問題時）

- **最快**：Vercel → Deployments → 找到第二節記下的那一筆 →「⋯」→ **Promote to Production**（或 Instant Rollback）。之後再把 GitHub `main` 也還原（下一點），避免下次 push 又部署 V2.8.3。
- **GitHub**：在 `main` 對 V2.8.3 那一筆 commit 做 Revert（GitHub Desktop：History → 右鍵 → Revert changes in commit）→ Push。
- **資料相容性**：V2.8.3 沒有改收藏資料格式。新增的 localStorage「pbg」（預設主題背景圖）舊版不會讀，回復後預設主題不顯示背景圖，「自訂」主題的設定不受影響。

---

# 附錄 B：V2.6.0 → V2.8.x 首次升級說明（保留參考）

> 以下是 V2.8.1／V2.8.2 時從 V2.6.0 首次升級的完整步驟，保留給「管理試算表還沒升級」或「全新安裝」時參考；文中的版本號與 ZIP 名稱請換成 V2.10.2。


> 本包只交付檔案。小克沒有 commit、沒有 push GitHub、沒有部署 Vercel、沒有修改環境變數、Google Console、Service Account 或管理試算表。下面是你確認後要做的正式替換步驟。

### A1. 正式部署方式（已確認）

- **不建立 Git 分支、不使用 Preview、不維持兩個版本並行。**
- 直接以 **V2.8.2 替換目前正式網站 V2.6.0**：更新 GitHub `main` → Vercel 自動部署 **Production**。
- 只有一個正式網址：**https://littlemonkey805-sns-bookmark.vercel.app/**
- 部署後直接在這個正式網址做桌機、手機與真實 Google 整合測試（清單見 `TEST_REPORT.md` 第五節）。
- 保留回復方式（第五節）。

V2.7.0、V2.8.0 沒有單獨上線，這一次是 **V2.6.0 → V2.8.2** 一次到位。

### A2. 部署前準備（約 5 分鐘，建議都做）

0. **（V2.8.2）先清掉空白收藏**：如果現在卡片模式是空白、只有表格看得到，先在表格找「平台、備註都空白、收藏日 1970-01-01」的列，點開後按「刪除」。不清也可以，V2.8.2 上線後這種資料會顯示成有 ⚠️ 提示的卡片，到時再刪。**不要**直接去 Google 試算表刪列。

1. **記下目前正式版**：Vercel → 專案 → Deployments，找到目前標示 Production 的那一筆（V2.6.0），記下它的時間或網址；GitHub `main` 最新一筆 commit 也記下來。出問題時用這一筆回復。
2. **備份收藏**：用平常的帳號打開正式網站，按右上「備份」下載一份備份檔。
3. **備份管理試算表**：開啟 `SNS_Bookmark_Admin` → 檔案 → 建立副本（副本只是保險，不會被程式使用）。
4. **備份目前的 Apps Script**：管理試算表 → 擴充功能 → Apps Script，把現在的 `Code.gs` 全選複製，貼到記事本存起來。

### A3. 先更新管理試算表（必須先完成；此時不要部署網站）

> **順序不可顛倒：先完成本節的管理端升級與驗證，再進行第四節的 GitHub `main`／Vercel Production 更新。不要先部署網站。** V2.8.2 的公告 API 需要「公告管理」工作表；如果網站先部署、管理表還沒有這張工作表，公告 API 會回傳 `502 sheet_missing`，公告中心無法正常載入。

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

### A4. 更新網站（GitHub main → Vercel Production；管理端驗證完成後才做）

1. 解壓縮 `sns-bookmark-v2.8.2-complete.zip`，得到唯一最外層資料夾 `sns-bookmark-v2.8.2`。
2. 把資料夾**裡面所有檔案與資料夾**（含隱藏檔 `.vercelignore`）複製到 Git 專案根目錄，覆蓋同名檔案。不要把外層資料夾整個再套一層：
   - 會被更新：`index.html`、`package.json`、`.vercelignore`、`admin-setup/Code.gs`、`admin-setup/ADMIN_SETUP.md`、各說明文件。
   - **會新增**：`api/announcements.js`、`assets/`、`brand-assets/`、`manifest.webmanifest` 及歷史測試報告。
   - `brand-assets/` 是原始素材封存資料夾，`.vercelignore` 會排除它，不會作為網站公開檔案部署。
   - 沒有變：`vercel.json`、`api/_lib/`、`api/auth/`、`api/activity.js`、`api/help.js`。
3. 直接 commit 到 GitHub `main` 並 Push。**不建立分支、不使用 Preview、不維持兩個版本並行。** Vercel 會自動部署 Production；不需要修改任何環境變數。
4. Vercel → Deployments 確認最新一筆是 **Ready** 且標示 **Production**。
5. 打開唯一正式網址 `https://littlemonkey805-sns-bookmark.vercel.app/`，左側資料夾欄（手機在 ☰ 抽屜）最底部應顯示「版本：v2.8.2」。桌機、手機都在這個正式網址驗收；手機加到主畫面的請完全關掉再打開。

### A5. 正式版回復方式（出問題時）

**網站**（擇一）：
- **最快**：Vercel → Deployments → 找到第二節記下的 V2.6.0 那一筆 → 「⋯」→ **Promote to Production**（或 Instant Rollback）。幾秒內正式網址就回到 V2.6.0。之後再把 GitHub `main` 也還原（下一點），避免下次 push 又部署 V2.8.2。
- **GitHub**：在 `main` 對 V2.8.2 那一筆 commit 做 Revert（GitHub Desktop：History → 右鍵那一筆 → Revert changes in commit）→ Push，Vercel 會自動部署回 V2.6.0。

**資料相容性**：V2.7.0～V2.8.2 都沒有改收藏資料格式，V2.6.0 可以直接讀取。回復後：
- 「品牌桃」變回「可愛」、相簿模式與 📢 公告入口消失；分組選擇器新增的分組仍然存在。
- 主題：V2.6.0 只會讀取裝置上的主題設定，已經被轉成品牌桃的裝置會顯示「可愛」主題，可以手動切回。

**管理試算表**：新的「公告管理」「意見回饋紀錄」可以保留，V2.6.0 不會讀取它們；新版 Code.gs 也不需要退回（原本四個工作表的功能相同）。真的要退回時，把第二節備份的舊 Code.gs 貼回去即可。


## 其他注意事項

### 瀏覽器分頁圖示（Favicon）沒有立刻換掉？

瀏覽器會把舊的分頁圖示快取很久。電腦版按 Ctrl＋F5（Mac：⌘＋Shift＋R）強制重新整理；手機已加到主畫面的捷徑，要**刪掉捷徑再重新「加入主畫面」**才會換成 Fav小。

### 之後要替換品牌圖檔（不用改程式）

網站讀的是 `assets/` 裡固定檔名的圖片，用同樣檔名覆蓋即可：

| 用途 | 網站讀取的檔案 | 對應原始素材 |
|---|---|---|
| 淺色背景 Logo | `assets/logo-light.png` | SNS文章收藏夾-主題適應版-淺色.png |
| 深色背景 Logo | `assets/logo-dark.png` | SNS文章收藏夾-主題適應版-深色.png |
| 自訂上傳背景 Logo | `assets/logo-custom.png` | SNS文章收藏夾-主題適應版-自訂背景.png（與深色版同一張，刻意共用） |
| 手機漢堡選單小猴 Logo | `assets/monkey-logo.png` | 猴子Logo.png（＝ V2.8.3 參考附件 00_小猴Logo_唯一指定原始素材.png，逐位元相同，未修改） |
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

## 全新安裝（第一次部署，參考用）

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

1. 把 `sns-bookmark-v3.0.0` 資料夾裡的所有檔案（含 `.vercelignore`）放進 Git 專案根目錄。
2. 在 Vercel 設好四個環境變數。
3. Push 或 Redeploy。
4. 打開網站 → 按「登入 Google」。
5. 照 `admin-setup/ADMIN_SETUP.md` 設定管理中心（可以之後再做）。

登入流程、帳號安全規則、圖片生命週期管理的完整說明沒有變，請看 `HISTORY-V2.2.0.md` 第五～七節。
