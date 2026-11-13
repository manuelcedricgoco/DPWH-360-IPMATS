import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Alert from '../../components/common/Alert.jsx';
import FlagBoard from '../../components/charts/FlagBoard.jsx';
import StatStrip from '../../components/charts/StatStrip.jsx';
import BarList from '../../components/charts/BarList.jsx';
import RecentProjects from '../../components/dashboard/RecentProjects.jsx';
import PendingRegistrations from '../../components/dashboard/PendingRegistrations.jsx';
import { compactPeso, computeProjectStats, useProjects } from '../../lib/projectStats.js';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { projects, count, partial, loading, error, reload } = useProjects();
  const stats = computeProjectStats(projects);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrator dashboard"
        description="Province-wide view of DPWH infrastructure projects in Occidental Mindoro, and the accounts that work on them."
        actions={(
          <>
            <Link to="/admin/users" className="btn-secondary"><Icon name="users" className="h-4 w-4" />Manage users</Link>
            <Link to="/dpwh/projects/new" className="btn-primary"><Icon name="plus" className="h-4 w-4" />Register project</Link>
          </>
        )}
      >
        {profile?.full_name && <p className="mt-1 text-sm text-ink-3">Signed in as {profile.full_name}</p>}
      </PageHeader>

      {error && (
        <Alert type="error">
          Could not load projects: {error}{' '}
          <button type="button" className="underline" onClick={reload}>Try again</button>
        </Alert>
      )}
      {partial && <Alert type="info">Figures are based on the latest {projects.length} of {count} projects.</Alert>}

      <div className="stagger space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <FlagBoard flags={stats.flags} total={stats.total} needsReview={stats.needsReview} loading={loading} />
          <PendingRegistrations />
        </div>

        <StatStrip
          loading={loading}
          items={[
            { label: 'Total projects', value: stats.total },
            { label: 'Ongoing', value: stats.ongoing },
            { label: 'Delayed', value: stats.delayed, tone: 'alert' },
            { label: 'Completed', value: stats.completed },
            { label: 'Total contract amount', value: stats.totalContract, format: compactPeso, hint: `Approved budget ${compactPeso(stats.totalApproved)}` },
            { label: 'Published to the public', value: stats.published },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="panel lg:col-span-2">
            <div className="panel-header">
              <h2 className="panel-title">Projects by municipality</h2>
              <span className="text-sm text-ink-3">Number of projects</span>
            </div>
            <div className="p-5">
              <BarList items={stats.byMunicipality} loading={loading} limit={11} emptyText="No projects registered yet." />
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Completion status</h2>
            </div>
            <div className="p-5">
              <BarList items={stats.completion} loading={loading} emptyText="No projects registered yet." />
              {!loading && stats.total > 0 && (
                <p className="mt-5 border-t border-line-soft pt-4 text-sm text-ink-2">
                  Average physical progress{' '}
                  <span className="tabular font-semibold text-ink">{stats.avgProgress.toFixed(1)}%</span>
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <RecentProjects
              projects={projects}
              loading={loading}
              linkTo={(p) => `/dpwh/projects/${p.project_id}/edit`}
              footnote="Based on project registration and update times. The full activity log is not connected yet."
            />
          </div>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Project value by type</h2>
                <p className="text-xs text-ink-3">Contract amount, or approved budget if not yet awarded</p>
              </div>
            </div>
            <div className="p-5">
              <BarList
                items={stats.byType}
                value={(item) => item.amount}
                format={compactPeso}
                unit=""
                loading={loading}
                emptyText="No contract amounts recorded yet."
              />
              {!loading && (
                <ul className="mt-5 space-y-1.5 border-t border-line-soft pt-4 text-sm">
                  {stats.byType.map((t) => (
                    <li key={t.key} className="flex justify-between text-ink-2">
                      <span>{t.label}</span>
                      <span className="tabular font-semibold text-ink">{t.count} project{t.count === 1 ? '' : 's'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
