import PageHeader from '../../components/ui/PageHeader.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { FLAG_META } from '../../lib/projectStats.js';
import { AGENCY, OFFICIAL_TITLE, PROVINCE } from '../../lib/brand.js';

const FEATURES = [
  { icon: 'rotate360', title: '360° site images', body: 'Panoramic photos taken on site show what has actually been built at each inspection.' },
  { icon: 'trendingUp', title: 'Phase-by-phase progress', body: 'Each project is split into weighted phases, and progress is reported phase by phase.' },
  { icon: 'wallet', title: 'Financial tracking', body: 'Budgets, contract amounts, variation orders and disbursements are recorded per project.' },
  { icon: 'map', title: 'GIS mapping', body: 'Every project is placed on the map of Occidental Mindoro with its exact coordinates.' },
];

const FLAG_TEXT = {
  green: 'The project is on schedule, documented and within its finances, or it is completed.',
  yellow: 'Something needs attention, for example a schedule slip, a missing or old 360° image, or a gap between payments and progress.',
  red: 'A serious issue was detected, for example a large delay, a reused image or payments above the contract amount. An auditor reviews it.',
};

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="About the portal"
        description={`The official project monitoring and transparency portal of the ${AGENCY} in ${PROVINCE}.`}
      />

      <section className="panel flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-line bg-white p-1">
          <img src="/images/dpwh-logo.jpg" alt={`${AGENCY} logo`} className="h-full w-full rounded-full object-contain" />
        </span>
        <div>
          <p className="font-display text-xl leading-snug font-semibold text-ink sm:text-[1.4rem]">{OFFICIAL_TITLE}</p>
          <p className="mt-1 text-sm text-ink-3">{AGENCY}, {PROVINCE}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="panel p-6">
          <h2 className="panel-title">What you can follow here</h2>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-ink">{f.title}</p>
                  <p className="mt-0.5 text-sm text-ink-2">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel p-6">
          <h2 className="panel-title">When a project counts as completed</h2>
          <p className="mt-2 text-sm text-ink-2">All three must be true:</p>
          <ul className="mt-3 space-y-2.5 text-sm text-ink">
            {['Every phase is at 100%', 'An actual completion date is recorded', 'A final 360° image has been uploaded'].map((item) => (
              <li key={item} className="flex gap-2.5"><Icon name="checkCircle" className="mt-0.5 h-4 w-4 text-flag-green" />{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel overflow-hidden">
        <div className="panel-header"><h2 className="panel-title">What the project flags mean</h2></div>
        <ul className="divide-y divide-line-soft">
          {['green', 'yellow', 'red'].map((key) => (
            <li key={key} className="flex gap-4 px-5 py-4">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${FLAG_META[key].bar}`}>
                <Icon name={FLAG_META[key].icon} className="h-4 w-4" strokeWidth={2.4} />
              </span>
              <div>
                <p className="font-semibold text-ink">{FLAG_META[key].long}</p>
                <p className="mt-0.5 text-sm text-ink-2">{FLAG_TEXT[key]}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="flex gap-2 border-t border-line-soft bg-canvas/70 px-5 py-3 text-sm text-ink-2">
          <Icon name="info" className="mt-0.5 h-4 w-4 text-ink-3" />
          Flags are calculated automatically from the data submitted to the system. They are a monitoring aid and do not replace
          engineering inspection or a formal audit.
        </p>
      </section>
    </div>
  );
}
