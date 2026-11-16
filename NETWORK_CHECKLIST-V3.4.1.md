# V3.4.1 正式網站 Network 實測清單

上線後用電腦版 Chrome 在正式網址實測。測試環境的數字是模擬的，這份清單用來確認正式網站實際的呼叫次數。

## 準備

1. 打開 https://littlemonkey805-sns-bookmark.vercel.app/ 並登入 Google。
2. 按 F12 → **Network** 分頁 → 勾選 **Preserve log**。
3. 篩選欄輸入 `api/`，只看自己網站的 API。
4. 每做完一項，按 🚫（Clear）清空再做下一項。
5. 點某一列 → **Payload** 看送出的內容（`info`、`res`、`vc`、`noPub`）；**Response** 看回傳內容與 `trace`（伺服器實際連了哪些平台）。

> 開網頁時固定會有 `announcements`、`token`、`activity`（open）各 1 次，和 V3.4.0 相同，不算在下面的項目裡。

## 檢查項目（預期次數）

| # | 操作 | `resolve` 預期 | `activity` 預期 | 要確認 |
|---|---|---|---|---|
| 1 | 新增收藏，**逐字**打一個完整的 YouTube 網址 | **1** | 0 | 打字過程中沒有一直出現 resolve |
| 2 | 新增收藏，**貼上**一個 YouTube 網址（沒貼過的影片） | 1 | 0 | Payload 有 `info:1`；帳號、文字、日期照常帶入 |
| 3 | 貼上網址有帳號的 IG Reel（`instagram.com/帳號/reel/…`） | **0** | 0 | 帳號、日期照常帶入 |
| 4 | 貼上 Threads 正式網址（`threads.com/@帳號/post/…`） | **0** | 0 | 帳號、日期照常帶入 |
| 5 | 貼上 IG Reel（`instagram.com/reel/…`，網址沒有帳號） | 1 | 0 | 照常查詢 |
| 6 | 貼上 TikTok、Threads、小紅書的手機分享短網址 | **1** | 0 | Payload 有 `info:1, res:1`；已收藏過時照常顯示重複提醒 |
| 7 | 貼上 X 影片網址 | **1** | 0 | Payload 有 `info:1, vc:1`；**不應該**另外出現 `cover:1`（除非第一次查詢失敗） |
| 8 | 打開「編輯」一筆帳號、文字、日期都有的舊收藏 | **0** | 0 | — |
| 9 | 同一個網址再貼一次（同一頁） | 0 | 0 | — |
| 10 | 重新整理網頁後，貼第 2 項同一個網址 | **0** | 0 | 結果和第一次相同（從這台裝置的快取帶入） |
| 11 | 同一支 YouTube 加上 `&si=xxx&t=42` 再貼 | **0** | 0 | — |
| 12 | 編輯一筆 YouTube 收藏：有日期、「貼上的文字」空白 | 1 | 0 | Payload 有 `noPub:1`；Response 的 `trace` 只有 `www.youtube.com/oembed`，沒有 `www.youtube.com/watch` |
| 13 | 接著把網址換成另一支影片 | 1 | 0 | Payload **沒有** `noPub`；日期換成新影片的 |
| 14 | 10 分鐘內新增／編輯 5 筆收藏 | — | 第一次 1 次，10 分鐘到時再 1 次（共 2 次） | 每一筆收藏都立即存到 Google 試算表 |

## 另外可以看的地方

- **Vercel 後台 → Usage → Functions**：上線一週後比較 `/api/resolve`、`/api/activity` 的呼叫次數（Invocations）和記憶體時間（Provisioned Memory），和上線前一週相比。
- `resolve` 的 Response 裡 `trace` 出現 `graph.facebook.com … 400` 時，代表 IG／FB 的 Meta oEmbed 沒有權限（盤點時提到的疑點），可以回報給小克。
