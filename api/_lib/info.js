// V3.2.0：九個平台的「發文帳號／貼上的文字」自動帶入資料取得器（由 api/resolve.js 在請求帶 info:1 時呼叫）。
// 原則：
//   ・只連各平台官方或公開的網域；只用 GET；不帶 Cookie、不登入、不處理驗證碼；被拒絕就放棄（不重試）。
//   ・使用一般瀏覽器的 User-Agent（猴猴 Q5 決定）；不偽造登入狀態、不突破任何存取控制。
//   ・每個請求整體 7 秒逾時，頁面最多讀 256KB（沿用 resolve.js 的 readText）。
//   ・統一回傳：{ ok, platform, acct, acctOk, texts:[字串…] }
//       acct：要填入「發文帳號」的值（@帳號或顯示名稱，依平台規則）；acctOk=false 表示沒取得
//       texts：要合併填入「貼上的文字」的內容（依順序、已去除重複）；空陣列表示沒取得
'use strict';

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const TIMEOUT = 7000;
const MAX_TEXT = 2000, MAX_ACCT = 80;

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…' };
const decode = (s) => String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; }
  return ENT[e.toLowerCase()] !== undefined ? ENT[e.toLowerCase()] : m;
});
// HTML → 純文字（<br> 換行、去標籤、解碼、整理空白）
const strip = (h) => decode(String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n').replace(/<[^>]+>/g, ''))
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/[ \t\u00a0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const clipT = (s) => strip(s).slice(0, MAX_TEXT);
const clipA = (s) => decode(String(s || '')).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_ACCT);
// 合併文字：去掉空白項目與完全相同（或被包含）的重複內容，保持順序
const uniq = (arr) => {
  const out = [];
  for (const t0 of arr) {
    const t = String(t0 || '').trim(); if (!t) continue;
    const n = t.replace(/\s+/g, '');
    if (out.some((o) => { const m = o.replace(/\s+/g, ''); return m === n || m.includes(n); })) continue;
    for (let i = out.length - 1; i >= 0; i--) if (n.includes(out[i].replace(/\s+/g, ''))) out.splice(i, 1);
    out.push(t);
  }
  return out;
};
const metaOf = (html, attr, name) => {
  for (const t of String(html || '').match(/<meta\b[^>]*>/gi) || []) {
    const a = (n) => { const m = new RegExp('\\b' + n + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'i').exec(t); return m ? (m[2] !== undefined ? m[2] : m[3]) : ''; };
    if (a(attr).toLowerCase() === name.toLowerCase()) return decode(a('content'));
  }
  return '';
};

// V3.2.1：原文發布日期 → 台北時間 YYYY-MM-DD。
//   數字或數字字串：10 位以下視為秒、13 位視為毫秒；ISO 時間（含時區）轉成台北日期；純日期 YYYY-MM-DD 原樣保留（不做時區換算，避免差一天）。
//   早於 2004-01-01 或晚於現在＋1 天 → 不合理，放棄。
const TPE = (ms) => new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
const MIN_MS = Date.UTC(2004, 0, 1);
const toDate = (v) => {
  if (v === null || v === undefined || v === '') return '';
  let ms = NaN;
  if (typeof v === 'number' || /^\d{9,13}$/.test(String(v).trim())) { const n = Number(v); if (!Number.isFinite(n) || n <= 0) return ''; ms = n < 1e11 ? n * 1000 : n; }
  else {
    const s = String(v).trim();
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (d) { const t = Date.UTC(+d[1], +d[2] - 1, +d[3]); return t >= MIN_MS && t <= Date.now() + 864e5 && new Date(t).getUTCDate() === +d[3] ? s : ''; }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(s)) return ''; // 只接受有時區的 ISO 時間
    ms = Date.parse(s);
  }
  return Number.isFinite(ms) && ms >= MIN_MS && ms <= Date.now() + 864e5 ? TPE(ms) : '';
};
// 微博 created_at：「Tue Nov 11 20:15:03 +0800 2025」（相對時間如「3小時前」不接受）
const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const wbDate = (s) => {
  const m = /^[A-Z][a-z]{2} ([A-Z][a-z]{2}) (\d{1,2}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2}) (\d{4})$/.exec(String(s || '').trim());
  if (!m || MON[m[1]] === undefined) return '';
  const off = (m[6] === '-' ? -1 : 1) * (+m[7] * 60 + +m[8]);
  return toDate(Date.UTC(+m[9], MON[m[1]], +m[2], +m[3], +m[4], +m[5]) - off * 60000);
};
// Instagram／Threads shortcode → 時間（與前端 inferDate 相同算法）
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const codeDate = (c) => { let n = 0n; for (const ch of String(c || '')) { const i = B64.indexOf(ch); if (i < 0) return ''; n = n * 64n + BigInt(i); } return n ? toDate(Number((n >> 23n) + 1314220021721n)) : ''; };
// TikTok 影片 ID 前 32 位元＝建立時間（秒）；只在公開資料沒有 createTime 時才用（排程發布的影片可能和實際公開時間不同）
const ttIdDate = (id) => { try { return /^\d{15,25}$/.test(id) ? toDate(Number(BigInt(id) >> 32n)) : ''; } catch (e) { return ''; } };

