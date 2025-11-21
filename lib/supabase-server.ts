import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for Supabase server client');
}

if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for Supabase server client');
}

/**
 * Creates a Supabase client using the service-role key.
 * This client bypasses Row Level Security (RLS) and should ONLY be used server-side.
 * Never import this into client components.
 */
export function createServerSupabaseClient(): SupabaseClient {
  // These are checked at module load time, so they're guaranteed to be strings here
  // The service-role key automatically bypasses RLS in Supabase
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
