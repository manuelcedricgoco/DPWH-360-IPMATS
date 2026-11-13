import { NavLink } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';
import { NAV_GROUPS } from './navigation.js';

/** Logo + portal name. Logo keeps its square aspect ratio on a white disc. */
export function Brand({ collapsed = false }) {
  return (
    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-0.5 shadow-[0_0_0_3px_rgb(255_255_255/0.08)]">
        <img src="/images/dpwh-logo.jpg" alt="DPWH logo" className="h-full w-full rounded-full object-contain" />
      </span>
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          <span className="block font-display text-[1.35rem] font-semibold tracking-[0.02em] text-white">DPWH 360°</span>
          <span className="block truncate text-xs text-navy-200">Occidental Mindoro</span>
        </span>
      )}
    </div>
  );
}

export default function Sidebar({ role, collapsed = false, onNavigate }) {
  const groups = NAV_GROUPS[role] || [];

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4" aria-label="Main">
      {groups.map((group, index) => (
        <div key={group.label} className={index ? 'mt-5' : ''}>
          {collapsed ? (
            index > 0 && <div className="mx-3 mb-3 border-t border-white/10" aria-hidden="true" />
          ) : (
            <p className="mb-1.5 px-3 text-xs font-medium text-navy-200/70">{group.label}</p>
          )}
          <ul className="space-y-0.5">
            {group.links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  onClick={onNavigate}
                  title={collapsed ? link.label : undefined}
                  aria-label={collapsed ? link.label : undefined}
                  className={({ isActive }) => `group relative flex items-center gap-3 rounded-md py-2 text-[14.5px] font-medium transition-colors duration-150
                    ${collapsed ? 'justify-center px-0' : 'px-3'}
                    ${isActive ? 'bg-white/[0.09] text-white' : 'text-navy-100/80 hover:bg-white/[0.05] hover:text-white'}`}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r bg-signal-500 transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                        aria-hidden="true"
                      />
                      <Icon name={link.icon} className={`h-[18px] w-[18px] ${isActive ? 'text-white' : 'text-navy-200/80 group-hover:text-white'}`} />
                      {!collapsed && <span className="flex-1 truncate">{link.label}</span>}
                      {!collapsed && link.soon && (
                        <span className="rounded border border-white/15 px-1.5 text-[11px] font-medium text-navy-200/80">Soon</span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
