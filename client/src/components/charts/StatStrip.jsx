import CountUp from '../ui/CountUp.jsx';
import Skeleton from '../ui/Skeleton.jsx';

/**
 * One panel divided into key figures (instead of a row of identical cards).
 * items: [{ label, value, format?, hint?, tone? }]  tone: 'alert' highlights a figure that needs action.
 */
export default function StatStrip({ items, loading }) {
  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-3 lg:grid-cols-5',
    6: 'sm:grid-cols-3 lg:grid-cols-6',
  }[items.length] || 'sm:grid-cols-3';

  return (
    <dl className={`panel grid grid-cols-2 overflow-hidden ${cols}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="relative -mr-px -mb-px border-r border-b border-line-soft px-5 py-4"
        >
          {item.tone === 'alert' && Number(item.value) > 0 && (
            <span className="absolute top-0 left-0 h-full w-[3px] bg-signal-600" aria-hidden="true" />
          )}
          <dt className="text-[13px] font-medium text-ink-3">{item.label}</dt>
          <dd className="mt-1">
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <span className="tabular font-display text-[1.9rem] leading-none font-semibold text-ink">
                {item.raw ?? <CountUp value={item.value} format={item.format} />}
              </span>
            )}
            {item.hint && !loading && <span className="mt-1.5 block text-xs text-ink-3">{item.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
