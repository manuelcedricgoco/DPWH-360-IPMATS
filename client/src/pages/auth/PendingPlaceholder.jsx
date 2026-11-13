import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeFor } from '../../lib/roles.js';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

// Placeholder for /pending. Jonalyn replaces it with PendingApproval.jsx.
export default function PendingPlaceholder() {
  const { session, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.is_approved && profile?.is_active) return <Navigate to={homeFor(profile)} replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-lg border border-amber-200 bg-white p-6 text-center shadow">
        <h1 className="text-lg font-semibold text-slate-900">
          {profile && !profile.is_active ? 'Account deactivated' : 'Waiting for approval'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {profile && !profile.is_active
            ? 'Your account has been deactivated. Please contact the administrator.'
            : 'Your account is waiting for an administrator to approve it. Please check back later.'}
        </p>
        <button
          type="button"
          className="btn-secondary mt-4"
          onClick={async () => { await signOut(); navigate('/login', { replace: true }); }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
