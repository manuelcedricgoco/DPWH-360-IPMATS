import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon.jsx';
import Alert from '../../components/common/Alert.jsx';
import FlagBoard from '../../components/charts/FlagBoard.jsx';
import StatStrip from '../../components/charts/StatStrip.jsx';
import BarList from '../../components/charts/BarList.jsx';
import RecentProjects from '../../components/dashboard/RecentProjects.jsx';
import { compactPeso, computeProjectStats, useProjects } from '../../lib/projectStats.js';
import { OFFICIAL_TITLE } from '../../lib/brand.js';

export default function PublicOverview() {
  // RLS returns only published projects to public viewers.
  const { projects, loading, error, reload } = useProjects();
  const stats = computeProjectStats(projects);

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-2xl bg-navy-950 text-white">
        <img src="/images/dpwh-background.webp" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(11_20_56/0.97)_0%,rgb(11_20_56/0.88)_55%,rgb(26_40_120/0.55)_100%)]" aria-hidden="true" />
        <div className="max-w-2xl px-6 py-10 sm:px-10 sm:py-12">
          <p className="mb-5 max-w-[60ch] text-sm leading-snug font-medium text-navy-200">{OFFICIAL_TITLE}</p>
          <h1 className="font-display text-[2.4rem] leading-[1.02] font-semibold sm:text-[3.2rem]">
            Public works in Occidental Mindoro
          </h1>
          <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-navy-100">
            See the DPWH road, bridge and flood control projects published for transparency: where they are,
            who builds them, how much they cost and how far along they are.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/public/projects" className="btn-primary bg-white text-navy-900 hover:bg-navy-50">
              <Icon name="compass" className="h-4 w-4" />Explore projects
            </Link>
            <Link to="/public/about" className="btn-secondary border-white/25 bg-white/5 text-white hover:border-white/40 hover:bg-white/10">
              About the portal
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <Alert type="error">
          Could not load projects: {error}{' '}
          <button type="button" className="underline" onClick={reload}>Try again</button>
        </Alert>
      )}

      <div className="stagger space-y-6">
        <StatStrip
          loading={loading}
          items={[
            { label: 'Published projects', value: stats.total },
            { label: 'Total contract amount', value: stats.totalContract, format: compactPeso },
            { label: 'Average progress', value: stats.avgProgress, format: (n) => `${n.toFixed(1)}%` },
            { label: 'Completed', value: stats.completed },
          ]}
        />

        <FlagBoard
          title="Project flags"
          flags={stats.flags}
          total={stats.total}
          loading={loading}
          note="Flags are computed automatically from the data DPWH submits. They help the public follow projects but are not an engineering inspection or a formal audit finding."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel">
            <div className="panel-header"><h2 className="panel-title">Published projects by municipality</h2></div>
            <div className="p-5"><BarList items={stats.byMunicipality} loading={loading} limit={11} emptyText="No projects have been published yet." /></div>
          </section>
          <RecentProjects projects={projects} loading={loading} limit={5} title="Recently updated" />
        </div>
      </div>
    </div>
  );
}
