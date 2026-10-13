import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(window.ANCESTRIA_SUPABASE_URL, window.ANCESTRIA_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
