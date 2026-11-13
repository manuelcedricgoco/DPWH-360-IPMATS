// Sidebar links per role. Later weeks add their pages here.
export const NAV_LINKS = {
  administrator: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/dpwh/projects', label: 'Projects', end: true },
    { to: '/dpwh/projects/new', label: 'Register project' },
  ],
  dpwh_personnel: [
    { to: '/dpwh/projects', label: 'Projects', end: true },
    { to: '/dpwh/projects/new', label: 'Register project' },
  ],
  auditor: [
    { to: '/auditor', label: 'Dashboard', end: true },
  ],
  public_viewer: [
    { to: '/public', label: 'Projects map', end: true },
  ],
};
