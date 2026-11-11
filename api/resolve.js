// POST /api/resolve：社群「手機分享短網址」解析（V3.0.0 新增）。
// 只做一件事：把 TikTok／Threads／抖音／微博 t.cn 的分享短網址，依平台公開的轉址（HTTP 3xx Location）
// 或頁面本身公開標示的正式網址（<link rel="canonical">、og:url），找出正式的貼文／影片網址，供前端「重複網址偵測」比對。
// 安全限制：
//   ・只接受自己網站送來的 POST（同 /api/auth 的 X-Requested-With＋Origin 檢查）。
//   ・只接受下列平台的短網址；每一次轉址都重新檢查目標網域，只能停留在同一個平台的網域內（避免任意網址請求／SSRF）。
//   ・只用 https／http 預設連接埠、不接受 IP 位址、不帶 Cookie、不登入、不處理驗證碼；遇到登入頁或被拒絕就回報失敗。
//   ・最多 5 次轉址、整體 6 秒逾時、頁面最多讀 256KB。
//   ・不寫入任何資料、不讀取使用者的 Google 資料；不需要新的環境變數。
const S = require('./_lib/session');

const TIMEOUT = 6000, MAX_HOPS = 5, MAX_BYTES = 256 * 1024;
const UA = 'Mozilla/5.0 (compatible; SNSBookmarkResolver/3.0; +https://littlemonkey805-sns-bookmark.vercel.app/)';

const PLAT = [
  {
    id: 'tiktok',
    isShort: (h, p) => h === 'vm.tiktok.com' || h === 'vt.tiktok.com' || ((h === 'www.tiktok.com' || h === 'tiktok.com' || h === 'm.tiktok.com') && /^\/t\/[\w-]+/.test(p)),
    allow: (h) => /(^|\.)tiktok\.com$/.test(h),
    canon: (u) => { const m = /^\/@([\w.-]{1,40})\/(?:video|photo)\/(\d{8,25})/.exec(u.pathname); return m ? { url: 'https://www.tiktok.com/@' + m[1] + '/video/' + m[2], acct: '@' + m[1] } : null; },
  },
  {
    id: 'threads',
    isShort: (h, p) => /^(www\.)?threads\.(com|net)$/.test(h) && /^\/share\/[\w-]+/.test(p),
    allow: (h) => /^(www\.)?threads\.(com|net)$/.test(h),
    canon: (u) => { const m = /^\/@([\w.]{1,40})\/post\/([\w-]{5,20})/.exec(u.pathname); return m ? { url: 'https://www.threads.com/@' + m[1] + '/post/' + m[2], acct: '@' + m[1] } : null; },
  },
  {
    id: 'douyin',
    isShort: (h) => h === 'v.douyin.com',
    allow: (h) => /(^|\.)(douyin|iesdouyin)\.com$/.test(h),
    canon: (u) => { const m = /\/(?:share\/)?(?:video|note)\/(\d{8,25})/.exec(u.pathname); return m ? { url: 'https://www.douyin.com/video/' + m[1], acct: null } : null; },
  },
  {
    id: 'weibo',
    isShort: (h) => h === 't.cn',
    allow: (h) => h === 't.cn' || /(^|\.)weibo\.(com|cn)$/.test(h),
    canon: (u) => {
      const h = u.hostname, p = u.pathname; let m;
      if (/(^|\.)weibo\.com$/.test(h) && (m = /^\/(\d{4,12})\/([A-Za-z0-9]{8,10})\/?$/.exec(p))) return { url: 'https://weibo.com/' + m[1] + '/' + m[2], acct: null };
      if (/(^|\.)weibo\.com$/.test(h) && (m = /^\/detail\/(\d{10,20})\/?$/.exec(p))) return { url: 'https://weibo.com/detail/' + m[1], acct: null };
      if (/(^|\.)weibo\.cn$/.test(h) && (m = /^\/(?:status|detail)\/([A-Za-z0-9]{8,20})\/?$/.exec(p))) return { url: 'https://m.weibo.cn/status/' + m[1], acct: null };
      return null;
    },
  },
];

