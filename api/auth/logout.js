// 登出：清除伺服器發給瀏覽器的 Cookie。
// 這裡刻意「不」向 Google 撤銷授權，避免把你其他裝置的登入一起踢掉。
const S = require('../_lib/session');

module.exports = async (req, res) => {
  try {
    if (!S.sameSiteCall(req)) return S.json(res, 403, { error: 'forbidden' });
    S.addCookies(res, [S.cookieStr('g_rt', '', 0), S.cookieStr('g_at', '', 0), S.cookieStr('g_state', '', 0)]);
    return S.json(res, 200, { ok: true });
  } catch (e) {
    return S.json(res, 500, { error: 'server_error' });
  }
};
