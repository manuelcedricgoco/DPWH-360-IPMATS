import { useMemo, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Alert from '../../components/common/Alert.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Pagination, { usePagination } from '../../components/ui/Pagination.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { Badge, FlagBadge, ProgressBar } from '../../components/ui/Badges.jsx';
import FlagReasons from '../../components/projects/FlagReasons.jsx';
import {
  AUDIT_STATUS_LABEL, flaggedQueue, projectFlag, relativeTime, useProjects,
} from '../../lib/projectStats.js';

const EMPTY = { search: '', flag: '', review: '', municipality: '' };

/** Table of yellow/red projects, awaiting review first (same order as v_flagged_projects). */
export function QueueTable({ rows, loading, emptyTitle = 'The queue is empty', emptyText }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Flag</th>
            <th className="min-w-[16rem]">Flag reasons</th>
            <th>Progress</th>
            <th>Audit status</th>
            <th>Last evaluated</th>
          </tr>
        </thead>
        <tbody>
          {loading && <SkeletonRows rows={5} columns={6} />}
          {!loading && rows.length === 0 && (
            <tr className="hover:bg-transparent">
              <td colSpan={6}><EmptyState icon="checkCircle" title={emptyTitle} compact>{emptyText}</EmptyState></td>
            </tr>
          )}
          {!loading && rows.map((p) => (
            <tr key={p.project_id}>
              <td className="min-w-[15rem]">
                <span className="block font-semibold text-ink">{p.name}</span>
                <span className="tabular block text-xs text-ink-3">{p.project_code}, {p.municipality}</span>
                {p.needs_review && (
                  <span className="mt-1.5 inline-flex"><Badge tone="orange" icon="flag">Awaiting review</Badge></span>
                )}
              </td>
              <td><FlagBadge project={p} /></td>
              <td><FlagReasons project={p} /></td>
              <td><ProgressBar value={p.overall_progress} planned={p.planned_progress} /></td>
              <td className="whitespace-nowrap text-ink-2">{AUDIT_STATUS_LABEL[p.audit_status] || p.audit_status || '—'}</td>
              <td className="whitespace-nowrap text-ink-2">{relativeTime(p.last_evaluated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditQueuePage() {
  const { projects, loading, error, reload } = useProjects();
  const [filters, setFilters] = useState(EMPTY);
  const queue = useMemo(() => flaggedQueue(projects), [projects]);
  const municipalities = useMemo(() => [...new Set(queue.map((p) => p.municipality).filter(Boolean))].sort(), [queue]);

  const rows = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return queue
      .filter((p) => !term || `${p.name} ${p.project_code}`.toLowerCase().includes(term))
      .filter((p) => !filters.flag || projectFlag(p) === filters.flag)
      .filter((p) => !filters.review || (filters.review === 'awaiting' ? p.needs_review : !p.needs_review))
      .filter((p) => !filters.municipality || p.municipality === filters.municipality);
  }, [queue, filters]);

  const paging = usePagination(rows, 12, [filters.search, filters.flag, filters.review, filters.municipality]);
  const set = (name) => (e) => setFilters((f) => ({ ...f, [name]: e.target.value }));
  const hasFilters = Object.values(filters).some(Boolean);
  const awaiting = queue.filter((p) => p.needs_review).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit queue"
        description="Projects the flag engine marked yellow or red. Those awaiting an auditor review are listed first, then red flags."
        actions={(
          <button type="button" className="btn-secondary" onClick={reload} disabled={loading}>
            <Icon name="refresh" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        )}
      />

      {error && <Alert type="error">Could not load projects: {error}</Alert>}
      <Alert type="info">
        Confirming or overriding a flag will be done in Flag decisions, which is not connected yet. This queue is read-only.
      </Alert>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-4 pt-4">
          <p className="pb-1 text-sm text-ink-2">
            {loading ? 'Loading…' : <><span className="tabular font-semibold text-ink">{queue.length}</span> flagged, <span className="tabular font-semibold text-ink">{awaiting}</span> awaiting review</>}
          </p>
        </div>
        <div className="grid gap-3 border-b border-line-soft p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end">
          <div>
            <label htmlFor="q-search" className="label">Search</label>
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input id="q-search" type="search" className="input pl-9" placeholder="Project name or code" value={filters.search} onChange={set('search')} />
            </div>
          </div>
          <div>
            <label htmlFor="q-flag" className="label">Flag</label>
            <select id="q-flag" className="input" value={filters.flag} onChange={set('flag')}>
              <option value="">Yellow and red</option>
              <option value="red">For investigation (red)</option>
              <option value="yellow">Needs attention (yellow)</option>
            </select>
          </div>
          <div>
            <label htmlFor="q-review" className="label">Review</label>
            <select id="q-review" className="input" value={filters.review} onChange={set('review')}>
              <option value="">All</option>
              <option value="awaiting">Awaiting review</option>
              <option value="reviewed">Already reviewed</option>
            </select>
          </div>
          <div>
            <label htmlFor="q-muni" className="label">Municipality</label>
            <select id="q-muni" className="input" value={filters.municipality} onChange={set('municipality')}>
              <option value="">All municipalities</option>
              {municipalities.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button type="button" className="btn-ghost justify-self-start" onClick={() => setFilters(EMPTY)} disabled={!hasFilters}>Clear</button>
        </div>

        <QueueTable
          rows={paging.pageItems}
          loading={loading}
          emptyTitle={hasFilters ? 'No flagged projects match these filters' : 'The queue is empty'}
          emptyText={hasFilters ? undefined : 'No project currently has a yellow or red flag.'}
        />
        {!loading && <Pagination {...paging} onChange={paging.setPage} label="projects" />}
      </section>
    </div>
  );
}
