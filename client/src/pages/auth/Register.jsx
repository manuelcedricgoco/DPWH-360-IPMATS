import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeFor } from '../../lib/roles.js';
import { isEmail } from '../../lib/useRecords.js';
import Alert from '../../components/common/Alert.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

const ROLE_OPTIONS = [
  { value: 'dpwh_personnel', label: 'DPWH Personnel', hint: 'Register and update projects. Needs administrator approval.' },
  { value: 'auditor', label: 'Auditor', hint: 'Review flagged projects and audit findings. Needs administrator approval.' },
  { value: 'public_viewer', label: 'Public Viewer only', hint: 'View published projects. Active right away.' },
];

const MIN_PASSWORD = 8;

function validate(form) {
  const errors = {};
  if (!form.full_name.trim()) errors.full_name = 'Full name is required';
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!isEmail(form.email)) errors.email = 'Enter a valid email address';
  if (form.password.length < MIN_PASSWORD) errors.password = `Password must be at least ${MIN_PASSWORD} characters`;
  if (form.confirm_password !== form.password) errors.confirm_password = 'Passwords do not match';
  if (form.requested_role !== 'public_viewer' && !form.office.trim()) {
    errors.office = 'Office is required for DPWH personnel and auditor accounts';
  }
  return errors;
}

function friendlySignUpError(error) {
  const message = error?.message || '';
  if (/already registered|already exists/i.test(message)) return 'An account with this email already exists. Please sign in instead.';
  if (/password/i.test(message) && /(weak|pwned|leaked|known)/i.test(message)) {
    return 'This password is too weak or has appeared in a data breach. Please choose a different password.';
  }
  if (/rate limit|too many/i.test(message)) return 'Too many sign-up attempts. Please wait a few minutes and try again.';
  if (/failed to fetch|network/i.test(message)) return 'Cannot reach the server. Check your internet connection.';
  return message || 'Registration failed. Please try again.';
}

export default function Register() {
  const { session, profile, loading } = useAuth();
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '', office: '', requested_role: 'dpwh_personnel',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { privileged, roleLabel, needsEmailConfirm, signedIn }

  // Already signed in (and not just registered) → go home.
  if (!result && !submitting) {
    if (loading) return <LoadingScreen />;
    if (session && profile) return <Navigate to={homeFor(profile)} replace />;
  }

  const update = (name) => (event) => {
    setForm((f) => ({ ...f, [name]: event.target.value }));
    if (fieldErrors[name]) setFieldErrors((errs) => ({ ...errs, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    const privileged = form.requested_role !== 'public_viewer';
    const metadata = { full_name: form.full_name.trim(), office: form.office.trim() || undefined };
    // Only 'dpwh_personnel' or 'auditor' is sent; public viewers send no requested_role.
    if (privileged) metadata.requested_role = form.requested_role;

    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: metadata },
      });
      if (signUpError) throw signUpError;
      // With email confirmation on, Supabase returns a user with no identities for an existing email.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('User already registered');
      }
      setResult({
        privileged,
        roleLabel: ROLE_OPTIONS.find((r) => r.value === form.requested_role)?.label,
        needsEmailConfirm: !data.session,
        signedIn: Boolean(data.session),
      });
    } catch (err) {
      setError(friendlySignUpError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (name) => `input ${fieldErrors[name] ? 'input-error' : ''}`;
  const fieldError = (name) => fieldErrors[name] && (
    <p id={`${name}-error`} className="mt-1 text-xs text-red-600">{fieldErrors[name]}</p>
  );
  const aria = (name) => (fieldErrors[name] ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` } : {});

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-dpwh-blue to-blue-700 px-4 py-10">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-dpwh-blue">Create an account</h1>
          <p className="mt-1 text-sm text-slate-600">DPWH 360° – Occidental Mindoro</p>
        </div>

        {result ? (
          <div className="space-y-4">
            <Alert type="success">Registration received.</Alert>
            {result.privileged ? (
              <p className="text-sm text-slate-700">
                Your request for a <span className="font-semibold">{result.roleLabel}</span> account must be approved by an
                administrator. Until it is approved, you will see a “waiting for approval” page after signing in.
              </p>
            ) : (
              <p className="text-sm text-slate-700">Your public viewer account is ready.</p>
            )}
            {result.needsEmailConfirm && (
              <Alert type="info">
                We sent a confirmation link to {form.email.trim()}. Please confirm your email address before signing in.
              </Alert>
            )}
            <Link to="/login" className="btn-primary w-full">
              {result.signedIn ? 'Continue' : 'Go to sign in'}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && <Alert type="error">{error}</Alert>}

            <div>
              <label htmlFor="full_name" className="label">Full name <span className="text-red-600">*</span></label>
              <input id="full_name" autoComplete="name" className={inputClass('full_name')} value={form.full_name}
                onChange={update('full_name')} maxLength={150} disabled={submitting} {...aria('full_name')} />
              {fieldError('full_name')}
            </div>

            <div>
              <label htmlFor="email" className="label">Email <span className="text-red-600">*</span></label>
              <input id="email" type="email" autoComplete="email" className={inputClass('email')} value={form.email}
                onChange={update('email')} disabled={submitting} {...aria('email')} />
              {fieldError('email')}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className="label">Password <span className="text-red-600">*</span></label>
                <input id="password" type="password" autoComplete="new-password" className={inputClass('password')}
                  value={form.password} onChange={update('password')} disabled={submitting} {...aria('password')} />
                {fieldError('password') || <p className="mt-1 text-xs text-slate-500">At least {MIN_PASSWORD} characters.</p>}
              </div>
              <div>
                <label htmlFor="confirm_password" className="label">Confirm password <span className="text-red-600">*</span></label>
                <input id="confirm_password" type="password" autoComplete="new-password" className={inputClass('confirm_password')}
                  value={form.confirm_password} onChange={update('confirm_password')} disabled={submitting} {...aria('confirm_password')} />
                {fieldError('confirm_password')}
              </div>
            </div>

            <fieldset>
              <legend className="label">Account type <span className="text-red-600">*</span></legend>
              <div className="space-y-2">
                {ROLE_OPTIONS.map((role) => (
                  <label
                    key={role.value}
                    className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm ${
                      form.requested_role === role.value ? 'border-dpwh-blue-light bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="requested_role"
                      value={role.value}
                      checked={form.requested_role === role.value}
                      onChange={update('requested_role')}
                      disabled={submitting}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block font-medium text-slate-900">{role.label}</span>
                      <span className="block text-slate-600">{role.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="office" className="label">
                Office {form.requested_role !== 'public_viewer' && <span className="text-red-600">*</span>}
              </label>
              <input id="office" className={inputClass('office')} value={form.office} onChange={update('office')}
                maxLength={200} placeholder="e.g. Occidental Mindoro District Engineering Office"
                disabled={submitting} {...aria('office')} />
              {fieldError('office')}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-dpwh-blue-light hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
