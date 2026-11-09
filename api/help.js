// GET /api/help：提供「使用說明與常見問題」的公開內容。
// 只讀管理試算表裡「使用說明與 Q&A」這一個工作表，只回傳勾選「是否顯示」的項目，
// 而且只回傳 ID、類型、排序、標題、內容五個欄位；其他工作表（使用者、測試名單）完全不會被讀取。
const S = require('./_lib/session');
const AD = require('./_lib/admin');

let cache = { t: 0, items: null };
const TTL = 60e3; // 伺服器端快取 1 分鐘（前端另有 5 分鐘快取）

const kind = (v) => {
  const s = String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, '');
  if (['注意事項', 'notice', '注意'].includes(s)) return 'notice';
  if (['q&a', 'qa', '常見問題', '常見問題q&a', 'faq', '問答'].includes(s)) return 'qa';
  return '';
};
const shown = (v) => v === true || ['true', '是', 'y', 'yes', '1', '✓', '✔', 'v'].includes(String(v == null ? '' : v).trim().toLowerCase());
const text = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').slice(0, max);

const parse = (rows) => (rows || []).map((r, i) => {
  r = r || [];
  const type = kind(r[1]), title = text(r[3], 300).trim(), body = text(r[4], 8000);
  if (!type || !title || !shown(r[5])) return null;
  const order = (r[2] === '' || r[2] == null) ? NaN : Number(r[2]);
  return { id: text(r[0] || ('row' + (i + 2)), 60), type, order: Number.isFinite(order) ? order : 9999, title, body };
}).filter(Boolean).sort((a, b) => a.order - b.order);

const handler = async (req, res, fetchFn = fetch) => {
  try {
    if (req.method !== 'GET') return S.json(res, 405, { error: 'method_not_allowed' });
    const cfg = AD.config();
    if (!cfg) return S.json(res, 503, { error: 'not_configured' });
    if (cache.items && Date.now() - cache.t < TTL) return S.json(res, 200, { items: cache.items, at: cache.t });
    try {
      const j = await AD.sheetsCall(cfg, '/values/' + AD.range(AD.SHEET.help, 'A2:H') + '?valueRenderOption=UNFORMATTED_VALUE', {}, fetchFn);
      cache = { t: Date.now(), items: parse(j.values) };
      return S.json(res, 200, { items: cache.items, at: cache.t });
    } catch (e) {
      if (cache.items) return S.json(res, 200, { items: cache.items, at: cache.t, stale: true });
      return S.json(res, 502, AD.safeErr(e));
    }
  } catch (e) {
    return S.json(res, 500, { error: 'server_error' });
  }
};
module.exports = (req, res) => handler(req, res);
module.exports._handler = handler;
module.exports._parse = parse;
module.exports._reset = () => { cache = { t: 0, items: null }; };
module.exports._expire = () => { cache.t = 0; };
