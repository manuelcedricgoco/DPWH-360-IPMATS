/** Read-only label/value list for "view details" panels. items: [{ label, value }] */
export default function DetailList({ items }) {
  return (
    <dl className="divide-y divide-slate-100">
      {items.map(({ label, value }) => (
        <div key={label} className="grid grid-cols-3 gap-3 py-2.5 text-sm">
          <dt className="font-medium text-slate-500">{label}</dt>
          <dd className="col-span-2 break-words text-slate-900">
            {value === null || value === undefined || value === '' ? <span className="text-slate-400">—</span> : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ActiveBadge({ active }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
