import { useState } from 'react';
import { api } from '../../lib/api.js';
import { isEmail, toBody, useRecords } from '../../lib/useRecords.js';
import { formatDate, labelOf } from '../../lib/format.js';
import Alert from '../../components/common/Alert.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Icon from '../../components/ui/Icon.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { useToast } from '../../context/ToastContext.jsx';
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
        ? await api(`/agencies/${panel.record.agency_id}`, { method: 'PATCH', body })
        : await api('/agencies', { method: 'POST', body });
      toast.success(`Agency "${data.name}" was ${panel.mode === 'edit' ? 'updated' : 'added'}.`);
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
    <div className="space-y-6">
      <PageHeader
        title="Implementing agencies"
        description="DPWH offices that implement projects"
        actions={<button type="button" className="btn-primary" onClick={() => open('add')}><Icon name="plus" className="h-4 w-4" />Add agency</button>}
      />

      {error && <Alert type="error">{error}</Alert>}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full sm:w-80">
          <label htmlFor="agency-search" className="label">Search</label>
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              id="agency-search"
              type="search"
              className="input pl-9"
              placeholder="Name or acronym"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <span className="tabular text-sm text-ink-3">{loading ? 'Loading…' : `${records.length} agenc${records.length === 1 ? 'y' : 'ies'}`}</span>
      </div>

      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Acronym</th>
              <th>Office type</th>
              <th>Address</th>
              <th>Contact</th>
              <th>Active</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && records.length === 0 && <SkeletonRows rows={4} columns={7} />}
            {!loading && !error && records.length === 0 && (
              <tr className="hover:bg-transparent">
                <td colSpan={7}>
                  <EmptyState icon="building" compact
                    title={search ? 'No agencies match your search' : 'No agencies yet'}
                    action={!search && <button type="button" className="btn-primary btn-sm" onClick={() => open('add')}><Icon name="plus" className="h-4 w-4" />Add the first agency</button>}
                  />
                </td>
              </tr>
            )}
            {records.map((a) => (
              <tr key={a.agency_id}>
                <td className="font-semibold text-ink">{a.name}</td>
                <td className="whitespace-nowrap">{a.acronym || '—'}</td>
                <td className="whitespace-nowrap">{labelOf(OFFICE_TYPES, a.office_type)}</td>
                <td>{a.address || '—'}</td>
                <td>
                  {a.contact_email || a.contact_phone ? (
                    <div className="space-y-0.5">
                      {a.contact_email && <div>{a.contact_email}</div>}
                      {a.contact_phone && <div className="text-ink-3">{a.contact_phone}</div>}
                    </div>
                  ) : '—'}
                </td>
                <td><ActiveBadge active={a.is_active} /></td>
                <td className="whitespace-nowrap text-right">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => open('view', a)}>View</button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => open('edit', a)}>Edit</button>
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
            <label htmlFor="a-name" className="label">Name <span className="text-flag-red" aria-hidden="true">*</span></label>
            <input id="a-name" className={inputClass('name')} value={form.name} onChange={update('name')} maxLength={300} />
            {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="a-acronym" className="label">Acronym</label>
              <input id="a-acronym" className="input" value={form.acronym} onChange={update('acronym')} maxLength={50} placeholder="e.g. OM-DEO" />
            </div>
            <div>
              <label htmlFor="a-type" className="label">Office type <span className="text-flag-red" aria-hidden="true">*</span></label>
              <select id="a-type" className={inputClass('office_type')} value={form.office_type} onChange={update('office_type')}>
                {OFFICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {fieldErrors.office_type && <p className="field-error">{fieldErrors.office_type}</p>}
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
              {fieldErrors.contact_email && <p className="field-error">{fieldErrors.contact_email}</p>}
            </div>
            <div>
              <label htmlFor="a-phone" className="label">Contact phone</label>
              <input id="a-phone" type="tel" className="input" value={form.contact_phone} onChange={update('contact_phone')} maxLength={50} />
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <input type="checkbox" className="h-4 w-4 rounded border-line accent-navy-700" checked={form.is_active} onChange={update('is_active')} />
            Active
          </label>
        </form>
      </Modal>
    </div>
  );
}
