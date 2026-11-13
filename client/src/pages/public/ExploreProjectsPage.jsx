import { useMemo, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Alert from '../../components/common/Alert.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Pagination, { usePagination } from '../../components/ui/Pagination.jsx';
import { FlagBadge, ProgressBar } from '../../components/ui/Badges.jsx';
import { useProjects } from '../../lib/projectStats.js';
import { formatDate, formatPeso, labelOf, PROJECT_TYPES } from '../../lib/format.js';

const EMPTY = { search: '', type: '', municipality: '' };
const TYPE_ICON = { road: 'map', bridge: 'building', flood_control: 'activity' };

function ProjectCard({ p }) {
  return (
    <article className="panel flex flex-col p-5 transition-[border-color,box-shadow] duration-150 hover:border-navy-200 hover:shadow-[0_8px_24px_-12px_rgb(11_20_56/0.25)]">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700">
          <Icon name={TYPE_ICON[p.project_type] || 'folder'} className="h-4 w-4" />
          {labelOf(PROJECT_TYPES, p.project_type)}
        </span>
        <FlagBadge project={p} />
      </div>
      <h2 className="mt-3 font-display text-lg leading-snug font-semibold text-ink">{p.name}</h2>
      <p className="tabular mt-0.5 text-xs text-ink-3">{p.project_code}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="col-span-2 flex items-start gap-1.5 text-ink-2">
          <dt><Icon name="mapPin" className="mt-0.5 h-4 w-4 text-ink-3" /><span className="sr-only">Location</span></dt>
          <dd>{p.barangay ? `${p.barangay}, ` : ''}{p.municipality}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">{p.contract_amount != null ? 'Contract amount' : 'Approved budget'}</dt>
          <dd className="tabular font-semibold text-ink">{formatPeso(p.contract_amount ?? p.approved_budget)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">Target completion</dt>
          <dd className="font-semibold text-ink">{formatDate(p.target_completion_date)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-ink-3">Contractor</dt>
          <dd className="text-ink">{p.contractor_name || 'Not yet awarded'}</dd>
        </div>
      </dl>

      <div className="mt-auto pt-5">
        <ProgressBar value={p.overall_progress} />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-3">
          <Icon name="rotate360" className="h-4 w-4" />
          {p.latest_image_path ? `360° image from ${formatDate(p.latest_image_date)}` : 'No 360° image available yet'}
        </p>
      </div>
    </article>
  );
}

export default function ExploreProjectsPage() {
  const { projects, loading, error, reload } = useProjects();
  const [filters, setFilters] = useState(EMPTY);
  const municipalities = useMemo(() => [...new Set(projects.map((p) => p.municipality).filter(Boolean))].sort(), [projects]);

  const rows = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return projects
      .filter((p) => !term || `${p.name} ${p.project_code} ${p.contractor_name || ''}`.toLowerCase().includes(term))
      .filter((p) => !filters.type || p.project_type === filters.type)
      .filter((p) => !filters.municipality || p.municipality === filters.municipality);
  }, [projects, filters]);

  const paging = usePagination(rows, 12, [filters.search, filters.type, filters.municipality]);
  const set = (name) => (e) => setFilters((f) => ({ ...f, [name]: e.target.value }));
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader title="Explore projects" description="Every DPWH project in Occidental Mindoro that has been published for public viewing." />

      {error && (
        <Alert type="error">
          Could not load projects: {error}{' '}
          <button type="button" className="underline" onClick={reload}>Try again</button>
        </Alert>
      )}

      <div className="panel grid gap-3 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label htmlFor="x-search" className="label">Search</label>
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input id="x-search" type="search" className="input pl-9" placeholder="Project, code or contractor" value={filters.search} onChange={set('search')} />
          </div>
        </div>
        <div>
          <label htmlFor="x-type" className="label">Type</label>
          <select id="x-type" className="input" value={filters.type} onChange={set('type')}>
            <option value="">All types</option>
            {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="x-muni" className="label">Municipality</label>
          <select id="x-muni" className="input" value={filters.municipality} onChange={set('municipality')}>
            <option value="">All municipalities</option>
            {municipalities.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <button type="button" className="btn-ghost justify-self-start" onClick={() => setFilters(EMPTY)} disabled={!hasFilters}>Clear</button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="panel space-y-3 p-5"><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-4/5" /><Skeleton className="h-20" /><Skeleton className="h-3" /></div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="panel">
          <EmptyState icon="compass" title={hasFilters ? 'No projects match these filters' : 'No projects have been published yet'}
            action={hasFilters && <button type="button" className="btn-secondary btn-sm" onClick={() => setFilters(EMPTY)}>Clear filters</button>}
          >
            {!hasFilters && 'Projects appear here after DPWH and the auditors publish them.'}
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paging.pageItems.map((p) => <ProjectCard key={p.project_id} p={p} />)}
          </div>
          <div className="panel"><Pagination {...paging} onChange={paging.setPage} label="projects" /></div>
        </>
      )}
    </div>
  );
}
