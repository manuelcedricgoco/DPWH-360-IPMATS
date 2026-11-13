import Icon from './Icon.jsx';
import { FLAG_META, projectFlag } from '../../lib/projectStats.js';

const TONE = {
  green: 'bg-flag-green-soft text-flag-green-ink',
  yellow: 'bg-flag-yellow-soft text-flag-yellow-ink',
  red: 'bg-flag-red-soft text-flag-red-ink',
  navy: 'bg-navy-50 text-navy-800',
  gray: 'bg-line-soft text-ink-2',
  orange: 'bg-signal-100 text-[#a3330f]',
};

const DOT = {
  green: 'bg-flag-green',
  yellow: 'bg-flag-yellow',
  red: 'bg-flag-red',
  navy: 'bg-navy-600',
  gray: 'bg-ink-3',
  orange: 'bg-signal-600',
};

/** Small pill. tone: green | yellow | red | navy | gray | orange */
export function Badge({ tone = 'gray', dot = false, icon, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONE[tone] || TONE.gray}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone] || DOT.gray}`} aria-hidden="true" />}
      {icon && <Icon name={icon} className="h-3.5 w-3.5" strokeWidth={2.2} />}
      {children}
    </span>
  );
}

/**
 * Automatic flag of a project (database-computed; effective flag first, like v_map_projects).
 * Always icon + label, never color alone.
 */
export function FlagBadge({ project, flag }) {
  const value = flag ?? projectFlag(project);
  const meta = FLAG_META[value] || FLAG_META.none;
  return <Badge tone={meta.tone} icon={meta.icon}>{meta.short}</Badge>;
}

const STATUS_TONE = { active: 'green', suspended: 'yellow', cancelled: 'gray' };
const STATUS_LABEL = { active: 'Active', suspended: 'Suspended', cancelled: 'Cancelled' };

/** Administrative project status (set by people). */
export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] || 'gray'} dot>{STATUS_LABEL[status] || status || '—'}</Badge>;
}

/** Thin progress meter with the value as text. */
export function ProgressBar({ value, planned }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const plan = planned === null || planned === undefined ? null : Math.max(0, Math.min(100, Number(planned) || 0));
  return (
    <div className="min-w-[7rem]">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="tabular font-semibold text-ink">{pct.toFixed(pct % 1 ? 1 : 0)}%</span>
        {plan !== null && <span className="tabular text-ink-3">plan {plan.toFixed(plan % 1 ? 1 : 0)}%</span>}
      </div>
      <div
        className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-line-soft"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Physical progress"
      >
        <span className="animate-bar absolute inset-y-0 left-0 rounded-full bg-navy-700" style={{ width: `${pct}%` }} />
        {plan !== null && (
          <span className="absolute inset-y-[-2px] w-0.5 bg-ink/60" style={{ left: `calc(${plan}% - 1px)` }} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
