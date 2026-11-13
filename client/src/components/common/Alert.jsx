const STYLES = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
};

/** <Alert type="error" messages={['a', 'b']}>Main message</Alert> */
export default function Alert({ type = 'info', children, messages = [] }) {
  if (!children && !messages.length) return null;
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`rounded-md border px-4 py-3 text-sm ${STYLES[type]}`}>
      {children && <p className="font-medium">{children}</p>}
      {messages.length > 1 && (
        <ul className="mt-1 list-disc pl-5">
          {messages.map((message) => <li key={message}>{message}</li>)}
        </ul>
      )}
    </div>
  );
}
