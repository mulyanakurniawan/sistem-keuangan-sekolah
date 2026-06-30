import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('[Supabase] SUPABASE_URL dan SUPABASE_ANON_KEY harus didefinisikan di file .env!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Re-export types for use across the app
export type { User, Student, PaymentType, Payment, PaymentInstallment, ActivityLog } from './db_manager';
