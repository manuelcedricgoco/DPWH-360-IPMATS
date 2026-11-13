import PageHeader from '../../components/ui/PageHeader.jsx';
import Icon from '../../components/ui/Icon.jsx';

// Reference view of the access rules enforced by the database (row-level
// security), as documented in database/README.md → "Roles and access (RLS)".
// Read-only: permissions are not editable from the portal.

const ROLES = [
  { key: 'administrator', label: 'Administrator', icon: 'shield', summary: 'Manages users, roles, agencies and system settings. Can see and edit all records.' },
  { key: 'dpwh_personnel', label: 'DPWH Personnel', icon: 'hardHat', summary: 'Registers projects and reports progress, finances, 360° images and documents.' },
  { key: 'auditor', label: 'Auditor', icon: 'clipboardList', summary: 'Reviews automatic flags, records findings and evidence, and publishes reviewed information.' },
  { key: 'public_viewer', label: 'Public Viewer', icon: 'globe', summary: 'Reads information that has been published for transparency.' },
];

// level: full | write | partial | read | none
const MATRIX = [
  {
    data: 'Projects, phases and progress',
    administrator: ['full', 'All'],
    dpwh_personnel: ['write', 'Create and edit (no hard delete)'],
    auditor: ['read', 'Read'],
    public_viewer: ['partial', 'Published projects only'],
  },
  {
    data: 'Finance records',
    administrator: ['full', 'All'],
    dpwh_personnel: ['write', 'Create and edit'],
    auditor: ['read', 'Read'],
    public_viewer: ['none', 'No access'],
  },
  {
    data: '360° images and documents',
    administrator: ['full', 'All'],
    dpwh_personnel: ['write', 'Upload and edit'],
    auditor: ['write', 'Read, approve for public'],
    public_viewer: ['partial', 'Approved items of published projects'],
  },
  {
    data: 'Flag reviews, findings, evidence, corrective actions',
    administrator: ['read', 'Read'],
    dpwh_personnel: ['partial', 'Read; update corrective actions assigned to them'],
    auditor: ['write', 'Create and edit'],
    public_viewer: ['partial', 'Published findings only'],
  },
  {
    data: 'Agencies, contractors, barangays',
    administrator: ['write', 'Create and edit'],
    dpwh_personnel: ['partial', 'Contractors and barangays'],
    auditor: ['read', 'Read'],
    public_viewer: ['read', 'Read'],
  },
  {
    data: 'System settings (flag thresholds)',
    administrator: ['write', 'Edit'],
    dpwh_personnel: ['read', 'Read'],
    auditor: ['read', 'Read'],
    public_viewer: ['none', 'No access'],
  },
  {
    data: 'Activity logs (insert-only)',
    administrator: ['read', 'Read'],
    dpwh_personnel: ['none', 'No access'],
    auditor: ['read', 'Read'],
    public_viewer: ['none', 'No access'],
  },
  {
    data: 'User roles and approval',
    administrator: ['write', 'Approve, assign roles, activate'],
    dpwh_personnel: ['none', 'No access'],
    auditor: ['none', 'No access'],
    public_viewer: ['none', 'No access'],
  },
];

const LEVEL = {
  full: { icon: 'checkCircle', className: 'text-flag-green-ink' },
  write: { icon: 'pencil', className: 'text-navy-700' },
  partial: { icon: 'filter', className: 'text-flag-yellow-ink' },
  read: { icon: 'eye', className: 'text-ink-2' },
  none: { icon: 'x', className: 'text-ink-3' },
};

function Cell({ value }) {
  const [level, text] = value;
  const style = LEVEL[level];
  return (
    <span className={`flex items-start gap-2 ${style.className}`}>
      <Icon name={style.icon} className="mt-0.5 h-4 w-4" />
      <span className={level === 'none' ? 'text-ink-3' : 'text-ink'}>{text}</span>
    </span>
  );
}

export default function RolesPermissionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles and permissions"
        description="What each role can see and change. These rules are enforced by the database for every request; this page is a reference and does not change them."
      />

      <ul className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((role) => (
          <li key={role.key} className="panel p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
              <Icon name={role.icon} className="h-5 w-5" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold text-ink">{role.label}</p>
            <p className="mt-1 text-sm text-ink-2">{role.summary}</p>
          </li>
        ))}
      </ul>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <h2 className="panel-title">Access by record type</h2>
          <p className="text-sm text-ink-3">Every privilege requires an approved and active account.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="min-w-[14rem]">Records</th>
                {ROLES.map((r) => <th key={r.key} className="min-w-[11rem]">{r.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.data}>
                  <td className="font-semibold text-ink">{row.data}</td>
                  {ROLES.map((r) => <td key={r.key}><Cell value={row[r.key]} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-5 text-sm text-ink-2">
        <h2 className="panel-title">How new accounts get their role</h2>
        <ol className="mt-3 grid gap-4 md:grid-cols-3">
          <li className="flex gap-3">
            <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-800 font-display font-semibold text-white">1</span>
            <span>Everyone who signs up starts as a public viewer. Public viewer accounts are active right away.</span>
          </li>
          <li className="flex gap-3">
            <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-800 font-display font-semibold text-white">2</span>
            <span>People who ask for DPWH personnel or auditor access wait on the pending page until reviewed.</span>
          </li>
          <li className="flex gap-3">
            <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-800 font-display font-semibold text-white">3</span>
            <span>An administrator approves or rejects the request in User management. Administrators can’t demote or deactivate themselves.</span>
          </li>
        </ol>
      </section>
    </div>
  );
}
