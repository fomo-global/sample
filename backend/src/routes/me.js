import { Router } from 'express';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/me', auth, async (req, res) => {
  const user = req.user;
  const { exp } = req.jwt;
  res.json({ user, exp });
});

export default router;
