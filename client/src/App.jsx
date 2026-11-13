import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import PendingApproval from './pages/auth/PendingApproval.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import ProjectListPage from './pages/dpwh/ProjectListPage.jsx';
import ProjectFormPage from './pages/dpwh/ProjectFormPage.jsx';
import DpwhDashboard from './pages/dpwh/DpwhDashboard.jsx';
import ContractorsPage from './pages/admin/ContractorsPage.jsx';
import AgenciesPage from './pages/admin/AgenciesPage.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import UserManagementPage from './pages/admin/UserManagementPage.jsx';
import RolesPermissionsPage from './pages/admin/RolesPermissionsPage.jsx';
import AuditorDashboard from './pages/auditor/AuditorDashboard.jsx';
import AuditQueuePage from './pages/auditor/AuditQueuePage.jsx';
import PublicOverview from './pages/public/PublicOverview.jsx';
import ExploreProjectsPage from './pages/public/ExploreProjectsPage.jsx';
import AboutPage from './pages/public/AboutPage.jsx';

const PROJECT_EDITORS = ['administrator', 'dpwh_personnel'];

// Modules whose backend API is not built yet. Each page says so and lists what it will do.
const COMING = {
  adminActivity: {
    title: 'Activity logs', icon: 'activity',
    description: 'A read-only trail of sign-ins, record changes and report exports.',
    planned: ['Insert-only log of who did what and when', 'Filters by user, action and date', 'Export for audit purposes'],
    related: { to: '/admin', label: 'Back to dashboard' },
  },
  adminReports: {
    title: 'Reports', icon: 'fileText',
    description: 'Province-wide reports on project progress, finances and flags.',
    planned: ['Progress and slippage report per municipality', 'Financial summary per project', 'Flag history and audit outcomes', 'Export to PDF and spreadsheet'],
    related: { to: '/dpwh/projects', label: 'View all projects' },
  },
  adminSettings: {
    title: 'System settings', icon: 'settings',
    description: 'Thresholds the flag engine uses, such as slippage, image age and GPS distance limits.',
    planned: ['Slippage limits for yellow and red flags', 'Maximum age of the latest 360° image', 'GPS distance tolerance for site images', 'Financial gap limits'],
    related: { to: '/admin/roles', label: 'View roles and permissions' },
  },
  dpwhUpdates: {
    title: 'Project updates', icon: 'trendingUp',
    description: 'Report accomplishment per phase. Every update is kept as history.',
    planned: ['Phase list with weights and planned dates', 'Accomplishment entry per phase', 'Full update history per project'],
    related: { to: '/dpwh/projects', label: 'Go to projects' },
  },
  dpwhImages: {
    title: '360° image uploads', icon: 'rotate360',
    description: 'Upload panoramic site photos with their capture date and GPS location.',
    planned: ['Upload of equirectangular 360° photos', 'Automatic reading of EXIF date and GPS', 'Preview in the 360° viewer before saving', 'Marking the final completion image'],
    related: { to: '/dpwh/projects', label: 'Go to projects' },
  },
  dpwhReports: {
    title: 'Progress reports', icon: 'barChart',
    description: 'Planned versus actual progress for the projects you handle.',
    planned: ['S-curve of planned and actual progress', 'Slippage per phase', 'Printable progress report'],
    related: { to: '/dpwh', label: 'Back to dashboard' },
  },
  dpwhDocuments: {
    title: 'Documents', icon: 'files',
    description: 'Contracts, plans, variation orders and other project files.',
    planned: ['Upload of project documents', 'Document types and dates', 'Marking documents for public release'],
    related: { to: '/dpwh/projects', label: 'Go to projects' },
  },
  auditInspection: {
    title: 'Project inspection', icon: 'scanSearch',
    description: 'One project at a time: details, phases, finances, images and flag history.',
    planned: ['Full project record in one view', 'Flag history from the engine', 'Phase and payment timeline'],
    related: { to: '/auditor/queue', label: 'Open audit queue' },
  },
  auditEvidence: {
    title: '360° evidence review', icon: 'rotate360',
    description: 'Review the 360° images DPWH uploaded and approve them for public viewing.',
    planned: ['360° viewer for each site image', 'GPS distance and reused-image warnings', 'Approval of images for the public'],
    related: { to: '/auditor/queue', label: 'Open audit queue' },
  },
  auditDecisions: {
    title: 'Flag decisions', icon: 'flag',
    description: 'Confirm an automatic flag, or override it with a reason and evidence.',
    planned: ['Confirm the current automatic flag', 'Override with a reason of at least 10 characters', 'Attach audit evidence to every override'],
    related: { to: '/auditor/queue', label: 'Open audit queue' },
  },
  auditActions: {
    title: 'Corrective actions', icon: 'wrench',
    description: 'Actions required from DPWH after an audit finding, and their status.',
    planned: ['Corrective actions linked to findings', 'Assigned person and due date', 'Status updates from DPWH personnel'],
    related: { to: '/auditor', label: 'Back to dashboard' },
  },
  auditReports: {
    title: 'Audit reports', icon: 'fileCheck',
    description: 'Findings and outcomes of audits, ready for publication.',
    planned: ['Findings per project', 'Publishing reviewed findings to the public', 'Printable audit report'],
    related: { to: '/auditor', label: 'Back to dashboard' },
  },
  publicMap: {
    title: 'Project map', icon: 'map',
    description: 'Published projects on the map of Occidental Mindoro, colored by flag.',
    planned: ['OpenStreetMap of the province', 'A marker for every published project', 'Project details and 360° view from the marker'],
    related: { to: '/public/projects', label: 'Explore projects' },
  },
  publicGallery: {
    title: '360° site gallery', icon: 'image',
    description: 'Approved 360° site images of published projects.',
    planned: ['Gallery of approved 360° images', 'Interactive 360° viewer', 'Images grouped by project and date'],
    related: { to: '/public/projects', label: 'Explore projects' },
  },
  publicReports: {
    title: 'Published audit reports', icon: 'fileCheck',
    description: 'Audit findings that auditors have released to the public.',
    planned: ['Published findings per project', 'Corrective actions and their status'],
    related: { to: '/public/projects', label: 'Explore projects' },
  },
};

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pending" element={<PendingApproval />} />

      {/* Signed in and approved */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<ProtectedRoute allowedRoles={['administrator']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/roles" element={<RolesPermissionsPage />} />
            <Route path="/admin/activity" element={<PlaceholderPage {...COMING.adminActivity} />} />
            <Route path="/admin/reports" element={<PlaceholderPage {...COMING.adminReports} />} />
            <Route path="/admin/settings" element={<PlaceholderPage {...COMING.adminSettings} />} />
            <Route path="/admin/contractors" element={<ContractorsPage />} />
            <Route path="/admin/agencies" element={<AgenciesPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={PROJECT_EDITORS} />}>
            <Route path="/dpwh" element={<DpwhDashboard />} />
            <Route path="/dpwh/projects" element={<ProjectListPage />} />
            <Route path="/dpwh/projects/new" element={<ProjectFormPage />} />
            <Route path="/dpwh/projects/:id/edit" element={<ProjectFormPage />} />
            <Route path="/dpwh/contractors" element={<ContractorsPage />} />
            <Route path="/dpwh/updates" element={<PlaceholderPage {...COMING.dpwhUpdates} />} />
            <Route path="/dpwh/images" element={<PlaceholderPage {...COMING.dpwhImages} />} />
            <Route path="/dpwh/reports" element={<PlaceholderPage {...COMING.dpwhReports} />} />
            <Route path="/dpwh/documents" element={<PlaceholderPage {...COMING.dpwhDocuments} />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['auditor']} />}>
            <Route path="/auditor" element={<AuditorDashboard />} />
            <Route path="/auditor/queue" element={<AuditQueuePage />} />
            <Route path="/auditor/inspection" element={<PlaceholderPage {...COMING.auditInspection} />} />
            <Route path="/auditor/evidence" element={<PlaceholderPage {...COMING.auditEvidence} />} />
            <Route path="/auditor/decisions" element={<PlaceholderPage {...COMING.auditDecisions} />} />
            <Route path="/auditor/actions" element={<PlaceholderPage {...COMING.auditActions} />} />
            <Route path="/auditor/reports" element={<PlaceholderPage {...COMING.auditReports} />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['public_viewer']} />}>
            <Route path="/public" element={<PublicOverview />} />
            <Route path="/public/projects" element={<ExploreProjectsPage />} />
            <Route path="/public/map" element={<PlaceholderPage {...COMING.publicMap} />} />
            <Route path="/public/gallery" element={<PlaceholderPage {...COMING.publicGallery} />} />
            <Route path="/public/reports" element={<PlaceholderPage {...COMING.publicReports} />} />
            <Route path="/public/about" element={<AboutPage />} />
          </Route>
        </Route>
      </Route>

      {/* Anything else → login (which redirects signed-in users to their home) */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
