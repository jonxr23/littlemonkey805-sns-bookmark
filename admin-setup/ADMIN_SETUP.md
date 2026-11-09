# SNS_Bookmark 管理中心：第一次設定指南（V2.5.0）

這份指南只需要做**一次**。之後更新 App 版本時，沿用同一份試算表、同一組環境變數，不需要重建，也不會清空歷史資料。

整體架構：

```
你的 Google 雲端硬碟
└── SNS_Bookmark_管理中心（資料夾，只有你自己能看到）
    └── SNS_Bookmark_Admin（Google 試算表）
        ├── 使用者總覽          ← 自動統計
        ├── 使用者活動紀錄      ← App 自動寫入
        ├── OAuth 測試名單      ← 你登記 Gmail
        └── 使用說明與 Q&A      ← App 的「ⓘ 使用說明」內容

Vercel 伺服器 ──（Service Account，只被分享這一份試算表）──▶ SNS_Bookmark_Admin
```

- 一般使用者自己的 `SNS_Bookmark` 收藏資料夾完全不變，也不會被 Service Account 碰到。
- 一般使用者的 OAuth 權限沒有增加（仍是 `drive.file`）。
- 管理資料只透過 Vercel 後端存取；App 只能「寫入活動紀錄」和「讀取已勾選顯示的使用說明」，沒有任何讀取使用者名單的 API。

預計需要 20～30 分鐘。

---

## 步驟 1：建立資料夾與試算表

