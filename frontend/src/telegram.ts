export function getTelegram() {
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function ensureTelegramEnv(): { ok: boolean; reason?: string } {
  const tg = getTelegram();
  if (!tg) return { ok: false, reason: 'Открой мини‑приложение внутри Telegram' };
  return { ok: true };
}