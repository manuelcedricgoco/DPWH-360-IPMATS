import Skeleton from '../ui/Skeleton.jsx';

/**
 * Single-series horizontal bar chart (no legend needed; the panel title names it).
 * items: [{ label, count, ... }]. value(item) picks the measure; format(n) prints it.
 */
export default function BarList({
  items = [], value = (item) => item.count, format = (n) => n.toLocaleString('en-PH'),
  loading, limit = 8, emptyText = 'No data yet.', unit = 'projects',
}) {
  if (loading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-5" />)}
      </div>
    );
  }

  const rows = items.filter((item) => value(item) > 0);
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-3">{emptyText}</p>;

  const shown = rows.slice(0, limit);
  const rest = rows.slice(limit);
  if (rest.length) {
    shown.push({ label: `Other (${rest.length})`, __value: rest.reduce((s, item) => s + value(item), 0) });
  }
  const valueOf = (item) => (item.__value !== undefined ? item.__value : value(item));
  const max = Math.max(...shown.map(valueOf));

  return (
    <ul className="space-y-2.5">
      {shown.map((item) => {
        const v = valueOf(item);
        const width = max ? (v / max) * 100 : 0;
        return (
          <li
            key={item.label}
            className="group grid grid-cols-[minmax(6rem,9rem)_1fr] items-center gap-3 rounded-md px-1 py-0.5 hover:bg-navy-50/70"
            title={`${item.label}: ${format(v)} ${unit}`}
          >
            <span className="truncate text-sm text-ink-2 group-hover:text-ink">{item.label}</span>
            <span className="flex items-center gap-2">
              <span className="relative h-2.5 flex-1">
                <span
                  className="animate-bar absolute inset-y-0 left-0 rounded-r-[4px] bg-navy-700 group-hover:bg-navy-600"
                  style={{ width: `max(${width}%, 3px)` }}
                />
              </span>
              <span className="tabular w-16 shrink-0 text-right text-sm font-semibold text-ink">{format(v)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
