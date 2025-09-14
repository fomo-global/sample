import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDb, sequelize } from './models/index.js';
import './models/User.js';
import './models/Prediction.js'; // важно импортнуть
import authRoute from './routes/auth.js';
import meRoute from './routes/me.js';
import predictionsRoute from './routes/predictions.js';

const app = express();
const PORT = process.env.PORT || 5000;

const FRONT_ORIGIN = (process.env.FRONT_ORIGIN || process.env.FRONT_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // Разрешаем postman/curl (нет origin) и явные домены из .env
    if (!origin || FRONT_ORIGIN.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// health (фикс слэша)
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoute);
app.use('/api', meRoute);
app.use('/api', predictionsRoute);

// Глобальный обработчик ошибок (чтобы не падать некрасиво)
app.use((err, _req, res, _next) => {
  console.error('[UNCAUGHT]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

(async () => {
  try {
    await connectDb();
    await sequelize.sync(); // на prod — миграции
    app.listen(PORT, '0.0.0.0', () => console.log(`API on http://localhost:${PORT}`));
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }
})();
