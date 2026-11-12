// POST /api/resolve：社群「手機分享短網址」解析（V3.0.0 新增；V3.1.0 加入 Bilibili b23.tv、Facebook 分享網址、微博貼文↔影片關聯）。
// 只做一件事：把 TikTok／Threads／抖音／微博 t.cn／Bilibili b23.tv／Facebook 的分享網址，依平台公開的轉址（HTTP 3xx Location）
// 或頁面本身公開標示的正式網址（<link rel="canonical">、og:url），找出正式的貼文／影片網址，供前端「重複網址偵測」比對。
// 安全限制：
//   ・只接受自己網站送來的 POST（同 /api/auth 的 X-Requested-With＋Origin 檢查）。
//   ・只接受下列平台的短網址；每一次轉址都重新檢查目標網域，只能停留在同一個平台的網域內（避免任意網址請求／SSRF）。
//   ・只用 https／http 預設連接埠、不接受 IP 位址、不帶 Cookie、不登入、不處理驗證碼；遇到登入頁或被拒絕就回報失敗。
//   ・最多 5 次轉址、整體 6 秒逾時、頁面最多讀 256KB。
//   ・不寫入任何資料、不讀取使用者的 Google 資料；不需要新的環境變數。
// V3.1.0：微博「貼文」網址另外讀微博公開的貼文資料（m.weibo.cn／weibo.com 的 statuses/show），只取影片 FID，用來把貼文和影片頁視為同一則內容；拿不到就回報失敗，不重試。
const S = require('./_lib/session');

const TIMEOUT = 6000, MAX_HOPS = 5, MAX_BYTES = 256 * 1024;
const UA = 'Mozilla/5.0 (compatible; SNSBookmarkResolver/3.1; +https://littlemonkey805-sns-bookmark.vercel.app/)';

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
    canon: (u) => {
      const m = /\/(?:share\/)?(?:video|note)\/(\d{8,25})/.exec(u.pathname);
      if (m) return { url: 'https://www.douyin.com/video/' + m[1], acct: null };
      // V3.1.0：電腦版 /user/{id}?modal_id={影片 ID}
      const q = u.searchParams.get('modal_id');
      return q && /^\d{8,25}$/.test(q) ? { url: 'https://www.douyin.com/video/' + q, acct: null } : null;
    },
  },
  {
    id: 'weibo',
    isShort: (h) => h === 't.cn',
    allow: (h) => h === 't.cn' || /(^|\.)weibo\.(com|cn)$/.test(h),
    canon: (u) => {
      const h = u.hostname, p = u.pathname; let m;
      if (/(^|\.)weibo\.com$/.test(h) && (m = /^\/(\d{4,12})\/([A-Za-z0-9]{8,10})\/?$/.exec(p))) return { url: 'https://weibo.com/' + m[1] + '/' + m[2], acct: null };
      if (/(^|\.)weibo\.com$/.test(h) && (m = /^\/(\d{4,12})\/(\d{12,20})\/?$/.exec(p))) return { url: 'https://weibo.com/' + m[1] + '/' + m[2], acct: null }; // V3.1.0：手機分享的數字貼文 ID
      if (/(^|\.)weibo\.com$/.test(h) && (m = /^\/detail\/(\d{10,20})\/?$/.exec(p))) return { url: 'https://weibo.com/detail/' + m[1], acct: null };
      if (/(^|\.)weibo\.cn$/.test(h) && (m = /^\/(?:status|detail)\/([A-Za-z0-9]{8,20})\/?$/.exec(p))) return { url: 'https://m.weibo.cn/status/' + m[1], acct: null };
      return null;
    },
  },
  {
    // V3.1.0：Bilibili 手機分享短網址 b23.tv → www.bilibili.com/video/BV…（語系路徑、追蹤參數一律去掉）
    id: 'bilibili',
    isShort: (h) => h === 'b23.tv',
    allow: (h) => h === 'b23.tv' || /(^|\.)bilibili\.com$/.test(h),
    canon: (u) => { const m = /(?:^|\/)video\/(BV[0-9A-Za-z]{10}|av\d{1,12})(?:\/|$)/i.exec(u.pathname); if (!m || !/(^|\.)bilibili\.com$/.test(u.hostname)) return null; const id = /^bv/i.test(m[1]) ? 'BV' + m[1].slice(2) : m[1].toLowerCase(); return { url: 'https://www.bilibili.com/video/' + id + '/', acct: null }; },
  },
  {
    // V3.1.0：Facebook 分享網址（/share/…、fb.watch）。只做「盡力解析」：跟著公開轉址走；遇到登入頁時只讀登入頁網址裡的 next 參數，不登入、不重試。
    id: 'facebook',
    isShort: (h, p) => (/^(www\.|m\.|web\.)?facebook\.com$/.test(h) && /^\/share\/(?:[prv]\/)?[\w-]+/.test(p)) || h === 'fb.watch',
    allow: (h) => /(^|\.)facebook\.com$/.test(h) || h === 'fb.watch',
    canon: (u) => {
      if (!/(^|\.)facebook\.com$/.test(u.hostname)) return null;
      const p = u.pathname, q = (k) => u.searchParams.get(k) || '';
      if (/^\/login(\.php)?\/?$/.test(p) && q('next')) { const n = safeUrl(q('next')); return n && /(^|\.)facebook\.com$/.test(n.hostname) && !/^\/login/.test(n.pathname) ? PLAT_FB_CANON(n) : null; }
      return PLAT_FB_CANON(u);
    },
  },
];

