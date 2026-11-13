import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock, usePresence } from '../../lib/motion.js';
import Icon from '../ui/Icon.jsx';

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

/**
 * <Modal open title="Add contractor" onClose={...} footer={<buttons/>} size="md">…</Modal>
 * Centered dialog. Closes on Escape or backdrop click (not while busy). The body
 * scrolls inside the dialog; header and footer stay visible. The page behind it
 * does not scroll while it is open.
 */
export default function Modal({ open, title, description, onClose, children, footer, busy = false, size = 'md' }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;
  const { mounted, visible } = usePresence(open, 200);
  useBodyScrollLock(mounted);

  // Escape closes; focus moves into the dialog once, when it opens, and returns after.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !busyRef.current) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.activeElement;
    const frame = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector('input, select, textarea, button:not([data-close])');
      (first || panelRef.current)?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(frame);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6">
      <div
        className={`absolute inset-0 bg-navy-950/55 backdrop-blur-[3px] transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={busy ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_32px_80px_-20px_rgb(11_20_56/0.5)] outline-none
          sm:max-h-[calc(100dvh-3rem)] ${SIZES[size] || SIZES.md}
          transition-[transform,opacity] duration-200 ease-[var(--ease-out-quart)]
          ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.97] opacity-0'}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="modal-title" className="font-display text-xl font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 truncate text-sm text-ink-3">{description}</p>}
          </div>
          <button
            type="button"
            data-close
            onClick={onClose}
            disabled={busy}
            className="-mt-0.5 -mr-1.5 rounded-lg p-2 text-ink-3 transition-colors hover:bg-canvas hover:text-ink"
            aria-label="Close"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-line bg-canvas/60 px-5 py-4 sm:px-6
            max-sm:[&>button]:flex-1"
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
