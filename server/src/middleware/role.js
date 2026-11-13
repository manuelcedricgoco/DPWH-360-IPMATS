import { ALL_ROLES } from '../config/permissions.js';

/**
 * requireRole('administrator', 'dpwh_personnel') – use after requireAuth().
 * Also accepts arrays, e.g. requireRole(rolesFor('projects', 'write')).
 * Returns 403 unless req.profile.role is one of the given roles
 * (and the profile is approved and active).
 */
export function requireRole(...roles) {
  const allowed = roles.flat().filter((role) => role !== 'anon');
  const unknown = allowed.filter((role) => !ALL_ROLES.includes(role));
  if (unknown.length) throw new Error(`requireRole: unknown role(s) ${unknown.join(', ')}`);

  return (req, res, next) => {
    const profile = req.profile;
    if (!profile) return res.status(401).json({ error: 'Authentication required' });
    if (!profile.is_approved || !profile.is_active || !allowed.includes(profile.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this' });
    }
    next();
  };
}
