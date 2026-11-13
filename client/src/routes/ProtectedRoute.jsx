import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homeFor } from '../lib/roles.js';
import LoadingScreen from '../components/common/LoadingScreen.jsx';
import Alert from '../components/common/Alert.jsx';

/**
 * <Route element={<ProtectedRoute allowedRoles={['administrator', 'dpwh_personnel']} />}> … </Route>
 * - not logged in      → /login
 * - not approved       → /pending
 * - wrong role         → that role's home page
 * Without allowedRoles, any approved user may enter.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { session, profile, profileError, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;

  if (!profile) {
    return (
      <div className="mx-auto mt-24 max-w-md space-y-4 px-4">
        <Alert type="error">Could not load your profile: {profileError || 'unknown error'}</Alert>
        <button type="button" className="btn-secondary" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  if (!profile.is_approved || !profile.is_active) return <Navigate to="/pending" replace />;
  if (allowedRoles && !allowedRoles.includes(profile.role)) return <Navigate to={homeFor(profile)} replace />;

  return children ?? <Outlet />;
}
