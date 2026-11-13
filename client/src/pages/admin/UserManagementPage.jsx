import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import {
  ACCESS_ACTIONS, APPROVAL_META, approvalStatus, isMissingEndpoint, listUsers, setUserAccess,
} from '../../lib/usersApi.js';
import { ROLE_LABEL } from '../../lib/roles.js';
import { formatDate } from '../../lib/format.js';
import { relativeTime } from '../../lib/projectStats.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatStrip from '../../components/charts/StatStrip.jsx';
import Icon from '../../components/ui/Icon.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { Badge } from '../../components/ui/Badges.jsx';
import { ActiveBadge } from '../../components/common/DetailList.jsx';
import DetailList from '../../components/common/DetailList.jsx';
import Modal from '../../components/common/Modal.jsx';
import Alert from '../../components/common/Alert.jsx';
import { initials } from '../../components/layout/UserMenu.jsx';

const PAGE_SIZE = 12;
// Roles an administrator can grant here. Re-approving a rejected account may also
// restore plain public viewer access.
const APPROVABLE_ROLES = ['dpwh_personnel', 'auditor'];
const REAPPROVABLE_ROLES = ['dpwh_personnel', 'auditor', 'public_viewer'];
const EMPTY_FILTERS = { search: '', role: '', approval: '', account: '' };
const EMPTY_SUMMARY = { total: 0, pending: 0, approved: 0, rejected: 0, active: 0, inactive: 0 };

function ApprovalBadge({ user }) {
  const meta = APPROVAL_META[approvalStatus(user)];
  return <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>;
}

function RoleCell({ user }) {
  return (
    <div className="space-y-1">
      <span className="block font-medium text-ink">{ROLE_LABEL[user.role] || user.role}</span>
      {user.requested_role && !user.is_approved && (
        <span className="block text-xs text-flag-yellow-ink">Requests {ROLE_LABEL[user.requested_role]}</span>
      )}
    </div>
  );
}

