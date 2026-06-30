import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { createApiRouter } from '../src/api-router';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  app.use('/', createApiRouter(supabase));
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, supabase: !!(supabaseUrl && supabaseKey) });
});

export default app;