1. 用**你自己（管理者）的 Google 帳號**打開 [Google 雲端硬碟](https://drive.google.com)。
2. 左上「＋ 新增」→「新資料夾」，名稱輸入 `SNS_Bookmark_管理中心` → 建立。
3. 打開這個資料夾，按「＋ 新增」→「Google 試算表」→「空白試算表」。
4. 左上角把「未命名的試算表」改名為 `SNS_Bookmark_Admin`。
5. 看網址列，網址長這樣：
   `https://docs.google.com/spreadsheets/d/`**`1AbCdEf……XyZ`**`/edit`
   中間粗體那一段就是**試算表 ID**，先複製到記事本（步驟 5 會用到）。

> 如果你之前已經建過 `SNS_Bookmark_Admin`：不要重建，直接用原本那一份，從步驟 2 繼續（步驟 2 的設定可以重複執行，不會刪資料）。

## 步驟 2：安裝 Apps Script，建立四個工作表

1. 在 `SNS_Bookmark_Admin` 試算表上方選單：**擴充功能 → Apps Script**。
2. 會開啟新分頁。左邊有一個 `程式碼.gs`（或 `Code.gs`），把裡面原本的內容**全部刪掉**。
3. 打開 ZIP 裡的 `admin-setup/Code.gs`，全選複製，貼進去。
4. 按上方的 💾（儲存專案）。專案名稱可以取 `SNS_Bookmark 管理中心`。
5. 上方函式選單選 `setupAdminSheet`，按「▶ 執行」。
6. 第一次執行會要求授權：
   - 按「審查權限」→ 選你的 Google 帳號。
   - 出現「Google 尚未驗證這個應用程式」→ 按左下「進階」→「前往 SNS_Bookmark 管理中心（不安全）」。這是你自己寫給自己用的腳本，所以 Google 會這樣提示。
   - 按「允許」。（這份腳本只要求「查看及管理這份試算表」的權限）
7. 執行完成後回到試算表分頁，應該會看到四個工作表：`使用者總覽`、`使用者活動紀錄`、`OAuth 測試名單`、`使用說明與 Q&A`，右下角出現「四個工作表都已設定完成」。
8. 重新整理試算表頁面，上方會多一個「**SNS_Bookmark 管理**」選單：
   - 「重新套用格式（不會刪除資料）」：格式被弄亂時可以按。
   - 「檢查設定」：檢查工作表、時區、Service Account 是否已分享，並顯示試算表 ID。

> Apps Script 也會把試算表時區設為 **Asia/Taipei**，所以「距今天數」「最近 7 天」都用台北時間計算。

### Apps Script 做了什麼

| 工作表 | 自動設定 |
|---|---|
| 使用者總覽 | 11 項統計公式（總帳號數、7／30 天活躍、從未使用、長期未使用、已登記測試帳號 `X／100`、已登記但沒用過、已標記刪除、未登記但有使用、最近一次活動時間） |
| 使用者活動紀錄 | 標題列、「距今天數」「活動狀態」「測試名單比對」三欄自動計算、日期格式、顏色（綠 0～7 天、黃 8～30、橘 31～59、紅 60 以上、灰 未登入）、篩選器、交錯底色、凍結標題 |
| OAuth 測試名單 | 第 1 列黃色「新增 Mail」輸入格、第 2 列限制說明、第 3 列標題、「是否刪除」核取方塊、比對結果／最後使用時間／距今天數自動計算、重複 Email 標紅、已刪除列灰色刪除線 |
| 使用說明與 Q&A | 標題列、「類型」下拉選單（注意事項／Q&A）、「是否顯示」核取方塊、放入初始的 14 項說明（只有工作表是空的時候才放） |

編輯時自動處理（`onEdit`，不用另外設定觸發條件）：
- 在 `OAuth 測試名單` 的 B1 輸入 Gmail → 自動加到名單最下面、記錄首次加入日期、次數 1、清空輸入格。
- 重複的 Gmail：
  - 還在名單中 → 「這個 Google Mail 已經在測試名單中，不需要重複新增。」
  - 之前勾選刪除 → 「這個帳號之前已經登記過，目前有刪除標記。若要重新加入，請找到原本紀錄並取消『是否刪除』勾選。」
  - 都不會新增第二筆。直接在 A 欄手動打入重複的 Gmail 也會被還原。
- 取消「是否刪除」的勾選 → 首次加入日期保留，「最近重新加入日期」更新、「歷史加入次數」+1。
- 在 `使用說明與 Q&A` 修改任何一列 → 自動填 ID（空白時）、建立日期（空白時）、最後修改日期。

## 步驟 3：建立 Service Account（讓 Vercel 能寫入這一份試算表）

Service Account 是「給伺服器用的 Google 帳號」。我們讓它**只**能存取 `SNS_Bookmark_Admin` 這一份試算表。

1. 打開 [Google Cloud Console](https://console.cloud.google.com/)，上方專案選單選**你目前 OAuth 用的那個專案**（建立 Client ID `840119973043-…` 的專案）。
2. 確認 Google Sheets API 已啟用：左側「API 和服務」→「已啟用的 API 和服務」，清單裡要有 **Google Sheets API**。沒有的話：「＋ 啟用 API 和服務」→ 搜尋 `Google Sheets API` → 啟用。（App 本來就用 Sheets API，通常已啟用）
3. 左側選單「IAM 與管理」→「服務帳戶」→ 上方「＋ 建立服務帳戶」。
   - 服務帳戶名稱：`sns-bookmark-admin`
   - 按「建立並繼續」。
   - 「授予這個服務帳戶專案存取權」：**不要選任何角色**，直接按「繼續」→「完成」。（它不需要專案權限，只需要那一份試算表）
4. 回到服務帳戶清單，記下它的電子郵件，長這樣：
   `sns-bookmark-admin@你的專案ID.iam.gserviceaccount.com`
5. 點進這個服務帳戶 → 上方「金鑰」分頁 →「新增金鑰」→「建立新的金鑰」→ 選 **JSON** →「建立」。
   瀏覽器會下載一個 `.json` 檔案。**這個檔案就是密碼**：
   - 不要上傳到 GitHub、不要寄給任何人、不要貼到聊天對話（包括貼給 Claude）。
   - 步驟 5 填完 Vercel 之後，建議把它移到安全的地方或刪除。
   - 如果不小心外流：回到「金鑰」分頁把那把金鑰刪掉，再建立一把新的。

> 如果出現「金鑰建立已停用」（組織政策 `iam.disableServiceAccountKeyCreation`）：這通常發生在公司或學校的 Google Workspace 專案。個人 Gmail 建立的專案一般不會遇到。遇到時請告訴我，需要改用其他驗證方式。

## 步驟 4：只把試算表分享給 Service Account

1. 回到 `SNS_Bookmark_Admin` 試算表，右上角「共用」。
2. 輸入步驟 3-4 的 Service Account 電子郵件（`…@…iam.gserviceaccount.com`）。
3. 權限選「**編輯者**」。
4. 取消勾選「通知使用者」，按「共用」。

注意：
- **只分享這一份試算表**，不要分享 `SNS_Bookmark_管理中心` 資料夾，也不要分享整個雲端硬碟。
- 不要把試算表設成「知道連結的任何人」。一般使用者完全不需要看到這份試算表。
- 完成後可以用選單「SNS_Bookmark 管理 → 檢查設定」，確認「Service Account 編輯者」有出現那個 Email。

## 步驟 5：設定 Vercel 環境變數

Vercel → 你的專案 → **Settings → Environment Variables**。新增以下變數（Environment 勾 **Production**；如果你也會用 Preview 網址測試，再勾 Preview）：

| 名稱 | 填什麼 | 從哪裡拿 |
|---|---|---|
| `ADMIN_SHEET_ID` | 試算表 ID（只要中間那一段，不要整個網址） | 步驟 1-5 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `sns-bookmark-admin@….iam.gserviceaccount.com` | 步驟 3-4，也是 JSON 檔裡的 `client_email` |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | JSON 檔裡 `private_key` 的值 | 見下方說明 |
| `ACTIVITY_KEY_SECRET` | 自己產生 32 字元以上的隨機字串 | `openssl rand -base64 32` 或密碼管理員 |

### 私鑰怎麼貼（最容易出錯的地方）

1. 用記事本（或任何純文字編輯器）打開步驟 3 下載的 `.json` 檔。
2. 找到 `"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEv……\n-----END PRIVATE KEY-----\n",`
3. 複製**兩個雙引號中間**的內容，也就是從 `-----BEGIN PRIVATE KEY-----` 一直到 `-----END PRIVATE KEY-----\n`。
4. 原封不動貼到 Vercel 的 Value 欄位。裡面的 `\n` 不用改成換行，程式會自動處理；前後多貼了雙引號也沒關係。

> 另一種方式：不填 `GOOGLE_SERVICE_ACCOUNT_EMAIL` 和 `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`，改新增一個 `GOOGLE_SERVICE_ACCOUNT_JSON`，把整個 JSON 檔的內容（從 `{` 到 `}`）貼進去。兩種擇一即可。

### 關於 `ACTIVITY_KEY_SECRET`

- 用來把每個人的 Google 帳號 ID（sub）轉成不可逆的「使用者識別 Key」，試算表不存原始帳號 ID。
- **設定後就不要再改**。改了會讓同一個人被當成新使用者，產生第二列。
- 沒有設定時會改用 `SESSION_SECRET` 推導；但之後若更換 `SESSION_SECRET` 也會產生同樣問題，所以建議設定一個獨立的值。

### 套用

設定完成後，到 **Deployments → 最新一筆 → ⋯ → Redeploy**。環境變數只有在重新部署後才會生效。

原本的 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET`、`APP_URL` 保持不變。

## 步驟 6：登記 OAuth 測試使用者

每當你在 Google Cloud Console 的「OAuth 同意畫面 → 測試使用者」加入一位朋友：

1. 打開 `OAuth 測試名單` 工作表。
2. 在第 1 列黃色格（B1）輸入他的 Gmail，按 Enter。
3. 下方自動新增一列。之後他是否登入、最後使用時間，全部由 App 自動比對。

要把某人移出測試名單時：
1. 到 Google Cloud Console 移除這個測試使用者（**一定要做，App 沒辦法幫你做**）。
2. 在名單勾選「是否刪除」。這只是你的管理標記，歷史資料會保留。

`使用者總覽` 裡的「已登記名額提醒 `X／100`」是**你自己登記的名單統計**，不代表 Google Cloud Console 即時實際名額或剩餘配額；移除測試使用者後 Google 是否立即釋出名額，以 Console 為準。

## 步驟 7：確認管理紀錄正常寫入

1. 打開 App，登入 Google。
2. 等 5 秒左右，回到 `使用者活動紀錄`：應該出現一列你的 Gmail、首次使用時間、最後使用時間、最近操作類型「開啟 App」。
3. 在 App 點開一張卡片（查看明細），約 5 秒後「最近操作類型」變成「查看收藏明細」，「最後資料異動時間」仍是空白。
4. 在 App 新增或修改一筆收藏並儲存，約 2 秒後「最後資料異動時間」出現時間。
5. 回到 `使用者總覽`，「總使用帳號數」「最近 7 天活躍帳號數」應該是 1 以上。

沒有出現時：
- 確認 Vercel 已 Redeploy。
- Vercel → 專案 → Logs，看 `/api/activity` 的狀態碼：
  - `503 not_configured`：環境變數名稱拼錯或沒填。
  - `502 sa`：Service Account 私鑰或 Email 錯誤（重貼私鑰）。
  - `502 key`：私鑰格式錯誤（確認是從 `-----BEGIN` 到 `-----END PRIVATE KEY-----\n`）。
  - `502 sheets_403`：試算表沒有分享給 Service Account，或分享成「檢視者」。
  - `502 sheets_404`：`ADMIN_SHEET_ID` 填錯。
  - `502 sheets_400`：工作表名稱被改過，請執行「重新套用格式」或把名稱改回來。
- 這些錯誤只會讓活動紀錄寫不進去，**不會影響使用者登入、收藏、圖片、同步**。

為了減少寫入次數，App 有節流：同一種操作 10 分鐘內只記一次（新增／編輯／刪除／批次操作每次都記）。

## 步驟 8：確認一般使用者讀不到管理資料

1. 用瀏覽器打開 `https://littlemonkey805-sns-bookmark.vercel.app/api/help`：只會看到「是否顯示」有勾選的說明項目（id、type、order、title、body 五個欄位）。不會有 Email、時間、測試名單。
2. 打開 `https://littlemonkey805-sns-bookmark.vercel.app/api/activity`（瀏覽器直接開是 GET）：會看到 `{"error":"forbidden"}`。這個 API 只接受 App 送出的寫入，不提供任何讀取。
3. 用**另一個 Google 帳號**（非管理者）打開試算表網址：應該顯示「需要存取權」。
4. 試算表的「共用」名單裡應該只有你自己和 Service Account。

## 修改使用說明與 Q&A（之後的日常操作）

- 打開 `使用說明與 Q&A` 工作表直接修改，不需要改程式、不需要重新部署。
- 新增一列：填「類型」（注意事項／Q&A）、「排序」（數字小的在前面）、「標題」、「內容」，勾選「是否顯示」。
- 暫時不想顯示：取消勾選「是否顯示」。
- 內容可以換行（在儲存格內按 Ctrl+Enter；Mac 按 ⌘+Enter）。內容一律當純文字顯示，寫 HTML 也不會被執行。
- App 端有快取：伺服器 1 分鐘、使用者的瀏覽器 5 分鐘。修改後最多約 6 分鐘內，所有人重新打開使用說明就會看到新內容。

## 更新 App 版本時

- 不需要重做這份指南。試算表、Service Account、環境變數都沿用。
- 新版本如果改了 `Code.gs`，只要把新的內容貼進 Apps Script、儲存，再執行一次「重新套用格式」即可；既有資料不會被刪除。
