/**
 * @OnlyCurrentDoc
 * （上面這行讓腳本只要求「目前這份試算表」的權限，不會存取你其他的雲端硬碟檔案）
 *
 * SNS_Bookmark 管理中心（V2.5.0）— Google Apps Script
 *
 * 安裝位置：SNS_Bookmark_Admin 試算表 → 擴充功能 → Apps Script，把這整份貼進 Code.gs。
 * 功能：
 *   1. setupAdminSheet()：建立／修正四個工作表的標題、公式、格式、篩選器、條件式格式（可重複執行，不會刪除資料）。
 *   2. onEdit()：OAuth 測試名單「新增 Mail」、重複 Mail 偵測、取消刪除勾選時更新日期與次數、Q&A 自動填建立／修改日期。
 *   3. onOpen()：試算表上方加入「SNS_Bookmark 管理」選單。
 * 這份程式只操作「目前這份試算表」，不會讀寫任何使用者的收藏資料。
 */
const SNS = {
  DASH: '使用者總覽',
  ACT: '使用者活動紀錄',
  LIST: 'OAuth 測試名單',
  HELP: '使用說明與 Q&A',
  TZ: 'Asia/Taipei',
  LIST_FIRST: 4,           // OAuth 測試名單的資料從第 4 列開始
  ROWS: 1000,              // 預先套用格式的列數
};
const HELP_SEED = [
 {
  "id": "n1",
  "type": "notice",
  "order": 1,
  "title": "Google 帳號及登入",
  "body": "你的收藏存在你自己的 Google 雲端硬碟：「SNS_Bookmark」資料夾裡的「SNS_Bookmark_Data」試算表（收藏資料）和「SNS_Bookmark_Images」資料夾（圖片）。\nApp 只能存取它自己建立的檔案，看不到你雲端硬碟裡的其他檔案。\n目前 App 是測試階段，Google 大約每 7 天會要求重新登入一次，重新登入後資料都還在。\n切換帳號或登出前，App 會先把修改存到雲端；存不進去時會停在原本的帳號，不會把資料寫到別的帳號。"
 },
 {
  "id": "n2",
  "type": "notice",
  "order": 2,
  "title": "雲端同步",
  "body": "新增、修改、刪除後會自動存到雲端，頁面上方會顯示「已儲存到雲端 ✓」。\n頁面開著時大約每 30～60 秒自動同步一次；想馬上看到另一台裝置的修改，按右上角的 ⟳。\n顯示「儲存到雲端中…」時，請先不要關閉頁面。\n兩台裝置同時改到同一筆收藏時，會跳出視窗讓你選擇保留哪一邊，不會默默蓋掉。"
 },
 {
  "id": "n3",
  "type": "notice",
  "order": 3,
  "title": "圖片格式及容量",
  "body": "支援 JPG、JPEG、PNG、GIF 四種格式；HEIC、WEBP、BMP 等其他格式不會上傳。\nJPG：100 KB 以下保留原檔；超過 100 KB 會縮到最長邊 1440 px 並調整畫質，目標約 100～150 KB，但不會為了容量把圖片壓到明顯模糊。\nPNG：100 KB 以下保留原檔；超過時只做不失真的處理（縮到最長邊 1440 px、保留透明背景），不會轉成 JPG。\nGIF：原始檔最多 25 MB；會處理成最長邊約 480 px 的動態 GIF（保留動畫、透明背景、循環設定和播放速度），一般在 3 MB 以下，最多 5 MB；壓縮後仍超過 5 MB 就不會上傳。雲端只存處理後的 GIF。\nGoogle 雲端硬碟剩不到 100 MB 時，頁面最上方會出現黃色提醒。"
 },
 {
  "id": "n4",
  "type": "notice",
  "order": 4,
  "title": "收藏刪除後無法復原",
  "body": "刪除收藏前會跳出確認視窗；確認後，收藏資料就無法從 App 復原（App 沒有回收桶）。\n沒有被其他收藏使用的圖片會移到 Google 雲端硬碟的垃圾桶，約 30 天內可以從雲端硬碟垃圾桶還原圖片檔，但收藏卡片本身不會回來。\n刪除「資料夾」不一樣：只會移除資料夾和分類關係，收藏卡片與圖片都會保留；沒有其他分類的收藏會變成「未分類」。"
 },
 {
  "id": "n5",
  "type": "notice",
  "order": 5,
  "title": "備份及還原",
  "body": "按右上角「備份」→「下載備份檔」，會下載一個 JSON 檔，內容包含收藏、資料夾、自訂平台和分組設定。\n備份檔只記錄圖片的雲端 ID，不包含圖片檔本身；還原到另一個 Google 帳號時，圖片不會顯示。\n還原時，相同的收藏會被備份檔覆蓋，不會刪掉現有的其他收藏。\n建議定期下載備份，存在自己的電腦或手機。"
 },
 {
  "id": "q1",
  "type": "qa",
  "order": 1,
  "title": "為什麼手機與電腦的資料不同步？",
  "body": "1. 先確認兩台裝置登入的是同一個 Google 帳號（點右上角頭像就能看到 Email）。\n2. 按右上角的 ⟳ 立即同步；頁面開著時也會每 30～60 秒自動同步。\n3. 如果有一台顯示「雲端儲存失敗」或跳出衝突視窗，請先在那台處理。\n4. 手機若把網頁加到主畫面，請完全關掉再開，才會載入最新版本。"
 },
 {
  "id": "q2",
  "type": "qa",
  "order": 2,
  "title": "為什麼圖片上傳失敗？",
  "body": "常見原因：\n・還沒登入 Google，或雲端同步還沒完成（等頁面上方的「同步雲端資料中…」消失）。\n・網路中斷，或登入已過期（依提示重新登入）。\n・Google 雲端硬碟空間不足（頁面最上方會出現黃色提醒）。\n・格式不是 JPG、JPEG、PNG、GIF（例如 iPhone 的 HEIC、WEBP），上傳區會出現紅字提示，請先轉成 JPG 或 PNG。\n・GIF 原始檔超過 25 MB，或壓縮後仍超過 5 MB，請換一張較小或較短的 GIF。"
 },
 {
  "id": "q3",
  "type": "qa",
  "order": 3,
  "title": "如何更換 Google 帳號？",
  "body": "點右上角的頭像 →「🔀 切換帳號」，再選擇要使用的 Google 帳號。\n每個帳號的收藏都存在各自的雲端硬碟，不會混在一起。\n切換前 App 會先把修改存到雲端；如果存不進去，會停在原本的帳號並提示原因。"
 },
 {
  "id": "q4",
  "type": "qa",
  "order": 4,
  "title": "如何搜尋及選擇資料夾？",
  "body": "左側「📁 資料夾」區上方有搜尋框，輸入資料夾名稱的一部分就能找到，不分大小寫，也不用從第一個字開始（例如輸入 Be 或 reen 都能找到 FreenBecky）。\n搜尋結果會顯示完整路徑，例如「泰百 → FreenBecky」和「KPOP → FreenBecky」，同名的資料夾也分得出來。\n新增／編輯收藏的「分類」也有同樣的搜尋框，可以多選；搜尋或清除搜尋都不會取消已選的分類。上方的「最近使用」可以一鍵加入常用資料夾。\n按 ▸／▾ 可以展開或收合子資料夾。"
 },
 {
  "id": "q5",
  "type": "qa",
  "order": 5,
  "title": "刪除收藏後可以復原嗎？",
  "body": "不行，App 沒有回收桶，刪除前請在確認視窗再看一次。\n如果之前有下載備份檔，可以用「備份 → 從備份檔還原」把那一筆加回來；若圖片顯示「已在雲端移除」，可以先到 Google 雲端硬碟的垃圾桶還原那張圖片。"
 },
 {
  "id": "q6",
  "type": "qa",
  "order": 6,
  "title": "點卡片會發生什麼事？",
  "body": "點卡片空白處或文字，會打開「收藏明細」，可以看到這筆收藏的完整內容（唯讀，不會不小心改到）。\n明細最下面有「刪除」「編輯」「取消」：按「編輯」才會進入修改畫面；按「刪除」會再跳出確認視窗。\n卡片上的按鈕（星號、已讀、開啟原文、編輯、刪除…）照原本的方式運作，不會打開明細。\n批次模式下，點卡片是「選取」，不會打開明細。"
 },
 {
  "id": "q7",
  "type": "qa",
  "order": 7,
  "title": "怎麼刪除資料夾？會不會刪到收藏？",
  "body": "在左側資料夾區，按資料夾右邊的垃圾桶圖示，確認後就會刪除這個資料夾和它所有的子資料夾。\n收藏卡片、圖片、標籤、備註、日期全部保留；只有「收藏放在這個資料夾」的分類關係會被移除。\n如果收藏還有其他資料夾，就保留其他資料夾；沒有其他資料夾的收藏會變成「📂 未分類」。"
 },
 {
  "id": "n6",
  "type": "notice",
  "order": 6,
  "title": "使用狀況紀錄（隱私說明）",
  "body": "App 會記錄你的 Google 帳號（Email）、首次使用時間、最後使用時間，以及必要的操作類型（例如開啟 App、查看收藏明細、搜尋／篩選、新增、編輯、刪除收藏、批次操作），用於產品管理與使用狀況統計。\n不記錄你的收藏網址、貼文內容、圖片、備註或標籤作為活動紀錄，也不記錄任何登入 Token。\n這些紀錄存在管理者自己的 Google 試算表，其他使用者看不到。"
 },
 {
  "id": "q8",
  "type": "qa",
  "order": 8,
  "title": "App 會記錄我的什麼資料？",
  "body": "只記錄：Google 帳號（Email）、第一次和最後一次使用的時間、最後一次修改收藏的時間，以及最近一次的操作類型（例如「新增收藏」）。\n不記錄：收藏網址、貼文內容、圖片、備註、標籤、登入 Token。\n你的收藏本身仍然只存在你自己的 Google 雲端硬碟。"
 }
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('SNS_Bookmark 管理')
    .addItem('重新套用格式（不會刪除資料）', 'setupAdminSheet')
    .addItem('檢查設定', 'checkAdminSheet')
    .addToUi();
}

