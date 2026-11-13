import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeFor } from '../../lib/roles.js';
import { isEmail } from '../../lib/useRecords.js';
import Alert from '../../components/common/Alert.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';
import AuthShell from '../../components/auth/AuthShell.jsx';
import PasswordInput from '../../components/auth/PasswordInput.jsx';
import Icon from '../../components/ui/Icon.jsx';

const ROLE_OPTIONS = [
  { value: 'dpwh_personnel', label: 'DPWH Personnel', icon: 'hardHat', hint: 'Register and update projects. Needs administrator approval.' },
  { value: 'auditor', label: 'Auditor', icon: 'clipboardList', hint: 'Review flagged projects and audit findings. Needs administrator approval.' },
  { value: 'public_viewer', label: 'Public Viewer only', icon: 'globe', hint: 'View published projects. Active right away.' },
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

function Step({ done, title, children }) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        done ? 'bg-flag-green text-white' : 'border-2 border-navy-200 bg-white text-navy-700'}`}
      >
        {done ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
      <div className="-mt-0.5">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {children && <p className="mt-0.5 text-sm text-ink-2">{children}</p>}
      </div>
    </li>
  );
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
    <p id={`${name}-error`} className="field-error">{fieldErrors[name]}</p>
  );
  const aria = (name) => (fieldErrors[name] ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` } : {});
  const required = <span className="text-flag-red" aria-hidden="true">*</span>;
  const passwordLongEnough = form.password.length >= MIN_PASSWORD;

  if (result) {
    return (
      <AuthShell wide>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-flag-green-soft text-flag-green-ink">
            <Icon name="checkCircle" className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-display text-[1.75rem] leading-tight font-semibold text-ink">Registration received</h2>
            <p className="text-sm text-ink-2">{form.email.trim()}</p>
          </div>
        </div>

        {result.privileged ? (
          <>
            <div className="mt-6 rounded-lg border border-flag-yellow/40 bg-flag-yellow-soft px-4 py-3 text-sm text-flag-yellow-ink">
              <p className="flex items-center gap-2 font-semibold"><Icon name="clock" className="h-4 w-4" /> Pending administrator approval</p>
              <p className="mt-1">
                Your request for a <span className="font-semibold">{result.roleLabel}</span> account must be approved by an
                administrator. Until then you will see a “waiting for approval” page after signing in.
              </p>
            </div>
            <ol className="relative mt-6 before:absolute before:top-3 before:bottom-3 before:left-3 before:w-px before:bg-line">
              <Step done title="Account created" />
              {result.needsEmailConfirm && (
                <Step title="Confirm your email address">We sent a confirmation link to {form.email.trim()}.</Step>
              )}
              <Step title="Administrator review">An administrator checks your details and approves your {result.roleLabel} access.</Step>
              <Step title="Sign in">Once approved, signing in takes you straight to your dashboard.</Step>
            </ol>
          </>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-ink-2">Your public viewer account is ready.</p>
            {result.needsEmailConfirm && (
              <Alert type="info">
                We sent a confirmation link to {form.email.trim()}. Please confirm your email address before signing in.
              </Alert>
            )}
          </div>
        )}

        <Link to="/login" className="btn-primary mt-7 w-full py-2.5 text-[15px]">
          {result.signedIn ? 'Continue' : 'Go to sign in'}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell wide>
      <h2 className="font-display text-[1.75rem] leading-tight font-semibold text-ink">Create an account</h2>
      <p className="mt-1 text-sm text-ink-2">
        Fields marked {required} are required. DPWH personnel and auditor accounts are activated after an administrator approves them.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {error && <Alert type="error">{error}</Alert>}

        <fieldset>
          <legend className="label">Account type {required}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {ROLE_OPTIONS.map((role) => {
              const checked = form.requested_role === role.value;
              return (
                <label
                  key={role.value}
                  className={`relative flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-sm transition-[border-color,background-color,box-shadow] duration-150
                    has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-navy-100
                    ${checked ? 'border-navy-600 bg-navy-50 shadow-[inset_0_0_0_1px_var(--color-navy-600)]' : 'border-line hover:border-navy-200 hover:bg-canvas'}`}
                >
                  <input
                    type="radio"
                    name="requested_role"
                    value={role.value}
                    checked={checked}
                    onChange={update('requested_role')}
                    disabled={submitting}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between">
                    <Icon name={role.icon} className={`h-5 w-5 ${checked ? 'text-navy-700' : 'text-ink-3'}`} />
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${checked ? 'border-navy-700' : 'border-line'}`} aria-hidden="true">
                      {checked && <span className="h-1.5 w-1.5 rounded-full bg-navy-700" />}
                    </span>
                  </span>
                  <span className="font-semibold text-ink">{role.label}</span>
                  <span className="text-xs leading-snug text-ink-2">{role.hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="full_name" className="label">Full name {required}</label>
            <input id="full_name" autoComplete="name" className={inputClass('full_name')} value={form.full_name}
              onChange={update('full_name')} maxLength={150} disabled={submitting} {...aria('full_name')} />
            {fieldError('full_name')}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="email" className="label">Email {required}</label>
            <input id="email" type="email" autoComplete="email" className={inputClass('email')} value={form.email}
              onChange={update('email')} disabled={submitting} {...aria('email')} />
            {fieldError('email')}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="office" className="label">
              Office {form.requested_role !== 'public_viewer' ? required : <span className="font-normal text-ink-3">(optional)</span>}
            </label>
            <input id="office" className={inputClass('office')} value={form.office} onChange={update('office')}
              maxLength={200} placeholder="e.g. Occidental Mindoro District Engineering Office"
              disabled={submitting} {...aria('office')} />
            {fieldError('office')}
          </div>

          <div>
            <label htmlFor="password" className="label">Password {required}</label>
            <PasswordInput id="password" autoComplete="new-password" className={inputClass('password')}
              value={form.password} onChange={update('password')} disabled={submitting} {...aria('password')} />
            {fieldError('password') || (
              <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${passwordLongEnough ? 'text-flag-green-ink' : 'text-ink-3'}`}>
                <Icon name={passwordLongEnough ? 'checkCircle' : 'info'} className="h-3.5 w-3.5" />
                At least {MIN_PASSWORD} characters
              </p>
            )}
          </div>
          <div>
            <label htmlFor="confirm_password" className="label">Confirm password {required}</label>
            <PasswordInput id="confirm_password" autoComplete="new-password" className={inputClass('confirm_password')}
              value={form.confirm_password} onChange={update('confirm_password')} disabled={submitting} {...aria('confirm_password')} />
            {fieldError('confirm_password')}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-2.5 text-[15px]" disabled={submitting}>
          {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="mt-6 border-t border-line-soft pt-5 text-center text-sm text-ink-2">
        Already have an account?{' '}
        <Link to="/login" className="link">Sign in</Link>
      </div>
    </AuthShell>
  );
}
