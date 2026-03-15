import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Returns the Supabase client singleton, or null if env vars are not configured.
 * When null, the game falls back to localStorage-only mode.
 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}
