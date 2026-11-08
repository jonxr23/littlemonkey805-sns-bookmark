// 共用工具：加密 Cookie、讀取 Cookie、設定環境變數檢查
const crypto = require('crypto');

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error('Missing environment variable: ' + k);
  return v;
};

// APP_URL 例如 https://littlemonkey805-sns-bookmark.vercel.app（結尾不要加斜線）
const appUrl = () => env('APP_URL').replace(/\/+$/, '');

const key = () => crypto.createHash('sha256').update(env('SESSION_SECRET')).digest();

// AES-256-GCM：Refresh Token 以加密後的 HttpOnly Cookie 保存，瀏覽器的 JavaScript 讀不到
const encrypt = (text) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64url');
};

const decrypt = (s) => {
  const b = Buffer.from(s, 'base64url');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
};

const readCookies = (req) => {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
};

const cookieStr = (name, value, maxAge) =>
  `${name}=${value}; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

const addCookies = (res, list) => {
  const prev = res.getHeader('Set-Cookie');
  const arr = prev ? (Array.isArray(prev) ? prev : [prev]) : [];
  res.setHeader('Set-Cookie', arr.concat(list));
};

// 簡單的 CSRF 防護：只接受自己網站、且帶有自訂標頭的 POST
const sameSiteCall = (req) => {
  if (req.method !== 'POST') return false;
  if (req.headers['x-requested-with'] !== 'sns') return false;
  const o = req.headers.origin;
  if (o && o !== appUrl()) return false;
  return true;
};

const RT_MAX_AGE = 60 * 60 * 24 * 180; // 180 天（每次成功使用就重新計算：滑動期限）

// 向 Google 確認這個 Access Token 實際屬於哪一個 Google 帳號（sub = 帳號的唯一識別碼）
const googleSub = async (accessToken) => {
  const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => ({}));
  return j && j.sub ? String(j.sub) : null;
};

// g_rt Cookie 內容 = { r: Refresh Token, s: 這個 Token 所屬的 Google sub }，整包加密
const sealRefresh = (refreshToken, sub) => encrypt(JSON.stringify({ r: refreshToken, s: sub }));
const openRefresh = (cookieValue) => {
  try {
    const o = JSON.parse(decrypt(cookieValue));
    return o && o.r && o.s ? { r: o.r, s: String(o.s) } : null;
  } catch (e) { return null; }
};
const refreshCookie = (refreshToken, sub) => cookieStr('g_rt', sealRefresh(refreshToken, sub), RT_MAX_AGE);

const json = (res, status, obj) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
};

module.exports = { env, appUrl, encrypt, decrypt, readCookies, cookieStr, addCookies, sameSiteCall, json, googleSub, openRefresh, refreshCookie, RT_MAX_AGE };
