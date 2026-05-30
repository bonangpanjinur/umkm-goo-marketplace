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

  // Connect directly to Supabase so /rest/v1/* and /auth/v1/* go straight
  // to the Supabase project. This requires VITE_SUPABASE_URL to be set.
  // The /api/* routes still go through the Vite proxy → API server.
  const baseUrl = ORIGINAL_SUPABASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

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
