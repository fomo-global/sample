import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Telegram Mini App — Single Button Flow + History (React + TSX)
 * --------------------------------------------------------------
 * Поведение по ТЗ:
 * 1) При входе: авторизация -> запрос next-allowed -> ЗАГРУЗКА ИСТОРИИ. Пока это не выполнено — показываем лоадер.
 * 2) После инициализации: показываем одну кнопку «Получить предсказание» и таймер (если ещё рано) + блок истории.
 * 3) Если таймер > 0 — кнопка дизейбл. По достижении 0 — кнопка автоматически становится активной (без доп. запросов).
 * 4) Если таймера нет (wait_seconds = 0), по клику делаем POST /predictions. На 429 — снова выставляем таймер. После успешного запроса — обновляем историю.
 * 5) Авторизация не дублируется: дедуп (authPromiseRef + tokenRef).
 */

// =========================
// Конфиг
// =========================
const API_BASE = process.env.API_BASE_URL
const ENDPOINTS = {
  AUTH_TELEGRAM: `${API_BASE}/api/auth/telegram`,
  PREDICTIONS: `${API_BASE}/api/predictions`,
  NEXT_ALLOWED: `${API_BASE}/api/predictions/next-allowed`,
};

declare global {
  interface Window { Telegram?: { WebApp?: TgWebApp } }
}

type TgWebApp = { initData: string; colorScheme?: 'light' | 'dark'; ready?: () => void; expand?: () => void };

// =========================
// Типы API
// =========================
interface AuthResponse {
  token: string;
  user: {
    id: number; telegram_id: string; username: string | null; first_name: string | null; last_name: string | null;
    photo_url: string | null; language_code: string | null; is_premium: boolean;
  };
}
interface NextAllowedResponse { next_available_at: string; wait_seconds: number }
interface CreatePredictionResponse { prediction: { id: number; text: string; created_at: string }, next_available_at: string }
interface PredictionsListResponse { items: Array<{ id: number; text: string; lang: string | null; model: string | null; created_at: string }>; }

// =========================
// Вспомогательные
// =========================
function fmtSeconds(s: number) { if (s <= 0) return '0:00'; const m = Math.floor(s / 60), sec = s % 60; return `${m}:${String(sec).padStart(2,'0')}`; }
function httpErr(status: number, payload?: any) { const e: any = new Error(payload?.error || `HTTP ${status}`); e.__httpStatus = status; e.payload = payload; return e; }
async function safeJson(r: Response) { try { return await r.json() } catch { return {} } }

