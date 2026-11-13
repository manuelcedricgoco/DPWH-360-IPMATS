// Sidebar links per role. Later weeks add their pages here.
export const NAV_LINKS = {
  administrator: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/dpwh/projects', label: 'Projects', end: true },
    { to: '/dpwh/projects/new', label: 'Register project' },
    { to: '/admin/contractors', label: 'Contractors' },
    { to: '/admin/agencies', label: 'Agencies' },
  ],
  dpwh_personnel: [
    { to: '/dpwh/projects', label: 'Projects', end: true },
    { to: '/dpwh/projects/new', label: 'Register project' },
    { to: '/dpwh/contractors', label: 'Contractors' },
  ],
  auditor: [
    { to: '/auditor', label: 'Dashboard', end: true },
  ],
  public_viewer: [
    { to: '/public', label: 'Projects map', end: true },
  ],
};
