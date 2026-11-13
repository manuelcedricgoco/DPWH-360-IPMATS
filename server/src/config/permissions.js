// Single source of truth for who may read/write each record type on the API side.
// Mirrors the RLS rules in database/README.md ("Roles and access"). The database
// still enforces RLS; these checks give early, clear 403s.

export const ROLES = Object.freeze({
  ADMIN: 'administrator',
  DPWH: 'dpwh_personnel',
  AUDITOR: 'auditor',
  PUBLIC: 'public_viewer',
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

/** All staff (administrator, dpwh_personnel, auditor) can read everything. */
export const STAFF = Object.freeze([ROLES.ADMIN, ROLES.DPWH, ROLES.AUDITOR]);

// 'anon' = not logged in.
// read: who may read · write: create/update · delete: hard delete.
export const PERMISSIONS = Object.freeze({
  projects: {
    read: [...STAFF, ROLES.PUBLIC, 'anon'], // public viewer / anon: published projects only (RLS)
    write: [ROLES.ADMIN, ROLES.DPWH],
    delete: [ROLES.ADMIN],
  },
  contractors: {
    read: [...STAFF, ROLES.PUBLIC, 'anon'],
    write: [ROLES.ADMIN, ROLES.DPWH],
    delete: [ROLES.ADMIN],
  },
  implementing_agencies: {
    read: [...STAFF, ROLES.PUBLIC, 'anon'],
    write: [ROLES.ADMIN],
    delete: [ROLES.ADMIN],
  },
  barangays: {
    read: [...STAFF, ROLES.PUBLIC, 'anon'],
    write: [ROLES.ADMIN, ROLES.DPWH],
    delete: [ROLES.ADMIN],
  },
  municipalities: {
    read: [...STAFF, ROLES.PUBLIC, 'anon'],
    write: [],
    delete: [],
  },
});

/** Roles allowed to perform `action` ('read' | 'write' | 'delete') on `resource`. */
export function rolesFor(resource, action) {
  const roles = PERMISSIONS[resource]?.[action];
  if (!roles) throw new Error(`Unknown permission: ${resource}.${action}`);
  return roles;
}

/** can(req.profile?.role, 'projects', 'write') – a missing role counts as 'anon'. */
export function can(role, resource, action) {
  return rolesFor(resource, action).includes(role || 'anon');
}
