import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_LABEL } from '../../lib/roles.js';
import { NAV_LINKS } from './navigation.js';

function Sidebar({ role, onNavigate }) {
  const links = NAV_LINKS[role] || [];
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Main">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `rounded-md px-3 py-2 text-sm font-medium ${
              isActive ? 'bg-dpwh-blue text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = profile?.full_name || user?.email || 'User';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-dpwh-blue px-4 py-3 text-white shadow">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded p-1 hover:bg-white/10 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <div>
            <p className="text-lg font-bold leading-tight">DPWH 360°</p>
            <p className="hidden text-xs text-blue-100 sm:block">Occidental Mindoro Project Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="max-w-[12rem] truncate text-sm font-medium">{displayName}</p>
            <p className="text-xs text-blue-100">{ROLE_LABEL[profile?.role] || profile?.role}</p>
          </div>
          <button type="button" onClick={handleSignOut} className="rounded-md border border-white/40 px-3 py-1.5 text-sm hover:bg-white/10">
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <aside className={`${menuOpen ? 'block' : 'hidden'} border-b border-slate-200 bg-white md:block md:w-56 md:shrink-0 md:border-b-0 md:border-r`}>
          <Sidebar role={profile?.role} onNavigate={() => setMenuOpen(false)} />
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
