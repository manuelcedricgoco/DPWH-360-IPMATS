import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../lib/api.js';
import {
  formatDate, formatPeso, labelOf, PROJECT_STATUSES, PROJECT_TYPES,
} from '../../lib/format.js';
import Alert from '../../components/common/Alert.jsx';

const STATUS_BADGE = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-slate-200 text-slate-700',
};

const EMPTY_FILTERS = { municipality_id: '', project_type: '', status: '', search: '' };

export default function ProjectListPage() {
  const location = useLocation();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState(''); // debounced copy of filters.search
  const [municipalities, setMunicipalities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const flash = location.state?.flash;

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-600">Infrastructure projects in Occidental Mindoro</p>
        </div>
        <Link to="/dpwh/projects/new" className="btn-primary">+ Register project</Link>
      </div>

      {flash && <Alert type="success">{flash}</Alert>}

      {/* Filters */}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label htmlFor="search" className="label">Search</label>
          <input
            id="search"
            type="search"
            className="input"
            placeholder="Project name or code"
            value={filters.search}
            onChange={setFilter('search')}
          />
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
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{loading ? 'Loading…' : `${count} project${count === 1 ? '' : 's'}`}</span>
        {hasFilters && (
          <button type="button" className="text-dpwh-blue-light hover:underline" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-3">Code</th>
              <th className="px-3 py-3">Project name</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Municipality</th>
              <th className="px-3 py-3">Agency</th>
              <th className="px-3 py-3">Contractor</th>
              <th className="px-3 py-3 text-right">Approved budget</th>
              <th className="px-3 py-3 text-right">Contract amount</th>
              <th className="px-3 py-3 text-right">Duration</th>
              <th className="px-3 py-3">NTP</th>
              <th className="px-3 py-3">Target completion</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!loading && !error && projects.length === 0 && (
              <tr>
                <td colSpan={13} className="px-3 py-10 text-center text-slate-500">
                  {hasFilters ? 'No projects match these filters.' : 'No projects yet. Register the first one.'}
                </td>
              </tr>
            )}
            {projects.map((p) => (
              <tr key={p.project_id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{p.project_code}</td>
                <td className="min-w-[14rem] px-3 py-2 font-medium text-slate-900">{p.name}</td>
                <td className="whitespace-nowrap px-3 py-2">{labelOf(PROJECT_TYPES, p.project_type)}</td>
                <td className="whitespace-nowrap px-3 py-2">{p.municipality}{p.barangay ? `, ${p.barangay}` : ''}</td>
                <td className="px-3 py-2">{p.agency_acronym || p.agency_name}</td>
                <td className="px-3 py-2">{p.contractor_name || <span className="text-slate-400">—</span>}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatPeso(p.approved_budget)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatPeso(p.contract_amount)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{p.duration_days} days</td>
                <td className="whitespace-nowrap px-3 py-2">{formatDate(p.notice_to_proceed)}</td>
                <td className="whitespace-nowrap px-3 py-2">{formatDate(p.target_completion_date)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status] || ''}`}>
                    {labelOf(PROJECT_STATUSES, p.status)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link to={`/dpwh/projects/${p.project_id}/edit`} className="text-dpwh-blue-light hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
