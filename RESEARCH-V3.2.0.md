# SNS Bookmark V3.2.0｜九平台資料來源研究與比較（小克 × 小澄）＋第十平台小紅書可行性＋2026-11-13 重新研究＋V3.2.1

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

## 五、第十個平台：小紅書可行性研究（2026-11-12 17:55 追加）

> 小克的開發環境連不到小紅書（測試網址 `https://xhslink.com/o/9AeERipuNrv` 也無法讀取），以下全部是**文件可行性＋模擬測試**，沒有任何一項做過實際連線。

| # | 問題 | 結論 | 分類 |
|---|---|---|---|
| 1 | 作者暱稱能否免費取得 | **有機會，但不穩定**。小紅書沒有免費、免授權的官方查詢 API（官方開放平台是商家／小程序用途，要申請與授權）。唯一免費且不用登入的來源是**公開筆記頁**內嵌的頁面資料（`window.__INITIAL_STATE__` 裡該筆記的 `user.nickname`）。社群回報：電腦版 UA 常被導去登入頁；手機 UA 有時能拿到頁面；資料中心 IP（Vercel 這類）會被週期性擋下；網址上的 `xsec_token` 是必要參數且會過期。拿不到就放棄，欄位保持空白（18:05 起所有平台都不顯示失敗提示） | 🔬🚀 |
| 2 | xhslink.com 能否解析出筆記 ID | **可以（理論上）**。`xhslink.com/o/{代碼}` 以公開的 HTTP 302 轉址到 `www.xiaohongshu.com/discovery/item/{24 位筆記 ID}?xsec_token=…`。只要讀轉址的目的地網址就能取得筆記 ID，**不需要讀筆記頁、不需要 Cookie** | 🟡🚀 |
| 3 | 能否用筆記 ID 判斷重複 | **可以**。筆記 ID 是 24 位英數，`/explore/{ID}`、`/discovery/item/{ID}`、`/user/profile/{作者}/{ID}` 都是同一篇。識別碼用 `xhs:{筆記ID}`（`xsec_token` 等參數不影響）。短網址解析失敗時不當成「確定沒重複」，顯示手機分享網址提醒 | ✅（格式）🚀（實際轉址） |
| 4 | 官方 Deep Link 能否喚起 App | **找不到小紅書公開的官方 Deep Link 文件**。社群整理（非官方）最常見的是 `xhsdiscover://item/{筆記ID}`；另有 Android `xhsdiscovery://`、iOS `xhsdiscover://detail?noteId=` 等寫法，新版 App 可能改動。網頁版筆記網址是否已註冊 Universal Link／App Link，小克無法讀取 `apple-app-site-association`／`assetlinks.json` 確認。採用 `xhsdiscover://item/{筆記ID}`，並保留原始網址備援 | 🔬（非官方）📱 需實機 |
| 5 | 台灣網路環境的限制 | 2025-12-04 內政部（打詐指揮中心）對小紅書發布「網際網路停止解析及限制接取」命令，**暫定 1 年**（約到 2026-12 初，之後是否延長要看當時公告）。影響：台灣網路下網頁版打不開（DNS 停止解析）、App 可能轉圈或連不上。所以 **「成功喚起 App」≠「App 成功載入筆記」**：喚起只代表手機切到 App，App 內能不能載入取決於 App 自己的連線，網站無法得知、也不會假設成功 | ✅ |

### 實作採用

| 項目 | 做法 | 不做的事 |
|---|---|---|
| 平台識別 | `xhslink.com`、`xhslink.cn`、`*.xiaohongshu.com` 都歸到「小紅書」（平台家族，可在平台管理改名） | — |
| 發文帳號 | 伺服器（Vercel）：短網址只讀一次轉址 → 用手機 UA 讀一次公開筆記頁（保留分享網址自帶的 `xsec_token`）→ 只認**同一個筆記 ID** 那一則的作者暱稱 | 不帶 Cookie、不登入、不處理驗證碼、不跟隨登入頁、不重試、不用第三方解析服務（Apify、TikHub 等）、不取標題／正文／描述 |
| 貼上的文字 | 一律不自動帶入 | — |
| 重複收藏 | `/api/resolve` 只讀 xhslink 的轉址目的地取筆記 ID（**不讀筆記頁**）；成功後存進 `ck`（`xhs:{筆記ID}`），原始分享網址照原樣存在 `url` | — |
| 開啟原文 | 電腦：原始網址（不變）。手機：有筆記 ID → `xhsdiscover://item/{ID}`；約 1.6 秒後頁面仍在前景 → 顯示「開啟原始網址」連結（不自動跳走）；沒有筆記 ID → 直接開原始網址 | 不使用 VPN、代理或任何繞過台灣網路限制的方式開啟 |

