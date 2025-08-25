import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  console.log(token)
  if (!token) return res.status(401).json({ error: 'No token / Нет токена' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'miniapp.api',
      audience: 'miniapp.webapp'
    });

    const user = await User.findByPk(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.token_version !== payload.ver) return res.status(401).json({ error: 'Token invalidated / Токен признан недействительным' });

    req.user = user;
    req.jwt = payload; // { sub, ver, tg_id?, iat, exp }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token / Недействительный или просроченный токен' });
  }
}