module.exports = function makeInfo({ resolve, safeUrl, readText, wbPostId }) {
  // 只允許的網域（每一次請求都檢查，不跟隨轉址）
  const ALLOW = [
    /^api\.bilibili\.com$/, /^www\.bilibili\.com$/, /^www\.youtube\.com$/, /^www\.tiktok\.com$/, /^www\.iesdouyin\.com$/,
    /^m\.weibo\.cn$/, /^weibo\.com$/, /^graph\.facebook\.com$/, /^graph\.threads\.com$/, /^www\.threads\.com$/,
    /^publish\.twitter\.com$/, /^publish\.x\.com$/, /^www\.instagram\.com$/,
    /^xhslink\.(com|cn)$/, /^www\.xiaohongshu\.com$/, // 小紅書（第十個平台）
    /^www\.facebook\.com$/, /^m\.douyin\.com$/, // V3.2.1：Facebook 公開貼文頁（作者／日期）、抖音手機分享頁（備援）
  ];
  // V3.2.1：extra＝一般瀏覽器本來就會送的標頭（例如 Referer）；不送 Cookie、不送登入資訊。
  // ctx.trace 只記「網域＋路徑開頭＋狀態碼」，方便在正式環境看出是哪一步被擋（不記內容）
  const get = async (ctx, url, accept, ua, extra) => {
    const u = safeUrl(url);
    if (!u || !ALLOW.some((r) => r.test(u.hostname))) throw new Error('blocked_host');
    if (ctx.signal.aborted) throw new Error('timeout');
    const tag = u.hostname + u.pathname.slice(0, 28);
    try {
      const r = await ctx.fetch(u.href, { method: 'GET', redirect: 'manual', signal: ctx.signal, headers: { 'User-Agent': ua || BROWSER_UA, Accept: accept || 'text/html,application/xhtml+xml', 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.6', ...((extra && extra.headers) || {}) } });
      if (ctx.trace) ctx.trace.push(tag + ' ' + r.status);
      return r;
    } catch (e) { if (ctx.trace) ctx.trace.push(tag + ' ' + (ctx.signal.aborted ? 'timeout' : 'error')); throw e; }
  };
  const getJSON = async (ctx, url, extra) => {
    const r = await get(ctx, url, 'application/json, text/plain, */*', extra && extra.ua, extra);
    if (r.status !== 200 || !/json|javascript/i.test(r.headers.get('content-type') || '')) return null;
    try { return JSON.parse(await readText(r)); } catch (e) { return null; }
  };
  const getHTML = async (ctx, url, ua, extra) => {
    const r = await get(ctx, url, 'text/html,application/xhtml+xml', ua, extra);
    if (r.status !== 200 || !/html/i.test(r.headers.get('content-type') || '')) return '';
    return await readText(r);
  };
  const safe = async (fn) => { try { return await fn(); } catch (e) { return null; } };
  // V3.2.0 修正（2026-11-13）：較大的公開頁面（TikTok 影片頁、小紅書筆記頁）最多讀 1MB
  const BIG_MAX = 1024 * 1024;
  const readBig = async (r) => {
    if (!r.body || !r.body.getReader) { const t = await r.text(); return t.slice(0, BIG_MAX); }
    const rd = r.body.getReader(); const chunks = []; let n = 0;
    while (n < BIG_MAX) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); n += value.length; }
    try { rd.cancel(); } catch (e) { /* ignore */ }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
  };
  const getBigHTML = async (ctx, url, ua, extra) => {
    const r = await get(ctx, url, 'text/html,application/xhtml+xml', ua, extra);
    if (r.status !== 200 || !/html/i.test(r.headers.get('content-type') || '')) return '';
    return await readBig(r);
  };
  // 頁面裡 <script id="…" type="application/json">{…}</script> 的資料
  const scriptJSON = (html, id) => {
    const m = new RegExp('<script\\b[^>]*\\bid="' + id + '"[^>]*>([\\s\\S]*?)<\\/script>', 'i').exec(html || '');
    if (!m) return null; try { return JSON.parse(m[1]); } catch (e) { return null; }
  };
  // 深度走訪：找第一個符合條件的物件
  const findObj = (root, test, maxD) => {
    let hit = null; const seen = new Set();
    const walk = (o, d) => { if (hit || !o || typeof o !== 'object' || d > (maxD || 14) || seen.has(o)) return; seen.add(o); if (test(o)) { hit = o; return; } for (const k of Object.keys(o)) walk(o[k], d + 1); };
    walk(root, 0); return hit;
  };
  // V3.2.1：acct（發文帳號）、texts（搜尋文字）、pub（原文發布日期）三個欄位各自獨立；任何一個有就算 ok
  const out = (platform, acct, texts, pub) => { const a = clipA(acct); const t = uniq((texts || []).map(clipT)); const d = /^\d{4}-\d{2}-\d{2}$/.test(pub || '') ? pub : ''; return { ok: !!(a || t.length || d), platform, acct: a, acctOk: !!a, texts: t, pub: d }; };
  // V3.2.1：先取得的欄位先記下來（ctx.part）；後面的請求逾時或失敗時，已經取得的帳號不會被丟掉
  const keep = (ctx, f) => { const P = ctx.part; if (f.acct && !P.acct) P.acct = f.acct; if (f.texts) for (const x of f.texts) if (x) P.texts.push(x); if (f.pub && !P.pub) P.pub = f.pub; };
  const fin = (ctx, platform) => out(platform, ctx.part.acct, ctx.part.texts, ctx.part.pub);
  const handleOf = (u, re) => { const m = re.exec(u.pathname); return m ? '@' + m[1] : ''; };

  // ---- 1. Bilibili：UP 主暱稱、影片標題、發布日期（三項各自獨立）----
  // V3.2.1：同一個 view 介面回應裡的 data.pubdate（秒）也傳回前端；介面缺任何一項時才讀一次公開影片頁（__INITIAL_STATE__ 的 videoData）。
  // 請求帶一般瀏覽器會送的 Referer（不帶 Cookie）。標題裡的日期（例如巡演日期）不會被當成發布日期。
  async function bilibili(ctx, u) {
    if (u.hostname === 'b23.tv') { const r = await resolve(u.href, ctx.fetch); if (!r.ok) return fin(ctx, 'bilibili'); u = safeUrl(r.url); }
    const m = u && /(?:^|\/)video\/(BV[0-9A-Za-z]{10})(?:\/|$)/i.exec(u.pathname); if (!m) return fin(ctx, 'bilibili');
    const bv = 'BV' + m[1].slice(2), P = ctx.part;
    const ref = { headers: { Referer: 'https://www.bilibili.com/video/' + bv + '/' } };
    const j = await safe(() => getJSON(ctx, 'https://api.bilibili.com/x/web-interface/view?bvid=' + bv, ref));
    const d = j && j.code === 0 && j.data && typeof j.data === 'object' ? j.data : null;
    if (d) keep(ctx, { acct: d.owner && d.owner.name, texts: [d.title], pub: toDate(d.pubdate) });
    if (!P.acct || !P.texts.length || !P.pub) {
      const html = await safe(() => getBigHTML(ctx, 'https://www.bilibili.com/video/' + bv + '/', null, { headers: { Referer: 'https://www.bilibili.com/' } }));
      if (html) {
        const st = /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;\s*\(function/.exec(html);
        let data = null; if (st) { try { data = JSON.parse(st[1]); } catch (e) { data = null; } }
        const vd = findObj(data, (o) => String(o.bvid || '') === bv && (typeof o.title === 'string' || !!o.owner || o.pubdate !== undefined));
        if (vd) keep(ctx, { acct: vd.owner && vd.owner.name, texts: P.texts.length ? [] : [vd.title], pub: toDate(vd.pubdate) });
        if (!P.acct) keep(ctx, { acct: metaOf(html, 'name', 'author') });
        if (!P.texts.length) keep(ctx, { texts: [metaOf(html, 'property', 'og:title').replace(/_(?:哔哩哔哩|嗶哩嗶哩)_bilibili$/i, '')] });
      }
    }
    return fin(ctx, 'bilibili');
  }
  // ---- 2. YouTube：頻道名稱＋影片標題（官方 oEmbed，不變）；V3.2.1 加發布日期（公開影片頁）----
  // 日期只用 playerMicroformatRenderer.publishDate 或 itemprop="datePublished"（不用 uploadDate），且頁面的 canonical 必須是同一支影片。
  const ytId = (u) => {
    const h = u.hostname.replace(/^(www|m|music)\./, '');
    let id = h === 'youtu.be' ? u.pathname.split('/')[1] : (u.searchParams.get('v') || (/^\/(?:shorts|live|embed)\/([\w-]{11})/.exec(u.pathname) || [])[1]);
    return /^[\w-]{11}$/.test(id || '') ? id : '';
  };
  async function youtube(ctx, u) {
    const j = await safe(() => getJSON(ctx, 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(u.href)));
    if (j) keep(ctx, { acct: j.author_name, texts: [j.title] });
    const id = ytId(u);
    if (id) {
      const html = await safe(() => getBigHTML(ctx, 'https://www.youtube.com/watch?v=' + id + '&hl=zh-TW'));
      const canon = html ? ((/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(html) || [])[1] || metaOf(html, 'property', 'og:url')) : '';
      if (html && new RegExp('[?&]v=' + id.replace(/-/g, '\\-') + '(?:&|$)').test(decode(canon))) {
        const i = html.indexOf('"playerMicroformatRenderer"');
        const pd = i >= 0 ? (/"publishDate"\s*:\s*"([^"]+)"/.exec(html.slice(i, i + 60000)) || [])[1] : '';
        keep(ctx, { pub: toDate(pd) || toDate(metaOf(html, 'itemprop', 'datePublished')) });
        const oc = i >= 0 ? /"ownerChannelName"\s*:\s*("(?:[^"\\]|\\.)*")/.exec(html.slice(i, i + 60000)) : null;
        if (!ctx.part.acct && oc) { try { keep(ctx, { acct: JSON.parse(oc[1]) }); } catch (e) { /* ignore */ } }
      }
    }
    return fin(ctx, 'youtube');
  }
  // ---- 3. TikTok：@帳號（網址優先）、影片描述、發布日期 ----
  // V3.2.1：同一支影片（ID 相同）的物件裡，帳號、描述、createTime 各自取；公開資料都沒有日期時，才用影片 ID 前 32 位元推算（建立時間）。
  async function tiktok(ctx, u) {
    if (!/\/@[\w.-]+\/(?:video|photo)\/\d/.test(u.pathname)) { const r = await resolve(u.href, ctx.fetch); if (r.ok) u = safeUrl(r.url); }
    let acct = handleOf(u, /^\/@([\w.-]{1,40})\//);
    const vid = (/\/(?:video|photo)\/(\d{8,25})/.exec(u.pathname) || [])[1] || '';
    if (!acct) {
      const j = await safe(() => getJSON(ctx, 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(u.href)));
      if (j && typeof j.author_unique_id === 'string' && /^[\w.-]{1,40}$/.test(j.author_unique_id)) acct = '@' + j.author_unique_id;
    }
    keep(ctx, { acct });
    let desc = '', pub = '';
    if (vid) {
      const same = (o) => String(o.id || o.itemId || o.aweme_id || '') === vid && (o.desc !== undefined || o.text !== undefined || o.createTime !== undefined || o.create_time !== undefined || !!o.author);
      const take = (o) => {
        if (!o) return;
        if (!ctx.part.acct && o.author && typeof o.author.uniqueId === 'string' && /^[\w.-]{1,40}$/.test(o.author.uniqueId)) keep(ctx, { acct: '@' + o.author.uniqueId });
        const t = o.desc !== undefined ? o.desc : o.text; if (!desc && typeof t === 'string') desc = t;
        if (!pub) pub = toDate(o.createTime !== undefined ? o.createTime : o.create_time);
      };
      if (ctx.part.acct) {
        const html = await safe(() => getBigHTML(ctx, 'https://www.tiktok.com/' + ctx.part.acct + '/video/' + vid));
        if (html) take(findObj(scriptJSON(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__') || scriptJSON(html, 'SIGI_STATE'), same));
        keep(ctx, { texts: [desc], pub });
      }
      if (!desc || !pub) {
        const html = await safe(() => getBigHTML(ctx, 'https://www.tiktok.com/embed/v2/' + vid));
        if (html) take(findObj(scriptJSON(html, '__FRONTITY_CONNECT_STATE__') || scriptJSON(html, '__NEXT_DATA__') || scriptJSON(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__'), same));
        keep(ctx, { texts: [desc], pub });
      }
      if (!ctx.part.pub) keep(ctx, { pub: ttIdDate(vid) });
    }
    return fin(ctx, 'tiktok');
  }
  // ---- 4. 抖音：作者暱稱（最優先）、作品描述、發布日期 ----
  // V3.2.1：先確認作品 ID（網址、modal_id、短網址解析），只認「同一個作品 ID」的物件，作者／描述／create_time 各自獨立取（不再要求 desc 和作者同時存在）。
  // 公開分享頁 www.iesdouyin.com 取不到時，再試一次 m.douyin.com 的同一個分享頁。分享文字裡的「05/24」等不是發布日期，不使用。
  async function douyin(ctx, u) {
    const pick = (x) => { const m = /\/(?:share\/)?(?:video|note|slides)\/(\d{8,25})/.exec(x.pathname); return m ? m[1] : (/^\d{8,25}$/.test(x.searchParams.get('modal_id') || '') ? x.searchParams.get('modal_id') : ''); };
    let id = pick(u);
    if (!id && u.hostname === 'v.douyin.com') { const r = await resolve(u.href, ctx.fetch); if (r.ok) { const x = safeUrl(r.url); id = x ? pick(x) : ''; } }
    if (!id) return fin(ctx, 'douyin');
    const page = (host) => safe(async () => {
      const r = await get(ctx, 'https://' + host + '/share/video/' + id + '/', 'text/html,application/xhtml+xml', MOBILE_UA);
      if (r.status >= 300 && r.status < 400) {
        let nx = null; try { nx = safeUrl(new URL(r.headers.get('location') || '', 'https://' + host + '/').href); } catch (e) { nx = null; }
        if (!nx || nx.hostname !== host || !new RegExp('^/share/(?:video|note|slides)/' + id + '/?$').test(nx.pathname)) return '';
        return await getBigHTML(ctx, nx.href, MOBILE_UA);
      }
      if (r.status !== 200 || !/html/i.test(r.headers.get('content-type') || '')) return '';
      return await readBig(r);
    });
    const parse = (html) => {
      const m = html && (/window\._ROUTER_DATA\s*=\s*(\{[\s\S]*?\})\s*<\/script>/.exec(html) || /<script\b[^>]*id="RENDER_DATA"[^>]*>([\s\S]*?)<\/script>/.exec(html));
      let data = null; if (m) { try { data = JSON.parse(/^\s*\{/.test(m[1]) ? m[1] : decodeURIComponent(m[1])); } catch (e) { data = null; } }
      return findObj(data, (o) => String(o.aweme_id || o.awemeId || o.item_id || '') === id && (!!o.author || o.desc !== undefined || o.create_time !== undefined || o.createTime !== undefined), 16);
    };
    let hit = parse(await page('www.iesdouyin.com'));
    if (!hit) hit = parse(await page('m.douyin.com'));
    if (hit) {
      const au = hit.author && typeof hit.author === 'object' ? hit.author : null;
      keep(ctx, { acct: au && (au.nickname || au.nickName) });
      keep(ctx, { texts: [typeof hit.desc === 'string' ? hit.desc : ''], pub: toDate(hit.create_time !== undefined ? hit.create_time : hit.createTime) });
    }
    return fin(ctx, 'douyin');
  }
  // ---- 5. 微博：發文者（轉發就是轉發者）、文字（影片標題 → 轉發者文字 → 原始正文）、發布日期 ----
  // V3.2.1：三項各自取；發布日期用「網址這一則微博」自己的 created_at（轉發就是轉發的時間，不用被轉發的原文時間）。
  // 請求帶手機網頁本來就會送的 Referer、X-Requested-With（不帶 Cookie）。影片頁 tv/show、video.weibo.com 反查需要訪客 Cookie，不做。
  async function weibo(ctx, u) {
    let id = wbPostId(u);
    if (!id && u.hostname === 't.cn') { const r = await resolve(u.href, ctx.fetch); if (r.ok) { const x = safeUrl(r.url); id = x ? wbPostId(x) : ''; } }
    if (!id) return fin(ctx, 'weibo');
    const H = { ua: MOBILE_UA, headers: { Referer: 'https://m.weibo.cn/detail/' + id, 'X-Requested-With': 'XMLHttpRequest', 'MWeibo-Pwa': '1' } };
    const j = await safe(() => getJSON(ctx, 'https://m.weibo.cn/statuses/show?id=' + encodeURIComponent(id), H));
    let d = j && (j.data && typeof j.data === 'object' ? j.data : null);
    if (!d || !(d.id || d.mid)) {
      const html = await safe(() => getHTML(ctx, 'https://m.weibo.cn/' + (/^\d+$/.test(id) ? 'detail/' : 'status/') + encodeURIComponent(id), MOBILE_UA));
      const m = html && /\$render_data\s*=\s*(\[[\s\S]*?\])\s*\[0\]\s*\|\|/.exec(html);
      let rd = null; if (m) { try { rd = JSON.parse(m[1]); } catch (e) { rd = null; } }
      d = rd && rd[0] && rd[0].status && typeof rd[0].status === 'object' ? rd[0].status : null;
    }
    if (!d || !(d.id || d.mid)) return fin(ctx, 'weibo');
    keep(ctx, { acct: d.user && d.user.screen_name, pub: wbDate(d.created_at) });
    const longText = async (x) => {
      if (!x) return '';
      let t = typeof x.text_raw === 'string' && x.text_raw ? x.text_raw : x.text;
      if (x.isLongText && (x.id || x.mid)) {
        const e = await safe(() => getJSON(ctx, 'https://m.weibo.cn/statuses/extend?id=' + encodeURIComponent(x.id || x.mid), H));
        if (e && e.data && typeof e.data.longTextContent === 'string') t = e.data.longTextContent;
      }
      return strip(t);
    };
    const vt = (x) => { const p = x && x.page_info; if (!p) return ''; const isV = /video/i.test(String(p.type || p.object_type || '')) || /^1034:/.test(String(p.object_id || '')); if (!isV) return ''; return (p.media_info && p.media_info.video_title) || p.title || p.content2 || ''; };
    const title = vt(d) || vt(d.retweeted_status);
    keep(ctx, { texts: [title] });
    keep(ctx, { texts: [await longText(d)] });
    if (d.retweeted_status) keep(ctx, { texts: [await longText(d.retweeted_status)] });
    return fin(ctx, 'weibo');
  }
  // ---- 6. Facebook：發文者顯示名稱、發布日期（搜尋文字依猴猴決定不擷取）----
  // V3.2.1：① Meta 官方 oEmbed 嵌入碼的「Posted by／由…發佈」；② 公開貼文頁的 article:published_time／JSON-LD datePublished（沒有就留空，不用修改時間），
  //   作者沒取到時也看 JSON-LD author.name、article:author（不是網址、不是純數字才用）。分享網址的識別碼不會被當成日期。
  async function facebook(ctx, u) {
    if (/^\/share\//.test(u.pathname) || u.hostname === 'fb.watch') { const r = await resolve(u.href, ctx.fetch); if (r.ok) u = safeUrl(r.url); }
    if (!u) return fin(ctx, 'facebook');
    const okName = (n) => { n = strip(n || ''); return n && !/^\d+$/.test(n) && !/^https?:/i.test(n) ? n : ''; };
    const isVideo = /\/videos\/|^\/watch|^\/reel\//.test(u.pathname);
    const j = await safe(() => getJSON(ctx, 'https://graph.facebook.com/v25.0/' + (isVideo ? 'oembed_video' : 'oembed_post') + '?url=' + encodeURIComponent(u.href)));
    const html = j && typeof j.html === 'string' ? j.html : '';
    if (html) {
      const bq = (/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i.exec(html) || [])[1] || '';
      const by = /Posted by\s*<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(bq) || /由\s*<a\b[^>]*>([\s\S]*?)<\/a>\s*(?:發佈|發布|发布)/i.exec(bq);
      keep(ctx, { acct: by ? okName(by[1]) : '' });
    }
    if (/(^|\.)facebook\.com$/.test(u.hostname)) {
      const pg = await safe(() => getHTML(ctx, 'https://www.facebook.com' + u.pathname + u.search));
      if (pg) {
        let ld = null;
        for (const m of pg.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) { try { const o = JSON.parse(m[1]); ld = findObj(o, (x) => x.datePublished !== undefined || (x.author && typeof x.author === 'object')); if (ld) break; } catch (e) { /* ignore */ } }
        keep(ctx, { pub: toDate(metaOf(pg, 'property', 'article:published_time')) || toDate(ld && ld.datePublished) });
        if (!ctx.part.acct) keep(ctx, { acct: okName(ld && ld.author && (Array.isArray(ld.author) ? ld.author[0] && ld.author[0].name : ld.author.name)) || okName(metaOf(pg, 'property', 'article:author')) });
      }
    }
    return fin(ctx, 'facebook');
  }
  // ---- 7. Threads：@帳號（網址）、發布日期（正式貼文 shortcode 推算；手機 /share/ 先解析成正式網址）----
  // V3.2.1：/share/ 的代碼不是貼文 shortcode，解析失敗就不推算日期。
  async function threads(ctx, u) {
    if (/^\/share\//.test(u.pathname)) { const r = await resolve(u.href, ctx.fetch); u = r.ok ? safeUrl(r.url) : null; }
    if (!u) return fin(ctx, 'threads');
    const sc = (/^\/@[\w.]{1,40}\/post\/([\w-]{6,11})(?:\/|$)/.exec(u.pathname) || [])[1] || '';
    keep(ctx, { acct: handleOf(u, /^\/@([\w.]{1,40})\//), pub: sc ? codeDate(sc) : '' });
    return fin(ctx, 'threads');
  }
  // ---- 8. X：@帳號（網址）＋正文（官方 oEmbed 嵌入碼裡的 <p>）；發布日期由前端用 status ID（Snowflake）推算（不變）----
  async function x(ctx, u) {
    const acct = (() => { const mm = /^\/(\w{1,15})\/status\/\d/.exec(u.pathname); return mm && mm[1] !== 'i' ? '@' + mm[1] : ''; })();
    keep(ctx, { acct });
    const id = (/\/status\/(\d{5,25})/.exec(u.pathname) || [])[1];
    if (!id) return fin(ctx, 'x');
    // 官方文件的 oEmbed 位址是 publish.x.com（complete-5 起；猴猴實測正文已能取得）
    let j = await safe(() => getJSON(ctx, 'https://publish.x.com/oembed?omit_script=1&dnt=true&url=' + encodeURIComponent('https://x.com/i/status/' + id)));
    if (!j) j = await safe(() => getJSON(ctx, 'https://publish.twitter.com/oembed?omit_script=1&dnt=true&url=' + encodeURIComponent('https://twitter.com/i/status/' + id)));
    const html = j && typeof j.html === 'string' ? j.html : '';
    const p = (/<blockquote\b[^>]*class="[^"]*twitter-tweet[^"]*"[^>]*>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(html) || [])[1] || '';
    if (!ctx.part.acct) { const mm = /&mdash;[^<]*\(@(\w{1,15})\)/.exec(html); if (mm) keep(ctx, { acct: '@' + mm[1] }); }
    keep(ctx, { texts: [strip(p).replace(/\s*pic\.twitter\.com\/\w+\s*$/i, '').trim()] });
    return fin(ctx, 'x');
  }
  // ---- 9. Instagram：@帳號（最優先）；V3.2.2 起搜尋文字「能順便讀到就帶」（只用為了取帳號而讀到的同一份回應，不另外請求）；發布日期由前端 shortcode 推算（不變）----
  // V3.2.1 修正：
  //   ① 官方 oEmbed 文件列出的網址格式只有 /p/{shortcode}/ 和 /tv/{shortcode}/ —— 以前送 /reel/{code}/ 可能直接被拒，改送 /p/{code}/（Reel 的代碼在 /p/ 也通用）。
  //   ② 公開嵌入頁：CaptionUsername、UsernameText（都是貼文擁有者）；內嵌資料改成「正式解析 JSON」，只認 shortcode 等於這篇代碼的物件的 owner.username。
  //   ③ 最後才讀公開貼文頁 meta。前一步有了就不再請求；被導去登入就放棄。
  async function instagram(ctx, u) {
    const m = /^\/(?:([\w.]{1,30})\/)?(p|reel|reels|tv)\/([\w-]{5,40})/.exec(u.pathname);
    if (!m) return fin(ctx, 'instagram');
    let acct = m[1] && !/^(p|reel|reels|tv|explore|stories)$/.test(m[1]) ? '@' + m[1] : '';
    const code = m[3], canon = 'https://www.instagram.com/p/' + code + '/';
    if (!acct) {
      const j = await safe(() => getJSON(ctx, 'https://graph.facebook.com/v25.0/instagram_oembed?url=' + encodeURIComponent(canon)));
      const mm = j && typeof j.html === 'string' && /\(@([\w.]{1,30})\)/.exec(strip(j.html));
      if (mm) acct = '@' + mm[1];
    }
    let cap = '';
    if (!acct) {
      const html = await safe(() => getBigHTML(ctx, canon + 'embed/captioned/'));
      if (html) {
        const c = /<div\b[^>]*class="[^"]*\bCaption\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
        const un = c && /<a\b[^>]*class="[^"]*\bCaptionUsername\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(c[1]);
        if (un && /^[\w.]{1,30}$/.test(strip(un[1]))) acct = '@' + strip(un[1]);
        // V3.2.2：同一份嵌入頁裡、貼文擁有者名稱後面的說明文字（不含留言）
        if (c) cap = strip(c[1].replace(/<a\b[^>]*class="[^"]*\bCaptionUsername\b[^"]*"[^>]*>[\s\S]*?<\/a>/i, '').replace(/<div\b[^>]*class="[^"]*\bCaptionComments\b[\s\S]*$/i, ''));
        if (!acct) { const un2 = /<span\b[^>]*class="[^"]*\bUsernameText\b[^"]*"[^>]*>([\w.]{1,30})<\/span>/i.exec(html); if (un2) acct = '@' + un2[1]; }
        if (!acct) {
          const objs = [];
          for (const mm of html.matchAll(/"contextJSON"\s*:\s*("(?:[^"\\]|\\.)*")/g)) { try { objs.push(JSON.parse(JSON.parse(mm[1]))); } catch (e) { /* ignore */ } }
          for (const mm of html.matchAll(/<script\b[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)) { try { objs.push(JSON.parse(mm[1])); } catch (e) { /* ignore */ } }
          for (const o of objs) {
            const hit = findObj(o, (x) => x.shortcode === code && x.owner && typeof x.owner.username === 'string', 20);
            if (hit && /^[\w.]{1,30}$/.test(hit.owner.username)) { acct = '@' + hit.owner.username; break; }
          }
        }
      }
    }
    if (!acct) {
      const html = await safe(() => getHTML(ctx, canon));
      if (html) {
        const urlAcct = (s) => { const mm = /^https:\/\/www\.instagram\.com\/([\w.]{1,30})\/(?:p|reels?|tv)\/([\w-]{5,40})/.exec(s || ''); return mm && mm[2] === code && !/^(p|reel|reels|tv|explore|stories)$/.test(mm[1]) ? mm[1] : ''; };
        const canonL = (/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(html) || [])[1] || '';
        const desc = metaOf(html, 'name', 'description') || metaOf(html, 'property', 'og:description');
        const d1 = /\s-\s([\w.]{1,30}) (?:on|於) [^:：]{3,40}[:：]\s*["“]?([\s\S]*?)["”]?\s*\.?\s*$/.exec(desc);
        const t1 = /\(@([\w.]{1,30})\)/.exec(metaOf(html, 'property', 'og:title') || metaOf(html, 'name', 'twitter:title'));
        const a1 = urlAcct(metaOf(html, 'property', 'og:url')) || urlAcct(decode(canonL)) || (d1 && d1[1]) || (t1 && t1[1]) || '';
        if (a1) acct = '@' + a1;
        // V3.2.2：同一頁 description「… - 帳號 on 日期: "說明"」裡的說明（只有帳號也是從這一句取得、且帳號相同時才用）
        if (!cap && d1 && d1[2] && acct === '@' + d1[1]) cap = d1[2];
      }
    }
    keep(ctx, { acct });
    keep(ctx, { texts: [cap] });
    return fin(ctx, 'instagram');
  }

  // ---- 10. 小紅書：作者暱稱＋（2026-11-13 起）同一頁的筆記標題、正文 ----
  // xhslink 短網址只讀一次公開轉址（不跟隨到登入頁）；筆記頁用手機瀏覽器 UA、不帶 Cookie 讀一次公開頁面，
  // 從頁面內嵌資料找「這則筆記（同一個筆記 ID）」的 user.nickname（2026-11-13 起連同標題、正文）。被導去登入、驗證、或頁面沒有資料就放棄。
  // XHS_FETCH=false 時完全不連線（直接回報沒取得，欄位保持空白）。
  // V3.2.1：作者、文字、發布日期（同一則筆記物件的 time／createTime，毫秒或秒自動判斷；不用 lastUpdateTime）各自獨立。
  const XHS_FETCH = true;
  async function xiaohongshu(ctx, u) {
    const none = () => fin(ctx, 'xiaohongshu');
    if (!XHS_FETCH) return none();
    let t = u;
    if (/^xhslink\.(com|cn)$/.test(u.hostname)) {
      const r = await safe(() => get(ctx, u.href, 'text/html,application/xhtml+xml', MOBILE_UA));
      let loc = r && r.status >= 300 && r.status < 400 ? r.headers.get('location') : '';
      // V3.2.0 修正（2026-11-13）：短網址如果回 200 頁面（用頁面內的網址轉址），從同一個回應裡找筆記網址
      if (!loc && r && r.status === 200 && /html/i.test(r.headers.get('content-type') || '')) {
        const body = await safe(() => readText(r));
        const mm = body && /https?:\/\/(?:www\.)?xiaohongshu\.com\/(?:discovery\/item|explore)\/[0-9a-f]{24}[^"'\s<>\\]*/i.exec(body.replace(/\\u002F/gi, '/').replace(/&amp;/g, '&'));
        loc = mm ? mm[0] : '';
      }
      let nx = null; try { nx = loc ? safeUrl(new URL(loc, u).href) : null; } catch (e) { nx = null; }
      if (!nx) return none();
      t = nx;
    }
    if (!/^(www\.)?xiaohongshu\.com$/.test(t.hostname)) return none();
    const m = /^\/(?:explore|discovery\/item|user\/profile\/[0-9a-f]{24})\/([0-9a-f]{24})\/?$/i.exec(t.pathname);
    if (!m) return none();
    const id = m[1].toLowerCase();
    const html = await safe(async () => {
      const r = await get(ctx, 'https://www.xiaohongshu.com' + t.pathname + t.search, 'text/html,application/xhtml+xml', MOBILE_UA);
      if (r.status !== 200 || !/html/i.test(r.headers.get('content-type') || '')) return '';
      return await readBig(r);
    });
    if (!html) return none();
    const s = /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/.exec(html);
    if (!s) return none();
    let data = null; try { data = JSON.parse(s[1].replace(/:\s*undefined\b/g, ':null')); } catch (e) { data = null; }
    // 只認「筆記 ID 相同」的那一則筆記的作者，避免抓到留言者或推薦筆記的作者
    let nick = ''; const seen = new Set();
    const walk = (o, d) => {
      if (nick || !o || typeof o !== 'object' || d > 14 || seen.has(o)) return; seen.add(o);
      const oid = String(o.noteId || o.note_id || o.id || '').toLowerCase();
      if (oid === id && o.user && typeof o.user === 'object') { const n = o.user.nickname || o.user.nickName || o.user.nick_name; if (typeof n === 'string' && n.trim()) { nick = n; return; } }
      for (const k of Object.keys(o)) walk(o[k], d + 1);
    };
    walk(data, 0);
    keep(ctx, { acct: nick });
    // 同一個頁面回應裡「這則筆記」的標題＋正文（搜尋文字）、發布時間（不另外請求）
    const note = findObj(data, (o) => String(o.noteId || o.note_id || o.id || '').toLowerCase() === id && (typeof o.title === 'string' || typeof o.desc === 'string' || o.time !== undefined || o.createTime !== undefined));
    if (note) keep(ctx, { texts: [note.title, note.desc], pub: toDate(note.time !== undefined ? note.time : (note.createTime !== undefined ? note.createTime : note.create_time)) });
    return fin(ctx, 'xiaohongshu');
  }

  const PLATS = [
    ['bilibili', (h) => h === 'b23.tv' || /(^|\.)bilibili\.com$/.test(h), bilibili],
    ['youtube', (h) => h === 'youtu.be' || /(^|\.)youtube\.com$/.test(h), youtube],
    ['tiktok', (h) => /(^|\.)tiktok\.com$/.test(h), tiktok],
    ['douyin', (h) => /(^|\.)(douyin|iesdouyin)\.com$/.test(h), douyin],
    ['weibo', (h) => h === 't.cn' || /(^|\.)weibo\.(com|cn)$/.test(h), weibo],
    ['facebook', (h) => /(^|\.)facebook\.com$/.test(h) || h === 'fb.watch', facebook],
    ['threads', (h) => /^(www\.)?threads\.(com|net)$/.test(h), threads],
    ['x', (h) => /^(www\.|mobile\.)?(x|twitter)\.com$/.test(h), x],
    ['instagram', (h) => /^(www\.)?instagram\.com$/.test(h), instagram],
    ['xiaohongshu', (h) => /^xhslink\.(com|cn)$/.test(h) || /(^|\.)xiaohongshu\.com$/.test(h), xiaohongshu],
  ];
  async function info(input, fetchFn) {
    const u = safeUrl(input);
    if (!u) return { ok: false, reason: 'bad_url' };
    const P = PLATS.find((p) => p[1](u.hostname));
    if (!P) return { ok: false, reason: 'unsupported' };
    const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), TIMEOUT);
    // V3.2.1：ctx.part 記下已經取得的欄位——後面的請求逾時或出錯時，回傳已經取得的帳號／文字／日期，不整筆丟掉。
    // trace 只有「網域＋路徑開頭＋狀態碼」，不含任何內容，給正式環境排查用（瀏覽器開發者工具 → Network → resolve）。
    const ctx = { fetch: fetchFn, signal: ac.signal, part: { acct: '', texts: [], pub: '' }, trace: [] };
    try {
      const r = await P[2](ctx, u);
      const v = r && typeof r === 'object' ? r : fin(ctx, P[0]);
      return { ...v, ...(ac.signal.aborted ? { reason: 'timeout' } : {}), trace: ctx.trace.slice(0, 12) };
    } catch (e) {
      return { ...fin(ctx, P[0]), reason: ac.signal.aborted ? 'timeout' : 'error', trace: ctx.trace.slice(0, 12) };
    } finally { clearTimeout(tm); }
  }
  info._strip = strip; info._uniq = uniq;
  return info;
};