### ⚠️ 需要猴猴確認的一點

自動偵測發文帳號是由 **Vercel 伺服器**（預設在美國）去讀小紅書公開頁面，不是使用者的手機或電腦。技術上這不是在台灣網路上連小紅書，也不是讓使用者看內容（只回傳暱稱幾個字）；但如果猴猴認為「由海外伺服器代查」也屬於繞過台灣限制，可以把 `api/_lib/info.js` 的 `XHS_FETCH = true` 改成 `false`：小紅書就完全不連線、發文帳號一律留空（重複比對的短網址轉址解析是另一段，在 `api/resolve.js`，如也要停用請告訴小克）。

### 小紅書參考來源

- [中央社：小紅書涉1706件詐欺案 內政部命令暫行封鎖1年](https://cna.com.tw/news/asoc/202512040238.aspx)、[台灣英文新聞：停止解析與限制接取命令](https://www.taiwannews.com.tw/zh/news/6258557)
- [festivities/fixXiaohongshu（xhslink 302 轉址、`__INITIAL_STATE__`、xsec_token 必要、資料中心 IP 會被擋）](https://github.com/festivities/fixXiaohongshu)
- [dsh-reverie Issue #1（電腦版 UA 導去登入、手機 UA 可取得頁面資料）](https://github.com/Gniy7Ga/dsh-reverie/issues/1)
- [XHS-Downloader Issue #495（短網址轉址、沒有 Cookie 會被導回首頁或登入頁）](https://github.com/JoeanAmier/XHS-Downloader/issues/495)
- [小紅書 URL Scheme 社群整理（非官方）](https://gitcode.csdn.net/6aa0decf1a35784c84208c36.html)

## 六、2026-11-13 重新研究：手機 APP 優先開啟、重新嘗試自動偵測

> 小克的開發環境連不到任何社群平台，研究工具也不允許直接打這些 API，所以以下是**官方文件＋公開資料**的研究；所有「能不能真的拿到」都要在 Vercel 正式環境實測。

### 6-1. 手機 APP 優先開啟

| 方式 | 採用 | 理由 |
|---|---|---|
| Android：Chrome 官方 `intent://` 網址（`scheme=https`＋`package`＋`S.browser_fallback_url`） | ✅ 八個平台 | Chrome 官方文件寫明：找不到 App 時會開 `S.browser_fallback_url`；必須是使用者點擊才會啟動 App（我們只在點擊時使用）。交給 App 的是一般 https 網址，由 App 自己宣告的 https 連結處理，不是自訂 Scheme |
| iOS：一般 https 連結＝Universal Links | ✅ 九個平台 | iOS 沒有不用自訂 Scheme、又能指定 App 的官方方式；由系統依各 App 的 Universal Links 設定決定 |
| 各平台自訂 URL Scheme（`snssdk1128://`、`bilibili://`、`twitter://`…） | ⛔ | 多半沒有官方公開文件；猴猴規則：不可使用未經確認的 Scheme |
| 用計時器偵測 App 是否安裝 | ⛔ | 規則：不用不可靠的偵測；Chrome 也會擋沒有使用者點擊的跳轉 |
| TikTok 指定 package | ⛔ | 台灣常見的是 `com.ss.android.ugc.trill`，國際版是 `com.zhiliaoapp.musically`，無法確定使用者裝哪一個；指定錯了會直接開網頁，所以交給系統 App Links |
| 小紅書 | 維持 | 猴猴已實測可跳轉，不動 |

**沒能確認的部分**：小克無法讀取各平台的 `apple-app-site-association`／`assetlinks.json`，所以「哪些網址路徑會被 App 接手、短網址能不能被 App 接手」都要實機確認。短網址在這台裝置解析過的話，交給 App 的會是正式網址（App 通常比較認得），網頁備援仍是原本網址。

### 6-2. 重新嘗試自動偵測

| 平台／項目 | 研究結果 | 處理 |
|---|---|---|
| X 正文 | 官方 oEmbed 文件的位址是 `publish.x.com/oembed`、不需驗證、無頻率限制。舊的 `publish.twitter.com` 會轉址；本程式為了安全不跟隨轉址 → **以前很可能就是這樣一直取不到** | 改用 `publish.x.com`，失敗再試舊網址 🟡🚀 |
| TikTok 描述 | 官方 Embed Videos 文件的 oEmbed 回應範例只有 iframe 嵌入碼，**沒有 title／author_name**，並註明即將淘汰 → oEmbed 永遠拿不到描述 | 改讀公開影片頁內嵌資料（`__UNIVERSAL_DATA_FOR_REHYDRATION__`，社群公開資料；未驗證）→ 官方嵌入頁 `/embed/v2/` 🔬🚀 |
| 微博 帳號＋文字 | `m.weibo.cn` 手機端在 2024 年的公開文章仍不需 Cookie；但資料中心 IP 可能被導去訪客驗證。影片頁（tv/show、video.weibo.com）的公開介面需要訪客 Cookie | 加同網域公開手機頁 `/detail/{ID}` 的 `$render_data` 備援；影片頁維持不連線 🔬🚀 |
| Instagram @帳號 | Meta 2026/6/15 免權杖公告：回應只有 html、type 等技術欄位（「不提供個人資料」）→ 嵌入碼裡不一定有 @帳號；公開嵌入頁、貼文頁對資料中心 IP 常要求登入 | 加兩個只取帳號的來源：嵌入頁裡貼文 owner、公開貼文頁 meta 🔬🚀；**不取說明** |
| 小紅書 作者＋文字 | 同第五節：只有公開筆記頁一個免費來源，可能被登入牆／驗證擋下 | 同一頁回應取標題＋正文；短網址 200 頁面備援 🔬🚀 |
| 抖音 描述 | 公開分享頁對資料中心 IP 常回驗證頁；官方開放平台要授權；電腦版介面要 a_bogus 簽章（屬繞過防護） | 只補「圖文作品轉址」與分享文字「图文作品」寫法；其餘無合規替代 🔬🚀 |

### 2026-11-13 參考來源

- [Chrome：Android Intents with Chrome](https://developer.chrome.com/docs/android/intents?hl=en)
- [X：oEmbed API（publish.x.com）](https://docs.x.com/x-for-websites/oembed-api.md)
- [TikTok：Embed Videos（oEmbed 回應範例、即將淘汰）](https://developers.tiktok.com/docs/en/embed-videos)
- [Meta：Tokenless access to Meta oEmbed APIs](https://developers.facebook.com/blog/post/2026/06/15/tokenless-access-to-meta-oembed-apis/)
- [cnblogs：微博手機端爬取不需 Cookie（2024-06）](https://cnblogs.com/mingkai2004/p/18244624)
- [HasData：TikTok 公開頁面 rehydration 資料](https://hasdata.com/blog/tiktok-scraping-python)

## 七、V3.2.1（2026-11-13）：十平台帳號優先、發布日期、歷史版本比對

> 小克的開發環境連不到任何社群平台（網路被擋），研究工具也不允許直接呼叫這些 API。以下是**官方文件＋公開資料＋小克自己保存的歷史安裝包與文件**的研究；所有「真的拿不拿得到」都要在 Vercel 正式環境實測。為了讓實測時看得出卡在哪一步，API 回應多了 `trace`（只有網域＋狀態碼）。

### 7-1. 歷史版本比對（指令第十三章）

| 項目 | 比對範圍 | 結果 |
|---|---|---|
| Instagram @帳號 | V3.2.0 初版（complete-1）、complete-4（18:10）、complete-5 的 `instagram()`；V2.8.x～V3.1.0 的 CHANGELOG／TEST_REPORT | 三版伺服器端的帳號順序**相同**（網址 → oEmbed → 公開嵌入頁），差別只在 complete-4 起「有帳號就不再讀嵌入頁」，不影響帳號。**V3.2.0 以前，Instagram 帳號只有一個來源：前端 `inferAcct` 從網址 `instagram.com/{帳號}/p|reel/{代碼}/` 讀出**（V2.8.x 起）。猴猴這次的兩個測試網址是 `/reels/代碼`、`/reel/代碼`，網址裡沒有帳號——這最可能就是「以前可以、現在不行」的原因：以前測的網址帶有帳號路徑。這個方法仍然保留 |
| Instagram oEmbed | 官方 Instagram oEmbed 文件 | 文件列出的網址格式只有 `/p/{shortcode}/`、`/tv/{shortcode}/`（Reel 也支援，但沒有列 `/reel/` 寫法）。complete-5 以前送 `/reel/{代碼}/` → **改送 `/p/{代碼}/`** |
| Instagram 嵌入頁內嵌資料 | complete-5 的 owner 正規表示式 | 要求 `shortcode_media` 與 `owner` 之間不能有 `[`，真實資料常有陣列在前 → 幾乎不會命中；而且嵌入頁的資料通常放在跳脫過的 `contextJSON` 字串裡。**改成正式解析 JSON，只認 `shortcode` 等於這篇代碼的 `owner.username`** |
| Threads 日期 | V2.x～V3.2.0 的 `inferDate` | 一直只有一種實作：正式貼文網址 `/@帳號/post/{shortcode}` 的 shortcode 推算（與 Instagram 同算法）。歷史紀錄裡**沒有** `/share/` 解析日期的實作或測試；complete-5 只能解析正式網址，是因為前端 `inferDate` 只看網址本身，不會先解析分享網址 |
| 其他平台日期 | 同上 | 歷史上只有 X（Snowflake）、Instagram／Threads（shortcode）、PTT（文章網址時間）三種，沒有其他平台的日期解析可以恢復 |
| Bilibili `pubdate` | V3.2.0 初版～complete-5 | 三版都呼叫同一個 `view` 介面，回應本來就有 `data.pubdate`，但 `out()` 只有帳號與文字兩個欄位，所以沒有傳回前端。帳號與標題在歷史上也從來沒有實測成功過（V3.2.0 以前沒有伺服器取得） |
| 抖音 | V3.1.0 分享文字解析、V3.2.0 `_ROUTER_DATA` | 分享文字解析不變（實測可取得暱稱）。`_ROUTER_DATA` 的找法從 V3.2.0 初版起就要求「`desc` 和 `author.nickname` 同時存在」→ 改成只認作品 ID |
| 微博 | V3.2.0 初版（只有 `statuses/show`）、complete-5（加 `/detail/` 的 `$render_data`） | 解析的欄位相同；`/detail/` 只接受數字 ID，電腦網址的 9 碼 bid 應改用 `/status/{bid}` → 已改 |
| 自動帶入流程 | V3.2.0 初版～complete-5 | 手動保護、`auto` 規則一致；complete-5 發現的「同一個網址再收到輸入事件會清掉帳號」這次一併修好（見 CHANGELOG 五） |

### 7-2. 各平台資料來源（V3.2.1 採用）

| 平台 | 帳號來源 | 文字來源 | 發布日期來源 | 已知會失敗的原因 |
|---|---|---|---|---|
| TikTok | 網址 @帳號 | 公開影片頁 `__UNIVERSAL_DATA_FOR_REHYDRATION__` 的 `desc`（實測已通過） | 同一物件 `createTime`（秒；官方 Video Object 的 `create_time` 同義）→ 沒有才用影片 ID 前 32 位元（學術論文確認是建立時間，排程發布可能與實際公開時間不同） | 公開頁偶爾回驗證頁 |
| 抖音 | `www.iesdouyin.com`／`m.douyin.com` 公開分享頁 `_ROUTER_DATA` 裡同一個作品 ID 的 `author.nickname`；伺服器拿不到時用手機完整分享文字 | 同一物件 `desc`；分享文字 | 同一物件 `create_time` | 公開分享頁對資料中心 IP 常回驗證頁（實測網頁版、短網址都沒取得）；抖音作品 ID 的時間推算沒有公開文件確認，**不使用** |
| 微博 | `m.weibo.cn/statuses/show` → `/detail/`、`/status/` 公開頁 `$render_data` 的 `user.screen_name` | `page_info.media_info.video_title` → 這則（轉發者）`text_raw`／`text` → `retweeted_status`；長文 `statuses/extend` | 這則微博 `created_at`（「Tue Nov 11 20:15:03 +0800 2025」格式） | 資料中心 IP 可能被導去訪客驗證；**影片網址兩種**：唯一已知的介面是 `weibo.com/tv/api/component`（POST），公開範例都帶 Cookie → 依規則不做，三欄留空 |
| Bilibili | `api.bilibili.com/x/web-interface/view` 的 `owner.name` → 公開影片頁 `__INITIAL_STATE__.videoData.owner.name` → `meta[name=author]` | `title` → `videoData.title` → `og:title` | `pubdate`（秒）→ `videoData.pubdate` | 介面對資料中心 IP 常回 `-412` 風控 |
| Facebook | 官方 oEmbed（免權杖）嵌入碼「Posted by」→ 公開貼文頁 JSON-LD `author.name`、`article:author` | 停用 | 公開貼文頁 `article:published_time`、JSON-LD `datePublished` | 個人／非公開貼文、公開頁要求登入；Meta 2025/11 起 oEmbed 不再回傳 `author_name` |
| 小紅書 | 筆記頁 `__INITIAL_STATE__` 同一筆記 ID 的 `user.nickname` | 同一筆記 `title`、`desc` | 同一筆記 `time`（毫秒） | 登入牆、驗證、`xsec_token` 過期、資料中心 IP；筆記 ID 的時間推算沒有公開文件確認，**不使用** |
| Threads | 網址 @帳號 | 停用 | 正式 shortcode 推算（`/share/` 先解析） | `/share/` 解析失敗就留空 |
| YouTube | 官方 oEmbed `author_name` | 官方 oEmbed `title` | 公開影片頁 `playerMicroformatRenderer.publishDate`、`itemprop=datePublished`（不用 `uploadDate`；官方 Data API 的 `snippet.publishedAt` 需要金鑰） | 頁面太大或要求同意 Cookie 時取不到日期（帳號、標題不受影響） |
| Instagram | 網址帳號 → 官方 oEmbed（`/p/`）→ 公開嵌入頁（CaptionUsername、UsernameText、`contextJSON` owner）→ 公開貼文頁 meta | 停用 | shortcode 推算（前端，不變） | 公開頁對資料中心 IP 常要求登入；免權杖 oEmbed 不保證含帳號 |
| X | 網址 @帳號 | `publish.x.com` oEmbed | status ID（Snowflake，前端，不變） | — |

### 2026-11-13（V3.2.1）參考來源

- [TikTok：Video Object（create_time）](https://developers.tiktok.com/docs/en/tiktok-api-v2-video-object)
- [Just Another Hour on TikTok（影片 ID 前 32 位元＝建立時間）](https://arxiv.org/html/2504.13279v5)、[Bellingcat：tiktok-timestamp](https://awesome.ecosyste.ms/projects/github.com%2Fbellingcat%2Ftiktok-timestamp)
- [Meta：Instagram oEmbed（網址格式）](https://developers.facebook.com/docs/instagram-platform/oembed)
- [YouTube Data API：videos（publishedAt）](https://developers.google.com/youtube/data/reference/rest/v3/videos)
- [Open Graph protocol（article:published_time）](https://ogp.me/)
- [Threads：Media（timestamp）](https://developers.facebook.com/docs/threads/threads-media)
- [cnblogs：微博 tv/api/component](https://www.cnblogs.com/honlicc/articles/15761789.html)

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
