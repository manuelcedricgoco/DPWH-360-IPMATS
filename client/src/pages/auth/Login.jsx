import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeFor } from '../../lib/roles.js';
import { ApiError } from '../../lib/api.js';
import Alert from '../../components/common/Alert.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-dpwh-blue to-blue-700 px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-dpwh-blue">DPWH 360°</h1>
          <p className="mt-1 text-sm text-slate-600">Infrastructure Project Monitoring and Transparency System</p>
          <p className="text-xs text-slate-500">Occidental Mindoro</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <Alert type="error">{error}</Alert>}

          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          No account yet?{' '}
          <Link to="/register" className="font-medium text-dpwh-blue-light hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
