import { useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { usePresence } from '../../lib/motion.js';
import { ROLE_LABEL } from '../../lib/roles.js';

export function initials(name = '') {
  const parts = String(name).trim().split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
}

/** Avatar button with a dropdown: account details + sign out. */
export default function UserMenu({ profile, user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const { mounted, visible } = usePresence(open, 150);
  const rootRef = useRef(null);
  const name = profile?.full_name || user?.email || 'User';
  const email = profile?.email || user?.email;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-canvas"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 font-display text-[15px] font-semibold text-white">
          {initials(name)}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-[11rem] truncate text-sm font-semibold text-ink">{name}</span>
          <span className="block text-xs text-ink-3">{ROLE_LABEL[profile?.role] || profile?.role}</span>
        </span>
        <Icon name="chevronDown" className={`hidden h-4 w-4 text-ink-3 transition-transform duration-150 md:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {mounted && (
        <div
          role="menu"
          className={`absolute right-0 z-30 mt-2 w-72 origin-top-right rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-12px_rgb(11_20_56/0.3)]
            transition-[transform,opacity] duration-150 ease-[var(--ease-out-quart)]
            ${visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            {email && <p className="truncate text-sm text-ink-3">{email}</p>}
            <p className="mt-2 inline-flex rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-800">
              {ROLE_LABEL[profile?.role] || profile?.role}
            </p>
            {profile?.office && <p className="mt-2 text-xs text-ink-3">{profile.office}</p>}
          </div>
          <div className="my-1 border-t border-line-soft" />
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onSignOut(); }}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-ink-2 hover:bg-flag-red-soft hover:text-flag-red-ink"
          >
            <Icon name="logOut" className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
