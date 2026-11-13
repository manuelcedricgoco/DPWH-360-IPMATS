// Role names (same as the database enum public.user_role) and their home pages.

export const ROLE_HOME = {
  administrator: '/admin',
  dpwh_personnel: '/dpwh',
  auditor: '/auditor',
  public_viewer: '/public',
};

export const ROLE_LABEL = {
  administrator: 'Administrator',
  dpwh_personnel: 'DPWH Personnel',
  auditor: 'Auditor',
  public_viewer: 'Public Viewer',
};

/** Where a user should land after login, based on their profile. */
export function homeFor(profile) {
  if (!profile) return '/login';
  if (!profile.is_approved) return '/pending';
  return ROLE_HOME[profile.role] || '/public';
}
