// 前端每次需要 Access Token 時呼叫這裡（POST /api/auth/token）。
// 伺服器用 Cookie 裡加密的 Refresh Token 向 Google 換新的 Access Token（約 1 小時有效），回傳給前端。
const S = require('../_lib/session');

module.exports = async (req, res) => {
  try {
    if (!S.sameSiteCall(req)) return S.json(res, 403, { error: 'forbidden' });
    const ck = S.readCookies(req);
    const clear = [S.cookieStr('g_rt', '', 0), S.cookieStr('g_at', '', 0)];

    if (ck.g_rt) {
      const sealed = S.openRefresh(ck.g_rt); // { r, s } 解不開、或沒有綁定 sub 的一律當作無效
      if (!sealed) { S.addCookies(res, clear); return S.json(res, 401, { error: 'reauth' }); }
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: S.env('GOOGLE_CLIENT_ID'),
          client_secret: S.env('GOOGLE_CLIENT_SECRET'),
          refresh_token: sealed.r,
          grant_type: 'refresh_token',
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.access_token) {
        // 再向 Google 確認換出來的 Access Token 真的是這個 Cookie 綁定的帳號
        const sub = await S.googleSub(j.access_token);
        if (!sub || sub !== sealed.s) { S.addCookies(res, clear); return S.json(res, 401, { error: 'reauth' }); }
        // 滑動期限：只有「Google 真的接受了這個 Refresh Token」才重新計算 180 天（若 Google 換發新的就用新的）
        S.addCookies(res, [S.refreshCookie(j.refresh_token || sealed.r, sealed.s)]);
        return S.json(res, 200, { access_token: j.access_token, expires_in: Number(j.expires_in) || 3600, sub });
      }
      if (j.error === 'invalid_grant') { // 已被撤銷或過期：不延長、不假裝有效，要求重新授權
        S.addCookies(res, clear);
        return S.json(res, 401, { error: 'reauth' });
      }
      return S.json(res, 502, { error: 'upstream_error' });
    }

    if (ck.g_at) {
      try {
        const o = JSON.parse(S.decrypt(ck.g_at));
        const left = Math.floor((o.e - Date.now()) / 1000);
        if (o.a && o.s && left > 60) return S.json(res, 200, { access_token: o.a, expires_in: left, sub: String(o.s) });
      } catch (e) { /* 往下走，要求重新登入 */ }
      S.addCookies(res, clear);
    }
    return S.json(res, 401, { error: 'reauth' });
  } catch (e) {
    return S.json(res, 500, { error: 'server_error' });
  }
};
