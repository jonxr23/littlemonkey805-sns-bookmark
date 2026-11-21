# TEST_REPORT — V3.4.26（地圖開啟方式修正）

- 版本：3.4.26（地圖連結開啟方式修正；2026-11-21）
- 基準：先前交付的 V3.4.26 多地點完整安裝包。
- 修改範圍：只調整 Google Maps 單一地點入口及多地點清單內的地點連結開啟方式。

## 修改內容

- 單一地點的猴子地圖連結新增 `target="_blank"`，並使用 `rel="noopener noreferrer"`。
- 多地點彈窗每列「🐵🗺️ 點擊前往」連結採用相同設定。
- 保留原始 HTTPS Google Maps 分享網址，不改寫成 `intent://`、`googlemaps://` 或其他強制 App Scheme。
- 手機點擊時，將 HTTPS Google Maps 網址交由作業系統／瀏覽器的既有 App Link 或 Universal Link 機制處理；若未喚起 App，則由瀏覽器以新分頁開啟網頁。
- 桌機瀏覽器以新分頁開啟 Google Maps。
- 原 SNS 收藏夾分頁不應被地圖連結導覽取代。
- 不新增 API、Vercel Function、Google Maps API 或雲端權限呼叫。

## 測試結果

| 測試 | 結果 | 範圍 |
|---|---|---|
| JavaScript 語法檢查 | 通過 | 16 個 inline script 區塊逐一執行 Node `--check` |
| 單一地點連結靜態檢查 | 通過 | 確認生成的地圖 `<a>` 有 `target="_blank"` 與 `rel="noopener noreferrer"` |
| 多地點清單連結靜態檢查 | 通過 | 確認每列「點擊前往」連結有相同新分頁設定 |
| 原始網址保留檢查 | 通過 | 仍使用已保存的 HTTPS Google Maps URL，未轉成強制 App Scheme |
| 修改範圍檢查 | 通過 | 只修改 MAPS 模組兩處連結模板及本測試報告 |

## 未測／限制

- 未在 Android 實機驗證 Google Maps App 是否被系統喚起；是否喚起取決於裝置、瀏覽器、App Link／Universal Link 設定及使用者偏好。
- 未在 iOS Safari 實機驗證 Universal Link 行為。
- 未在實體桌機瀏覽器驗證新分頁行為。
- 本次是連結屬性靜態檢查及 JavaScript 語法檢查，不代表實機驗收。

**重要說明：** 網頁無法可靠地先查明 App 是否安裝並保證自動切換。本版採用 HTTPS Google Maps 原始連結，交由系統／瀏覽器決定是否喚起已安裝 App；若未喚起，`target="_blank"` 提供新分頁網頁備援。實際結果仍須於使用者裝置驗收。
