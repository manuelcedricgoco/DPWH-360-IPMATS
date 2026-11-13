import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

/**
 * <PageHeader title="Contractors" description="…" back={{ to: '/x', label: 'Projects' }} actions={<button/>} />
 */
export default function PageHeader({ title, description, actions, back, children }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {back && (
          <Link to={back.to} className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-navy-700">
            <Icon name="arrowLeft" className="h-4 w-4" />
            {back.label}
          </Link>
        )}
        <h1 className="font-display text-[2rem] leading-[1.1] font-semibold tracking-[0.005em] text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-[65ch] text-[15px] text-ink-2">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
