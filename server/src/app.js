import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import meRouter from './routes/me.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/me', meRouter);

app.use('/api', notFound);
app.use(errorHandler);

export default app;
