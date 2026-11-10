import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseServiceKey &&
  supabaseServiceKey !== 'your-service-role-key-here' &&
  supabaseServiceKey !== 'your-anon-key-here'
);

export function getServiceSupabase() {
  if (!isSupabaseConfigured) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