/* ========== 一次性設定（可以重複執行） ========== */
function setupAdminSheet() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(SNS.TZ);
  const sheets = ss.getSheets();
  // 全新的試算表只有一個空白工作表：改名成「使用者總覽」，避免多出空白頁
  if (!ss.getSheetByName(SNS.DASH) && sheets.length === 1 && sheets[0].getLastRow() === 0) sheets[0].setName(SNS.DASH);
  const dash = sheet_(ss, SNS.DASH, 0), act = sheet_(ss, SNS.ACT, 1), list = sheet_(ss, SNS.LIST, 2), help = sheet_(ss, SNS.HELP, 3);
  setupAct_(act);
  setupList_(list);
  setupHelp_(help);
  setupDash_(dash);
  ss.setActiveSheet(dash);
  ss.toast('四個工作表都已設定完成（既有資料沒有被刪除）。', 'SNS_Bookmark', 6);
}
function sheet_(ss, name, idx) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name, idx);
  return sh;
}
function base_(sh, headerRow, lastCol, widths) {
  sh.setFrozenRows(headerRow);
  const head = sh.getRange(headerRow, 1, 1, lastCol);
  head.setFontWeight('bold').setBackground('#e8eef3').setVerticalAlignment('middle').setWrap(true);
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getBandings().forEach(function (b) { b.remove(); });
  sh.getRange(headerRow, 1, SNS.ROWS, lastCol).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
  // 條紋的標題色改回我們的標題色
  head.setBackground('#e8eef3');
  const f = sh.getFilter(); if (f) f.remove();
  sh.getRange(headerRow, 1, Math.max(2, sh.getMaxRows() - headerRow + 1), lastCol).createFilter();
}
function rules_(sh, list) {
  // 這四個工作表的條件式格式全部由這份程式管理：重新套用時整組替換，不會越疊越多
  sh.setConditionalFormatRules(list);
}
const C_ = { green: '#d9ead3', yellow: '#fff2cc', orange: '#fce5cd', red: '#f4cccc', grey: '#eeeeee' };
function rule_(range, formula, bg, extra) {
  let b = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setBackground(bg).setRanges(range);
  if (extra) b = extra(b);
  return b.build();
}

