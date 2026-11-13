import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import { FlagBadge } from '../ui/Badges.jsx';
import { recentlyUpdated, relativeTime } from '../../lib/projectStats.js';
import { labelOf, PROJECT_TYPES } from '../../lib/format.js';

const TYPE_ICON = { road: 'map', bridge: 'building', flood_control: 'activity' };

/** Most recently registered or changed projects, from project timestamps. */
export default function RecentProjects({ projects, loading, limit = 6, linkTo, title = 'Recent project activity', footnote }) {
  const rows = recentlyUpdated(projects, limit);

  return (
    <section className="panel flex flex-col">
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
      </div>
      <ul className="flex-1 divide-y divide-line-soft">
        {loading && Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-5 py-3.5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
          </li>
        ))}
        {!loading && rows.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-ink-3">No project activity yet.</li>
        )}
        {!loading && rows.map((p) => {
          const isNew = p.created_at && p.updated_at && Math.abs(new Date(p.updated_at) - new Date(p.created_at)) < 60000;
          const body = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700">
                <Icon name={TYPE_ICON[p.project_type] || 'folder'} className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                <span className="block truncate text-xs text-ink-3">
                  {isNew ? 'Registered' : 'Updated'} {relativeTime(p.updated_at || p.created_at)}, {labelOf(PROJECT_TYPES, p.project_type)} in {p.municipality}
                </span>
              </span>
              <FlagBadge project={p} />
            </>
          );
          return (
            <li key={p.project_id}>
              {linkTo ? (
                <Link to={linkTo(p)} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-navy-50/60">{body}</Link>
              ) : (
                <div className="flex items-center gap-3 px-5 py-3">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {footnote && <p className="border-t border-line-soft px-5 py-2.5 text-xs text-ink-3">{footnote}</p>}
    </section>
  );
}
