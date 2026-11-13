import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Server-side clients never persist or refresh sessions.
const serverAuth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

/**
 * Client for one signed-in user's request. Uses the ANON key plus the user's
 * access token, so every query runs under the database's RLS for that user.
 * Use this (via req.db) for all normal user requests.
 */
export function supabaseForUser(accessToken) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: serverAuth,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Anon client for public (not logged-in) requests. RLS applies as `anon`. */
export const supabaseAnon = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: serverAuth });

/**
 * Service-role client. BYPASSES RLS. Only for server-side jobs
 * (maintenance, scheduled tasks) – never for normal user requests.
 * null when SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export const supabaseAdmin = env.supabaseServiceRoleKey
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, { auth: serverAuth })
  : null;
