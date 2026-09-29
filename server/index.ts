import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db';
import { syncRouter } from './routes/sync';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'repomodore-sync-api',
    time: new Date().toISOString(),
  });
});

// Sync Routes
app.use('/api/sync', syncRouter);

export async function startServer() {
  try {
    await initDatabase();
    return app.listen(port, () => {
      console.log(`[Repomodore Sync API] Server listening on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('[Repomodore Sync API] Fatal initialization error:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
