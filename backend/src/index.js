import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDb, sequelize } from './models/index.js';
import './models/User.js'; // важно импортнуть модель, чтобы она зарегистрировалась
import authRoute from './routes/auth.js';
import meRoute from './routes/me.js';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONT_ORIGIN = process.env.FRONT_ORIGIN;

app.use(cors({ 
  origin: FRONT_ORIGIN, 
  credentials: true, 
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());

app.get('api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoute);
app.use('/api', meRoute);

(async () => {
  await connectDb();
  await sequelize.sync();
  app.listen(PORT, '0.0.0.0', () => console.log(`API on http://localhost:${PORT}`));
})();