export default function UserManagementPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, approval: searchParams.get('status') || '' });
  const [search, setSearch] = useState(''); // debounced copy of filters.search
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);

  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false); // at least one successful response
  const [loadError, setLoadError] = useState({ message: '', missing: false });
  const [agencies, setAgencies] = useState([]);

  const [detail, setDetail] = useState(null);
  // action: null | { type: 'approve' | 'reject' | 'activate' | 'deactivate', user }
  const [action, setAction] = useState(null);
  const [approveForm, setApproveForm] = useState({ role: 'dpwh_personnel', agency_id: '' });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  // Wait 300 ms after typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(filters.search.trim()), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Back to page 1 when a filter changes.
  useEffect(() => setPage(1), [search, filters.role, filters.approval, filters.account]);

  // Users, filtering, paging and the overview counts all come from GET /api/users.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    listUsers({
      search,
      role: filters.role,
      status: filters.approval,
      account: filters.account,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }, { signal: controller.signal })
      .then(({ data, count: total, summary: totals }) => {
        setUsers(data || []);
        setCount(total ?? (data || []).length);
        setSummary({ ...EMPTY_SUMMARY, ...totals });
        setLoadError({ message: '', missing: false });
        setLoaded(true);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setUsers([]);
        setCount(0);
        setLoadError({ message: err.message, missing: isMissingEndpoint(err) });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, filters.role, filters.approval, filters.account, page, version]);

  // Agencies for the optional agency assignment on approval (existing endpoint).
  useEffect(() => {
    api('/agencies').then(({ data }) => setAgencies((data || []).filter((a) => a.is_active))).catch(() => setAgencies([]));
  }, []);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const connected = !loadError.message;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const agencyName = (id) => {
    const agency = agencies.find((a) => a.agency_id === id);
    return agency ? (agency.acronym ? `${agency.acronym} – ${agency.name}` : agency.name) : null;
  };

  const hasFilters = Object.values(filters).some(Boolean);
  const setFilter = (name) => (event) => setFilters((f) => ({ ...f, [name]: event.target.value }));
  const approveRoles = action?.user && approvalStatus(action.user) === 'rejected' ? REAPPROVABLE_ROLES : APPROVABLE_ROLES;

  const openAction = (type, user) => {
    setActionError('');
    if (type === 'approve') {
      const choices = approvalStatus(user) === 'rejected' ? REAPPROVABLE_ROLES : APPROVABLE_ROLES;
      setApproveForm({
        role: choices.includes(user.requested_role) ? user.requested_role : choices[0],
        agency_id: user.agency_id || '',
      });
    }
    setAction({ type, user });
  };
  const closeAction = () => { if (!busy) setAction(null); };

  const runAction = async () => {
    if (!action) return;
    const { type, user } = action;
    const name = user.full_name || user.email;
    const body = type === 'approve'
      ? ACCESS_ACTIONS.approve(approveForm.role, approveForm.agency_id)
      : ACCESS_ACTIONS[type]();

    setBusy(true);
    setActionError('');
    try {
      await setUserAccess(user.id, body);
      const message = {
        approve: `${name} was approved as ${ROLE_LABEL[approveForm.role]}.`,
        reject: `${name}’s registration was rejected.`,
        activate: `${name}’s account was activated.`,
        deactivate: `${name}’s account was deactivated.`,
      }[type];
      toast.success(message);
      setAction(null);
      setDetail(null);
      reload();
    } catch (err) {
      const message = isMissingEndpoint(err)
        ? 'The server does not recognise the user access endpoint. Restart the Express server and try again.'
        : err.message;
      setActionError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  // Pending rows: approve / reject inline. Activation lives in the details panel.
  const rowActions = (user) => (
    <div className="flex items-center justify-end gap-1">
      {approvalStatus(user) === 'pending' && (
        <>
          <button type="button" className="btn-success btn-sm" onClick={() => openAction('approve', user)} disabled={!connected}
            aria-label={`Approve ${user.full_name || user.email}`}>
            <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />Approve
          </button>
          <button type="button" className="btn-secondary btn-sm px-2 text-flag-red-ink hover:bg-flag-red-soft" onClick={() => openAction('reject', user)} disabled={!connected}
            aria-label={`Reject ${user.full_name || user.email}`} title="Reject registration">
            <Icon name="x" className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </>
      )}
      <button type="button" className="btn-ghost btn-sm px-2" onClick={() => setDetail(user)}
        aria-label={`View details of ${user.full_name || user.email}`} title="View details">
        <Icon name="eye" className="h-4 w-4" />
      </button>
    </div>
  );
  const detailIsSelf = detail?.id === profile?.id;
  const dash = loaded && connected ? undefined : '—';

  return (
    <div className="space-y-6">
      <PageHeader
        title="User management"
        description="Review new registrations, approve DPWH personnel and auditors, and manage account access."
        actions={(
          <>
            {summary.pending > 0 && filters.approval !== 'pending' && (
              <button type="button" className="btn-primary" onClick={() => setFilters({ ...EMPTY_FILTERS, approval: 'pending' })}>
                <Icon name="clock" className="h-4 w-4" />
                Review {summary.pending} pending
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={reload} disabled={loading}>
              <Icon name="refresh" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        )}
      />

      {loadError.message && (
        <Alert type="error">
          {loadError.missing
            ? 'The server does not recognise /api/users. Restart the Express server so it loads the user management routes.'
            : <>Could not load users: {loadError.message}</>}{' '}
          <button type="button" className="underline" onClick={reload}>Try again</button>
        </Alert>
      )}

      <StatStrip
        loading={loading && !loaded}
        items={[
          { label: 'Total users', value: summary.total, raw: dash },
          { label: 'Pending approval', value: summary.pending, tone: 'alert', raw: dash },
          { label: 'Approved', value: summary.approved, raw: dash },
          { label: 'Not approved', value: summary.rejected, raw: dash },
          { label: 'Active accounts', value: summary.active, raw: dash },
          { label: 'Inactive accounts', value: summary.inactive, raw: dash },
        ]}
      />

      <section className="panel overflow-hidden">
        <div className="grid gap-3 border-b border-line-soft p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end">
          <div>
            <label htmlFor="user-search" className="label">Search</label>
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input id="user-search" type="search" className="input pl-9" placeholder="Name or email"
                value={filters.search} onChange={setFilter('search')} />
            </div>
          </div>
          <div>
            <label htmlFor="user-role" className="label">Role</label>
            <select id="user-role" className="input" value={filters.role} onChange={setFilter('role')}>
              <option value="">All roles</option>
              {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="user-approval" className="label">Approval</label>
            <select id="user-approval" className="input" value={filters.approval} onChange={setFilter('approval')}>
              <option value="">All statuses</option>
              {Object.entries(APPROVAL_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="user-account" className="label">Account</label>
            <select id="user-account" className="input" value={filters.account} onChange={setFilter('account')}>
              <option value="">Active and inactive</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button type="button" className="btn-ghost justify-self-start" onClick={() => setFilters(EMPTY_FILTERS)} disabled={!hasFilters}>
            Clear
          </button>
        </div>

        <div className={`overflow-x-auto transition-opacity duration-150 ${loading && loaded ? 'opacity-60' : ''}`} aria-busy={loading}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Registered</th>
                <th>Approval and account</th>
                <th className="text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading && !loaded && <SkeletonRows rows={5} columns={6} />}
              {!loading && !connected && (
                <tr className="hover:bg-transparent">
                  <td colSpan={6}>
                    <EmptyState icon="alertOctagon" title="Users could not be loaded" compact
                      action={<button type="button" className="btn-secondary btn-sm" onClick={reload}><Icon name="refresh" className="h-4 w-4" />Try again</button>}
                    />
                  </td>
                </tr>
              )}
              {loaded && connected && users.length === 0 && !loading && (
                <tr className="hover:bg-transparent">
                  <td colSpan={6}>
                    <EmptyState icon="users" title={hasFilters ? 'No users match these filters' : 'No user accounts yet'} compact
                      action={hasFilters && <button type="button" className="btn-secondary btn-sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>}
                    />
                  </td>
                </tr>
              )}
              {loaded && connected && users.map((u) => (
                <tr key={u.id}>
                  <td className="min-w-[13rem]">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-100 font-display text-sm font-semibold text-navy-800">
                        {initials(u.full_name || u.email)}
                      </span>
                      <span className="min-w-0">
                        <button type="button" onClick={() => setDetail(u)} className="block max-w-full truncate text-left font-semibold text-ink hover:text-navy-700 hover:underline">
                          {u.full_name || '—'}
                        </button>
                        {u.office && <span className="block truncate text-xs text-ink-3">{u.office}</span>}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-ink-2">{u.email || '—'}</td>
                  <td><RoleCell user={u} /></td>
                  <td className="whitespace-nowrap">
                    <span className="block text-ink">{formatDate(u.created_at)}</span>
                    <span className="block text-xs text-ink-3">{relativeTime(u.created_at)}</span>
                  </td>
                  <td>
                    <span className="flex flex-col items-start gap-1.5">
                      <ApprovalBadge user={u} />
                      <ActiveBadge active={u.is_active} />
                    </span>
                  </td>
                  <td className="whitespace-nowrap">{rowActions(u)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {connected && loaded && (
          <Pagination page={page} pageCount={pageCount} total={count} pageSize={PAGE_SIZE} onChange={setPage} label="users" />
        )}
      </section>

      {/* User details */}
      <Modal
        open={Boolean(detail)}
        title="User details"
        description={detail?.email}
        onClose={() => setDetail(null)}
        footer={detail && (approvalStatus(detail) === 'pending' ? (
          <>
            <button type="button" className="btn-secondary text-flag-red-ink" onClick={() => openAction('reject', detail)} disabled={!connected}>
              Reject registration
            </button>
            <button type="button" className="btn-success" onClick={() => openAction('approve', detail)} disabled={!connected}>
              Approve account
            </button>
          </>
        ) : approvalStatus(detail) === 'rejected' ? (
          <button type="button" className="btn-success" onClick={() => openAction('approve', detail)} disabled={!connected}>
            <Icon name="userCheck" className="h-4 w-4" />Approve account
          </button>
        ) : detailIsSelf ? (
          <p className="mr-auto text-sm text-ink-3">This is your account. Administrators can’t deactivate themselves.</p>
        ) : detail.is_active ? (
          <button type="button" className="btn-secondary text-flag-red-ink" onClick={() => openAction('deactivate', detail)} disabled={!connected}>
            <Icon name="power" className="h-4 w-4" />Deactivate account
          </button>
        ) : (
          <button type="button" className="btn-success" onClick={() => openAction('activate', detail)} disabled={!connected}>
            <Icon name="userCheck" className="h-4 w-4" />Activate account
          </button>
        ))}
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-800 font-display text-xl font-semibold text-white">
                {initials(detail.full_name || detail.email)}
              </span>
              <div>
                <p className="font-display text-xl font-semibold text-ink">{detail.full_name || 'No name given'}</p>
                <div className="mt-1 flex flex-wrap gap-2"><ApprovalBadge user={detail} /><ActiveBadge active={detail.is_active} /></div>
              </div>
            </div>
            <DetailList items={[
              { label: 'Full name', value: detail.full_name },
              { label: 'Email', value: detail.email },
              { label: 'Current role', value: ROLE_LABEL[detail.role] || detail.role },
              { label: 'Requested role', value: detail.requested_role ? ROLE_LABEL[detail.requested_role] : null },
              { label: 'Office', value: detail.office },
              { label: 'Agency', value: agencyName(detail.agency_id) },
              { label: 'Registered', value: detail.created_at ? `${formatDate(detail.created_at)} (${relativeTime(detail.created_at)})` : null },
              { label: 'Last updated', value: formatDate(detail.updated_at) },
            ]}
            />
          </div>
        )}
      </Modal>

      {/* Approve */}
      <ConfirmDialog
        open={action?.type === 'approve'}
        title="Approve this account?"
        tone="success"
        confirmLabel="Approve account"
        busyLabel="Approving…"
        busy={busy}
        onConfirm={runAction}
        onCancel={closeAction}
      >
        {action?.user && (
          <>
            <p>
              <span className="font-semibold text-ink">{action.user.full_name || action.user.email}</span>{' '}
              {action.user.requested_role
                ? <>asked for {ROLE_LABEL[action.user.requested_role]} access. Confirm the role to grant.</>
                : <>was not approved earlier. Choose the role to grant now.</>}
            </p>
            <div>
              <label htmlFor="approve-role" className="label">Role</label>
              <select id="approve-role" className="input" value={approveForm.role} disabled={busy}
                onChange={(e) => setApproveForm((f) => ({ ...f, role: e.target.value }))}>
                {approveRoles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="approve-agency" className="label">Agency <span className="font-normal text-ink-3">(optional)</span></label>
              <select id="approve-agency" className="input" value={approveForm.agency_id} disabled={busy}
                onChange={(e) => setApproveForm((f) => ({ ...f, agency_id: e.target.value }))}>
                <option value="">Keep current</option>
                {agencies.map((a) => (
                  <option key={a.agency_id} value={a.agency_id}>{a.acronym ? `${a.acronym} – ${a.name}` : a.name}</option>
                ))}
              </select>
            </div>
            {actionError && <Alert type="error">{actionError}</Alert>}
          </>
        )}
      </ConfirmDialog>

      {/* Reject */}
      <ConfirmDialog
        open={action?.type === 'reject'}
        title="Reject this registration?"
        tone="danger"
        icon="userX"
        confirmLabel="Reject registration"
        busyLabel="Rejecting…"
        busy={busy}
        onConfirm={runAction}
        onCancel={closeAction}
      >
        {action?.user && (
          <>
            <p>
              <span className="font-semibold text-ink">{action.user.full_name || action.user.email}</span> will not get{' '}
              {ROLE_LABEL[action.user.requested_role] || 'the requested'} access. The request is cleared and the account
              can’t use the portal unless an administrator approves it later.
            </p>
            {actionError && <Alert type="error">{actionError}</Alert>}
          </>
        )}
      </ConfirmDialog>

      {/* Activate / deactivate */}
      <ConfirmDialog
        open={action?.type === 'activate' || action?.type === 'deactivate'}
        title={action?.type === 'deactivate' ? 'Deactivate this account?' : 'Activate this account?'}
        tone={action?.type === 'deactivate' ? 'danger' : 'success'}
        icon={action?.type === 'deactivate' ? 'power' : 'userCheck'}
        confirmLabel={action?.type === 'deactivate' ? 'Deactivate account' : 'Activate account'}
        busy={busy}
        onConfirm={runAction}
        onCancel={closeAction}
      >
        {action?.user && (
          <>
            <p>
              {action.type === 'deactivate'
                ? <><span className="font-semibold text-ink">{action.user.full_name || action.user.email}</span> will lose access to the portal until the account is activated again.</>
                : <><span className="font-semibold text-ink">{action.user.full_name || action.user.email}</span> will be able to sign in and use the portal with their current role.</>}
            </p>
            {actionError && <Alert type="error">{actionError}</Alert>}
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
