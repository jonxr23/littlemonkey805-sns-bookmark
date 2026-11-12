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

module.exports = function makeInfo({ resolve, safeUrl, readText, wbPostId }) {
  // 只允許的網域（每一次請求都檢查，不跟隨轉址）
  const ALLOW = [
    /^api\.bilibili\.com$/, /^www\.bilibili\.com$/, /^www\.youtube\.com$/, /^www\.tiktok\.com$/, /^www\.iesdouyin\.com$/,
    /^m\.weibo\.cn$/, /^weibo\.com$/, /^graph\.facebook\.com$/, /^graph\.threads\.com$/, /^www\.threads\.com$/,
    /^publish\.twitter\.com$/, /^publish\.x\.com$/, /^www\.instagram\.com$/,
    /^xhslink\.(com|cn)$/, /^www\.xiaohongshu\.com$/, // 小紅書（第十個平台）
  ];
  const get = async (ctx, url, accept, ua) => {
    const u = safeUrl(url);
    if (!u || !ALLOW.some((r) => r.test(u.hostname))) throw new Error('blocked_host');
    if (ctx.signal.aborted) throw new Error('timeout');
    const r = await ctx.fetch(u.href, { method: 'GET', redirect: 'manual', signal: ctx.signal, headers: { 'User-Agent': ua || BROWSER_UA, Accept: accept || 'text/html,application/xhtml+xml', 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.6' } });
    return r;
  };
  const getJSON = async (ctx, url, extra) => {
    const r = await get(ctx, url, 'application/json, text/plain, */*', extra && extra.ua);
    if (r.status !== 200 || !/json|javascript/i.test(r.headers.get('content-type') || '')) return null;
    try { return JSON.parse(await readText(r)); } catch (e) { return null; }
  };
  const getHTML = async (ctx, url, ua) => {
    const r = await get(ctx, url, 'text/html,application/xhtml+xml', ua);
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
  const getBigHTML = async (ctx, url, ua) => {
    const r = await get(ctx, url, 'text/html,application/xhtml+xml', ua);
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
  const out = (platform, acct, texts) => { const a = clipA(acct); const t = uniq((texts || []).map(clipT)); return { ok: !!(a || t.length), platform, acct: a, acctOk: !!a, texts: t }; };
  const handleOf = (u, re) => { const m = re.exec(u.pathname); return m ? '@' + m[1] : ''; };

  // ---- 1. Bilibili：UP 主暱稱＋影片標題 ----
  async function bilibili(ctx, u) {
    if (u.hostname === 'b23.tv') { const r = await resolve(u.href, ctx.fetch); if (!r.ok) return out('bilibili', '', []); u = safeUrl(r.url); }
    const m = u && /(?:^|\/)video\/(BV[0-9A-Za-z]{10})(?:\/|$)/i.exec(u.pathname); if (!m) return out('bilibili', '', []);
    const bv = 'BV' + m[1].slice(2);
    const j = await safe(() => getJSON(ctx, 'https://api.bilibili.com/x/web-interface/view?bvid=' + bv));
    if (j && j.code === 0 && j.data) return out('bilibili', j.data.owner && j.data.owner.name, [j.data.title]);
    const html = await safe(() => getHTML(ctx, 'https://www.bilibili.com/video/' + bv + '/'));
    if (html) return out('bilibili', metaOf(html, 'name', 'author'), [metaOf(html, 'property', 'og:title').replace(/_(?:哔哩哔哩|嗶哩嗶哩)_bilibili$/i, '')]);
    return out('bilibili', '', []);
  }
  // ---- 2. YouTube：頻道名稱＋影片標題（官方 oEmbed） ----
  async function youtube(ctx, u) {
    const j = await safe(() => getJSON(ctx, 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(u.href)));
    return j ? out('youtube', j.author_name, [j.title]) : out('youtube', '', []);
  }
  // ---- 3. TikTok：@帳號（網址／oEmbed 的 author_unique_id）＋影片描述（oEmbed title，有才用） ----
  async function tiktok(ctx, u) {
    if (!/\/@[\w.-]+\/(?:video|photo)\/\d/.test(u.pathname)) { const r = await resolve(u.href, ctx.fetch); if (r.ok) u = safeUrl(r.url); }
    let acct = handleOf(u, /^\/@([\w.-]{1,40})\//);
    // V3.2.0 修正（2026-11-13）：官方 oEmbed 的回應範例已經沒有 title（影片描述），所以描述改讀「公開影片頁」內嵌資料
    // （__UNIVERSAL_DATA_FOR_REHYDRATION__ 裡同一支影片的 desc）；讀不到再試官方公開嵌入頁 /embed/v2/{ID}。
    // oEmbed 只在網址沒有 @帳號時才呼叫（取 author_unique_id，有才用）。
    const vid = (/\/(?:video|photo)\/(\d{8,25})/.exec(u.pathname) || [])[1] || '';
    if (!acct) {
      const j = await safe(() => getJSON(ctx, 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(u.href)));
      if (j && typeof j.author_unique_id === 'string' && /^[\w.-]{1,40}$/.test(j.author_unique_id)) acct = '@' + j.author_unique_id;
    }
    let desc = '';
    if (vid) {
      const same = (o) => String(o.id || o.itemId || o.aweme_id || '') === vid && typeof (o.desc !== undefined ? o.desc : o.text) === 'string';
      const pick = (o) => (o ? String(o.desc !== undefined ? o.desc : o.text) : '');
      if (acct) {
        const html = await safe(() => getBigHTML(ctx, 'https://www.tiktok.com/' + acct + '/video/' + vid));
        if (html) desc = pick(findObj(scriptJSON(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__') || scriptJSON(html, 'SIGI_STATE'), same));
      }
      if (!desc) {
        const html = await safe(() => getBigHTML(ctx, 'https://www.tiktok.com/embed/v2/' + vid));
        if (html) desc = pick(findObj(scriptJSON(html, '__FRONTITY_CONNECT_STATE__') || scriptJSON(html, '__NEXT_DATA__') || scriptJSON(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__'), same));
      }
    }
    return out('tiktok', acct, [desc]);
  }
  // ---- 4. 抖音：作者暱稱＋作品描述（公開分享頁 iesdouyin 的頁面資料） ----
  async function douyin(ctx, u) {
    let id = '';
    const pick = (x) => { const m = /\/(?:share\/)?(?:video|note)\/(\d{8,25})/.exec(x.pathname); return m ? m[1] : (/^\d{8,25}$/.test(x.searchParams.get('modal_id') || '') ? x.searchParams.get('modal_id') : ''); };
    id = pick(u);
    if (!id && u.hostname === 'v.douyin.com') { const r = await resolve(u.href, ctx.fetch); if (r.ok) { const x = safeUrl(r.url); id = x ? pick(x) : ''; } }
    if (!id) return out('douyin', '', []);
    // V3.2.0 修正（2026-11-13）：圖文作品的分享頁會從 /share/video/ 轉到 /share/note/，只在「同網域、同一個作品 ID」時跟隨一次
    let html = await safe(async () => {
      const r = await get(ctx, 'https://www.iesdouyin.com/share/video/' + id + '/', 'text/html,application/xhtml+xml', MOBILE_UA);
      if (r.status >= 300 && r.status < 400) {
        let nx = null; try { nx = safeUrl(new URL(r.headers.get('location') || '', 'https://www.iesdouyin.com/').href); } catch (e) { nx = null; }
        if (!nx || nx.hostname !== 'www.iesdouyin.com' || !new RegExp('^/share/(?:video|note|slides)/' + id + '/?$').test(nx.pathname)) return '';
        return await getHTML(ctx, nx.href, MOBILE_UA);
      }
      if (r.status !== 200 || !/html/i.test(r.headers.get('content-type') || '')) return '';
      return await readText(r);
    });
    if (!html) return out('douyin', '', []);
    let data = null;
    const m = /window\._ROUTER_DATA\s*=\s*(\{[\s\S]*?\})\s*<\/script>/.exec(html);
    if (m) { try { data = JSON.parse(m[1]); } catch (e) { data = null; } }
    // 在頁面資料裡找「有 desc 和 author.nickname」的作品物件（優先找同一個影片 ID）
    let hit = null; const seen = new Set();
    const walk = (o, d) => {
      if (!o || typeof o !== 'object' || d > 12 || seen.has(o)) return; seen.add(o);
      if (typeof o.desc === 'string' && o.author && typeof o.author.nickname === 'string') { if (!hit || String(o.aweme_id || '') === id) hit = o; }
      for (const k of Object.keys(o)) walk(o[k], d + 1);
    };
    walk(data, 0);
    return hit ? out('douyin', hit.author.nickname, [hit.desc]) : out('douyin', '', []);
  }
  // ---- 5. 微博：實際發文者（含轉發者）暱稱＋影片標題＋轉發者文字＋原始正文 ----
  async function weibo(ctx, u) {
    let id = wbPostId(u);
    if (!id && u.hostname === 't.cn') { const r = await resolve(u.href, ctx.fetch); if (r.ok) { const x = safeUrl(r.url); id = x ? wbPostId(x) : ''; } }
    if (!id) return out('weibo', '', []); // 影片頁（tv/show、video.weibo.com）反查原始微博需要訪客 Cookie，不做
    const j = await safe(() => getJSON(ctx, 'https://m.weibo.cn/statuses/show?id=' + encodeURIComponent(id), { ua: MOBILE_UA }));
    let d = j && (j.data && typeof j.data === 'object' ? j.data : null);
    // V3.2.0 修正（2026-11-13）：statuses/show 沒有資料時，改讀同網域的公開手機頁 m.weibo.cn/detail/{ID}（頁面內嵌 $render_data 的 status）。
    // 不帶 Cookie；被導去訪客驗證（轉址）就放棄。
    if (!d || !(d.id || d.mid)) {
      const html = await safe(() => getHTML(ctx, 'https://m.weibo.cn/detail/' + encodeURIComponent(id), MOBILE_UA));
      const m = html && /\$render_data\s*=\s*(\[[\s\S]*?\])\s*\[0\]\s*\|\|/.exec(html);
      let rd = null; if (m) { try { rd = JSON.parse(m[1]); } catch (e) { rd = null; } }
      d = rd && rd[0] && rd[0].status && typeof rd[0].status === 'object' ? rd[0].status : null;
    }
    if (!d || !(d.id || d.mid)) return out('weibo', '', []);
    const longText = async (x) => {
      if (!x) return '';
      let t = typeof x.text_raw === 'string' && x.text_raw ? x.text_raw : x.text;
      if (x.isLongText && (x.id || x.mid)) {
        const e = await safe(() => getJSON(ctx, 'https://m.weibo.cn/statuses/extend?id=' + encodeURIComponent(x.id || x.mid), { ua: MOBILE_UA }));
        if (e && e.data && typeof e.data.longTextContent === 'string') t = e.data.longTextContent;
      }
      return strip(t);
    };
    const vt = (x) => { const p = x && x.page_info; if (!p) return ''; const isV = /video/i.test(String(p.type || p.object_type || '')) || /^1034:/.test(String(p.object_id || '')); if (!isV) return ''; return (p.media_info && p.media_info.video_title) || p.title || p.content2 || ''; };
    const own = await longText(d), rt = d.retweeted_status ? await longText(d.retweeted_status) : '';
    const title = vt(d) || vt(d.retweeted_status);
    return out('weibo', d.user && d.user.screen_name, [title, own, rt]);
  }
  // ---- 6. Facebook：發文者顯示名稱（Meta 官方 oEmbed，2026/6/15 起免權杖）＋同一個回應裡的正文 ----
  // 2026-11-12 18:10 修正（猴猴選 B）：oEmbed 本來就是為了取顯示名稱而呼叫；回應裡剛好有的正文一起回傳，不為正文另外請求。
  async function facebook(ctx, u) {
    if (/^\/share\//.test(u.pathname) || u.hostname === 'fb.watch') { const r = await resolve(u.href, ctx.fetch); if (r.ok) u = safeUrl(r.url); }
    const isVideo = /\/videos\/|^\/watch|^\/reel\//.test(u.pathname);
    const j = await safe(() => getJSON(ctx, 'https://graph.facebook.com/v25.0/' + (isVideo ? 'oembed_video' : 'oembed_post') + '?url=' + encodeURIComponent(u.href)));
    const html = j && typeof j.html === 'string' ? j.html : '';
    if (!html) return out('facebook', '', []);
    const bq = (/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i.exec(html) || [])[1] || '';
    const p = (/<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(bq) || [])[1] || '';
    const by = /Posted by\s*<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(bq) || /由\s*<a\b[^>]*>([\s\S]*?)<\/a>\s*(?:發佈|发布)/i.exec(bq);
    const name = by ? strip(by[1]) : '';
    return out('facebook', /^\d+$/.test(name) ? '' : name, [p]);
  }
  // ---- 7. Threads：只取 @帳號（網址；手機分享 /share/ 先解析成正式網址）----
  // 2026-11-12 18:10 修正（猴猴選 B）：@帳號一律來自網址，不需要額外請求；原本讀貼文頁、呼叫 oEmbed 只是為了正文，已取消（所以不會有正文）。
  async function threads(ctx, u) {
    if (/^\/share\//.test(u.pathname)) { const r = await resolve(u.href, ctx.fetch); if (r.ok) u = safeUrl(r.url); }
    return out('threads', u ? handleOf(u, /^\/@([\w.]{1,40})\//) : '', []);
  }
  // ---- 8. X：@帳號（網址）＋正文（官方 oEmbed 嵌入碼裡的 <p>） ----
  async function x(ctx, u) {
    const acct = (() => { const mm = /^\/(\w{1,15})\/status\/\d/.exec(u.pathname); return mm && mm[1] !== 'i' ? '@' + mm[1] : ''; })();
    const id = (/\/status\/(\d{5,25})/.exec(u.pathname) || [])[1];
    if (!id) return out('x', acct, []);
    // V3.2.0 修正（2026-11-13）：官方文件的 oEmbed 位址是 publish.x.com（舊的 publish.twitter.com 會轉址，而本程式不跟隨轉址，所以以前一直取不到）
    let j = await safe(() => getJSON(ctx, 'https://publish.x.com/oembed?omit_script=1&dnt=true&url=' + encodeURIComponent('https://x.com/i/status/' + id)));
    if (!j) j = await safe(() => getJSON(ctx, 'https://publish.twitter.com/oembed?omit_script=1&dnt=true&url=' + encodeURIComponent('https://twitter.com/i/status/' + id)));
    const html = j && typeof j.html === 'string' ? j.html : '';
    const p = (/<blockquote\b[^>]*class="[^"]*twitter-tweet[^"]*"[^>]*>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(html) || [])[1] || '';
    let a2 = acct;
    if (!a2) { const mm = /&mdash;[^<]*\(@(\w{1,15})\)/.exec(html); if (mm) a2 = '@' + mm[1]; }
    const text = strip(p).replace(/\s*pic\.twitter\.com\/\w+\s*$/i, '').trim();
    return out('x', a2, [text]);
  }
  // ---- 9. Instagram：@帳號（網址 → 官方 oEmbed 嵌入碼 → 公開嵌入頁，前一步有了就不再請求）----
  // 2026-11-12 18:10 修正（猴猴選 B）：公開嵌入頁只在前兩步都沒取得帳號時才讀；有讀到時，同一頁裡的貼文說明一起回傳。網址或 oEmbed 已有帳號時不為說明另外請求。
  async function instagram(ctx, u) {
    const m = /^\/(?:([\w.]{1,30})\/)?(p|reel|reels|tv)\/([\w-]{5,40})/.exec(u.pathname);
    if (!m) return out('instagram', '', []);
    let acct = m[1] && !/^(p|reel|reels|tv|explore|stories)$/.test(m[1]) ? '@' + m[1] : '';
    const kind = m[2] === 'reels' ? 'reel' : m[2], code = m[3], canon = 'https://www.instagram.com/' + kind + '/' + code + '/';
    if (!acct) {
      const j = await safe(() => getJSON(ctx, 'https://graph.facebook.com/v25.0/instagram_oembed?url=' + encodeURIComponent(canon)));
      const mm = j && typeof j.html === 'string' && /\(@([\w.]{1,30})\)/.exec(strip(j.html));
      if (mm) acct = '@' + mm[1];
    }
    let cap = '';
    if (!acct) {
      const html = await safe(() => getHTML(ctx, canon + 'embed/captioned/'));
      if (html) {
        const c = /<div\b[^>]*class="[^"]*\bCaption\b[^"]*"[^>]*>([\s\S]*?)<div\b[^>]*class="[^"]*\bCaptionComments\b/i.exec(html) || /<div\b[^>]*class="[^"]*\bCaption\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
        if (c) {
          const un = /<a\b[^>]*class="[^"]*\bCaptionUsername\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(c[1]);
          if (un && /^[\w.]{1,30}$/.test(strip(un[1]))) acct = '@' + strip(un[1]);
          cap = strip(c[1].replace(/<a\b[^>]*class="[^"]*\bCaptionUsername\b[^"]*"[^>]*>[\s\S]*?<\/a>/i, ''));
        }
        if (!acct) { const un2 = /<span\b[^>]*class="[^"]*\bUsernameText\b[^"]*"[^>]*>([\w.]{1,30})<\/span>/i.exec(html); if (un2) acct = '@' + un2[1]; }
        // V3.2.0 修正（2026-11-13）：嵌入頁內嵌資料裡「owner」的 username（只認 owner，避免抓到留言者）
        if (!acct) { const i0 = html.indexOf('"shortcode_media"'); const ow = i0 >= 0 && /^[^\[]*?"owner"\s*:\s*\{[^{}]*?"username"\s*:\s*"([\w.]{1,30})"/.exec(html.slice(i0)); if (ow) acct = '@' + ow[1]; }
      }
    }
    // V3.2.0 修正（2026-11-13）：前面都沒有時，最後讀一次公開貼文頁的 meta（只取帳號，不取貼文說明）：
    //   og:url／canonical 的 /{帳號}/p|reel/{代碼}/，或 description「… - {帳號} on {日期}:」，或 title「(@帳號)」。被導去登入就放棄。
    if (!acct) {
      const html = await safe(() => getHTML(ctx, canon));
      if (html) {
        const urlAcct = (s) => { const mm = /^https:\/\/www\.instagram\.com\/([\w.]{1,30})\/(?:p|reels?|tv)\/([\w-]{5,40})/.exec(s || ''); return mm && mm[2] === code && !/^(p|reel|reels|tv|explore|stories)$/.test(mm[1]) ? mm[1] : ''; };
        const canonL = (/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(html) || [])[1] || '';
        const d1 = /\s-\s([\w.]{1,30}) (?:on|於) [^:：]{3,40}[:：]/.exec(metaOf(html, 'name', 'description') || metaOf(html, 'property', 'og:description'));
        const t1 = /\(@([\w.]{1,30})\)/.exec(metaOf(html, 'property', 'og:title') || metaOf(html, 'name', 'twitter:title'));
        const a1 = urlAcct(metaOf(html, 'property', 'og:url')) || urlAcct(decode(canonL)) || (d1 && d1[1]) || (t1 && t1[1]) || '';
        if (a1) acct = '@' + a1;
      }
    }
    return out('instagram', acct, [cap]);
  }

  // ---- 10. 小紅書：作者暱稱＋（2026-11-13 起）同一頁的筆記標題、正文 ----
  // xhslink 短網址只讀一次公開轉址（不跟隨到登入頁）；筆記頁用手機瀏覽器 UA、不帶 Cookie 讀一次公開頁面，
  // 從頁面內嵌資料找「這則筆記（同一個筆記 ID）」的 user.nickname（2026-11-13 起連同標題、正文）。被導去登入、驗證、或頁面沒有資料就放棄。
  // XHS_FETCH=false 時完全不連線（直接回報沒取得，前端顯示發文帳號提示）。
  const XHS_FETCH = true;
  async function xiaohongshu(ctx, u) {
    const none = () => out('xiaohongshu', '', []);
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
    // V3.2.0 修正（2026-11-13）：同一個頁面回應裡「這則筆記」的標題＋正文，作為搜尋文字（不另外請求）
    const note = findObj(data, (o) => String(o.noteId || o.note_id || o.id || '').toLowerCase() === id && (typeof o.title === 'string' || typeof o.desc === 'string'));
    const texts = note ? [note.title, note.desc] : [];
    return out('xiaohongshu', nick, texts);
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
    try {
      const r = await P[2]({ fetch: fetchFn, signal: ac.signal }, u);
      return r && typeof r === 'object' ? r : { ok: false, platform: P[0], acct: '', acctOk: false, texts: [] };
    } catch (e) {
      return { ok: false, platform: P[0], acct: '', acctOk: false, texts: [], reason: ac.signal.aborted ? 'timeout' : 'error' };
    } finally { clearTimeout(tm); }
  }
  info._strip = strip; info._uniq = uniq;
  return info;
};
