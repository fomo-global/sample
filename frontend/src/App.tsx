import { useEffect } from 'react';
import './styles.css';
import { ensureTelegramEnv, getTelegram } from './telegram';
import { useAuth } from './auth';
import { api } from './api';

export default function App() {
  const env = ensureTelegramEnv();
  const { token, loading, error, login, logout } = useAuth();
  useEffect(() => {
    const tg = getTelegram();
    if (tg) {
      tg.ready();
      tg.expand?.();
      if (tg && tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
      }
    }
  }, []);

  const callMe = async () => {
    const res = await api('/api/me');
    const data = await res.json().catch(() => ({}));
    const pretty = JSON.stringify(data, null, 2)
    .replace(/[{}]/g, '')                  
    .split('\n')
    .map(line => line.trim())                 
    .filter(Boolean)                          
    .map(line => '• ' + line)
    .join('\n');

    alert(`📋 Ответ от /api/me:\n\n${pretty}`);
  };

  if (!env.ok) {
    return (
      <div className="container">
        <h2>Открой мини‑приложение внутри Telegram</h2>
        <p className="muted">Этот фронтенд рассчитан на запуск в Telegram WebApp. В браузере SDK недоступен.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{marginTop: "80px"}}>
      <h1>Telegram Mini App</h1>
      <h3>сессия 2 мин, затем перезайтите в приложение</h3>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div><b>Статус:</b> {token ? 'авторизован' : 'не авторизован'}</div>
          </div>
          <div className="row">
            {!token ? (
              <button className="btn primary" disabled={loading} onClick={login}>
                {loading ? 'Входим…' : 'Войти через Telegram'}
              </button>
            ) : (
              <button className="btn ghost" onClick={logout}>Выйти</button>
            )}
          </div>
        </div>
        {error && (
          <pre style={{ marginTop: 12 }}>Ошибка: {error}</pre>
        )}
      </div>

      <div className="card">
        <h3>Тест API</h3>
        <p className="muted">Вызов GET <code>/api/me</code> с Bearer‑токеном из localStorage.</p>
        <button className="btn primary" onClick={callMe}>Вызвать /api/me</button>
      </div>
    </div>
  );
}