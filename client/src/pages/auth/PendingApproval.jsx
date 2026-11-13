import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeFor, ROLE_LABEL } from '../../lib/roles.js';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';
import Alert from '../../components/common/Alert.jsx';
import AuthShell from '../../components/auth/AuthShell.jsx';
import Icon from '../../components/ui/Icon.jsx';

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
  // Not approved and no request left: an administrator declined the registration.
  const declined = profile && profile.is_active && !profile.is_approved && !profile.requested_role;

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

  const state = deactivated
    ? { icon: 'power', wrap: 'bg-flag-red-soft text-flag-red-ink', title: 'Account deactivated' }
    : declined
      ? { icon: 'xCircle', wrap: 'bg-flag-red-soft text-flag-red-ink', title: 'Registration not approved' }
      : { icon: 'clock', wrap: 'bg-flag-yellow-soft text-flag-yellow-ink', title: 'Waiting for approval' };

  return (
    <AuthShell>
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${state.wrap}`}>
        <Icon name={state.icon} className="h-6 w-6" />
      </span>
      <h2 className="mt-4 font-display text-[1.75rem] leading-tight font-semibold text-ink">{state.title}</h2>

      {deactivated && (
        <p className="mt-2 text-sm text-ink-2">Your account has been deactivated. Please contact the administrator.</p>
      )}
      {declined && (
        <p className="mt-2 text-sm text-ink-2">
          An administrator did not approve this account. If you think this is a mistake, contact the administrator
          of the DPWH Occidental Mindoro office.
        </p>
      )}
      {!deactivated && !declined && (
        <div className="mt-2 space-y-2 text-sm text-ink-2">
          <p>
            Thank you for registering{profile?.full_name ? `, ${profile.full_name}` : ''}.
            {requested
              ? <> Your request for a <span className="font-semibold text-ink">{requested}</span> account is waiting for an administrator to approve it.</>
              : ' Your account is waiting for an administrator to approve it.'}
          </p>
          <p>You can sign in again later. Once approved, you will go straight to your dashboard.</p>
        </div>
      )}

      {note && <div className="mt-4"><Alert type="info">{note}</Alert></div>}

      <div className="mt-6 flex flex-wrap gap-3">
        {!deactivated && !declined && (
          <button type="button" className="btn-secondary" onClick={handleCheck} disabled={checking}>
            <Icon name="refresh" className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : 'Check again'}
          </button>
        )}
        <button type="button" className="btn-primary" onClick={handleSignOut}>
          <Icon name="logOut" className="h-4 w-4" />
          Sign out
        </button>
      </div>
      {profile?.email && <p className="mt-5 border-t border-line-soft pt-4 text-xs text-ink-3">Signed in as {profile.email}</p>}
    </AuthShell>
  );
}
