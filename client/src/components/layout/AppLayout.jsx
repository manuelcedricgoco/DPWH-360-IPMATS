import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../ui/Icon.jsx';
import Sidebar, { Brand } from './Sidebar.jsx';
import UserMenu from './UserMenu.jsx';
import { activeNavEntry } from './navigation.js';
import { useBodyScrollLock, usePresence } from '../../lib/motion.js';
import { AGENCY, OFFICIAL_TITLE, PROVINCE } from '../../lib/brand.js';

const COLLAPSE_KEY = 'dpwh360.sidebarCollapsed';

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function AppLayout() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawer = usePresence(drawerOpen, 240);
  useBodyScrollLock(drawer.mounted);
  const role = profile?.role;
  const current = activeNavEntry(role, location.pathname);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* storage unavailable: keep the in-memory value */
    }
  }, [collapsed]);

  // Close the mobile drawer on navigation and on Escape.
  useEffect(() => setDrawerOpen(false), [location.pathname]);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-800 focus:shadow">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-navy-950 transition-[width] duration-240 ease-[var(--ease-out-quart)] lg:flex
          ${collapsed ? 'w-[76px]' : 'w-[264px]'}`}
      >
        <div className={`flex h-16 items-center border-b border-white/[0.07] ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
          <Brand collapsed={collapsed} />
        </div>
        <Sidebar role={role} collapsed={collapsed} />
        <div className="border-t border-white/[0.07] p-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={`flex w-full items-center gap-3 rounded-md py-2 text-sm font-medium text-navy-200/80 transition-colors hover:bg-white/[0.05] hover:text-white
              ${collapsed ? 'justify-center' : 'px-3'}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            <Icon name={collapsed ? 'chevronsRight' : 'chevronsLeft'} className="h-[18px] w-[18px]" />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer.mounted && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className={`absolute inset-0 bg-navy-950/50 transition-opacity duration-200 ${drawer.visible ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={`relative flex h-full w-[284px] max-w-[85vw] flex-col bg-navy-950 shadow-2xl transition-transform duration-240 ease-[var(--ease-out-quart)]
              ${drawer.visible ? 'translate-x-0' : '-translate-x-full'}`}
            aria-label="Navigation"
          >
            <div className="flex h-16 items-center justify-between border-b border-white/[0.07] px-5">
              <Brand />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-1.5 text-navy-200 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>
            <Sidebar role={role} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className={`flex min-h-screen flex-col transition-[padding] duration-240 ease-[var(--ease-out-quart)] ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]'}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="-ml-1 rounded-md p-2 text-ink-2 hover:bg-canvas lg:hidden"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <img src="/images/dpwh-logo.jpg" alt="" className="h-8 w-8 rounded-full lg:hidden" />
            {current && (
              <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
                <ol className="flex items-center gap-1.5 text-ink-3">
                  <li className="hidden sm:block">{current.group.label}</li>
                  <li className="hidden sm:block" aria-hidden="true"><Icon name="chevronRight" className="h-3.5 w-3.5" /></li>
                  <li className="truncate font-semibold text-ink" aria-current="page">{current.link.label}</li>
                </ol>
              </nav>
            )}
          </div>
          <UserMenu profile={profile} user={user} onSignOut={handleSignOut} />
        </header>

        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8" tabIndex={-1}>
          <div key={location.pathname} className="animate-page mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-line px-4 py-4 text-xs text-ink-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-1 sm:flex-row sm:justify-between sm:gap-6">
            <span className="shrink-0">{AGENCY}, {PROVINCE}</span>
            <span className="max-w-[70ch] sm:text-right">{OFFICIAL_TITLE}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
