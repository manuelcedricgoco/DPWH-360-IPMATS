import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL } from '../lib/roles.js';

/** Temporary home page for a role until its real dashboard is built. */
export default function PlaceholderPage({ title, description }) {
  const { profile } = useAuth();
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {profile && (
        <p className="mt-4 text-sm text-slate-500">
          Signed in as <span className="font-medium">{profile.full_name || profile.email}</span> ({ROLE_LABEL[profile.role]})
        </p>
      )}
    </div>
  );
}
