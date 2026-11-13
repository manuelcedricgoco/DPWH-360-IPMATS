import { api } from './api.js';

// ---------------------------------------------------------------------------
// User management service (administrator only). Talks to the Express API:
//
//   GET   /api/users?search=&role=&status=&account=&limit=&offset=
//         → { data, count, limit, offset, summary }
//   PATCH /api/users/:id/access  { role?, is_approved?, is_active?, agency_id? }
//         → server calls the existing admin_set_user_access() database function
//
// See server/src/controllers/users.controller.js.
// ---------------------------------------------------------------------------

/** filters: { search, role, status, account, limit, offset } – empty values are skipped. */
export function listUsers(filters = {}, { signal } = {}) {
  return api('/users', { query: filters, signal });
}

export function setUserAccess(userId, { role, is_approved, is_active, agency_id } = {}) {
  const body = {};
  if (role !== undefined) body.role = role;
  if (is_approved !== undefined) body.is_approved = is_approved;
  if (is_active !== undefined) body.is_active = is_active;
  if (agency_id) body.agency_id = agency_id;
  return api(`/users/${encodeURIComponent(userId)}/access`, { method: 'PATCH', body });
}

/** True when the server answered with its generic "route does not exist" 404 (server not restarted / outdated). */
export function isMissingEndpoint(error) {
  return error?.status === 404 && /^Not found: /i.test(error?.message || '');
}

// Request bodies the UI sends for each action (see admin_set_user_access).
export const ACCESS_ACTIONS = {
  /** Grant the chosen role. The RPC clears requested_role. */
  approve: (role, agencyId) => ({ role, is_approved: true, is_active: true, agency_id: agencyId || undefined }),
  /** Decline the request: role stays public_viewer, account stays unapproved, request is cleared. */
  reject: () => ({ role: 'public_viewer', is_approved: false }),
  activate: () => ({ is_active: true }),
  deactivate: () => ({ is_active: false }),
};

/**
 * Approval state derived from real profile columns (same rule as the server):
 *   pending  – not approved and a privileged role is requested
 *   approved – approved
 *   rejected – not approved and no request left (what the reject action produces)
 */
export function approvalStatus(user) {
  if (user?.is_approved) return 'approved';
  if (user?.requested_role) return 'pending';
  return 'rejected';
}

export const APPROVAL_META = {
  pending: { label: 'Pending', tone: 'yellow', icon: 'clock' },
  approved: { label: 'Approved', tone: 'green', icon: 'checkCircle' },
  rejected: { label: 'Not approved', tone: 'red', icon: 'xCircle' },
};
