import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { computeTargetDate, formatDate, formatPeso, PROJECT_STATUSES, PROJECT_TYPES } from '../../lib/format.js';
import Alert from '../../components/common/Alert.jsx';

// Occidental Mindoro bounds (same as the database check constraints).
const LAT_MIN = 12.1;
const LAT_MAX = 13.95;
const LNG_MIN = 119.95;
const LNG_MAX = 121.2;

const EMPTY_FORM = {
  project_code: '',
  contract_reference_no: '',
  name: '',
  description: '',
  project_type: '',
  agency_id: '',
  contractor_id: '',
  approved_budget: '',
  contract_amount: '',
  municipality_id: '',
  barangay_id: '',
  latitude: '',
  longitude: '',
  notice_to_proceed: '',
  duration_days: '',
  status: 'active',
};

const toText = (value) => (value === null || value === undefined ? '' : String(value));

function validate(form) {
  const errors = {};
  const required = {
    project_code: 'Project code is required',
    name: 'Project name is required',
    project_type: 'Select a project type',
    agency_id: 'Select an implementing agency',
    approved_budget: 'Approved budget is required',
    municipality_id: 'Select a municipality',
    latitude: 'Latitude is required',
    longitude: 'Longitude is required',
    duration_days: 'Duration is required',
  };
  Object.entries(required).forEach(([field, message]) => {
    if (!String(form[field]).trim()) errors[field] = message;
  });

  const budget = Number(form.approved_budget);
  const amount = Number(form.contract_amount);
  if (form.approved_budget !== '' && !(budget > 0)) errors.approved_budget = 'Approved budget must be greater than 0';
  if (form.contract_amount !== '') {
    if (!(amount > 0)) errors.contract_amount = 'Contract amount must be greater than 0';
    else if (budget > 0 && amount > budget) errors.contract_amount = 'Contract amount must not exceed the approved budget';
  }

  if (form.latitude !== '') {
    const lat = Number(form.latitude);
    if (!Number.isFinite(lat) || lat < LAT_MIN || lat > LAT_MAX) {
      errors.latitude = `Latitude must be between ${LAT_MIN.toFixed(2)} and ${LAT_MAX.toFixed(2)} (Occidental Mindoro)`;
    }
  }
  if (form.longitude !== '') {
    const lng = Number(form.longitude);
    if (!Number.isFinite(lng) || lng < LNG_MIN || lng > LNG_MAX) {
      errors.longitude = `Longitude must be between ${LNG_MIN.toFixed(2)} and ${LNG_MAX.toFixed(2)} (Occidental Mindoro)`;
    }
  }

  if (form.duration_days !== '') {
    const days = Number(form.duration_days);
    if (!Number.isInteger(days) || days <= 0) errors.duration_days = 'Duration must be a whole number of days greater than 0';
  }
  return errors;
}

// Form state → API body. Empty optional fields are sent as null.
function toPayload(form) {
  const orNull = (value) => (String(value).trim() === '' ? null : String(value).trim());
  const numOrNull = (value) => (String(value).trim() === '' ? null : Number(value));
  return {
    project_code: form.project_code.trim(),
    contract_reference_no: orNull(form.contract_reference_no),
    name: form.name.trim(),
    description: orNull(form.description),
    project_type: form.project_type,
    agency_id: form.agency_id,
    contractor_id: orNull(form.contractor_id),
    approved_budget: Number(form.approved_budget),
    contract_amount: numOrNull(form.contract_amount),
    municipality_id: Number(form.municipality_id),
    barangay_id: numOrNull(form.barangay_id),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    notice_to_proceed: orNull(form.notice_to_proceed),
    duration_days: Number(form.duration_days),
    status: form.status,
  };
}

