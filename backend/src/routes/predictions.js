import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { Prediction } from '../models/Prediction.js';
import { generatePrediction } from '../services/llm.js';
import { getCooldownSecs, nextAvailableAt, secondsUntil } from '../utils/cooldown.js';

const router = Router();

// История
router.get('/predictions', auth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);

  const items = await Prediction.findAll({
    where: { user_id: req.user.id },
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  res.json({
    items: items.map(p => ({
      id: p.id,
      text: p.text,
      lang: p.lang,
      model: p.model,
      created_at: p.createdAt,
    })),
  });
});

// Когда можно снова
router.get('/predictions/next-allowed', auth, async (req, res) => {
  const cooldown = getCooldownSecs();
  const nextAt = nextAvailableAt(req.user.last_prediction_at, cooldown);
  const wait = secondsUntil(nextAt);
  res.json({ next_available_at: nextAt.toISOString(), wait_seconds: wait });
});

// Создать новое предсказание
router.post('/predictions', auth, async (req, res) => {
  const cooldown = getCooldownSecs();
  const lang = req.user.language_code || 'ru';

  const nextAt = nextAvailableAt(req.user.last_prediction_at, cooldown);
  const wait = secondsUntil(nextAt);

  if (wait > 0) {
    return res.status(429).json({
      error: 'Cooldown active / Кулдаун',
      next_available_at: nextAt.toISOString(),
      retry_after_seconds: wait,
    });
  }

  // Генерируем у LLM
  const out = await generatePrediction({ lang });

  // Сохраняем и обновляем last_prediction_at
  const prediction = await Prediction.create({
    user_id: req.user.id,
    text: out.text,
    lang,
    model: out.model,
    usage_prompt_tokens: out.usage_prompt_tokens,
    usage_completion_tokens: out.usage_completion_tokens,
    finish_reason: out.finish_reason,
    prompt_version: out.prompt_version,
  });

  await req.user.update({ last_prediction_at: new Date() });

  const next = nextAvailableAt(req.user.last_prediction_at, cooldown);

  res.status(201).json({
    prediction: {
      id: prediction.id,
      text: prediction.text,
      created_at: prediction.createdAt,
    },
    next_available_at: next.toISOString(),
  });
});

export default router;
