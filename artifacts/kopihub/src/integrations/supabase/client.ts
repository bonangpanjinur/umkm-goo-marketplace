import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const ORIGINAL_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabasePlaceholder = !SUPABASE_PUBLISHABLE_KEY;

function createSupabaseClient() {
  const anonKey = SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key';

  if (!SUPABASE_PUBLISHABLE_KEY) {
    console.error(
      '[Supabase] VITE_SUPABASE_PUBLISHABLE_KEY tidak terbaca. ' +
      'Data tidak akan bisa difetch.'
    );
  }

  // Use the current origin so /rest/v1/* and /auth/v1/* go through
  // the Vite dev proxy → API server → Neon database.
  // Auth is proxied upstream to the original Supabase project.
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : (ORIGINAL_SUPABASE_URL ?? 'http://localhost:3001');

  return createClient<Database>(baseUrl, anonKey, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'apikey': anonKey,
      },
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
