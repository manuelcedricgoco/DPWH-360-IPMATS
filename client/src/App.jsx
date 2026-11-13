import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import PendingApproval from './pages/auth/PendingApproval.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import ProjectListPage from './pages/dpwh/ProjectListPage.jsx';
import ProjectFormPage from './pages/dpwh/ProjectFormPage.jsx';
import ContractorsPage from './pages/admin/ContractorsPage.jsx';
import AgenciesPage from './pages/admin/AgenciesPage.jsx';

const PROJECT_EDITORS = ['administrator', 'dpwh_personnel'];

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
            <Route path="/admin" element={<PlaceholderPage title="Administrator dashboard" description="User approvals, agencies and contractors will be managed here." />} />
            <Route path="/admin/contractors" element={<ContractorsPage />} />
            <Route path="/admin/agencies" element={<AgenciesPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={PROJECT_EDITORS} />}>
            <Route path="/dpwh" element={<Navigate to="/dpwh/projects" replace />} />
            <Route path="/dpwh/projects" element={<ProjectListPage />} />
            <Route path="/dpwh/projects/new" element={<ProjectFormPage />} />
            <Route path="/dpwh/projects/:id/edit" element={<ProjectFormPage />} />
            <Route path="/dpwh/contractors" element={<ContractorsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['auditor']} />}>
            <Route path="/auditor" element={<PlaceholderPage title="Auditor dashboard" description="Flagged projects and audit findings will be shown here." />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['public_viewer']} />}>
            <Route path="/public" element={<PlaceholderPage title="Public projects" description="The public map of published projects will be shown here." />} />
          </Route>
        </Route>
      </Route>

      {/* Anything else → login (which redirects signed-in users to their home) */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
