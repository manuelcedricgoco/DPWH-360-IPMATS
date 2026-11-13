import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import {
  formatDate, formatPeso, labelOf, PROJECT_STATUSES, PROJECT_TYPES,
} from '../../lib/format.js';
import Alert from '../../components/common/Alert.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Icon from '../../components/ui/Icon.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Pagination, { usePagination } from '../../components/ui/Pagination.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { FlagBadge, ProgressBar, StatusBadge } from '../../components/ui/Badges.jsx';

const EMPTY_FILTERS = { municipality_id: '', project_type: '', status: '', search: '' };

export default function ProjectListPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState(''); // debounced copy of filters.search
  const [municipalities, setMunicipalities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Municipality options for the filter.
  useEffect(() => {
    api('/lookups/municipalities')
      .then(({ data }) => setMunicipalities(data))
      .catch(() => setMunicipalities([]));
  }, []);

  // Wait 300 ms after typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(filters.search.trim()), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api('/projects', {
      query: {
        municipality_id: filters.municipality_id,
        project_type: filters.project_type,
        status: filters.status,
        search,
        limit: 200,
      },
      signal: controller.signal,
    })
      .then(({ data, count: total }) => {
        setProjects(data);
        setCount(total ?? data.length);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters.municipality_id, filters.project_type, filters.status, search]);

  const setFilter = (name) => (event) => setFilters((f) => ({ ...f, [name]: event.target.value }));
  const hasFilters = Object.values(filters).some(Boolean);
  const paging = usePagination(projects, 15, [filters.municipality_id, filters.project_type, filters.status, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Infrastructure projects in Occidental Mindoro"
        actions={(
          <Link to="/dpwh/projects/new" className="btn-primary">
            <Icon name="plus" className="h-4 w-4" />
            Register project
          </Link>
        )}
      />

      <section className="panel overflow-hidden">
        {/* Filters */}
        <div className="grid gap-3 border-b border-line-soft p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end">
          <div>
            <label htmlFor="search" className="label">Search</label>
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                id="search"
                type="search"
                className="input pl-9"
                placeholder="Project name or code"
                value={filters.search}
                onChange={setFilter('search')}
              />
            </div>
          </div>
          <div>
            <label htmlFor="municipality" className="label">Municipality</label>
            <select id="municipality" className="input" value={filters.municipality_id} onChange={setFilter('municipality_id')}>
              <option value="">All municipalities</option>
              {municipalities.map((m) => <option key={m.municipality_id} value={m.municipality_id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="type" className="label">Type</label>
            <select id="type" className="input" value={filters.project_type} onChange={setFilter('project_type')}>
              <option value="">All types</option>
              {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="label">Status</label>
            <select id="status" className="input" value={filters.status} onChange={setFilter('status')}>
              <option value="">All statuses</option>
              {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <button type="button" className="btn-ghost justify-self-start" onClick={() => setFilters(EMPTY_FILTERS)} disabled={!hasFilters}>
            Clear filters
          </button>
        </div>

        {error && <div className="border-b border-line-soft p-4"><Alert type="error">{error}</Alert></div>}

        <div className="flex items-center justify-between px-4 py-2.5 text-sm text-ink-3">
          <span className="tabular">
            {loading ? 'Loading…' : `${count} project${count === 1 ? '' : 's'}${count > projects.length ? `, showing the latest ${projects.length}` : ''}`}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border-t border-line-soft">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Agency and contractor</th>
                <th className="text-right">Budget</th>
                <th>Schedule</th>
                <th>Progress</th>
                <th>Flag and status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonRows rows={6} columns={7} />}
              {!loading && !error && projects.length === 0 && (
                <tr className="hover:bg-transparent">
                  <td colSpan={7}>
                    <EmptyState
                      icon="folder"
                      title={hasFilters ? 'No projects match these filters' : 'No projects yet'}
                      compact
                      action={hasFilters
                        ? <button type="button" className="btn-secondary btn-sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>
                        : <Link to="/dpwh/projects/new" className="btn-primary btn-sm"><Icon name="plus" className="h-4 w-4" />Register the first project</Link>}
                    />
                  </td>
                </tr>
              )}
              {!loading && paging.pageItems.map((p) => (
                <tr key={p.project_id}>
                  <td className="min-w-[15rem]">
                    <span className="block font-semibold text-ink">{p.name}</span>
                    <span className="tabular block text-xs text-ink-3">{p.project_code}, {labelOf(PROJECT_TYPES, p.project_type)}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-ink-2">
                      <Icon name="mapPin" className="h-3.5 w-3.5 text-ink-3" />
                      {p.barangay ? `${p.barangay}, ` : ''}{p.municipality}
                    </span>
                  </td>
                  <td className="min-w-[10rem]">
                    <span className="block">{p.agency_acronym || p.agency_name}</span>
                    <span className="block text-xs text-ink-3">{p.contractor_name || 'No contractor yet'}</span>
                  </td>
                  <td className="tabular whitespace-nowrap text-right">
                    <span className="block font-semibold text-ink">{formatPeso(p.approved_budget)}</span>
                    <span className="block text-xs text-ink-3">Contract {formatPeso(p.contract_amount)}</span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="block">{formatDate(p.notice_to_proceed)}</span>
                    <span className="tabular block text-xs text-ink-3">to {formatDate(p.target_completion_date)}, {p.duration_days} days</span>
                  </td>
                  <td><ProgressBar value={p.overall_progress} planned={p.planned_progress} /></td>
                  <td>
                    <span className="flex flex-col items-start gap-1.5">
                      <FlagBadge project={p} />
                      <StatusBadge status={p.status} />
                    </span>
                  </td>
                  <td className="text-right">
                    <Link to={`/dpwh/projects/${p.project_id}/edit`} className="btn-ghost btn-sm" aria-label={`Edit ${p.name}`}>
                      <Icon name="pencil" className="h-4 w-4" />Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && <Pagination {...paging} onChange={paging.setPage} label="projects" />}
      </section>
    </div>
  );
}
