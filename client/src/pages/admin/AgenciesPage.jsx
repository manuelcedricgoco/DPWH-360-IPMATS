import { useState } from 'react';
import { api } from '../../lib/api.js';
import { isEmail, toBody, useRecords } from '../../lib/useRecords.js';
import { formatDate, labelOf } from '../../lib/format.js';
import Alert from '../../components/common/Alert.jsx';
import Modal from '../../components/common/Modal.jsx';
import DetailList, { ActiveBadge } from '../../components/common/DetailList.jsx';

// Same values as the database check constraint on implementing_agencies.office_type.
const OFFICE_TYPES = [
  { value: 'regional_office', label: 'Regional Office' },
  { value: 'district_engineering_office', label: 'District Engineering Office' },
  { value: 'provincial_office', label: 'Provincial Office' },
  { value: 'central_office', label: 'Central Office' },
  { value: 'other', label: 'Other' },
];

const EMPTY = {
  name: '',
  acronym: '',
  office_type: 'district_engineering_office',
  address: '',
  contact_email: '',
  contact_phone: '',
  is_active: true,
};

const toForm = (record) => Object.fromEntries(
  Object.keys(EMPTY).map((key) => [key, key === 'is_active' ? record[key] !== false : record[key] ?? EMPTY[key]]),
);

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Agency name is required';
  if (!form.office_type) errors.office_type = 'Select an office type';
  if (form.contact_email.trim() && !isEmail(form.contact_email)) errors.contact_email = 'Enter a valid email address';
  return errors;
}