function setupAct_(sh) {
  const H = ['Google Mail', '使用者識別 Key', '首次使用時間', '最後使用時間', '距今天數', '最近操作類型', '最後資料異動時間', '活動狀態', '測試名單比對', '管理備註'];
  ensureCols_(sh, H.length);
  [1, 2, 3, 4, 6, 7, 10].forEach(function (c) { sh.getRange(1, c).setValue(H[c - 1]); });
  const L = "'" + SNS.LIST + "'";
  sh.getRange('E1').setFormula('={"距今天數";ARRAYFORMULA(IF(B2:B="","",IF(D2:D="","從未使用",TODAY()-INT(D2:D))))}');
  sh.getRange('H1').setFormula('={"活動狀態";ARRAYFORMULA(IF(B2:B="","",IF(D2:D="","未登入",IF(TODAY()-INT(D2:D)<=7,"最近活躍",IF(TODAY()-INT(D2:D)<=30,"留意",IF(TODAY()-INT(D2:D)<=59,"長期未使用","優先檢視"))))))}');
  sh.getRange('I1').setFormula('={"測試名單比對";ARRAYFORMULA(IF(B2:B="","",IF(COUNTIF(' + L + '!A4:A,LOWER(TRIM(A2:A)))=0,"未登記於測試名單",IF(COUNTIFS(' + L + '!A4:A,LOWER(TRIM(A2:A)),' + L + '!E4:E,TRUE)>0,"已標記刪除","已登記"))))}');
  base_(sh, 1, H.length, [220, 170, 135, 135, 80, 120, 135, 100, 130, 220]);
  sh.getRange('C2:D').setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange('G2:G').setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange('E2:E').setNumberFormat('0').setHorizontalAlignment('center');
  sh.getRange('J2:J').setWrap(true);
  sh.getRange('B2:B').setFontColor('#888888');
  const st = sh.getRange('E2:E'), st2 = sh.getRange('H2:H');
  rules_(sh, [
    rule_([st, st2], '=$H2="最近活躍"', C_.green), rule_([st, st2], '=$H2="留意"', C_.yellow), rule_([st, st2], '=$H2="長期未使用"', C_.orange),
    rule_([st, st2], '=$H2="優先檢視"', C_.red), rule_([st, st2], '=$H2="未登入"', C_.grey),
    rule_([sh.getRange('I2:I')], '=$I2="未登記於測試名單"', C_.yellow), rule_([sh.getRange('I2:I')], '=$I2="已標記刪除"', C_.grey),
  ]);
  protectWarn_(sh, ['E1', 'H1', 'I1', 'A1:D1', 'F1:G1'], '這是 App 自動寫入／自動計算的欄位，請不要修改標題列。');
}

