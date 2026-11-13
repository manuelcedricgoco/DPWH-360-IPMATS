import Icon from '../ui/Icon.jsx';

const STYLES = {
  error: { box: 'border-flag-red/30 bg-flag-red-soft text-flag-red-ink', icon: 'alertOctagon' },
  success: { box: 'border-flag-green/30 bg-flag-green-soft text-flag-green-ink', icon: 'checkCircle' },
  info: { box: 'border-navy-200 bg-navy-50 text-navy-800', icon: 'info' },
  warning: { box: 'border-flag-yellow/40 bg-flag-yellow-soft text-flag-yellow-ink', icon: 'alert' },
};

/** <Alert type="error" messages={['a', 'b']}>Main message</Alert> */
export default function Alert({ type = 'info', children, messages = [], onDismiss }) {
  if (!children && !messages.length) return null;
  const style = STYLES[type] || STYLES.info;
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${style.box}`}>
      <Icon name={style.icon} className="mt-0.5 h-4.5 w-4.5" />
      <div className="min-w-0 flex-1">
        {children && <p className="font-medium">{children}</p>}
        {messages.length > 1 && (
          <ul className="mt-1 list-disc pl-5">
            {messages.map((message) => <li key={message}>{message}</li>)}
          </ul>
        )}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="-m-1 self-start rounded p-1 opacity-70 hover:opacity-100" aria-label="Dismiss">
          <Icon name="x" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
