/** Read-only label/value list for "view details" panels. items: [{ label, value }] */
export default function DetailList({ items }) {
  return (
    <dl className="divide-y divide-line-soft">
      {items.map(({ label, value }) => (
        <div key={label} className="grid grid-cols-3 gap-3 py-3 text-sm">
          <dt className="text-ink-3">{label}</dt>
          <dd className="col-span-2 break-words font-medium text-ink">
            {value === null || value === undefined || value === '' ? <span className="font-normal text-ink-3">—</span> : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ActiveBadge({ active }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      active ? 'bg-flag-green-soft text-flag-green-ink' : 'bg-line-soft text-ink-2'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-flag-green' : 'bg-ink-3'}`} aria-hidden="true" />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
