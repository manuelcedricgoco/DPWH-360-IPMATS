import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader.jsx';
import Icon from '../components/ui/Icon.jsx';

/**
 * Page for a module whose backend API is not built yet. It says so plainly,
 * lists what the module will do, and links somewhere useful. No sample data.
 * <PlaceholderPage title icon description planned={['…']} related={{ to, label }} />
 */
export default function PlaceholderPage({ title, description, icon = 'info', planned = [], related }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <section className="panel overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col justify-between gap-6 border-b border-line-soft bg-navy-50/50 p-6 md:border-r md:border-b-0">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-800 text-white">
                <Icon name={icon} className="h-6 w-6" />
              </span>
              <p className="mt-5 font-display text-xl font-semibold text-ink">This module is not available yet</p>
              <p className="mt-1.5 text-sm text-ink-2">
                It is part of a later development stage of DPWH 360°. Once it is connected, it will appear
                here with live records. No sample or placeholder data is shown in the meantime.
              </p>
            </div>
            {related && (
              <Link to={related.to} className="btn-secondary self-start">
                {related.label}
              </Link>
            )}
          </div>

          {planned.length > 0 && (
            <div className="p-6">
              <h2 className="text-sm font-semibold text-ink-2">What this module will include</h2>
              <ul className="mt-3 space-y-2.5">
                {planned.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm text-ink">
                    <Icon name="check" className="mt-0.5 h-4 w-4 text-navy-600" strokeWidth={2.4} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
