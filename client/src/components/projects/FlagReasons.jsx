import { flagReasons } from '../../lib/projectStats.js';

const DOT = { red: 'bg-flag-red', yellow: 'bg-flag-yellow', info: 'bg-ink-3', green: 'bg-flag-green' };

/** The flag engine's reasons for a project (read-only), worst first. */
export default function FlagReasons({ project, limit = 2 }) {
  const order = { red: 0, yellow: 1, info: 2 };
  const reasons = flagReasons(project).sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
  if (!reasons.length) return <span className="text-ink-3">No reasons recorded</span>;
  const shown = reasons.slice(0, limit);
  return (
    <ul className="space-y-1">
      {shown.map((r, i) => (
        <li key={`${r.check}-${i}`} className="flex gap-2 text-[13px] leading-snug text-ink-2">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[r.severity] || DOT.info}`} aria-hidden="true" />
          <span>{r.message}</span>
        </li>
      ))}
      {reasons.length > limit && <li className="pl-3.5 text-xs text-ink-3">and {reasons.length - limit} more</li>}
    </ul>
  );
}
