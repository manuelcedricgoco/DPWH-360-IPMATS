import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from '../components/ui/Icon.jsx';

const ToastContext = createContext(null);

const TONES = {
  success: { icon: 'checkCircle', iconClass: 'text-flag-green', bar: 'bg-flag-green' },
  error: { icon: 'alertOctagon', iconClass: 'text-flag-red', bar: 'bg-flag-red' },
  info: { icon: 'info', iconClass: 'text-navy-600', bar: 'bg-navy-600' },
};

/**
 * const toast = useToast();
 * toast.success('Account approved.');  toast.error(err.message);  toast.info('…');
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone, message, { duration } = {}) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-3), { id, tone, message }]);
    const ms = duration ?? (tone === 'error' ? 7000 : 4500);
    setTimeout(() => dismiss(id), ms);
    return id;
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (message, opts) => push('success', message, opts),
    error: (message, opts) => push('error', message, opts),
    info: (message, opts) => push('info', message, opts),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const tone = TONES[t.tone] || TONES.info;
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="animate-toast pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-lg border border-line bg-white py-3 pr-3 pl-4 shadow-[0_12px_32px_-12px_rgb(11_20_56/0.35)]"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} aria-hidden="true" />
              <Icon name={tone.icon} className={`mt-0.5 h-5 w-5 ${tone.iconClass}`} />
              <p className="flex-1 text-sm text-ink">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded p-0.5 text-ink-3 hover:bg-canvas hover:text-ink"
                aria-label="Dismiss notification"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
