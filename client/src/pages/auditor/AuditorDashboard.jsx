import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Alert from '../../components/common/Alert.jsx';
import FlagBoard from '../../components/charts/FlagBoard.jsx';
import StatStrip from '../../components/charts/StatStrip.jsx';
import BarList from '../../components/charts/BarList.jsx';
import { QueueTable } from './AuditQueuePage.jsx';
import { computeProjectStats, flaggedQueue, useProjects } from '../../lib/projectStats.js';

export default function AuditorDashboard() {
  const { projects, count, partial, loading, error, reload } = useProjects();
  const stats = computeProjectStats(projects);
  const queue = flaggedQueue(projects);
  const auditCount = (key) => stats.audit.find((a) => a.key === key)?.count || 0;

  const flaggedByMunicipality = Object.values(queue.reduce((acc, p) => {
    const key = p.municipality || 'Unspecified';
    acc[key] = acc[key] || { label: key, count: 0 };
    acc[key].count += 1;
    return acc;
  }, {})).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditor dashboard"
        description="Flagged projects to review, and where audits stand across the province."
        actions={<Link to="/auditor/queue" className="btn-primary"><Icon name="clipboardList" className="h-4 w-4" />Open audit queue</Link>}
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
            { label: 'Awaiting review', value: stats.needsReview, tone: 'alert' },
            { label: 'Red flags', value: stats.flags.red },
            { label: 'Yellow flags', value: stats.flags.yellow },
            { label: 'Audits under review', value: auditCount('under_review') },
            { label: 'Cleared', value: auditCount('cleared') },
          ]}
        />

        <FlagBoard flags={stats.flags} total={stats.total} needsReview={stats.needsReview} loading={loading} />

        <section className="panel overflow-hidden">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Next in the queue</h2>
              <p className="text-xs text-ink-3">Awaiting review first, then red flags</p>
            </div>
            <Link to="/auditor/queue" className="text-sm font-semibold text-navy-700 hover:underline">
              View all {queue.length ? queue.length : ''}
            </Link>
          </div>
          <QueueTable rows={queue.slice(0, 5)} loading={loading} emptyText="No project currently has a yellow or red flag." />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel">
            <div className="panel-header"><h2 className="panel-title">Audit status</h2></div>
            <div className="p-5">
              <BarList items={stats.audit} loading={loading} emptyText="No projects registered yet." />
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Flagged projects by municipality</h2>
            </div>
            <div className="p-5">
              <BarList items={flaggedByMunicipality} loading={loading} limit={11} emptyText="No flagged projects." />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
