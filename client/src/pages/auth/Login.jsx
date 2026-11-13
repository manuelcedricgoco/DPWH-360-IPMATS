import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeFor } from '../../lib/roles.js';
import { ApiError } from '../../lib/api.js';
import Alert from '../../components/common/Alert.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';
import AuthShell from '../../components/auth/AuthShell.jsx';
import PasswordInput from '../../components/auth/PasswordInput.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Icon from '../../components/ui/Icon.jsx';

// Supabase Auth messages → clear text for users.
function friendlyAuthError(error) {
  const message = error?.message || '';
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email address first. Check your inbox for the confirmation link.';
  if (/too many requests|rate limit/i.test(message)) return 'Too many attempts. Please wait a moment and try again.';
  if (/failed to fetch|network/i.test(message)) return 'Cannot reach the server. Check your internet connection.';
  return message || 'Sign-in failed. Please try again.';
}

export default function Login() {
  const { session, profile, loading, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Already signed in → go to the right page.
  if (!submitting && loading) return <LoadingScreen />;
  if (!submitting && session && profile) return <Navigate to={homeFor(profile)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const loaded = await signIn(email.trim(), password);
      if (!loaded.is_active) {
        await signOut();
        setError('Your account has been deactivated. Please contact the administrator.');
        return;
      }
      // Go back to the page the user tried to open, if any; ProtectedRoute re-checks the role.
      const from = location.state?.from?.pathname;
      navigate(loaded.is_approved && from ? from : homeFor(loaded), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError
        ? `Signed in, but your profile could not be loaded: ${err.message}`
        : friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <h2 className="font-display text-[1.75rem] leading-tight font-semibold text-ink">Sign in</h2>
      <p className="mt-1 text-sm text-ink-2">Use the email and password of your DPWH 360° account.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {error && <Alert type="error">{error}</Alert>}

        <div>
          <label htmlFor="email" className="label">Email</label>
          <div className="relative">
            <Icon name="mail" className="pointer-events-none absolute top-1/2 left-3 h-[18px] w-[18px] -translate-y-1/2 text-ink-3" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input pl-10"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="text-sm font-medium text-ink-2">Password</label>
            <button type="button" className="text-sm font-medium text-navy-700 hover:text-navy-600 hover:underline" onClick={() => setForgotOpen(true)}>
              Forgot password?
            </button>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <button type="submit" className="btn-primary w-full py-2.5 text-[15px]" disabled={submitting}>
          {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 border-t border-line-soft pt-5 text-center text-sm text-ink-2">
        No account yet?{' '}
        <Link to="/register" className="link">Create an account</Link>
      </div>

      <ConfirmDialog
        open={forgotOpen}
        title="Reset your password"
        icon="lock"
        confirmLabel="Close"
        cancelLabel={null}
        onConfirm={() => setForgotOpen(false)}
        onCancel={() => setForgotOpen(false)}
      >
        <p>
          Self-service password reset is not available in this portal yet. Ask the system administrator of
          the DPWH Occidental Mindoro office to help you regain access to your account.
        </p>
      </ConfirmDialog>
    </AuthShell>
  );
}
