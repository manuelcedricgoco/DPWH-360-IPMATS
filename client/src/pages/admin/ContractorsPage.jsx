import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { isEmail, toBody, useRecords } from '../../lib/useRecords.js';
import { formatDate } from '../../lib/format.js';
import Alert from '../../components/common/Alert.jsx';
import Modal from '../../components/common/Modal.jsx';
import DetailList, { ActiveBadge } from '../../components/common/DetailList.jsx';

const EMPTY = {
  name: '',
  license_number: '',
  address: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  is_active: true,
};

const toForm = (record) => Object.fromEntries(
  Object.keys(EMPTY).map((key) => [key, key === 'is_active' ? record[key] !== false : record[key] ?? '']),
);

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Contractor name is required';
  if (form.contact_email.trim() && !isEmail(form.contact_email)) errors.contact_email = 'Enter a valid email address';
  return errors;
}

export default function ContractorsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrator';
  const { records, loading, error, search, setSearch, reload } = useRecords('/contractors');

  // panel: null | { mode: 'view' | 'add' | 'edit' | 'delete', record }
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
        ? await api(`/contractors/${panel.record.contractor_id}`, { method: 'PATCH', body })
        : await api('/contractors', { method: 'POST', body });
      setFlash(`Contractor "${data.name}" was ${panel.mode === 'edit' ? 'updated' : 'added'}.`);
      close();
      reload();
    } catch (err) {
      setSaveError({
        message: err.status === 409 ? 'A contractor with this name or license number already exists.' : err.message,
        list: err.errors || [],
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setSaveError({ message: '', list: [] });
    try {
      await api(`/contractors/${panel.record.contractor_id}`, { method: 'DELETE' });
      setFlash(`Contractor "${panel.record.name}" was deleted.`);
      close();
      reload();
    } catch (err) {
      setSaveError({
        message: err.status === 409
          ? 'This contractor is linked to one or more projects and cannot be deleted. Mark it inactive instead.'
          : err.message,
        list: [],
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
          <h1 className="text-2xl font-semibold text-slate-900">Contractors</h1>
          <p className="text-sm text-slate-600">Contractors that build DPWH projects</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => open('add')}>+ Add contractor</button>
      </div>

      {flash && <Alert type="success">{flash}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full sm:w-80">
          <label htmlFor="contractor-search" className="label">Search</label>
          <input
            id="contractor-search"
            type="search"
            className="input"
            placeholder="Name or license number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-slate-600">{loading ? 'Loading…' : `${records.length} contractor${records.length === 1 ? '' : 's'}`}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">License no.</th>
              <th className="px-3 py-3">Contact person</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Active</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!loading && !error && records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                  {search ? 'No contractors match your search.' : 'No contractors yet. Add the first one.'}
                </td>
              </tr>
            )}
            {records.map((c) => (
              <tr key={c.contractor_id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-900">{c.name}</td>
                <td className="whitespace-nowrap px-3 py-2">{c.license_number || '—'}</td>
                <td className="px-3 py-2">{c.contact_person || '—'}</td>
                <td className="px-3 py-2">{c.contact_email || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2">{c.contact_phone || '—'}</td>
                <td className="px-3 py-2"><ActiveBadge active={c.is_active} /></td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <div className="flex justify-end gap-3">
                    <button type="button" className="text-dpwh-blue-light hover:underline" onClick={() => open('view', c)}>View</button>
                    <button type="button" className="text-dpwh-blue-light hover:underline" onClick={() => open('edit', c)}>Edit</button>
                    {isAdmin && (
                      <button type="button" className="text-red-600 hover:underline" onClick={() => open('delete', c)}>Delete</button>
                    )}
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
        title="Contractor details"
        onClose={close}
        footer={panel?.record && (
          <>
            {isAdmin && <button type="button" className="btn-danger" onClick={() => open('delete', panel.record)}>Delete</button>}
            <button type="button" className="btn-primary" onClick={() => open('edit', panel.record)}>Edit</button>
          </>
        )}
      >
        {panel?.record && (
          <DetailList items={[
            { label: 'Name', value: panel.record.name },
            { label: 'License no.', value: panel.record.license_number },
            { label: 'Address', value: panel.record.address },
            { label: 'Contact person', value: panel.record.contact_person },
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
        title={panel?.mode === 'edit' ? 'Edit contractor' : 'Add contractor'}
        onClose={close}
        busy={busy}
        footer={(
          <>
            <button type="button" className="btn-secondary" onClick={close} disabled={busy}>Cancel</button>
            <button type="submit" form="contractor-form" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </>
        )}
      >
        <form id="contractor-form" onSubmit={handleSave} noValidate className="space-y-4">
          {saveError.message && <Alert type="error" messages={saveError.list}>{saveError.message}</Alert>}
          <div>
            <label htmlFor="c-name" className="label">Name <span className="text-red-600">*</span></label>
            <input id="c-name" className={inputClass('name')} value={form.name} onChange={update('name')} maxLength={300} />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="c-license" className="label">License number (PCAB)</label>
            <input id="c-license" className="input" value={form.license_number} onChange={update('license_number')} maxLength={100} />
          </div>
          <div>
            <label htmlFor="c-address" className="label">Address</label>
            <textarea id="c-address" rows={2} className="input" value={form.address} onChange={update('address')} maxLength={500} />
          </div>
          <div>
            <label htmlFor="c-person" className="label">Contact person</label>
            <input id="c-person" className="input" value={form.contact_person} onChange={update('contact_person')} maxLength={150} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-email" className="label">Contact email</label>
              <input id="c-email" type="email" className={inputClass('contact_email')} value={form.contact_email} onChange={update('contact_email')} />
              {fieldErrors.contact_email && <p className="mt-1 text-xs text-red-600">{fieldErrors.contact_email}</p>}
            </div>
            <div>
              <label htmlFor="c-phone" className="label">Contact phone</label>
              <input id="c-phone" type="tel" className="input" value={form.contact_phone} onChange={update('contact_phone')} maxLength={50} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.is_active} onChange={update('is_active')} />
            Active
          </label>
        </form>
      </Modal>

      {/* Delete (administrator only) */}
      <Modal
        open={panel?.mode === 'delete' && isAdmin}
        title="Delete contractor"
        onClose={close}
        busy={busy}
        footer={(
          <>
            <button type="button" className="btn-secondary" onClick={close} disabled={busy}>Cancel</button>
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </>
        )}
      >
        <div className="space-y-3">
          {saveError.message && <Alert type="error">{saveError.message}</Alert>}
          <p className="text-sm text-slate-700">
            Delete <span className="font-semibold">{panel?.record?.name}</span>? This cannot be undone.
            Contractors linked to projects cannot be deleted; mark them inactive instead.
          </p>
        </div>
      </Modal>
    </div>
  );
}
