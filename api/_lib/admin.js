// 管理中心共用工具（V2.5.0）：用 Service Account 存取管理者的 SNS_Bookmark_Admin 試算表。
// 只使用 Node.js 內建模組，不需要安裝任何套件。私鑰只從 Vercel 環境變數讀取，不寫進任何日誌或錯誤訊息。
const crypto = require('crypto');

const SHEET = { act: '使用者活動紀錄', help: '使用說明與 Q&A' };
const ACT_LABEL = { open: '開啟 App', view: '查看收藏明細', search: '搜尋／篩選', add: '新增收藏', edit: '編輯收藏', delete: '刪除收藏', batch: '批次操作' };
const DATA_TYPES = new Set(['add', 'edit', 'delete', 'batch']);

// 讀取 Service Account 設定：支援「三個分開的變數」或「一整段 JSON」
const config = () => {
  const id = (process.env.ADMIN_SHEET_ID || '').trim();
  let email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  let key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  const js = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (js && (!email || !key)) {
    try { const o = JSON.parse(js); email = email || o.client_email || ''; key = key || o.private_key || ''; } catch (e) { /* 格式錯誤：當作沒設定 */ }
  }
  key = normKey(key);
  if (!id || !email || !key) return null;
  return { id, email, key };
};
// Vercel 介面貼上私鑰時，換行常常變成字面上的 \n，或整段被加上引號：這裡統一還原
const normKey = (k) => {
  k = String(k || '').trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) k = k.slice(1, -1);
  k = k.replace(/\\r/g, '').replace(/\\n/g, '\n').replace(/\r/g, '');
  return k.includes('PRIVATE KEY') ? k : '';
};

const b64u = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
let cached = { tok: '', exp: 0, email: '' };
// Service Account 用 JWT 換 Access Token（範圍只有試算表，能碰到的只有「分享給它」的那一份試算表）
const saToken = async (cfg, fetchFn = fetch) => {
  const now = Math.floor(Date.now() / 1000);
  if (cached.tok && cached.email === cfg.email && cached.exp - 120 > now) return cached.tok;
  const head = b64u({ alg: 'RS256', typ: 'JWT' });
  const body = b64u({ iss: cfg.email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  let sig;
  try { sig = crypto.createSign('RSA-SHA256').update(head + '.' + body).sign(cfg.key).toString('base64url'); }
  catch (e) { const er = new Error('service_account_key_invalid'); er.code = 'key'; throw er; }
  const r = await fetchFn('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: head + '.' + body + '.' + sig }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) { const er = new Error('service_account_token_failed'); er.code = 'sa'; er.status = r.status; throw er; }
  cached = { tok: j.access_token, exp: now + (Number(j.expires_in) || 3600), email: cfg.email };
  return cached.tok;
};

const enc = encodeURIComponent;
const range = (sheet, a1) => enc("'" + sheet.replace(/'/g, "''") + "'!" + a1);
const sheetsCall = async (cfg, path, opt = {}, fetchFn = fetch) => {
  const t = await saToken(cfg, fetchFn);
  const r = await fetchFn('https://sheets.googleapis.com/v4/spreadsheets/' + enc(cfg.id) + path, {
    method: opt.method || 'GET',
    headers: Object.assign({ Authorization: 'Bearer ' + t }, opt.body ? { 'Content-Type': 'application/json' } : {}),
    body: opt.body ? JSON.stringify(opt.body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const er = new Error('sheets_' + r.status); er.status = r.status; throw er; }
  return j;
};

// 試算表日期序號（台北時間），寫入數值，讓試算表用日期格式顯示、可以排序與計算天數
const serialTaipei = (ms) => (ms + 8 * 3600e3) / 86400e3 + 25569;

// 使用者內部識別 Key：Google sub 經過 HMAC-SHA256 的不可逆結果（試算表不存原始 sub）
const userKey = (sub) => {
  const secret = process.env.ACTIVITY_KEY_SECRET || ('activity-key:' + (process.env.SESSION_SECRET || ''));
  return 'u_' + crypto.createHmac('sha256', secret).update('sns-activity:' + String(sub)).digest('hex').slice(0, 24);
};

// 驗證前端送來的 Google Access Token：向 Google 查詢，必須是本 App 發出的、Email 已驗證
const verifyUser = async (accessToken, fetchFn = fetch) => {
  if (!accessToken || accessToken.length > 4096) return null;
  const r = await fetchFn('https://oauth2.googleapis.com/tokeninfo?access_token=' + enc(accessToken));
  if (!r.ok) return null;
  const j = await r.json().catch(() => ({}));
  const cid = process.env.GOOGLE_CLIENT_ID || '';
  if (!j || !j.sub || !j.email || !cid || (j.aud !== cid && j.azp !== cid)) return null;
  if (String(j.email_verified) !== 'true') return null;
  if (Number(j.exp) && Number(j.exp) * 1000 < Date.now()) return null;
  return { sub: String(j.sub), email: String(j.email).trim().toLowerCase() };
};

const safeErr = (e) => ({ error: (e && e.code) || (e && e.status ? 'sheets_' + e.status : 'admin_unavailable') });

module.exports = { SHEET, ACT_LABEL, DATA_TYPES, config, normKey, saToken, sheetsCall, range, serialTaipei, userKey, verifyUser, safeErr, _reset: () => { cached = { tok: '', exp: 0, email: '' }; } };
