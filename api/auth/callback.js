// Google 授權完成後會把使用者導回這裡（?code=...&state=...）。
// 這裡用 Client Secret 換取 Token；Client Secret 只存在伺服器環境變數，不會出現在前端。
const S = require('../_lib/session');

const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/drive.file';

module.exports = async (req, res) => {
  const back = (result) => {
    res.statusCode = 302;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', '/#login=' + encodeURIComponent(result));
    res.end();
  };
  try {
    const q = new URL(req.url, 'http://localhost').searchParams;
    const ck = S.readCookies(req);
    const clearState = S.cookieStr('g_state', '', 0);

    if (q.get('error')) { S.addCookies(res, [clearState]); return back('error:' + q.get('error')); }
    // state 必須和登入前寫入的 Cookie 相同，防止被別人偽造的登入連結（CSRF）
    if (!q.get('state') || !ck.g_state || q.get('state') !== ck.g_state) {
      S.addCookies(res, [clearState]);
      return back('error:state_mismatch');
    }
    const code = q.get('code');
    if (!code) { S.addCookies(res, [clearState]); return back('error:missing_code'); }

    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: S.env('GOOGLE_CLIENT_ID'),
        client_secret: S.env('GOOGLE_CLIENT_SECRET'),
        redirect_uri: S.appUrl() + '/api/auth/callback',
        grant_type: 'authorization_code',
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) {
      S.addCookies(res, [clearState]);
      return back('error:' + (j.error || 'token_exchange_failed'));
    }
    // 使用者在授權畫面可以取消勾選「雲端硬碟」，這樣程式無法運作，所以直接擋下
    if (!String(j.scope || '').split(' ').includes(REQUIRED_SCOPE)) {
      S.addCookies(res, [clearState]);
      return back('error:missing_drive_permission');
    }

    // 向 Google 確認「這次實際授權的是哪一個帳號」
    const sub = await S.googleSub(j.access_token);
    if (!sub) { S.addCookies(res, [clearState]); return back('error:userinfo_failed'); }

    const cookies = [clearState];
    const old = ck.g_rt ? S.openRefresh(ck.g_rt) : null; // 瀏覽器原本留著的（可能是別的帳號的）Refresh Token
    if (j.refresh_token) {
      // Google 給了這個帳號自己的新 Refresh Token：綁定 sub 後存起來，舊的直接被取代
      cookies.push(S.refreshCookie(j.refresh_token, sub));
      cookies.push(S.cookieStr('g_at', '', 0));
    } else if (old && old.s === sub) {
      // 沒有新的 Refresh Token，但原本那個確實是同一個帳號的：才可以繼續沿用，並順便延長期限
      cookies.push(S.refreshCookie(old.r, sub));
      cookies.push(S.cookieStr('g_at', '', 0));
    } else {
      // 沒有新的 Refresh Token，而且舊的屬於別的帳號（或舊的無法辨識）：
      // 絕對不能沿用，直接清掉；這一次只給一個綁定 sub 的短效 Access Token，過期後需重新登入
      const ttl = Math.max(60, Number(j.expires_in) || 3600);
      cookies.push(S.cookieStr('g_rt', '', 0));
      cookies.push(S.cookieStr('g_at', S.encrypt(JSON.stringify({ a: j.access_token, e: Date.now() + ttl * 1000, s: sub })), ttl));
    }
    S.addCookies(res, cookies);
    return back('ok');
  } catch (e) {
    S.addCookies(res, [S.cookieStr('g_state', '', 0)]);
    return back('error:server_error');
  }
};
