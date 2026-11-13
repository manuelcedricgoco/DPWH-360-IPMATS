import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Alert from '../../components/common/Alert.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { FlagBadge } from '../../components/ui/Badges.jsx';
import FlagBoard from '../../components/charts/FlagBoard.jsx';
import StatStrip from '../../components/charts/StatStrip.jsx';
import BarList from '../../components/charts/BarList.jsx';
import RecentProjects from '../../components/dashboard/RecentProjects.jsx';
import FlagReasons from '../../components/projects/FlagReasons.jsx';
import { computeProjectStats, flaggedQueue, useProjects } from '../../lib/projectStats.js';

export default function DpwhDashboard() {
  const { projects, count, partial, loading, error, reload } = useProjects();
  const stats = computeProjectStats(projects);
  const attention = flaggedQueue(projects).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Projects you register and report on in Occidental Mindoro, and what needs your input next."
        actions={(
          <>
            <Link to="/dpwh/projects" className="btn-secondary"><Icon name="folder" className="h-4 w-4" />Projects</Link>
            <Link to="/dpwh/projects/new" className="btn-primary"><Icon name="plus" className="h-4 w-4" />Register project</Link>
          </>
        )}
      />

      {error && (
        <Alert type="error">
          Could not load projects: {error}{' '}
          <button type="button" className="underline" onClick={reload}>Try again</button>
        </Alert>
      )}
      {partial && <Alert type="info">Figures are based on the latest {projects.length} of {count} projects.</Alert>}

      <div className="stagger space-y-6">
        <StatStrip
          loading={loading}
          items={[
            { label: 'Projects', value: stats.total },
            { label: 'Ongoing', value: stats.ongoing },
            { label: 'Delayed', value: stats.delayed, tone: 'alert' },
            { label: 'Started, no 360° image', value: stats.withoutImage, tone: 'alert' },
            { label: 'Average progress', value: stats.avgProgress, format: (n) => `${n.toFixed(1)}%` },
            { label: 'Suspended', value: stats.suspended },
          ]}
        />

        <FlagBoard flags={stats.flags} total={stats.total} needsReview={stats.needsReview} loading={loading} />

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="panel lg:col-span-2">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Projects that need attention</h2>
                <p className="text-xs text-ink-3">Yellow and red flags, with the reasons the flag engine recorded</p>
              </div>
              <Link to="/dpwh/projects" className="text-sm font-semibold text-navy-700 hover:underline">All projects</Link>
            </div>
            <ul className="divide-y divide-line-soft">
              {loading && Array.from({ length: 3 }, (_, i) => (
                <li key={i} className="space-y-2 px-5 py-4"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /></li>
              ))}
              {!loading && attention.length === 0 && (
                <li className="flex items-center gap-3 px-5 py-8 text-sm text-ink-2">
                  <Icon name="checkCircle" className="h-5 w-5 text-flag-green" />
                  No yellow or red flags right now.
                </li>
              )}
              {!loading && attention.map((p) => (
                <li key={p.project_id}>
                  <Link to={`/dpwh/projects/${p.project_id}/edit`} className="grid gap-2 px-5 py-3.5 transition-colors hover:bg-navy-50/60 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                      <p className="tabular text-xs text-ink-3">{p.project_code}, {p.municipality}</p>
                      <div className="mt-2"><FlagReasons project={p} /></div>
                    </div>
                    <div className="sm:text-right"><FlagBadge project={p} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <div className="panel-header"><h2 className="panel-title">Completion status</h2></div>
            <div className="p-5">
              <BarList items={stats.completion} loading={loading} emptyText="No projects registered yet." />
            </div>
          </section>
        </div>

        <RecentProjects
          projects={projects}
          loading={loading}
          linkTo={(p) => `/dpwh/projects/${p.project_id}/edit`}
          title="Recently registered and updated"
        />
      </div>
    </div>
  );
}
