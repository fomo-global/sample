import { getToken } from './auth';

const API_BASE_URL = process.env.API_BASE_URL

export async function api(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}/api/me`, {method: 'POST', ...options, headers });
  return res;
}