// Facebook 正式網址 → 可比對的固定格式（只認得出貼文／影片 ID 的格式；其他一律視為無法解析）
function PLAT_FB_CANON(u) {
  const p = u.pathname.replace(/\/+$/, ''), q = (k) => u.searchParams.get(k) || ''; let m;
  const ok = (x) => /^(pfbid[0-9A-Za-z]{20,80}|\d{5,25})$/.test(x);
  if (/^\/(permalink|story)\.php$/.test(p) && ok(q('story_fbid')) && /^\d{1,25}$/.test(q('id'))) return { url: 'https://www.facebook.com/permalink.php?story_fbid=' + q('story_fbid') + '&id=' + q('id'), acct: null };
  if ((m = /^\/groups\/([\w.-]{1,80})\/(?:posts|permalink)\/([\w]{5,90})$/.exec(p)) && ok(m[2])) return { url: 'https://www.facebook.com/groups/' + m[1] + '/posts/' + m[2], acct: null };
  if ((m = /^\/([\w.-]{1,80})\/posts\/([\w]{5,90})$/.exec(p)) && ok(m[2])) return { url: 'https://www.facebook.com/' + m[1] + '/posts/' + m[2], acct: null };
  if ((m = /^\/([\w.-]{1,80})\/videos\/(?:[\w-]+\/)?(\d{5,25})$/.exec(p))) return { url: 'https://www.facebook.com/watch/?v=' + m[2], acct: null };
  if ((m = /^\/reel\/(\d{5,25})$/.exec(p))) return { url: 'https://www.facebook.com/reel/' + m[1], acct: null };
  if (/^\/watch$/.test(p) && /^\d{5,25}$/.test(q('v'))) return { url: 'https://www.facebook.com/watch/?v=' + q('v'), acct: null };
  return null;
}

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

// V3.1.0：微博「貼文」網址（A：英數代碼、B：數字 ID、detail、m.weibo.cn）→ 取貼文 ID
const wbPostId = (u) => {
  const h = u.hostname, p = u.pathname.replace(/\/+$/, ''); let m;
  if (h === 'video.weibo.com') return '';
  if (/(^|\.)weibo\.com$/.test(h) && (m = /^\/\d{4,12}\/([A-Za-z0-9]{8,10}|\d{12,20})$/.exec(p))) return m[1];
  if (/(^|\.)weibo\.com$/.test(h) && (m = /^\/detail\/(\d{10,20})$/.exec(p))) return m[1];
  if (/(^|\.)weibo\.cn$/.test(h) && (m = /^\/(?:status|detail)\/([A-Za-z0-9]{8,20})$/.exec(p))) return m[1];
  return '';
};

// V3.1.0：微博貼文 ↔ 影片（FID，例如 1034:5348246542024732）的關聯。
// 只讀微博公開的貼文資料（page_info.object_id）；不登入、不帶 Cookie。拿不到（要登入、被擋、格式不同）就回報失敗，前端會顯示溫馨提醒。
async function weiboRel(id, fetchFn, signal) {
  const APIS = ['https://m.weibo.cn/statuses/show?id=', 'https://weibo.com/ajax/statuses/show?id='];
  for (const a of APIS) {
    if (signal.aborted) break;
    let r;
    try {
      r = await fetchFn(a + encodeURIComponent(id), { method: 'GET', redirect: 'manual', signal, headers: { 'User-Agent': UA, Accept: 'application/json, text/plain, */*', 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.6', 'X-Requested-With': 'XMLHttpRequest', Referer: a.indexOf('m.weibo.cn') > 0 ? 'https://m.weibo.cn/' : 'https://weibo.com/' } });
    } catch (e) { continue; }
    if (r.status !== 200 || !/json/i.test(r.headers.get('content-type') || '')) continue;
    let j; try { j = JSON.parse(await readText(r)); } catch (e) { continue; }
    const d = j && typeof j === 'object' ? (j.data && typeof j.data === 'object' ? j.data : j) : null;
    if (!d || !(d.id || d.mid || d.idstr)) continue;
    const rel = new Set();
    for (const x of [d, d.retweeted_status]) {
      const pi = x && x.page_info; if (!pi) continue;
      const oid = String(pi.object_id || '');
      if (/^\d{3,6}:\d{6,25}$/.test(oid) && (/^1034:/.test(oid) || /video/i.test(String(pi.type || pi.object_type || '')))) rel.add('wbv:' + oid);
    }
    return { ok: true, rel: [...rel] };
  }
  return { ok: false };
}

async function resolve(input, fetchFn = fetch) {
  const start = safeUrl(input);
  if (!start) return { ok: false, reason: 'bad_url' };
  const P = platOf(start);
  const wb0 = !P && /(^|\.)weibo\.(com|cn)$/.test(start.hostname) ? wbPostId(start) : '';
  if (!P && !wb0) return { ok: false, reason: 'unsupported' };
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), TIMEOUT);
  // 解析完成：微博貼文另外查影片關聯（查不到不影響正式網址結果，只回報 relOk:false）
  const done = async (pid, c) => {
    const out = { ok: true, platform: pid, url: c.url, acct: c.acct || null };
    if (pid === 'weibo') { let id = ''; try { id = wbPostId(new URL(c.url)); } catch (e) { /* ignore */ } if (id) { const w = await weiboRel(id, fetchFn, ac.signal); out.relOk = !!w.ok; if (w.ok) out.rel = w.rel; } }
    return out;
  };
  try {
    if (wb0) { const c = PLAT.find((x) => x.id === 'weibo').canon(start); if (!c) return { ok: false, reason: 'not_a_post' }; const o = await done('weibo', c); return o.relOk ? o : { ok: false, reason: 'rel_failed', url: o.url }; }
    let cur = start;
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const c = P.canon(cur);
      if (c) return await done(P.id, c);
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
      return c2 ? await done(P.id, c2) : { ok: false, reason: 'not_a_post' };
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
module.exports._wbPostId = wbPostId;
module.exports._reset = () => { cache.clear(); hits.clear(); };
