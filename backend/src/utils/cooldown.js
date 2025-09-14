import 'dotenv/config';

const DEFAULT_COOLDOWN = 3600; // 1 час

export function getCooldownSecs() {
  const v = Number(process.env.PREDICTION_COOLDOWN_SECS ?? DEFAULT_COOLDOWN);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : DEFAULT_COOLDOWN;
}

export function nextAvailableAt(lastAt, cooldownSecs) {
  if (!lastAt) return new Date();
  const ts = new Date(lastAt).getTime() + cooldownSecs * 1000;
  return new Date(ts);
}

export function secondsUntil(date) {
  const diff = Math.ceil((date.getTime() - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
}
