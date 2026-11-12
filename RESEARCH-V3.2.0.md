# SNS Bookmark V3.2.0｜九平台資料來源研究與比較（小克 × 小澄）

日期：2026-11-12　依據：小克《八平台研究報告 第一版》、小澄《九平台技術研究補充報告 第一版》、猴猴《七項問題最終決定》

> **限制**：小克的開發環境連不到任何社群平台，所以下表全部是「文件可行性」與「開發副本模擬測試」。**沒有一項做過本機實際連線或 Vercel 正式環境測試**。
> 分類：✅ 已確認（有官方或可靠公開文件）、🟡 有條件、🔬 理論上可能，尚未驗證、🚀 需要 Vercel 正式環境測試、⛔ 不建議／排除。凡是要連線的，全部同時是 🚀。

## 一、逐平台比較與最後採用

| 平台 | 小克第一版 | 小澄 | 差異與修正 | V3.2.0 最後採用 | 理由 |
|---|---|---|---|---|---|
| **Bilibili** | `x/web-interface/view`（owner.name、title），備援影片頁 og:title／author ✅🚀 | 同一介面；提醒它是**非官方、逆向整理**、可能需要 Cookie | 小澄說得對：這不是官方保證的 API。小克補充：沒有 Cookie 就拿不到時直接放棄，不要求使用者給 Cookie | 介面 → 影片頁 meta → 分享文字標題（只有標題） | 免費、匿名、欄位剛好符合；失敗容許放棄 🟡🚀 |
| **YouTube**（新增） | 第一版沒有列入 | 官方 oEmbed：author_name（頻道名稱）、title | 無衝突 | 官方 oEmbed `youtube.com/oembed` | 官方、免費、免金鑰，兩個欄位都有；不需要 Data API（要金鑰和配額） ✅🚀 |
| **抖音** | 公開分享頁 iesdouyin 頁面資料，通常要手機 User-Agent 🔬 | 官方開放平台要 OAuth＋使用者授權 → 不符合；公開頁面**不能視為已確認** | 兩邊一致：排除官方 API；公開頁只能算 🔬 | iesdouyin 公開分享頁（手機瀏覽器 UA，Q5 已同意）→ 分享文字「【作者的作品】描述」 | 不需授權；遇到驗證頁就放棄。分享文字備援不需連線 🔬🚀 |
| **TikTok** | 官方 oEmbed，「依 oEmbed 慣例」回傳 author_name、title ✅🚀 | 官方影片 oEmbed 文件**沒有列出** author_name、title；Embed Videos 即將淘汰 | **小澄正確，小克修正**：官方文件確實沒列出這兩個欄位，第一版的寫法過度樂觀。改為：帳號用網址 @帳號（Q3）；描述只有在回應裡真的有 `title` 字串時才用 | 帳號：網址／短網址解析的 @帳號（V3.1.0 既有）；描述：oEmbed `title`（有才用，沒有就留空） | 帳號不需額外查詢；描述能拿到就拿，拿不到依規則留空 🟡🚀 |
| **微博** | `m.weibo.cn/statuses/show`：screen_name、text、retweeted_status、page_info 🔬🚀；C／D 反查要 Cookie | 欄位 `text_raw`、`text`、`page_info.page_title／content1／content2`；C／D 要 Cookie 就不反查 | 一致。小澄補充 `text_raw`（純文字）—已採用，優先用 `text_raw`，沒有才把 `text`（HTML）轉純文字 | A／B／t.cn：statuses/show（長文另讀 statuses/extend）。帳號＝`user.screen_name`（轉發就是轉發者）；文字＝影片標題 → 轉發者的話 → 原始正文，各自成功各自帶入、去重。C／D：不連線 | 不需登入；C／D 需要訪客 Cookie，依規則不做 🔬🚀 |
| **Facebook** | Meta oEmbed（2026/6/15 起免權杖），author_name 已在 2025/11/3 移除，只能從 html 嵌入碼解析 🟡🚀 | 同：免權杖不代表拿得到作者與全文；分開個人／粉專；/share/{code}/ 要補強 | 一致 | `graph.facebook.com/v25.0/oembed_post`（影片用 `oembed_video`），從嵌入碼的 `<p>` 取正文、「Posted by」取顯示名稱；名稱是純數字就不填 | 官方、免費、免權杖；只有公開內容（多半是粉專），個人貼文通常拿不到 🟡🚀 |
| **Facebook 分享網址** | 推測「沒有提醒」是因為 pfbid 不同被當成沒重複 | 解析不出能確定比對的 ID 就提醒 | 一致 | 手機 `/share/…` 解析不出能確定比對的結果（或已收藏的 Facebook 分享網址無法確定）→ 顯示 Q6 指定文案，不擋儲存 | pfbid 是加密 ID，同一篇可能不同，不能當成「確定沒重複」 |
| **Threads** | 官方 oEmbed（免權杖、每小時 1,000 次）＋貼文頁 og:description 🟡🔬 | 嵌入 HTML **不等於**正文；若要 embed.js 才顯示，不可把 HTML 當文字存 | 一致。採用小澄的保護：只取嵌入碼裡**明確的文字段落**，只有連結就當沒取得 | 帳號：網址 @帳號（Q3）；正文：公開貼文頁 og:description → oEmbed 嵌入碼段落 | 都是公開資料；拿不到就留空 🔬🚀 |
| **X** | 官方 oEmbed（author_name＋html）🟡🚀；非官方 syndication ⛔ | 官方 API 付費排除；oEmbed 是嵌入用途，不能直接等同正文 API | 一致。實作只取嵌入碼 `<blockquote class="twitter-tweet"><p>` 裡的伺服器端文字，不執行任何 script | 帳號：網址 @帳號（Q3）；正文：oEmbed 嵌入碼的 `<p>`（去掉結尾 pic.twitter.com 連結） | 官方免費端點；格式變了就留空 🟡🚀 |
| **Instagram** | Meta oEmbed 免權杖但沒有 author_name；公開嵌入頁 `/embed/captioned/` 🔬 | `/p/{shortcode}/` 網址本身沒有帳號，不能假設一定拿得到 @帳號 | **小澄正確**：Q3 要 @帳號，但 `/p/` 網址沒有帳號 | 帳號：網址有就用 → oEmbed 嵌入碼「(@帳號)」→ 公開嵌入頁；說明文字：公開嵌入頁 Caption；全都拿不到就提示＋留空 | 都是公開資料；Instagram 對資料中心 IP 常要求登入，被擋就放棄 🔬🚀 |

