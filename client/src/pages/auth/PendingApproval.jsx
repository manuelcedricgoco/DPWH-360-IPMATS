import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeFor, ROLE_LABEL } from '../../lib/roles.js';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';
import Alert from '../../components/common/Alert.jsx';

// /pending – shown to signed-in users whose account is not approved yet (or is deactivated).
export default function PendingApproval() {
  const { session, profile, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState('');

  if (loading && !checking) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.is_approved && profile?.is_active) return <Navigate to={homeFor(profile)} replace />;

  const deactivated = profile && !profile.is_active;
  const requested = ROLE_LABEL[profile?.requested_role];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // Re-load the profile in case an administrator approved the account meanwhile.
  const handleCheck = async () => {
    setChecking(true);
    setNote('');
    try {
      const updated = await refreshProfile();
      if (!updated?.is_approved) setNote('Your account is still waiting for approval.');
    } catch (err) {
      setNote(`Could not check your status: ${err.message}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${deactivated ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            {deactivated
              ? <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" strokeLinecap="round" />
              : <path d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" />}
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-slate-900">
          {deactivated ? 'Account deactivated' : 'Waiting for approval'}
        </h1>

        {deactivated ? (
          <p className="mt-2 text-sm text-slate-600">Your account has been deactivated. Please contact the administrator.</p>
        ) : (
          <div className="mt-2 space-y-2 text-sm text-slate-600">
            <p>
              Thank you for registering{profile?.full_name ? `, ${profile.full_name}` : ''}.
              {requested
                ? <> Your request for a <span className="font-medium text-slate-900">{requested}</span> account is waiting for an administrator to approve it.</>
                : ' Your account is waiting for an administrator to approve it.'}
            </p>
            <p>You can sign in again later. Once approved, you will go straight to your dashboard.</p>
          </div>
        )}

        {note && <div className="mt-4 text-left"><Alert type="info">{note}</Alert></div>}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!deactivated && (
            <button type="button" className="btn-secondary" onClick={handleCheck} disabled={checking}>
              {checking ? 'Checking…' : 'Check again'}
            </button>
          )}
          <button type="button" className="btn-primary" onClick={handleSignOut}>Sign out</button>
        </div>
        {profile?.email && <p className="mt-4 text-xs text-slate-500">Signed in as {profile.email}</p>}
      </div>
    </div>
  );
}
