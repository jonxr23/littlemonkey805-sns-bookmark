// POST /api/activity：記錄「哪個 Google 帳號、什麼時候、做了哪一類操作」到管理者的 SNS_Bookmark_Admin。
// - 帳號身分只相信 Google：用前端的 Access Token 向 Google 查詢（必須是本 App 的 Token），不相信前端傳來的 Email。
// - 只記錄帳號、時間、操作類型；不記錄網址、貼文、圖片、備註、標籤、Token。
// - 這個 API 只會寫入，不會回傳任何管理資料；寫入失敗也不影響 App 的其他功能（前端不等待結果）。
const S = require('./_lib/session');
const AD = require('./_lib/admin');

const recent = new Map(); // 同一個執行個體內的短時間去重（Serverless 可能有多個執行個體，前端另有節流）

const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return await new Promise((resolve) => {
    let s = ''; req.on('data', (c) => { s += c; if (s.length > 4096) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
};

async function record(cfg, u, key, type, data, now, fetchFn) {
  const R = (a1) => AD.range(AD.SHEET.act, a1);
  const ts = AD.serialTaipei(now), label = AD.ACT_LABEL[type];
  const call = (p, o) => AD.sheetsCall(cfg, p, o, fetchFn);
  const rows = (await call('/values/' + R('A2:D') + '?valueRenderOption=UNFORMATTED_VALUE')).values || [];
  let hit = [];
  rows.forEach((r, i) => { if (r && r[1] === key) hit.push(i); });
  if (!hit.length) rows.forEach((r, i) => { if (r && !r[1] && String(r[0] || '').trim().toLowerCase() === u.email) hit.push(i); }); // 管理者手動先建的列
  const upd = [];
  if (hit.length) {
    const first = hit[0], row = first + 2;
    let firstUse = Number(rows[first][2]) || ts;
    // 同一個帳號被重複建立（例如兩台裝置在同一瞬間第一次登入）：合併成一列
    for (const i of hit.slice(1)) {
      const c = Number(rows[i][2]); if (c && c < firstUse) firstUse = c;
      upd.push({ range: decodeURIComponent(R('A' + (i + 2) + ':D' + (i + 2))), values: [['', '', '', '']] });
      upd.push({ range: decodeURIComponent(R('F' + (i + 2) + ':G' + (i + 2))), values: [['', '']] });
    }
    upd.push({ range: decodeURIComponent(R('A' + row + ':D' + row)), values: [[u.email, key, firstUse, ts]] });
    upd.push({ range: decodeURIComponent(R('F' + row)), values: [[label]] });
    if (data) upd.push({ range: decodeURIComponent(R('G' + row)), values: [[ts]] });
    await call('/values:batchUpdate', { method: 'POST', body: { valueInputOption: 'RAW', data: upd } });
    return { row, created: false, merged: hit.length - 1 };
  }
  // 新帳號：寫在最後一列之後；寫完再讀回確認沒有被同時寫入的另一個帳號蓋掉
  let row = rows.length + 2;
  for (let attempt = 0; attempt < 3; attempt++) {
    await call('/values:batchUpdate', { method: 'POST', body: { valueInputOption: 'RAW', data: [
      { range: decodeURIComponent(R('A' + row + ':D' + row)), values: [[u.email, key, ts, ts]] },
      { range: decodeURIComponent(R('F' + row + ':G' + row)), values: [[label, data ? ts : '']] },
    ] } });
    const chk = (await call('/values/' + R('B' + row) + '?valueRenderOption=UNFORMATTED_VALUE')).values;
    if (chk && chk[0] && chk[0][0] === key) return { row, created: true };
    const again = (await call('/values/' + R('A2:B') + '?valueRenderOption=UNFORMATTED_VALUE')).values || [];
    if (again.some((r) => r && r[1] === key)) return { row: -1, created: true };
    row = again.length + 2;
  }
  const er = new Error('append_conflict'); er.code = 'append_conflict'; throw er;
}

const handler = async (req, res, fetchFn = fetch) => {
  try {
    if (!S.sameSiteCall(req)) return S.json(res, 403, { error: 'forbidden' });
    const cfg = AD.config();
    if (!cfg) return S.json(res, 503, { error: 'not_configured' });
    const body = await readBody(req);
    const type = String((body && body.type) || '');
    if (!Object.prototype.hasOwnProperty.call(AD.ACT_LABEL, type)) return S.json(res, 400, { error: 'bad_type' });
    const auth = String(req.headers.authorization || '');
    const u = await AD.verifyUser(auth.startsWith('Bearer ') ? auth.slice(7).trim() : '', fetchFn);
    if (!u) return S.json(res, 401, { error: 'unauthorized' });
    const key = AD.userKey(u.sub), data = AD.DATA_TYPES.has(type) && body.data === true, now = Date.now();
    const last = recent.get(key);
    if (last && !data && last.type === type && now - last.t < 5 * 60e3) return S.json(res, 200, { ok: true, skipped: true });
    await record(cfg, u, key, type, data, now, fetchFn);
    if (recent.size > 5000) recent.clear();
    recent.set(key, { t: now, type });
    return S.json(res, 200, { ok: true });
  } catch (e) {
    return S.json(res, 502, AD.safeErr(e));
  }
};
module.exports = (req, res) => handler(req, res);
module.exports._handler = handler;
module.exports._recent = recent;
