import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { createApiRouter } from '../src/api-router';

const app = express();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (SUPABASE_URL && SUPABASE_KEY) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  app.use('/api', (req, res, next) => {
    if (!req.headers['content-type'] || req.headers['content-type'].includes('application/json')) {
      express.json({ limit: '50mb' })(req, res, next);
    } else {
      next();
    }
  });
  app.use('/api', express.urlencoded({ extended: true, limit: '50mb' }));

  const router = createApiRouter(supabase);
  app.use('/', router);
}

app.get('/api/health', (req, res) => {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_KEY) missing.push('SUPABASE_ANON_KEY');
  if (missing.length > 0) {
    return res.status(500).json({ status: 'error', message: `Missing env vars: ${missing.join(', ')}` });
  }
  res.json({ status: 'ok', message: 'Server keuangan sekolah berjalan.' });
});

export default app;
