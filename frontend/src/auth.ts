import { useEffect, useMemo, useState } from 'react';
import { getTelegram } from './telegram';

const ACCESS_TOKEN_KEY = 'accessToken';

const API_BASE_URL = process.env.API_BASE_URL

export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setToken(token?: string) {
  if (!token) localStorage.removeItem(ACCESS_TOKEN_KEY);
  else localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Инициализация/логин из Telegram initData
  const login = async () => {
    const tg = getTelegram();
    if (!tg) {
      setError('Открой мини‑приложение внутри Telegram');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const initData = tg.initData;
      const res = await fetch(`${API_BASE_URL}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      const json = await res.json();
      if (json.token) {
        setToken(json.token);
        setTokenState(json.token);
      } else {
        throw new Error(json.reason)
      }
      setUser(json.user || null);
    } catch (e: any) {
      setError(e?.message || String(e));
      setToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken();
    setTokenState(null);
    setUser(null);
  };

  return useMemo(() => ({ token, user, loading, error, login, logout }), [token, user, loading, error]);
}