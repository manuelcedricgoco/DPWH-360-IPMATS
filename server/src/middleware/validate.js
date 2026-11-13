// Request-body whitelisting and field rules (matching the database constraints
// in database/migrations/001_core_schema.sql), so users get clear 400 messages
// before the database rejects a value.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Columns the database computes or controls. Never accepted from clients.
const READ_ONLY_FIELDS = new Set([
  'project_id', 'overall_progress', 'planned_progress', 'financial_progress',
  'completion_status', 'auto_flag', 'effective_flag', 'flag_reasons', 'needs_review',
  'last_evaluated_at', 'is_published', 'published_at', 'published_by', 'audit_status',
  'created_by', 'created_at', 'updated_at', 'deleted_at',
]);

// ---------------------------------------------------------------------------
// Field rules
// ---------------------------------------------------------------------------
const text = (max = 500, required = false) => ({ type: 'text', max, required });

export const projectSchema = {
  fields: {
    project_code: text(50, true),
    contract_reference_no: text(100),
    name: text(300, true),
    description: text(5000),
    project_type: { type: 'enum', values: ['road', 'bridge', 'flood_control'], required: true },
    agency_id: { type: 'uuid', required: true },
    contractor_id: { type: 'uuid' },
    approved_budget: { type: 'number', gt: 0, required: true },
    contract_amount: { type: 'number', gt: 0 },
    municipality_id: { type: 'int', min: 1, required: true },
    barangay_id: { type: 'int', min: 1 },
    latitude: { type: 'number', min: 12.1, max: 13.95, required: true,
      message: 'latitude must be between 12.10 and 13.95 (Occidental Mindoro)' },
    longitude: { type: 'number', min: 119.95, max: 121.2, required: true,
      message: 'longitude must be between 119.95 and 121.20 (Occidental Mindoro)' },
    notice_to_proceed: { type: 'date' },
    duration_days: { type: 'int', min: 1, required: true },
    target_completion_date: { type: 'date' },
    status: { type: 'enum', values: ['active', 'suspended', 'cancelled'] },
  },
  check(body, errors) {
    const { approved_budget: budget, contract_amount: amount } = body;
    if (budget != null && amount != null && amount > budget) {
      errors.push('contract_amount must not exceed approved_budget');
    }
    const { notice_to_proceed: ntp, target_completion_date: target } = body;
    if (ntp && target && target < ntp) {
      errors.push('target_completion_date must be on or after notice_to_proceed');
    }
  },
};

export const contractorSchema = {
  fields: {
    name: text(300, true),
    license_number: text(100),
    address: text(500),
    contact_person: text(150),
    contact_email: { type: 'email' },
    contact_phone: text(50),
    is_active: { type: 'boolean' },
  },
};

export const agencySchema = {
  fields: {
    name: text(300, true),
    acronym: text(50),
    office_type: {
      type: 'enum',
      values: ['regional_office', 'district_engineering_office', 'provincial_office', 'central_office', 'other'],
    },
    address: text(500),
    contact_email: { type: 'email' },
    contact_phone: text(50),
    is_active: { type: 'boolean' },
  },
};

// ---------------------------------------------------------------------------
// Value parsing. Returns { value } or { error }. Empty strings become null so
// HTML forms can clear optional fields.
// ---------------------------------------------------------------------------
function parseField(name, rule, raw) {
  if (raw === '' || raw === null || raw === undefined) {
    return rule.required ? { error: `${name} is required` } : { value: null };
  }

  switch (rule.type) {
    case 'text': {
      if (typeof raw !== 'string') return { error: `${name} must be text` };
      const value = raw.trim();
      if (!value) return rule.required ? { error: `${name} is required` } : { value: null };
      if (value.length > rule.max) return { error: `${name} must be at most ${rule.max} characters` };
      return { value };
    }
    case 'email': {
      if (typeof raw !== 'string' || !EMAIL_RE.test(raw.trim())) return { error: `${name} must be a valid email address` };
      return { value: raw.trim() };
    }
    case 'enum':
      if (!rule.values.includes(raw)) return { error: `${name} must be one of: ${rule.values.join(', ')}` };
      return { value: raw };
    case 'uuid':
      if (typeof raw !== 'string' || !UUID_RE.test(raw)) return { error: `${name} must be a valid id` };
      return { value: raw };
    case 'date':
      if (typeof raw !== 'string' || !DATE_RE.test(raw) || Number.isNaN(Date.parse(raw))) {
        return { error: `${name} must be a date (YYYY-MM-DD)` };
      }
      return { value: raw };
    case 'boolean':
      if (typeof raw === 'boolean') return { value: raw };
      if (raw === 'true' || raw === 'false') return { value: raw === 'true' };
      return { error: `${name} must be true or false` };
    case 'int':
    case 'number': {
      const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.trim()) : NaN;
      if (!Number.isFinite(value)) return { error: `${name} must be a number` };
      if (rule.type === 'int' && !Number.isInteger(value)) return { error: `${name} must be a whole number` };
      const outOfRange =
        (rule.min !== undefined && value < rule.min) ||
        (rule.max !== undefined && value > rule.max) ||
        (rule.gt !== undefined && value <= rule.gt);
      if (outOfRange) {
        if (rule.message) return { error: rule.message };
        if (rule.gt !== undefined) return { error: `${name} must be greater than ${rule.gt}` };
        return { error: `${name} must be at least ${rule.min}` };
      }
      return { value };
    }
    default:
      return { error: `${name} has an unsupported rule` };
  }
}

/**
 * validateBody(schema, { partial }) – middleware.
 * Rejects unknown and read-only fields, checks every field rule, and replaces
 * req.body with the cleaned, whitelisted object.
 * partial = true for PATCH (only the sent fields are checked; at least one required).
 */
export function validateBody(schema, { partial = false } = {}) {
  return (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    const errors = [];
    const readOnly = Object.keys(body).filter((key) => READ_ONLY_FIELDS.has(key));
    const unknown = Object.keys(body).filter((key) => !schema.fields[key] && !READ_ONLY_FIELDS.has(key));
    if (readOnly.length) errors.push(`Read-only fields cannot be set: ${readOnly.join(', ')}`);
    if (unknown.length) errors.push(`Unknown fields: ${unknown.join(', ')}`);

    const clean = {};
    for (const [name, rule] of Object.entries(schema.fields)) {
      const present = Object.prototype.hasOwnProperty.call(body, name);
      if (!present) {
        if (!partial && rule.required) errors.push(`${name} is required`);
        continue;
      }
      const { value, error } = parseField(name, rule, body[name]);
      if (error) errors.push(error);
      else clean[name] = value;
    }

    if (partial && !Object.keys(clean).length && !errors.length) {
      errors.push('No fields to update');
    }
    if (!errors.length && schema.check) schema.check(clean, errors);

    if (errors.length) {
      return res.status(400).json({ error: errors[0], errors });
    }
    req.body = clean;
    next();
  };
}
