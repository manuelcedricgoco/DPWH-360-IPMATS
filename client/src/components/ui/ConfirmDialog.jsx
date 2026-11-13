import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock, usePresence } from '../../lib/motion.js';
import Icon from './Icon.jsx';

const TONES = {
  primary: { button: 'btn-primary', icon: 'info', iconWrap: 'bg-navy-50 text-navy-700' },
  success: { button: 'btn-success', icon: 'userCheck', iconWrap: 'bg-flag-green-soft text-flag-green-ink' },
  danger: { button: 'btn-danger', icon: 'alert', iconWrap: 'bg-flag-red-soft text-flag-red-ink' },
};

/**
 * Centered confirmation dialog.
 * <ConfirmDialog open title="Approve account?" tone="success" confirmLabel="Approve"
 *   busy={busy} onConfirm={...} onCancel={...}>details / extra fields</ConfirmDialog>
 */
export default function ConfirmDialog({
  open, title, tone = 'primary', icon, confirmLabel = 'Confirm', busyLabel, cancelLabel = 'Cancel',
  busy = false, confirmDisabled = false, onConfirm, onCancel, children,
}) {
  const { mounted, visible } = usePresence(open, 180);
  useBodyScrollLock(mounted);
  const dialogRef = useRef(null);
  const cancelRef = useRef(onCancel);
  const busyRef = useRef(busy);
  cancelRef.current = onCancel;
  busyRef.current = busy;
  const style = TONES[tone] || TONES.primary;

  useEffect(() => {
    if (!open) return undefined;
    // Capture phase + stopPropagation: Escape closes only this dialog, not a panel beneath it.
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      if (!busyRef.current) cancelRef.current();
    };
    document.addEventListener('keydown', onKey, true);
    const previous = document.activeElement;
    const frame = requestAnimationFrame(() => {
      const field = dialogRef.current?.querySelector('select, input, textarea');
      (field || dialogRef.current?.querySelector('[data-cancel], [data-confirm]'))?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey, true);
      cancelAnimationFrame(frame);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div
        className={`absolute inset-0 bg-navy-950/55 backdrop-blur-[3px] transition-opacity duration-180 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={busy ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className={`relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-[0_32px_80px_-20px_rgb(11_20_56/0.5)] sm:max-h-[calc(100dvh-3rem)]
          transition-[transform,opacity] duration-180 ease-[var(--ease-out-quart)]
          ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'}`}
      >
        <div className="flex min-h-0 gap-4 overflow-y-auto overscroll-contain px-5 pt-6 pb-6 sm:px-6">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.iconWrap}`}>
            <Icon name={icon || style.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="font-display text-xl font-semibold text-ink">{title}</h2>
            <div className="mt-2 space-y-3 text-sm text-ink-2">{children}</div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-canvas/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          {cancelLabel && (
            <button type="button" data-cancel className="btn-secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          )}
          <button type="button" data-confirm className={style.button} onClick={onConfirm} disabled={busy || confirmDisabled}>
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
            {busy ? (busyLabel || `${confirmLabel}…`) : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
