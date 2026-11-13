/** <Skeleton className="h-4 w-32" /> – shimmering placeholder block. */
export default function Skeleton({ className = 'h-4 w-full' }) {
  return <span className={`skeleton block ${className}`} aria-hidden="true" />;
}

/** Placeholder rows for a .data-table body while it loads. */
export function SkeletonRows({ rows = 6, columns = 5 }) {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={r} aria-hidden="true">
      {Array.from({ length: columns }, (_, c) => (
        <td key={c}>
          <Skeleton className={`h-4 ${c === 0 ? 'w-40' : c % 2 ? 'w-24' : 'w-16'}`} />
          {c === 0 && <Skeleton className="mt-2 h-3 w-24" />}
        </td>
      ))}
    </tr>
  ));
}
