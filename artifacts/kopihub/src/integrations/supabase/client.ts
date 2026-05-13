import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabasePlaceholder = !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY;

function createSupabaseClient() {
  if (isSupabasePlaceholder) {
    // Loud, single warning. Banner di __root memberi tahu user secara visual.
    // eslint-disable-next-line no-console
    console.error(
      '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY tidak terbaca. ' +
      'Build preview ini tidak akan bisa fetch data. Set env di .env root project.'
    );
    return createClient<Database>(
      SUPABASE_URL || 'https://placeholder.supabase.co',
      SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }

  return createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
