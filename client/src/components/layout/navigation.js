// Sidebar links per role, in groups. `soon: true` marks modules whose backend
// API is not built yet (their page explains what is coming).
// Every route here is also guarded by <ProtectedRoute allowedRoles> in App.jsx.

export const NAV_GROUPS = {
  administrator: [
    {
      label: 'Overview',
      links: [{ to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true }],
    },
    {
      label: 'Administration',
      links: [
        { to: '/admin/users', label: 'User management', icon: 'users' },
        { to: '/admin/roles', label: 'Roles and permissions', icon: 'shield' },
        { to: '/admin/activity', label: 'Activity logs', icon: 'activity', soon: true },
        { to: '/admin/settings', label: 'System settings', icon: 'settings', soon: true },
      ],
    },
    {
      label: 'Projects',
      links: [
        { to: '/dpwh/projects', label: 'All projects', icon: 'folder', end: true },
        { to: '/dpwh/projects/new', label: 'Register project', icon: 'squarePlus' },
        { to: '/admin/contractors', label: 'Contractors', icon: 'hardHat' },
        { to: '/admin/agencies', label: 'Agencies', icon: 'building' },
      ],
    },
    {
      label: 'Reporting',
      links: [{ to: '/admin/reports', label: 'Reports', icon: 'fileText', soon: true }],
    },
  ],

  dpwh_personnel: [
    {
      label: 'Overview',
      links: [{ to: '/dpwh', label: 'Dashboard', icon: 'dashboard', end: true }],
    },
    {
      label: 'Projects',
      links: [
        { to: '/dpwh/projects', label: 'Projects', icon: 'folder', end: true },
        { to: '/dpwh/projects/new', label: 'Register project', icon: 'squarePlus' },
        { to: '/dpwh/contractors', label: 'Contractors', icon: 'hardHat' },
      ],
    },
    {
      label: 'Field data',
      links: [
        { to: '/dpwh/updates', label: 'Project updates', icon: 'trendingUp', soon: true },
        { to: '/dpwh/images', label: '360° image uploads', icon: 'rotate360', soon: true },
        { to: '/dpwh/documents', label: 'Documents', icon: 'files', soon: true },
      ],
    },
    {
      label: 'Reporting',
      links: [{ to: '/dpwh/reports', label: 'Progress reports', icon: 'barChart', soon: true }],
    },
  ],

  auditor: [
    {
      label: 'Overview',
      links: [{ to: '/auditor', label: 'Dashboard', icon: 'dashboard', end: true }],
    },
    {
      label: 'Audit work',
      links: [
        { to: '/auditor/queue', label: 'Audit queue', icon: 'clipboardList' },
        { to: '/auditor/inspection', label: 'Project inspection', icon: 'scanSearch', soon: true },
        { to: '/auditor/evidence', label: '360° evidence review', icon: 'rotate360', soon: true },
        { to: '/auditor/decisions', label: 'Flag decisions', icon: 'flag', soon: true },
        { to: '/auditor/actions', label: 'Corrective actions', icon: 'wrench', soon: true },
      ],
    },
    {
      label: 'Reporting',
      links: [{ to: '/auditor/reports', label: 'Audit reports', icon: 'fileCheck', soon: true }],
    },
  ],

  public_viewer: [
    {
      label: 'Portal',
      links: [
        { to: '/public', label: 'Public overview', icon: 'home', end: true },
        { to: '/public/projects', label: 'Explore projects', icon: 'compass' },
        { to: '/public/map', label: 'Project map', icon: 'map', soon: true },
        { to: '/public/gallery', label: '360° site gallery', icon: 'image', soon: true },
        { to: '/public/reports', label: 'Audit reports', icon: 'fileCheck', soon: true },
        { to: '/public/about', label: 'About the portal', icon: 'info' },
      ],
    },
  ],
};

/** Flat list (kept for any code that used the old NAV_LINKS shape). */
export const NAV_LINKS = Object.fromEntries(
  Object.entries(NAV_GROUPS).map(([role, groups]) => [role, groups.flatMap((g) => g.links)]),
);

/** The nav entry that best matches a pathname (longest prefix wins). */
export function activeNavEntry(role, pathname) {
  const groups = NAV_GROUPS[role] || [];
  let best = null;
  groups.forEach((group) => group.links.forEach((link) => {
    const match = link.end ? pathname === link.to : pathname === link.to || pathname.startsWith(`${link.to}/`);
    if (match && (!best || link.to.length > best.link.to.length)) best = { group, link };
  }));
  return best;
}