// =========================
// Приложение
// =========================
export default function App() {
  const tg = (window.Telegram?.WebApp || {}) as TgWebApp;

  // Boot / auth state
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);

  const tokenRef = useRef<string | null>(null);
  const authPromiseRef = useRef<Promise<string> | null>(null);

  // Prediction state
  const [cooldown, setCooldown] = useState(0); // сек. до следующего
  const [nextAt, setNextAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastText, setLastText] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<PredictionsListResponse['items']>([]);

  // Theming
  useEffect(() => {
    try { tg.ready?.(); tg.expand?.(); } catch {}
    const dark = tg.colorScheme === 'dark';
    document.documentElement.style.setProperty('--bg', dark ? '#0f1115' : '#f6f7fb');
    document.documentElement.style.setProperty('--card', dark ? '#151922' : '#ffffff');
    document.documentElement.style.setProperty('--text', dark ? '#eef0f5' : '#111827');
    document.documentElement.style.setProperty('--muted', dark ? '#9aa3b2' : '#6b7280');
    document.documentElement.style.setProperty('--primary', '#4f46e5');
    document.documentElement.style.setProperty('--border', dark ? '#232838' : '#e5e7eb');
  }, [tg]);

  // Init flow: auth -> next-allowed -> history -> show UI
  useEffect(() => {
    (async () => {
      try {
        await ensureAuth();
        await refreshNextAllowed();
        await loadHistory();
      } catch (e) {
        // ошибка уже записана в authError/консоль
      } finally {
        setInitializing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local ticker: каждые 1с уменьшаем визуальный таймер
  useEffect(() => {
    if (!nextAt) return;
    const id = window.setInterval(() => {
      const diff = Math.ceil((nextAt.getTime() - Date.now()) / 1000);
      setCooldown(diff > 0 ? diff : 0);
    }, 1000);
    return () => window.clearInterval(id);
  }, [nextAt]);

  // -------- AUTH --------
  async function ensureAuth(): Promise<string> {
    if (tokenRef.current) return tokenRef.current;
    if (authPromiseRef.current) return authPromiseRef.current;

    const p = (async () => {
      setAuthError(null);
      const initData = tg.initData;
      if (!initData) { const msg = 'Нет initData — запусти из Telegram'; setAuthError(msg); throw new Error(msg); }
      const r = await fetch(ENDPOINTS.AUTH_TELEGRAM, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData }) });
      if (!r.ok) { const d = await safeJson(r); const msg = d?.error || 'Auth failed'; setAuthError(msg); throw new Error(msg); }
      const data = (await r.json()) as AuthResponse;
      tokenRef.current = data.token; setUser(data.user); return data.token;
    })().finally(() => { authPromiseRef.current = null; });

    authPromiseRef.current = p;
    return p;
  }

  // Универсальный вызов с авто-повтором при 401
  const withToken = useMemo(() => {
    return async function<T>(fn: (t: string) => Promise<T>): Promise<T> {
      const t1 = await ensureAuth();
      try { return await fn(t1) }
      catch (e: any) {
        if (e?.__httpStatus === 401) { tokenRef.current = null; const t2 = await ensureAuth(); return await fn(t2) }
        throw e;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- API --------
  async function refreshNextAllowed() {
    await withToken(async (t) => {
      const r = await fetch(ENDPOINTS.NEXT_ALLOWED, { headers: { Authorization: `Bearer ${t}` } });
      if (!r.ok) throw httpErr(r.status, await safeJson(r));
      const d = (await r.json()) as NextAllowedResponse;
      setNextAt(new Date(d.next_available_at));
      setCooldown(Math.max(0, d.wait_seconds | 0));
    });
  }

  async function loadHistory() {
    await withToken(async (t) => {
      const u = new URL(ENDPOINTS.PREDICTIONS);
      u.searchParams.set('limit', '20');
      u.searchParams.set('offset', '0');
      const r = await fetch(u.toString(), { headers: { Authorization: `Bearer ${t}` } });
      if (!r.ok) throw httpErr(r.status, await safeJson(r));
      const d = (await r.json()) as PredictionsListResponse;
      setHistory(d.items);
    });
  }

  async function requestPrediction() {
    if (cooldown > 0 || busy) return; // защита от даблкликов
    setBusy(true);
    try {
      await withToken(async (t) => {
        const r = await fetch(ENDPOINTS.PREDICTIONS, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({})
        });
        if (!r.ok) throw httpErr(r.status, await safeJson(r));
        const d = (await r.json()) as CreatePredictionResponse;
        setLastText(d.prediction.text);
        setNextAt(new Date(d.next_available_at)); // обновляем таймер после успеха
        await loadHistory(); // подхватить новую запись
      });
    } catch (e: any) {
      if (e?.__httpStatus === 429) {
        const wait = e?.payload?.retry_after_seconds ?? 0;
        const nextIso = e?.payload?.next_available_at;
        if (nextIso) setNextAt(new Date(nextIso));
        setCooldown(wait);
      } else {
        console.error(e);
      }
    } finally { setBusy(false); }
  }

  const canClick = !initializing && !busy && cooldown <= 0 && !!tokenRef.current;

  // -------- UI --------
  return (
    <div style={sx.page}>
      <div style={sx.card}>
        <h1 style={sx.title}>Hourly Fortune</h1>
        <p style={sx.sub}>Короткие предсказания раз в час</p>

        {initializing && (
          <div style={sx.loaderWrap}>
            <div style={sx.loader} />
            <div style={sx.note}>Загружаем…</div>
          </div>
        )}

        {!initializing && authError && (
          <div style={sx.error}>{authError}</div>
        )}

        {!initializing && !authError && (
          <>
            <div style={sx.timerBox}>
              <div style={sx.timer}>{fmtSeconds(cooldown)}</div>
              <div style={sx.timerHint}>до следующего предсказания</div>
            </div>

            <button
              style={{ ...sx.btn, ...(canClick ? sx.btnPrimary : sx.btnDisabled) }}
              disabled={!canClick}
              onClick={requestPrediction}
            >
              {busy ? 'Генерируем…' : 'Получить предсказание'}
            </button>

            {lastText && (
              <div style={sx.result}>
                <div style={sx.resultTitle}>Последнее предсказание</div>
                <div style={sx.resultText}>{lastText}</div>
              </div>
            )}

            <div style={sx.hist}>
              <div style={sx.histTitle}>История</div>
              {history.length === 0 && <div style={sx.histEmpty}>Записей пока нет</div>}
              {history.map((it) => (
                <div key={it.id} style={sx.histItem}>
                  <div style={sx.histText}>{it.text}</div>
                  <div style={sx.histMeta}>
                    <span>{new Date(it.created_at).toLocaleString()}</span>
                    <span>·</span>
                    <span>{it.model || 'LLM'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =========================
// Стили
// =========================
const sx: Record<string, React.CSSProperties> = {
  page: { background: 'var(--bg)', minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 520, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 },
  title: { margin: '0 0 6px 0', color: 'var(--text)', fontSize: 22 },
  sub: { margin: '0 0 12px 0', color: 'var(--muted)' },
  note: { color: 'var(--muted)', marginTop: 8 },
  error: { background: 'rgba(240,68,56,0.12)', color: '#b42318', border: '1px solid #fda29b', padding: '8px 10px', borderRadius: 10, marginTop: 8 },

  loaderWrap: { display: 'grid', placeItems: 'center', gap: 6, padding: '12px 0' },
  loader: { width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' } as any,

  timerBox: { textAlign: 'center', padding: '12px 0' },
  timer: { fontSize: 40, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' },
  timerHint: { color: 'var(--muted)', marginTop: 4 },

  btn: { margin: '8px auto 0', display: 'block', appearance: 'none', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 14, minWidth: 240, textAlign: 'center' },
  btnPrimary: { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },

  result: { marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' },
  resultTitle: { color: 'var(--muted)', marginBottom: 6 },
  resultText: { color: 'var(--text)' },

  hist: { marginTop: 18 },
  histTitle: { color: 'var(--muted)', marginBottom: 8, fontWeight: 600 },
  histEmpty: { color: 'var(--muted)' },
  histItem: { border: '1px dashed var(--border)', borderRadius: 12, padding: 10, marginBottom: 8 },
  histText: { color: 'var(--text)', marginBottom: 6, whiteSpace: 'pre-wrap' },
  histMeta: { color: 'var(--muted)', fontSize: 12, display: 'flex', gap: 6 },
};

// keyframes для лоадера
const styleEl = document.createElement('style');
styleEl.innerHTML = `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;
document.head.appendChild(styleEl);