const safeUrl = (s) => {
  let u;
  try { u = new URL(String(s || '').trim()); } catch (e) { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (u.username || u.password) return null;
  if (u.port && !((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80'))) return null;
  const h = u.hostname.toLowerCase();
  if (!h || /^[\d.]+$/.test(h) || h.includes(':') || h.startsWith('[')) return null; // 不接受 IP 位址
  u.hostname = h;
  return u;
};

const platOf = (u) => PLAT.find((P) => P.isShort(u.hostname, u.pathname)) || null;

// 從 HTML 前段找 canonical／og:url（只讀，不執行任何程式）
const metaUrl = (html) => {
  const tags = html.match(/<(?:link|meta)\b[^>]*>/gi) || [];
  for (const t of tags) {
    const attr = (n) => { const m = new RegExp('\\b' + n + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'i').exec(t); return m ? (m[2] !== undefined ? m[2] : m[3]) : ''; };
    if (/^<link/i.test(t) && /(^|\s)canonical(\s|$)/i.test(attr('rel'))) { const v = attr('href'); if (v) return v; }
    if (/^<meta/i.test(t) && /^og:url$/i.test(attr('property'))) { const v = attr('content'); if (v) return v; }
  }
  return '';
};

const readText = async (r) => {
  if (!r.body || !r.body.getReader) { const t = await r.text(); return t.slice(0, MAX_BYTES); }
  const rd = r.body.getReader(); const chunks = []; let n = 0;
  while (n < MAX_BYTES) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); n += value.length; }
  try { rd.cancel(); } catch (e) { /* ignore */ }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8').slice(0, MAX_BYTES);
};

async function resolve(input, fetchFn = fetch) {
  const start = safeUrl(input);
  if (!start) return { ok: false, reason: 'bad_url' };
  const P = platOf(start);
  if (!P) return { ok: false, reason: 'unsupported' };
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), TIMEOUT);
  try {
    let cur = start;
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const c = P.canon(cur);
      if (c) return { ok: true, platform: P.id, url: c.url, acct: c.acct || null };
      let r;
      try {
        r = await fetchFn(cur.href, { method: 'GET', redirect: 'manual', signal: ac.signal, headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.6' } });
      } catch (e) { return { ok: false, reason: ac.signal.aborted ? 'timeout' : 'network' }; }
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get('location');
        if (!loc) return { ok: false, reason: 'no_location' };
        let nx; try { nx = new URL(loc, cur); } catch (e) { return { ok: false, reason: 'bad_location' }; }
        nx = safeUrl(nx.href);
        if (!nx || !P.allow(nx.hostname)) return { ok: false, reason: 'redirect_blocked' };
        cur = nx; continue;
      }
      if (r.status !== 200) return { ok: false, reason: 'http_' + r.status };
      const ct = r.headers.get('content-type') || '';
      if (!/html/i.test(ct)) return { ok: false, reason: 'not_html' };
      const html = await readText(r);
      const m = metaUrl(html);
      if (!m) return { ok: false, reason: 'no_canonical' };
      let cu; try { cu = safeUrl(new URL(m, cur).href); } catch (e) { cu = null; }
      if (!cu || !P.allow(cu.hostname)) return { ok: false, reason: 'canonical_blocked' };
      const c2 = P.canon(cu);
      return c2 ? { ok: true, platform: P.id, url: c2.url, acct: c2.acct || null } : { ok: false, reason: 'not_a_post' };
    }
    return { ok: false, reason: 'too_many_redirects' };
  } finally { clearTimeout(tm); }
}

// 同一個執行個體內：成功結果快取 6 小時、每個來源 IP 每 5 分鐘最多 60 次（Serverless 可能有多個執行個體；前端另有快取與節流）
const cache = new Map(), hits = new Map();
const limited = (ip, now) => {
  const a = (hits.get(ip) || []).filter((t) => now - t < 5 * 60e3);
  a.push(now); hits.set(ip, a);
  if (hits.size > 5000) hits.clear();
  return a.length > 60;
};

const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return await new Promise((res) => {
    let s = ''; req.on('data', (c) => { s += c; if (s.length > 4096) req.destroy(); });
    req.on('end', () => { try { res(JSON.parse(s || '{}')); } catch (e) { res({}); } });
    req.on('error', () => res({}));
  });
};

const handler = async (req, res, fetchFn = fetch) => {
  try {
    if (!S.sameSiteCall(req)) return S.json(res, 403, { ok: false, reason: 'forbidden' });
    const now = Date.now();
    const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim();
    if (limited(ip, now)) return S.json(res, 429, { ok: false, reason: 'rate_limited' });
    const b = await readBody(req);
    const url = String((b && b.url) || '').slice(0, 600);
    const key = url.trim();
    const c = cache.get(key);
    if (c && now - c.t < 6 * 3600e3) return S.json(res, 200, c.v);
    const v = await resolve(url, fetchFn);
    if (v.ok) { cache.set(key, { t: now, v }); if (cache.size > 2000) cache.clear(); }
    return S.json(res, 200, v);
  } catch (e) {
    return S.json(res, 200, { ok: false, reason: 'server_error' });
  }
};

module.exports = (req, res) => handler(req, res);
module.exports._handler = handler;
module.exports._resolve = resolve;
module.exports._metaUrl = metaUrl;
module.exports._safeUrl = safeUrl;
module.exports._reset = () => { cache.clear(); hits.clear(); };