export default function AgenciesPage() {
  const { records, loading, error, search, setSearch, reload } = useRecords('/agencies');

  // panel: null | { mode: 'view' | 'add' | 'edit', record }
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState({ message: '', list: [] });
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  const open = (mode, record = null) => {
    setPanel({ mode, record });
    setForm(record ? toForm(record) : EMPTY);
    setFieldErrors({});
    setSaveError({ message: '', list: [] });
  };
  const close = () => setPanel(null);

  const update = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((f) => ({ ...f, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((errs) => ({ ...errs, [name]: undefined }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setBusy(true);
    setSaveError({ message: '', list: [] });
    try {
      const body = toBody(form);
      const { data } = panel.mode === 'edit'
        ? await api(`/agencies/${panel.record.agency_id}`, { method: 'PATCH', body })
        : await api('/agencies', { method: 'POST', body });
      setFlash(`Agency "${data.name}" was ${panel.mode === 'edit' ? 'updated' : 'added'}.`);
      close();
      reload();
    } catch (err) {
      setSaveError({
        message: err.status === 409 ? 'An agency with this name already exists.' : err.message,
        list: err.errors || [],
      });
    } finally {
      setBusy(false);
    }
  };

  const inputClass = (name) => `input ${fieldErrors[name] ? 'input-error' : ''}`;
  const isForm = panel?.mode === 'add' || panel?.mode === 'edit';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Implementing agencies</h1>
          <p className="text-sm text-slate-600">DPWH offices that implement projects</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => open('add')}>+ Add agency</button>
      </div>

      {flash && <Alert type="success">{flash}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full sm:w-80">
          <label htmlFor="agency-search" className="label">Search</label>
          <input
            id="agency-search"
            type="search"
            className="input"
            placeholder="Name or acronym"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-slate-600">{loading ? 'Loading…' : `${records.length} agenc${records.length === 1 ? 'y' : 'ies'}`}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Acronym</th>
              <th className="px-3 py-3">Office type</th>
              <th className="px-3 py-3">Address</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3">Active</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!loading && !error && records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                  {search ? 'No agencies match your search.' : 'No agencies yet. Add the first one.'}
                </td>
              </tr>
            )}
            {records.map((a) => (
              <tr key={a.agency_id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-900">{a.name}</td>
                <td className="whitespace-nowrap px-3 py-2">{a.acronym || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2">{labelOf(OFFICE_TYPES, a.office_type)}</td>
                <td className="px-3 py-2">{a.address || '—'}</td>
                <td className="px-3 py-2">
                  {a.contact_email || a.contact_phone ? (
                    <div className="space-y-0.5">
                      {a.contact_email && <div>{a.contact_email}</div>}
                      {a.contact_phone && <div className="text-slate-500">{a.contact_phone}</div>}
                    </div>
                  ) : '—'}
                </td>
                <td className="px-3 py-2"><ActiveBadge active={a.is_active} /></td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <div className="flex justify-end gap-3">
                    <button type="button" className="text-dpwh-blue-light hover:underline" onClick={() => open('view', a)}>View</button>
                    <button type="button" className="text-dpwh-blue-light hover:underline" onClick={() => open('edit', a)}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View details */}
      <Modal
        open={panel?.mode === 'view'}
        title="Agency details"
        onClose={close}
        footer={panel?.record && (
          <button type="button" className="btn-primary" onClick={() => open('edit', panel.record)}>Edit</button>
        )}
      >
        {panel?.record && (
          <DetailList items={[
            { label: 'Name', value: panel.record.name },
            { label: 'Acronym', value: panel.record.acronym },
            { label: 'Office type', value: labelOf(OFFICE_TYPES, panel.record.office_type) },
            { label: 'Address', value: panel.record.address },
            { label: 'Email', value: panel.record.contact_email },
            { label: 'Phone', value: panel.record.contact_phone },
            { label: 'Status', value: <ActiveBadge active={panel.record.is_active} /> },
            { label: 'Added', value: formatDate(panel.record.created_at) },
            { label: 'Last updated', value: formatDate(panel.record.updated_at) },
          ]}
          />
        )}
      </Modal>

      {/* Add / edit */}
      <Modal
        open={isForm}
        title={panel?.mode === 'edit' ? 'Edit agency' : 'Add agency'}
        onClose={close}
        busy={busy}
        footer={(
          <>
            <button type="button" className="btn-secondary" onClick={close} disabled={busy}>Cancel</button>
            <button type="submit" form="agency-form" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </>
        )}
      >
        <form id="agency-form" onSubmit={handleSave} noValidate className="space-y-4">
          {saveError.message && <Alert type="error" messages={saveError.list}>{saveError.message}</Alert>}
          <div>
            <label htmlFor="a-name" className="label">Name <span className="text-red-600">*</span></label>
            <input id="a-name" className={inputClass('name')} value={form.name} onChange={update('name')} maxLength={300} />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="a-acronym" className="label">Acronym</label>
              <input id="a-acronym" className="input" value={form.acronym} onChange={update('acronym')} maxLength={50} placeholder="e.g. OM-DEO" />
            </div>
            <div>
              <label htmlFor="a-type" className="label">Office type <span className="text-red-600">*</span></label>
              <select id="a-type" className={inputClass('office_type')} value={form.office_type} onChange={update('office_type')}>
                {OFFICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {fieldErrors.office_type && <p className="mt-1 text-xs text-red-600">{fieldErrors.office_type}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="a-address" className="label">Address</label>
            <textarea id="a-address" rows={2} className="input" value={form.address} onChange={update('address')} maxLength={500} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="a-email" className="label">Contact email</label>
              <input id="a-email" type="email" className={inputClass('contact_email')} value={form.contact_email} onChange={update('contact_email')} />
              {fieldErrors.contact_email && <p className="mt-1 text-xs text-red-600">{fieldErrors.contact_email}</p>}
            </div>
            <div>
              <label htmlFor="a-phone" className="label">Contact phone</label>
              <input id="a-phone" type="tel" className="input" value={form.contact_phone} onChange={update('contact_phone')} maxLength={50} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.is_active} onChange={update('is_active')} />
            Active
          </label>
        </form>
      </Modal>
    </div>
  );
}