function setupList_(sh) {
  const F = SNS.LIST_FIRST, H = ['Google Mail', '首次加入日期', '最近重新加入日期', '歷史加入次數', '是否刪除', 'App 使用紀錄比對結果', '最後使用時間', '距今天數', '管理備註'];
  ensureCols_(sh, H.length);
  sh.getRange('A1').setValue('➕ 新增 Google Mail：').setFontWeight('bold').setHorizontalAlignment('right');
  sh.getRange('B1').setBackground('#fff8dc').setBorder(true, true, true, true, false, false, '#c9a227', SpreadsheetApp.BorderStyle.SOLID_MEDIUM)
    .setNote('在這一格輸入新的 Gmail，按 Enter 就會自動加入下方名單（不用自己找空白列）。');
  try { sh.getRange('C1:I1').merge(); } catch (e) { }
  sh.getRange('C1').setFontColor('#b3261e').setFontWeight('bold').setWrap(true);
  try { sh.getRange('A2:I2').merge(); } catch (e) { }
  sh.getRange('A2').setValue('說明：在上方黃色格輸入 Gmail 新增。「是否刪除」只是名單管理標記，打勾不會從 Google Cloud Console 移除測試使用者，請另外到 Console 移除；取消打勾＝重新加入（保留首次加入日期，更新最近重新加入日期與次數）。下方「目前已登記」的數字是管理者自行登記的名單統計，不代表 Google Cloud Console 的實際名額或剩餘配額。')
    .setWrap(true).setFontColor('#555555').setFontSize(9);
  sh.setRowHeight(2, 48);
  [1, 2, 3, 4, 5, 9].forEach(function (c) { sh.getRange(3, c).setValue(H[c - 1]); });
  const A = "'" + SNS.ACT + "'";
  sh.getRange('F3').setFormula('={"App 使用紀錄比對結果";ARRAYFORMULA(IF(A4:A="","",IF(E4:E=TRUE,"已標記刪除",IF(COUNTIF(' + A + '!A2:A,LOWER(TRIM(A4:A)))>0,"已使用","從未使用"))))}');
  sh.getRange('G3').setFormula('={"最後使用時間";ARRAYFORMULA(IF(A4:A="","",IFERROR(VLOOKUP(LOWER(TRIM(A4:A)),{' + A + '!A2:A,' + A + '!D2:D},2,FALSE),"")))}');
  sh.getRange('H3').setFormula('={"距今天數";ARRAYFORMULA(IF(A4:A="","",IF(G4:G="","從未使用",TODAY()-INT(G4:G))))}');
  base_(sh, 3, H.length, [230, 135, 135, 95, 75, 150, 135, 80, 220]);
  sh.setFrozenRows(3);
  sh.getRange(F, 5, SNS.ROWS, 1).insertCheckboxes();
  sh.getRange(F, 2, SNS.ROWS, 2).setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange(F, 7, SNS.ROWS, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange(F, 4, SNS.ROWS, 1).setHorizontalAlignment('center');
  sh.getRange(F, 8, SNS.ROWS, 1).setHorizontalAlignment('center');
  sh.getRange(F, 9, SNS.ROWS, 1).setWrap(true);
  const day = sh.getRange('H4:H'), res = sh.getRange('F4:F');
  rules_(sh, [
    rule_([res, day], '=$F4="已標記刪除"', C_.grey, function (b) { return b.setFontColor('#888888'); }),
    rule_([res, day], '=$H4="從未使用"', C_.grey),
    rule_([res, day], '=AND(ISNUMBER($H4),$H4<=7)', C_.green), rule_([res, day], '=AND(ISNUMBER($H4),$H4>=8,$H4<=30)', C_.yellow),
    rule_([res, day], '=AND(ISNUMBER($H4),$H4>=31,$H4<=59)', C_.orange), rule_([res, day], '=AND(ISNUMBER($H4),$H4>=60)', C_.red),
    rule_([sh.getRange('A4:A')], '=AND($A4<>"",COUNTIF($A$4:$A,$A4)>1)', C_.red, function (b) { return b.setBold(true); }),
    rule_([sh.getRange('A4:E')], '=$E4=TRUE', '#f3f3f3', function (b) { return b.setStrikethrough(true).setFontColor('#999999'); }),
  ]);
  protectWarn_(sh, ['A3:I3'], '這是標題列與自動計算的欄位，請不要修改。');
}

function setupHelp_(sh) {
  const H = ['ID', '類型（注意事項／Q&A）', '排序', '標題', '內容', '是否顯示', '建立日期', '最後修改日期'];
  ensureCols_(sh, H.length);
  sh.getRange(1, 1, 1, H.length).setValues([H]);
  base_(sh, 1, H.length, [70, 120, 55, 240, 520, 75, 130, 130]);
  sh.getRange('B2:B').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['注意事項', 'Q&A'], true).setAllowInvalid(false).build());
  sh.getRange(2, 6, SNS.ROWS, 1).insertCheckboxes();
  sh.getRange('E2:E').setWrap(true).setVerticalAlignment('top');
  sh.getRange('D2:D').setWrap(true).setVerticalAlignment('top');
  sh.getRange('G2:H').setNumberFormat('yyyy-mm-dd hh:mm');
  // 只有在工作表還沒有任何內容時，才放入初始說明（不會覆蓋管理者已經寫好的內容）
  const has = sh.getRange('D2:D').getValues().some(function (r) { return String(r[0]).trim() !== ''; });
  if (!has) {
    const now = new Date();
    const rows = HELP_SEED.map(function (h) { return [h.id, h.type === 'qa' ? 'Q&A' : '注意事項', h.order, h.title, h.body, true, now, now]; });
    sh.getRange(2, 1, rows.length, 8).setValues(rows);
  }
  rules_(sh, [rule_([sh.getRange('A2:H')], '=AND($D2<>"",$F2<>TRUE)', C_.grey, function (b) { return b.setFontColor('#999999'); })]);
}

