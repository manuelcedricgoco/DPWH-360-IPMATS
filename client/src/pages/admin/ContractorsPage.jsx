import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { isEmail, toBody, useRecords } from '../../lib/useRecords.js';
import { formatDate } from '../../lib/format.js';
import Alert from '../../components/common/Alert.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Icon from '../../components/ui/Icon.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { useToast } from '../../context/ToastContext.jsx';
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
  const toast = useToast();

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
      toast.success(`Contractor "${data.name}" was ${panel.mode === 'edit' ? 'updated' : 'added'}.`);
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
      toast.success(`Contractor "${panel.record.name}" was deleted.`);
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
    <div className="space-y-6">
      <PageHeader
        title="Contractors"
        description="Contractors that build DPWH projects"
        actions={<button type="button" className="btn-primary" onClick={() => open('add')}><Icon name="plus" className="h-4 w-4" />Add contractor</button>}
      />

      {error && <Alert type="error">{error}</Alert>}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full sm:w-80">
          <label htmlFor="contractor-search" className="label">Search</label>
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              id="contractor-search"
              type="search"
              className="input pl-9"
              placeholder="Name or license number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <span className="tabular text-sm text-ink-3">{loading ? 'Loading…' : `${records.length} contractor${records.length === 1 ? '' : 's'}`}</span>
      </div>

      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>License no.</th>
              <th>Contact person</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Active</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && records.length === 0 && <SkeletonRows rows={4} columns={7} />}
            {!loading && !error && records.length === 0 && (
              <tr className="hover:bg-transparent">
                <td colSpan={7}>
                  <EmptyState icon="hardHat" compact
                    title={search ? 'No contractors match your search' : 'No contractors yet'}
                    action={!search && <button type="button" className="btn-primary btn-sm" onClick={() => open('add')}><Icon name="plus" className="h-4 w-4" />Add the first contractor</button>}
                  />
                </td>
              </tr>
            )}
            {records.map((c) => (
              <tr key={c.contractor_id}>
                <td className="font-semibold text-ink">{c.name}</td>
                <td className="whitespace-nowrap">{c.license_number || '—'}</td>
                <td>{c.contact_person || '—'}</td>
                <td>{c.contact_email || '—'}</td>
                <td className="whitespace-nowrap">{c.contact_phone || '—'}</td>
                <td><ActiveBadge active={c.is_active} /></td>
                <td className="whitespace-nowrap text-right">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => open('view', c)}>View</button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => open('edit', c)}>Edit</button>
                    {isAdmin && (
                      <button type="button" className="btn-ghost btn-sm text-flag-red-ink hover:bg-flag-red-soft hover:text-flag-red-ink" onClick={() => open('delete', c)}>Delete</button>
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
            <label htmlFor="c-name" className="label">Name <span className="text-flag-red" aria-hidden="true">*</span></label>
            <input id="c-name" className={inputClass('name')} value={form.name} onChange={update('name')} maxLength={300} />
            {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
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
              {fieldErrors.contact_email && <p className="field-error">{fieldErrors.contact_email}</p>}
            </div>
            <div>
              <label htmlFor="c-phone" className="label">Contact phone</label>
              <input id="c-phone" type="tel" className="input" value={form.contact_phone} onChange={update('contact_phone')} maxLength={50} />
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <input type="checkbox" className="h-4 w-4 rounded border-line accent-navy-700" checked={form.is_active} onChange={update('is_active')} />
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
          <p className="text-sm text-ink-2">
            Delete <span className="font-semibold">{panel?.record?.name}</span>? This cannot be undone.
            Contractors linked to projects cannot be deleted; mark them inactive instead.
          </p>
        </div>
      </Modal>
    </div>
  );
}
