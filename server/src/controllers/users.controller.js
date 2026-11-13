// User management (administrator only). Every query uses req.db – the signed-in
// administrator's own client – so RLS applies, admin_set_user_access() sees the
// real caller, and the activity-log trigger on profiles records who made the change.
// The service-role key is never used here.

const COLUMNS =
  'id, full_name, email, role, requested_role, is_approved, is_active, agency_id, office, created_at, updated_at';
const MAX_LIMIT = 500;
const ROLES = ['administrator', 'dpwh_personnel', 'auditor', 'public_viewer'];
const STATUSES = ['pending', 'approved', 'rejected'];
const ACCOUNTS = ['active', 'inactive'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Characters that would break a PostgREST or() filter.
const cleanSearch = (value) => String(value).replace(/[,()*%\\"]/g, ' ').trim();

/**
 * Approval state from real profile columns (same rule as the client):
 *   pending  – not approved and a dpwh_personnel/auditor role is requested
 *   approved – approved
 *   rejected – not approved and no request left (what a rejection produces)
 */
function approvalStatus(p) {
  if (p.is_approved) return 'approved';
  return p.requested_role ? 'pending' : 'rejected';
}

function badRequest(res, message) {
  return res.status(400).json({ error: message, errors: [message] });
}

// GET /api/users?search=&role=&status=pending|approved|rejected&account=active|inactive&limit=&offset=
// → { data, count, limit, offset, summary: { total, pending, approved, rejected, active, inactive } }
export async function listUsers(req, res, next) {
  try {
    const { search, role, status, account } = req.query;
    if (role !== undefined && role !== '' && !ROLES.includes(role)) {
      return badRequest(res, `role must be one of: ${ROLES.join(', ')}`);
    }
    if (status !== undefined && status !== '' && !STATUSES.includes(status)) {
      return badRequest(res, `status must be one of: ${STATUSES.join(', ')}`);
    }
    if (account !== undefined && account !== '' && !ACCOUNTS.includes(account)) {
      return badRequest(res, `account must be one of: ${ACCOUNTS.join(', ')}`);
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), MAX_LIMIT);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    let query = req.db
      .from('profiles')
      .select(COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Role matches the current role or a pending request for it. Search and role
    // each need an or(); combine them with and() so both apply.
    const groups = [];
    if (role) groups.push(`or(role.eq.${role},requested_role.eq.${role})`);
    const term = search ? cleanSearch(search) : '';
    if (term) groups.push(`or(full_name.ilike.*${term}*,email.ilike.*${term}*)`);
    if (groups.length === 1) query = query.or(groups[0].slice(3, -1));
    if (groups.length === 2) query = query.or(`and(${groups.join(',')})`);

    if (status === 'approved') query = query.eq('is_approved', true);
    if (status === 'pending') query = query.eq('is_approved', false).not('requested_role', 'is', null);
    if (status === 'rejected') query = query.eq('is_approved', false).is('requested_role', null);
    if (account) query = query.eq('is_active', account === 'active');

    // Overview counts across all accounts, independent of filters and paging.
    const summaryQuery = req.db.from('profiles').select('is_approved, is_active, requested_role');

    const [{ data, error, count }, { data: all, error: summaryError }] = await Promise.all([query, summaryQuery]);
    if (error) throw error;
    if (summaryError) throw summaryError;

    const summary = { total: all.length, pending: 0, approved: 0, rejected: 0, active: 0, inactive: 0 };
    all.forEach((p) => {
      summary[approvalStatus(p)] += 1;
      summary[p.is_active ? 'active' : 'inactive'] += 1;
    });

    res.json({ data, count, limit, offset, summary });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/users/:id/access  body { role?, is_approved?, is_active?, agency_id? }
// Body is already whitelisted by validateBody(userAccessSchema). Calls the existing
// admin_set_user_access() RPC; omitted fields are passed as null (= unchanged).
export async function setUserAccess(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return badRequest(res, 'User id must be a valid id');

    const { role, is_approved: isApproved, is_active: isActive, agency_id: agencyId } = req.body;

    // Same rule as the RPC, answered early with a clear message.
    if (id === req.user.id && ((role && role !== 'administrator') || isActive === false || isApproved === false)) {
      return res.status(403).json({ error: 'Administrators cannot demote or deactivate themselves' });
    }

    const { data, error } = await req.db.rpc('admin_set_user_access', {
      p_user_id: id,
      p_role: role ?? null,
      p_is_approved: isApproved ?? null,
      p_is_active: isActive ?? null,
      p_agency_id: agencyId ?? null,
    });
    if (error) {
      if (error.code === 'P0002') return res.status(404).json({ error: 'User not found' });
      throw error;
    }

    const profile = Array.isArray(data) ? data[0] : data;
    const picked = Object.fromEntries(COLUMNS.split(', ').map((key) => [key, profile?.[key] ?? null]));
    res.json({ data: picked });
  } catch (error) {
    next(error);
  }
}
