import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import { Badge } from '../ui/Badges.jsx';
import { isMissingEndpoint, listUsers } from '../../lib/usersApi.js';
import { relativeTime } from '../../lib/projectStats.js';
import { ROLE_LABEL } from '../../lib/roles.js';

const SHOWN = 5;

/** Administrator dashboard: registrations waiting for approval (GET /api/users?status=pending). */
export default function PendingRegistrations() {
  const [state, setState] = useState({ loading: true, users: [], total: 0, error: '', missing: false });

  useEffect(() => {
    const controller = new AbortController();
    listUsers({ status: 'pending', limit: SHOWN }, { signal: controller.signal })
      .then(({ data, summary }) => setState({
        loading: false, users: data || [], total: summary?.pending ?? (data || []).length, error: '', missing: false,
      }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState({ loading: false, users: [], total: 0, error: err.message, missing: isMissingEndpoint(err) });
      });
    return () => controller.abort();
  }, []);

  const { loading, users, total, error, missing } = state;

  return (
    <section className="panel flex flex-col">
      <div className="panel-header">
        <h2 className="panel-title flex items-center gap-2">
          Pending registrations
          {!loading && !error && (
            <span className={`tabular rounded-full px-2 py-0.5 font-sans text-xs font-bold ${total ? 'bg-signal-600 text-white' : 'bg-line-soft text-ink-2'}`}>
              {total}
            </span>
          )}
        </h2>
        <Link to="/admin/users" className="text-sm font-semibold text-navy-700 hover:underline">User management</Link>
      </div>

      <div className="flex-1">
        {loading && (
          <div className="space-y-3 p-5">
            <Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" />
          </div>
        )}

        {!loading && error && (
          <p className="flex gap-2 p-5 text-sm text-flag-red-ink">
            <Icon name="alertOctagon" className="mt-0.5 h-4 w-4" />
            {missing ? 'The server does not recognise /api/users. Restart the Express server.' : error}
          </p>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="flex gap-3 p-5 text-sm text-ink-2">
            <Icon name="checkCircle" className="h-5 w-5 text-flag-green" />
            No registrations are waiting for approval.
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <ul className="divide-y divide-line-soft">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{u.full_name || u.email}</p>
                  <p className="truncate text-xs text-ink-3">{u.email}, registered {relativeTime(u.created_at)}</p>
                </div>
                <Badge tone="yellow">{ROLE_LABEL[u.requested_role] || u.requested_role}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {total > 0 && (
        <div className="border-t border-line-soft px-5 py-3">
          <Link to="/admin/users?status=pending" className="btn-primary btn-sm w-full">
            Review {total} registration{total === 1 ? '' : 's'}
          </Link>
        </div>
      )}
    </section>
  );
}
