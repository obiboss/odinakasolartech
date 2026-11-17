import "server-only";

import { createClient } from "@supabase/supabase-js";

// Public catalogue reads must not depend on an incoming visitor session. Keeping
// this client separate from supabase/server makes public route output safe to
// share through Next's route/data caches.
export const publicSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);
