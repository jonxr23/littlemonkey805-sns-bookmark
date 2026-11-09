// GET /api/announcements：提供「📢 公告」的公開內容（V2.8.0）。
// 只讀管理試算表裡「公告管理」這一個工作表，在伺服器端篩選：
//   ・只回傳勾選「是否發布」、還沒到下架日期、有標題與內容、有發布時間的公告
//   ・只回傳 公告 ID、分類、標題、摘要、完整內容、發布時間、是否置頂、是否顯示 NEW、是否固定展開
//   ・不回傳 建立時間、最後修改時間、管理者備註、草稿、原始資料列，其他工作表完全不會被讀取
// 這個端點只能讀取；沒有任何新增、修改、發布、刪除公告的功能。
const S = require('./_lib/session');
const AD = require('./_lib/admin');

const SHEET = '公告管理';
const TTL = 30e3; // 伺服器端快取 30 秒（指令上限 60 秒）
let cache = { t: 0, rows: null };

const yes = (v) => v === true || ['true', '是', 'y', 'yes', '1', '✓', '✔', 'v'].includes(String(v == null ? '' : v).trim().toLowerCase());
const text = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').slice(0, max);
// 試算表的日期（台北時區的日期序號，或「2026-11-10 08:00」這類文字）→ 毫秒；無法辨識回傳 NaN
const toMs = (v) => {
  if (typeof v === 'number' && Number.isFinite(v) && v > 20000) return Math.round((v - 25569) * 86400e3 - 8 * 3600e3);
  const s = String(v == null ? '' : v).trim();
  const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) - 8 * 3600e3;
};
// 欄位：A 公告 ID、B 分類、C 標題、D 摘要、E 完整內容、F 建立時間、G 發布時間、H 最後修改時間、
//       I 是否發布、J 是否置頂、K 是否固定展開、L 是否顯示 NEW、M 下架日期、N 管理者備註（N 不讀取）
const parse = (rows, now = Date.now()) => {
  const list = (rows || []).map((r, i) => {
    r = r || [];
    const title = text(r[2], 200).trim(), summary = text(r[3], 600).trim(), body = text(r[4], 20000);
    if (!yes(r[8]) || !title || (!body.trim() && !summary)) return null;
    const pub = toMs(r[6]);
    if (!Number.isFinite(pub)) return null; // 沒有發布時間：視為尚未正式發布
    const off = r[12] === '' || r[12] == null ? NaN : toMs(r[12]);
    if (r[12] !== '' && r[12] != null && !Number.isFinite(off)) return null; // 下架日期打錯：保守起見不公開
    if (Number.isFinite(off) && now >= off) return null; // 已到下架時間
    return {
      id: text(r[0] || ('row' + (i + 2)), 60).trim(),
      cat: text(r[1], 20).trim() || '其他',
      title, summary, body, pub,
      pin: yes(r[9]), open: yes(r[10]), new: yes(r[11]),
      _created: toMs(r[5]), _mod: toMs(r[7]),
    };
  }).filter(Boolean);
  const num = (x) => (Number.isFinite(x) ? x : -Infinity);
  list.sort((a, b) => (b.pin - a.pin) || (b.pub - a.pub) || (num(b._created) - num(a._created)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  // 固定展開同時只能一則（試算表的 Apps Script 會自動處理；這裡再保險一次：保留最後修改的那一則）
  const opens = list.filter((x) => x.open);
  if (opens.length > 1) { const keep = opens.reduce((m, x) => (num(x._mod) > num(m._mod) ? x : m)); opens.forEach((x) => { if (x !== keep) x.open = false; }); }
  return list.slice(0, 200).map(({ _created, _mod, ...pub }) => pub);
};

const handler = async (req, res, fetchFn = fetch) => {
  try {
    if (req.method !== 'GET') return S.json(res, 405, { error: 'method_not_allowed' });
    const cfg = AD.config();
    if (!cfg) return S.json(res, 503, { error: 'not_configured' });
    // 快取原始資料列，篩選每次重算：下架時間一到就不再出現
    if (!cache.rows || Date.now() - cache.t >= TTL) {
      try {
        const j = await AD.sheetsCall(cfg, '/values/' + AD.range(SHEET, 'A2:M') + '?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER', {}, fetchFn);
        cache = { t: Date.now(), rows: j.values || [] };
      } catch (e) {
        if (cache.rows) return S.json(res, 200, { items: parse(cache.rows), at: cache.t, stale: true });
        return S.json(res, 502, e && e.status === 400 ? { error: 'sheet_missing' } : AD.safeErr(e));
      }
    }
    return S.json(res, 200, { items: parse(cache.rows), at: cache.t });
  } catch (e) {
    return S.json(res, 500, { error: 'server_error' });
  }
};
module.exports = (req, res) => handler(req, res);
module.exports._handler = handler;
module.exports._parse = parse;
module.exports._toMs = toMs;
module.exports._reset = () => { cache = { t: 0, rows: null }; };
module.exports._expire = () => { cache.t = 0; };