function Field({ id, label, required, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export default function ProjectFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState({ message: '', list: [] });
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [agencies, setAgencies] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // Load dropdown options and, when editing, the project.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, c, m, project] = await Promise.all([
          api('/agencies'),
          api('/contractors'),
          api('/lookups/municipalities'),
          isEdit ? api(`/projects/${id}`) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setAgencies(a.data);
        setContractors(c.data);
        setMunicipalities(m.data);
        if (project) {
          const p = project.data;
          setForm(Object.fromEntries(Object.keys(EMPTY_FORM).map((key) => [key, toText(p[key])])));
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  // Barangays of the selected municipality.
  useEffect(() => {
    if (!form.municipality_id) {
      setBarangays([]);
      return;
    }
    let cancelled = false;
    api('/lookups/barangays', { query: { municipality_id: form.municipality_id } })
      .then(({ data }) => { if (!cancelled) setBarangays(data); })
      .catch(() => { if (!cancelled) setBarangays([]); });
    return () => { cancelled = true; };
  }, [form.municipality_id]);

  const targetDate = useMemo(
    () => computeTargetDate(form.notice_to_proceed, form.duration_days),
    [form.notice_to_proceed, form.duration_days],
  );

  const update = (name) => (event) => {
    const value = event.target.value;
    setForm((f) => ({
      ...f,
      [name]: value,
      // A barangay belongs to one municipality, so reset it when the municipality changes.
      ...(name === 'municipality_id' ? { barangay_id: '' } : {}),
    }));
    if (fieldErrors[name]) setFieldErrors((errs) => ({ ...errs, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError({ message: '', list: [] });

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    setSaving(true);
    try {
      const body = toPayload(form);
      const { data } = isEdit
        ? await api(`/projects/${id}`, { method: 'PATCH', body })
        : await api('/projects', { method: 'POST', body });
      navigate('/dpwh/projects', {
        state: { flash: `Project ${data?.project_code || body.project_code} was ${isEdit ? 'updated' : 'registered'}.` },
      });
    } catch (err) {
      setServerError({ message: err.message, list: err.errors || [] });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (name) => `input ${fieldErrors[name] ? 'input-error' : ''}`;
  const aria = (name) => (fieldErrors[name] ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` } : {});

  if (loading) return <p className="text-sm text-slate-600">Loading…</p>;
  if (loadError) {
    return (
      <div className="max-w-xl space-y-4">
        <Alert type="error">{loadError}</Alert>
        <Link to="/dpwh/projects" className="btn-secondary">Back to projects</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <Link to="/dpwh/projects" className="text-sm text-dpwh-blue-light hover:underline">← Back to projects</Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{isEdit ? 'Edit project' : 'Register project'}</h1>
        <p className="text-sm text-slate-600">Fields marked <span className="text-red-600">*</span> are required.</p>
      </div>

      {serverError.message && <Alert type="error" messages={serverError.list}>{serverError.message}</Alert>}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Identification */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Project identification</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="project_code" label="Project code (DPWH ID)" required error={fieldErrors.project_code}>
              <input id="project_code" className={inputClass('project_code')} value={form.project_code} onChange={update('project_code')} maxLength={50} {...aria('project_code')} />
            </Field>
            <Field id="contract_reference_no" label="Contract reference no." error={fieldErrors.contract_reference_no}>
              <input id="contract_reference_no" className={inputClass('contract_reference_no')} value={form.contract_reference_no} onChange={update('contract_reference_no')} maxLength={100} />
            </Field>
            <div className="sm:col-span-2">
              <Field id="name" label="Project name" required error={fieldErrors.name}>
                <input id="name" className={inputClass('name')} value={form.name} onChange={update('name')} maxLength={300} {...aria('name')} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field id="description" label="Description">
                <textarea id="description" rows={3} className="input" value={form.description} onChange={update('description')} maxLength={5000} />
              </Field>
            </div>
            <Field id="project_type" label="Project type" required error={fieldErrors.project_type}>
              <select id="project_type" className={inputClass('project_type')} value={form.project_type} onChange={update('project_type')} {...aria('project_type')}>
                <option value="">Select type…</option>
                {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field id="status" label="Status" required>
              <select id="status" className="input" value={form.status} onChange={update('status')}>
                {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>
        </section>

        {/* Agency and contractor */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Agency and contractor</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="agency_id" label="Implementing agency" required error={fieldErrors.agency_id}>
              <select id="agency_id" className={inputClass('agency_id')} value={form.agency_id} onChange={update('agency_id')} {...aria('agency_id')}>
                <option value="">Select agency…</option>
                {agencies.filter((a) => a.is_active || a.agency_id === form.agency_id).map((a) => (
                  <option key={a.agency_id} value={a.agency_id}>
                    {a.acronym ? `${a.acronym} – ${a.name}` : a.name}{a.is_active ? '' : ' (inactive)'}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="contractor_id" label="Contractor" hint="Leave empty if not yet awarded.">
              <select id="contractor_id" className="input" value={form.contractor_id} onChange={update('contractor_id')}>
                <option value="">No contractor yet</option>
                {contractors.filter((c) => c.is_active || c.contractor_id === form.contractor_id).map((c) => (
                  <option key={c.contractor_id} value={c.contractor_id}>
                    {c.name}{c.is_active ? '' : ' (inactive)'}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Budget */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Budget</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="approved_budget" label="Approved budget (₱)" required error={fieldErrors.approved_budget}
              hint={form.approved_budget ? formatPeso(form.approved_budget) : undefined}>
              <input id="approved_budget" type="number" min="0.01" step="0.01" inputMode="decimal" className={inputClass('approved_budget')}
                value={form.approved_budget} onChange={update('approved_budget')} {...aria('approved_budget')} />
            </Field>
            <Field id="contract_amount" label="Contract amount (₱)" error={fieldErrors.contract_amount}
              hint={form.contract_amount ? formatPeso(form.contract_amount) : 'Must not exceed the approved budget.'}>
              <input id="contract_amount" type="number" min="0.01" step="0.01" inputMode="decimal" className={inputClass('contract_amount')}
                value={form.contract_amount} onChange={update('contract_amount')} {...aria('contract_amount')} />
            </Field>
          </div>
        </section>

        {/* Location */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Location</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="municipality_id" label="Municipality" required error={fieldErrors.municipality_id}>
              <select id="municipality_id" className={inputClass('municipality_id')} value={form.municipality_id} onChange={update('municipality_id')} {...aria('municipality_id')}>
                <option value="">Select municipality…</option>
                {municipalities.map((m) => <option key={m.municipality_id} value={m.municipality_id}>{m.name}</option>)}
              </select>
            </Field>
            <Field id="barangay_id" label="Barangay" hint={!form.municipality_id ? 'Select a municipality first.' : undefined}>
              <select id="barangay_id" className="input" value={form.barangay_id} onChange={update('barangay_id')} disabled={!form.municipality_id}>
                <option value="">{barangays.length ? 'Select barangay…' : 'No barangay'}</option>
                {barangays.map((b) => <option key={b.barangay_id} value={b.barangay_id}>{b.name}</option>)}
              </select>
            </Field>
            <Field id="latitude" label="Latitude" required error={fieldErrors.latitude} hint={`Between ${LAT_MIN.toFixed(2)} and ${LAT_MAX.toFixed(2)}`}>
              <input id="latitude" type="number" step="0.000001" inputMode="decimal" className={inputClass('latitude')}
                value={form.latitude} onChange={update('latitude')} {...aria('latitude')} />
            </Field>
            <Field id="longitude" label="Longitude" required error={fieldErrors.longitude} hint={`Between ${LNG_MIN.toFixed(2)} and ${LNG_MAX.toFixed(2)}`}>
              <input id="longitude" type="number" step="0.000001" inputMode="decimal" className={inputClass('longitude')}
                value={form.longitude} onChange={update('longitude')} {...aria('longitude')} />
            </Field>
          </div>
        </section>

        {/* Schedule */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Schedule</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="notice_to_proceed" label="Notice to proceed (NTP)">
              <input id="notice_to_proceed" type="date" className="input" value={form.notice_to_proceed} onChange={update('notice_to_proceed')} />
            </Field>
            <Field id="duration_days" label="Duration (calendar days)" required error={fieldErrors.duration_days}>
              <input id="duration_days" type="number" min="1" step="1" inputMode="numeric" className={inputClass('duration_days')}
                value={form.duration_days} onChange={update('duration_days')} {...aria('duration_days')} />
            </Field>
            <Field id="target_completion_date" label="Target completion date" hint="Computed: NTP + duration − 1. Read-only.">
              <input id="target_completion_date" className="input" readOnly disabled
                value={targetDate ? formatDate(targetDate) : 'Set when NTP and duration are entered'} />
            </Field>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Link to="/dpwh/projects" className="btn-secondary">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Register project'}
          </button>
        </div>
      </form>
    </div>
  );
}
