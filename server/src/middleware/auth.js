import { supabaseAnon, supabaseForUser } from '../config/supabase.js';

const PROFILE_COLUMNS =
  'id, full_name, email, role, requested_role, is_approved, is_active, agency_id, office';

function bearerToken(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token.trim() : null;
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

// Verifies the token, loads the profile under the user's own RLS, and
// attaches req.user, req.profile, req.db and req.accessToken.
async function authenticate(req, token) {
  const db = supabaseForUser(token);

  const { data: userData, error: userError } = await db.auth.getUser(token);
  if (userError || !userData?.user) throw httpError(401, 'Invalid or expired token');

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) throw httpError(403, 'Profile not found');

  req.user = userData.user;
  req.profile = profile;
  req.db = db;
  req.accessToken = token;
}

/**
 * requireAuth() or requireAuth({ allowUnapproved: true })
 * 401 when the token is missing or invalid; 403 when the profile is not
 * approved or is inactive (unless allowUnapproved is set).
 */
export function requireAuth({ allowUnapproved = false } = {}) {
  return async (req, res, next) => {
    try {
      const token = bearerToken(req);
      if (!token) throw httpError(401, 'Missing bearer token');
      await authenticate(req, token);

      if (!allowUnapproved) {
        if (!req.profile.is_active) throw httpError(403, 'Account is inactive');
        if (!req.profile.is_approved) throw httpError(403, 'Account is waiting for approval');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Like requireAuth, but without a token the request continues as anonymous
 * (req.user = req.profile = null, req.db = supabaseAnon).
 * A token that is present but invalid is still rejected with 401.
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) {
      req.user = null;
      req.profile = null;
      req.db = supabaseAnon;
      return next();
    }
    await authenticate(req, token);
    next();
  } catch (error) {
    next(error);
  }
}