## 二、排除的方案

| 方案 | 原因 |
|---|---|
| 各平台付費 API（X API 等） | 規則：不使用付費服務 |
| 需要授權或金鑰的官方 API（抖音開放平台、YouTube Data API） | 要 OAuth 或金鑰；YouTube oEmbed 已足夠 |
| 抖音電腦版資料介面（a_bogus 簽章） | 屬於繞過防護 |
| 微博影片頁 C／D 反查原始微博（需要訪客 Cookie） | 不偽造 Cookie |
| X syndication 等非公開介面 | 非官方、需要猜 token |
| 第三方解析服務（Apify 等） | 付費／不必要的依賴 |

## 三、User-Agent（Q5）

- **自動帶入的查詢**改用一般瀏覽器 User-Agent（抖音用手機瀏覽器）。不帶 Cookie、不處理驗證碼、被拒就放棄。
- **重複比對用的短網址解析維持 V3.1.0 原本的 User-Agent**：這部分猴猴已在正式網站實測成功，為了不影響已成功的功能，這次不改。之後如果實測發現需要，可以再統一。

## 四、需要 Vercel 正式環境確認的重點

1. Bilibili 介面是否回 -412（被擋時改讀影片頁）。
2. 抖音分享頁是否回驗證頁。
3. 微博 statuses/show 是否要求訪客驗證。
4. Meta oEmbed（Facebook／Instagram／Threads）免權杖在 Vercel 的實際回應內容，以及嵌入碼裡有沒有正文。
5. X oEmbed 的實際回應。
6. Instagram 公開嵌入頁是否要求登入。
7. TikTok oEmbed 回應裡實際有沒有 `title`。

## 參考來源

- [TikTok：Embed Videos](https://developers.tiktok.com/docs/en/embed-videos)、[Embed Creator Profiles](https://developers.tiktok.com/docs/en/embed-creator-profiles)
- [Meta：Tokenless access to Meta oEmbed APIs（2026/6/15）](https://developers.facebook.com/blog/post/2026/06/15/tokenless-access-to-meta-oembed-apis/?locale=ja_JP)
- [Meta：oEmbed updates（2025/11/3 移除 author_name 等）](https://developers.facebook.com/blog/post/2025/04/08/oembed-updates/)
- [Meta：oEmbed Post](https://developers.facebook.com/docs/graph-api/reference/oembed-post/)
- [Threads：Embed a Threads Post](https://developers.secure.facebook.com/docs/threads/tools-and-resources/embed-a-threads-post)
- [X：oEmbed API](https://developer.x.com/en/docs/x-for-websites/oembed-api)、[X Developer Platform 概覽（付費）](https://docs.x.com/overview)
- [YouTube Data API：videos](https://developers.google.com/youtube/data/reference/rest/v3/videos)
- [抖音開放平台：帳號影片列表（需授權）](https://open.douyin.com/platform/resource/docs/openapi/video-management/douyin/search-video/account-video-list)
- [bilibili-API-collect（社群整理）](https://www.github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/video/recommend.md)、[小澄引用：bilibili api-endpoints](https://github.com/niudungh/bilibili-comment-skill/blob/main/references/api-endpoints.md)
- [小澄引用：微博 openweb DOC](https://github.com/imoonkey/openweb/blob/main/src/sites/weibo/DOC.md)
