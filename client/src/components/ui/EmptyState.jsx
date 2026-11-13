import Icon from './Icon.jsx';

/** Centered empty / not-available message with an optional action. */
export default function EmptyState({ icon = 'inbox', title, children, action, compact = false }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-700">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-4 font-display text-lg font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
