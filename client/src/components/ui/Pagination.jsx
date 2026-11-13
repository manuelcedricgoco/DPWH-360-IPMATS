import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';

/** Client-side paging. const { page, setPage, pageItems, pageCount } = usePagination(rows, 15, [filters]) */
export function usePagination(items, pageSize = 15, resetKeys = []) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  // Back to page 1 whenever the filters change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), resetKeys);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );
  return { page, setPage, pageItems, pageCount, pageSize, total: items.length };
}

/** <Pagination page={1} pageCount={4} total={52} pageSize={15} onChange={setPage} label="projects" /> */
export default function Pagination({ page, pageCount, total, pageSize, onChange, label = 'records' }) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-3 text-sm" aria-label="Pagination">
      <p className="tabular text-ink-3">
        Showing <span className="font-semibold text-ink">{from}–{to}</span> of <span className="font-semibold text-ink">{total}</span> {label}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className="btn-secondary btn-sm px-2" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <Icon name="chevronLeft" className="h-4 w-4" />
          </button>
          <span className="tabular min-w-[5.5rem] text-center text-ink-2">Page {page} of {pageCount}</span>
          <button type="button" className="btn-secondary btn-sm px-2" onClick={() => onChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>
      )}
    </nav>
  );
}
