import Icon from '../ui/Icon.jsx';
import CountUp from '../ui/CountUp.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import { FLAG_META } from '../../lib/projectStats.js';

const ORDER = ['green', 'yellow', 'red'];

/**
 * The portal's signature panel: how many projects the database flag engine marks
 * green / yellow / red, as one segmented bar with large counts.
 */
export default function FlagBoard({ flags, total, needsReview, loading, title = 'Automatic project flags', action, note }) {
  const evaluated = ORDER.reduce((sum, key) => sum + (flags?.[key] || 0), 0);
  const notEvaluated = flags?.none || 0;
  const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  const summary = ORDER.map((key) => `${flags?.[key] || 0} ${FLAG_META[key].short.toLowerCase()}`).join(', ');

  return (
    <section className="panel overflow-hidden" aria-labelledby="flagboard-title">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 sm:px-6">
        <div>
          <h2 id="flagboard-title" className="panel-title">{title}</h2>
          <p className="text-sm text-ink-3">
            {loading ? 'Loading…' : `${total} project${total === 1 ? '' : 's'}, computed by the database flag engine`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && needsReview !== undefined && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
              needsReview ? 'bg-signal-100 text-[#a3330f]' : 'bg-line-soft text-ink-2'}`}
            >
              <Icon name="flag" className="h-4 w-4" />
              {needsReview} awaiting auditor review
            </span>
          )}
          {action}
        </div>
      </div>

      <div className="px-5 pt-5 pb-5 sm:px-6">
        {loading ? (
          <>
            <Skeleton className="h-4 w-full rounded-full" />
            <div className="mt-5 grid grid-cols-3 gap-4">
              {ORDER.map((k) => <Skeleton key={k} className="h-14" />)}
            </div>
          </>
        ) : (
          <>
            <div
              className="animate-bar flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-line-soft"
              role="img"
              aria-label={total ? `Flag distribution: ${summary}${notEvaluated ? `, ${notEvaluated} not evaluated` : ''}.` : 'No projects to show.'}
            >
              {[...ORDER, 'none'].map((key) => {
                const count = flags?.[key] || 0;
                if (!count) return null;
                return (
                  <span
                    key={key}
                    className={`h-full transition-[filter] duration-150 hover:brightness-110 ${FLAG_META[key].bar}`}
                    style={{ flexGrow: count, flexBasis: 0 }}
                    title={`${FLAG_META[key].long}: ${count} (${pct(count)}%)`}
                  />
                );
              })}
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
              {ORDER.map((key) => {
                const meta = FLAG_META[key];
                const count = flags?.[key] || 0;
                return (
                  <div key={key} className="flex items-center gap-3 sm:block">
                    <dt className="flex items-center gap-2 text-sm font-semibold text-ink-2 sm:mb-0.5">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${meta.bar}`}>
                        <Icon name={meta.icon} className="h-3.5 w-3.5" strokeWidth={2.4} />
                      </span>
                      {meta.long}
                    </dt>
                    <dd className="ml-auto flex items-baseline gap-2 sm:ml-0">
                      <span className="tabular font-display text-[2.75rem] leading-none font-semibold text-ink">
                        <CountUp value={count} />
                      </span>
                      <span className="tabular text-sm text-ink-3">{pct(count)}%</span>
                    </dd>
                  </div>
                );
              })}
            </dl>
            {notEvaluated > 0 && (
              <p className="mt-3 text-sm text-ink-3">{notEvaluated} project{notEvaluated === 1 ? '' : 's'} not evaluated yet.</p>
            )}
            {!total && evaluated === 0 && <p className="mt-3 text-sm text-ink-3">No projects to show yet.</p>}
          </>
        )}
      </div>

      <p className="flex items-start gap-2 border-t border-line-soft bg-canvas/70 px-5 py-2.5 text-xs text-ink-3 sm:px-6">
        <Icon name="info" className="mt-px h-3.5 w-3.5" />
        {note || 'Flags are a monitoring aid based on submitted data. They do not replace engineering inspection or a formal audit.'}
      </p>
    </section>
  );
}
