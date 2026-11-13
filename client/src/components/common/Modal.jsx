import { useEffect, useRef } from 'react';

/**
 * <Modal open title="Add contractor" onClose={...} footer={<buttons/>}>…</Modal>
 * Closes on Escape or backdrop click. Shows as a right-side panel on wide screens.
 */
export default function Modal({ open, title, onClose, children, footer, busy = false }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  // Escape closes; focus moves into the panel once, when it opens.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !busyRef.current) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const first = panelRef.current?.querySelector('input, select, textarea, button:not([data-close])');
    (first || panelRef.current)?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            data-close
            onClick={onClose}
            disabled={busy}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
