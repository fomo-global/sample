import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { verifyTelegramInitData } from '../utils/telegram.js';
import { User } from '../models/User.js';
import 'dotenv/config';

const router = Router();

router.post('/telegram', async (req, res) => {
  const { initData } = req.body ?? {};
  if (!initData) return res.status(400).json({ error: 'initData is required' });

  const v = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!v.ok) return res.status(401).json({ error: 'Invalid initData', reason: v.reason });

  const tgUser = v.data.user;
  if (!tgUser?.id) return res.status(400).json({ error: 'No user in initData' });

  const [user] = await User.upsert({
    telegram_id: String(tgUser.id),
    username: tgUser.username ?? null,
    first_name: tgUser.firstName ?? null,
    last_name: tgUser.lastName ?? null,
    photo_url: tgUser.photoUrl ?? null,
    language_code: tgUser.languageCode ?? null,
    is_premium: !!tgUser.isPremium,
    allows_write_to_pm: !!tgUser.allowsWriteToPm
  }, { returning: true });

  const token = jwt.sign(
    { sub: user.id, ver: user.token_version, tg_id: user.telegram_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '120s', issuer: 'miniapp.api', audience: 'miniapp.webapp' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      photo_url: user.photo_url,
      language_code: user.language_code,
      is_premium: user.is_premium
    }
  });
});

export default router;