function setupDash_(sh) {
  const A = "'" + SNS.ACT + "'", L = "'" + SNS.LIST + "'";
  sh.getRange('A1').setValue('SNS_Bookmark 使用者總覽').setFontSize(16).setFontWeight('bold');
  sh.getRange('A2').setValue('以下數字由公式自動計算（台北時間；7 天／30 天為從現在往前推的滾動時間）。同一個 Google 帳號用手機和電腦只算一次。');
  sh.getRange('A2').setFontColor('#666666');
  const rows = [
    ['項目', '數值', '說明'],
    ['總使用帳號數', '=COUNTIF(' + A + '!B2:B,"?*")', '曾經用 Google 登入過 App 的不同帳號數'],
    ['最近 7 天活躍帳號數', '=COUNTIFS(' + A + '!B2:B,"?*",' + A + '!D2:D,">="&(NOW()-7))', '最後使用時間在 7×24 小時內'],
    ['最近 30 天活躍帳號數', '=COUNTIFS(' + A + '!B2:B,"?*",' + A + '!D2:D,">="&(NOW()-30))', '最後使用時間在 30×24 小時內'],
    ['從未使用帳號數', '=SUMPRODUCT((' + L + '!A4:A<>"")*(COUNTIF(' + A + '!A2:A,' + L + '!A4:A)=0))', 'OAuth 測試名單裡（含已標記刪除）從來沒有登入過 App 的帳號'],
    ['長期未使用帳號數', '=COUNTIFS(' + A + '!B2:B,"?*",' + A + '!D2:D,"<"&(TODAY()-30))', '31 天以上沒有使用（橘色＋紅色）'],
    ['目前已登記 OAuth 測試帳號數', '=SUMPRODUCT((' + L + '!A4:A<>"")*(' + L + '!E4:E<>TRUE))', '測試名單中沒有勾選「是否刪除」的帳號'],
    ['已登記名額提醒', '=B10&"／100"', '這是管理者自行登記的名單統計，不代表 Google Cloud Console 即時實際名額或剩餘配額。'],
    ['已登記但沒有 App 使用紀錄的帳號數', '=SUMPRODUCT((' + L + '!A4:A<>"")*(' + L + '!E4:E<>TRUE)*(COUNTIF(' + A + '!A2:A,' + L + '!A4:A)=0))', '有效名單中還沒登入過的帳號'],
    ['已標記刪除帳號數', '=COUNTIF(' + L + '!E4:E,TRUE)', '勾選「是否刪除」的帳號（記得到 Console 實際移除）'],
    ['有使用但未登記於測試名單', '=COUNTIF(' + A + '!I2:I,"未登記於測試名單")', '可能是名單漏登記'],
    ['最近一次活動紀錄更新時間', '=IF(COUNT(' + A + '!D2:D)=0,"尚無紀錄",MAX(' + A + '!D2:D))', 'App 最後一次寫入活動紀錄的時間'],
  ];
  sh.getRange(4, 1, rows.length, 3).setValues(rows);
  sh.getRange(4, 1, 1, 3).setFontWeight('bold').setBackground('#e8eef3');
  sh.getRange(5, 2, rows.length - 1, 1).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(13);
  sh.getRange(4 + rows.length - 1, 2).setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange(5, 3, rows.length - 1, 1).setFontColor('#666666').setWrap(true);
  sh.setColumnWidth(1, 260); sh.setColumnWidth(2, 150); sh.setColumnWidth(3, 480);
  sh.setFrozenRows(4);
  sh.getBandings().forEach(function (b) { b.remove(); });
  sh.getRange(5, 1, rows.length - 1, 3).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  sh.getRange('B11').setBackground('#fff8dc');
  sh.getRange('A17').setValue('快速篩選：到「使用者活動紀錄」或「OAuth 測試名單」，點標題列的篩選圖示，依「活動狀態」「App 使用紀錄比對結果」「是否刪除」篩選，或依「最後使用時間」「距今天數」排序。').setFontColor('#666666').setWrap(true);
  try { sh.getRange('A17:C17').merge(); } catch (e) { }
  sh.setRowHeight(17, 40);
  protectWarn_(sh, ['A1:C16'], '使用者總覽是自動計算的，請不要修改公式。');
}

