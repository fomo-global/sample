import { parse, validate } from '@telegram-apps/init-data-node';

export function verifyTelegramInitData(initData, botToken) {
  try {
    validate(initData, botToken, { expiresIn: 60 }); // 60s
    const data = parse(initData);
    return { ok: true, data };
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? e.code : null;
    if (code === 'ERR_EXPIRED') {
      return { ok: false, reason: 'Init data expired' };
    }
    if (code === 'ERR_SIGN_INVALID' || code === 'ERR_HASH_INVALID') {
      return { ok: false, reason: 'Invalid signature' };
    }
    return { ok: false, reason: 'Verification failed / Проверка initData не удалась' };
  }
}
