import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for Supabase browser client');
}

if (!anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY for Supabase browser client');
}

let browserClient: SupabaseClient | null = null;

function ensureBrowserClient(): SupabaseClient {
  if (!browserClient) {
    // These are checked at module load time, so they're guaranteed to be strings here
    browserClient = createClient(supabaseUrl!, anonKey!);
  }
  return browserClient;
}

// Preferred name going forward
export function getBrowserSupabaseClient(): SupabaseClient {
  return ensureBrowserClient();
}

// Backwards-compatible export for existing imports:
//   import { supabaseBrowser } from '@/lib/supabase-browser';
export function supabaseBrowser(): SupabaseClient {
  return ensureBrowserClient();
}