function ensureCols_(sh, n) { if (sh.getMaxColumns() < n) sh.insertColumnsAfter(sh.getMaxColumns(), n - sh.getMaxColumns()); if (sh.getMaxRows() < SNS.ROWS + 5) sh.insertRowsAfter(sh.getMaxRows(), SNS.ROWS + 5 - sh.getMaxRows()); }
function protectWarn_(sh, a1s, desc) {
  sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) { if (p.getDescription() === desc) p.remove(); });
  a1s.forEach(function (a) { sh.getRange(a).protect().setDescription(desc).setWarningOnly(true); });
}

function checkAdminSheet() {
  const ss = SpreadsheetApp.getActive(), miss = [SNS.DASH, SNS.ACT, SNS.LIST, SNS.HELP].filter(function (n) { return !ss.getSheetByName(n); });
  const ed = ss.getEditors().map(function (u) { return u.getEmail(); }).filter(function (e) { return /gserviceaccount\.com$/.test(e); });
  const msg = (miss.length ? '缺少工作表：' + miss.join('、') + '（請執行「重新套用格式」）\n' : '四個工作表都在。\n') +
    '時區：' + ss.getSpreadsheetTimeZone() + (ss.getSpreadsheetTimeZone() === SNS.TZ ? '' : '（應為 Asia/Taipei，請執行「重新套用格式」）') + '\n' +
    'Service Account 編輯者：' + (ed.length ? ed.join('、') : '尚未分享給 Service Account') + '\n' +
    '試算表 ID（填到 Vercel 的 ADMIN_SHEET_ID）：' + ss.getId();
  SpreadsheetApp.getUi().alert('SNS_Bookmark 管理中心檢查', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ========== 編輯時自動處理（簡易觸發條件 onEdit，不需另外授權） ========== */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sh = e.range.getSheet(), name = sh.getName(), r = e.range.getRow(), c = e.range.getColumn();
    if (name === SNS.LIST) {
      if (r === 1 && c === 2) return addMail_(sh, e.range);
      if (r >= SNS.LIST_FIRST && c === 5 && e.range.getNumRows() === 1 && e.range.getNumColumns() === 1) return toggleDel_(sh, e);
      if (r >= SNS.LIST_FIRST && c === 1 && e.range.getNumRows() === 1 && e.range.getNumColumns() === 1) return manualMail_(sh, e);
    }
    if (name === SNS.HELP && r >= 2 && c <= 6) return stampHelp_(sh, e.range);
  } catch (err) {
    SpreadsheetApp.getActive().toast('自動處理失敗：' + (err && err.message), 'SNS_Bookmark', 8);
  }
}
const normMail_ = function (v) { return String(v == null ? '' : v).trim().toLowerCase(); };
const okMail_ = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); };
function say_(sh, text) { sh.getRange('C1').setValue(text); SpreadsheetApp.getActive().toast(text, 'SNS_Bookmark', 6); }
function listRows_(sh) {
  const F = SNS.LIST_FIRST, n = Math.max(0, sh.getMaxRows() - F + 1);
  const vals = n ? sh.getRange(F, 1, n, 5).getValues() : [];
  let last = -1; vals.forEach(function (v, i) { if (String(v[0]).trim() !== '') last = i; });
  return { vals: vals, last: last };
}
function addMail_(sh, cell) {
  const v = normMail_(cell.getValue());
  if (!v) return;
  if (!okMail_(v)) { say_(sh, '「' + v + '」不是正確的 Email 格式，請重新輸入。'); return; }
  const L = listRows_(sh);
  for (let i = 0; i <= L.last; i++) {
    if (normMail_(L.vals[i][0]) !== v) continue;
    cell.clearContent();
    if (L.vals[i][4] === true) say_(sh, '這個帳號之前已經登記過，目前有刪除標記。若要重新加入，請找到原本紀錄並取消『是否刪除』勾選。（第 ' + (i + SNS.LIST_FIRST) + ' 列）');
    else say_(sh, '這個 Google Mail 已經在測試名單中，不需要重複新增。（第 ' + (i + SNS.LIST_FIRST) + ' 列）');
    return;
  }
  const row = L.last + 1 + SNS.LIST_FIRST;
  sh.getRange(row, 1, 1, 4).setValues([[v, new Date(), '', 1]]);
  const cb = sh.getRange(row, 5);
  if (!cb.getDataValidation()) cb.insertCheckboxes();
  cb.setValue(false);
  cell.clearContent();
  say_(sh, '已新增：' + v + '（第 ' + row + ' 列）。別忘了 Google Cloud Console 也要加入這個測試使用者。');
}
function toggleDel_(sh, e) {
  const row = e.range.getRow(), mail = sh.getRange(row, 1).getValue();
  if (String(mail).trim() === '') return;
  const now = String(e.value).toUpperCase() === 'TRUE', was = String(e.oldValue).toUpperCase() === 'TRUE';
  if (was && !now) {
    const n = Number(sh.getRange(row, 4).getValue()) || 1;
    sh.getRange(row, 3, 1, 2).setValues([[new Date(), n + 1]]);
    say_(sh, '已重新加入：' + mail + '（首次加入日期保留，加入次數 ' + (n + 1) + '）。別忘了 Google Cloud Console 也要重新加入。');
  } else if (now && !was) {
    say_(sh, '已標記刪除：' + mail + '。這只是名單標記，請另外到 Google Cloud Console 移除這個測試使用者。');
  }
}
function manualMail_(sh, e) {
  const row = e.range.getRow(), v = normMail_(e.range.getValue());
  if (!v) return;
  const L = listRows_(sh);
  for (let i = 0; i <= L.last; i++) {
    if (i + SNS.LIST_FIRST === row) continue;
    if (normMail_(L.vals[i][0]) === v) {
      e.range.setValue(e.oldValue === undefined ? '' : e.oldValue);
      say_(sh, (L.vals[i][4] === true ? '這個帳號之前已經登記過，目前有刪除標記。若要重新加入，請找到原本紀錄並取消『是否刪除』勾選。' : '這個 Google Mail 已經在測試名單中，不需要重複新增。') + '（第 ' + (i + SNS.LIST_FIRST) + ' 列；剛剛的輸入已還原）');
      return;
    }
  }
  if (String(e.range.getValue()) !== v) e.range.setValue(v);
  if (sh.getRange(row, 2).getValue() === '') {
    sh.getRange(row, 2, 1, 3).setValues([[new Date(), '', 1]]);
    const cb = sh.getRange(row, 5); if (!cb.getDataValidation()) cb.insertCheckboxes(); if (cb.getValue() === '') cb.setValue(false);
  }
}
function stampHelp_(sh, range) {
  const r0 = range.getRow(), n = range.getNumRows(), now = new Date();
  const vals = sh.getRange(r0, 1, n, 8).getValues();
  const out = vals.map(function (v, i) {
    const used = v.slice(1, 5).some(function (x) { return String(x).trim() !== ''; });
    if (!used) return [v[0], v[6], v[7]];
    return [v[0] || ('H' + Utilities.formatDate(now, SNS.TZ, 'yyMMddHHmmss') + (r0 + i)), v[6] || now, now];
  });
  sh.getRange(r0, 1, n, 1).setValues(out.map(function (o) { return [o[0]]; }));
  sh.getRange(r0, 7, n, 2).setValues(out.map(function (o) { return [o[1], o[2]]; }));
  // 新增的列：預設勾選「是否顯示」以外保持原狀（是否顯示由管理者自己決定）
}
