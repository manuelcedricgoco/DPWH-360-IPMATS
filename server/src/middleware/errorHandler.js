// Maps Postgres / Supabase (PostgREST) errors to clear JSON responses.

// Friendly messages for known constraints (names from database/migrations).
const CONSTRAINT_MESSAGES = {
  projects_contract_within_budget: 'contract_amount must not exceed approved_budget',
  projects_dates_order: 'target_completion_date must be on or after notice_to_proceed',
  projects_latitude_check: 'latitude must be between 12.10 and 13.95 (Occidental Mindoro)',
  projects_longitude_check: 'longitude must be between 119.95 and 121.20 (Occidental Mindoro)',
  projects_barangay_in_municipality: 'The barangay does not belong to the selected municipality',
};

function constraintMessage(message) {
  const name = Object.keys(CONSTRAINT_MESSAGES).find((key) => message.includes(`"${key}"`));
  return name ? CONSTRAINT_MESSAGES[name] : null;
}

function mapDbError(err) {
  const code = err.code;
  const message = err.message || '';

  if (code === '42501' || /row-level security/i.test(message)) {
    return { status: 403, error: 'You do not have permission to do this' };
  }
  switch (code) {
    case '23505': // unique_violation
      return { status: 409, error: 'Record already exists' };
    case '23503': // foreign_key_violation
      if (/update or delete on table/i.test(message)) {
        return { status: 409, error: 'Cannot delete: this record is still used by other records' };
      }
      return {
        status: 400,
        error: constraintMessage(message) || 'Invalid reference: a linked record does not exist',
      };
    case '23514': // check_violation
    case '22P02': // invalid_text_representation (bad uuid / enum / number)
    case '22023': // invalid_parameter_value (raised by RPCs)
      return { status: 400, error: constraintMessage(message) || message || 'Invalid value' };
    case 'P0002': // no_data_found
    case 'PGRST116': // .single() returned no rows
      return { status: 404, error: 'Record not found' };
    default:
      return null;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }

  const mapped = mapDbError(err);
  const status = mapped?.status ?? (Number.isInteger(err.status) ? err.status : 500);
  const body = { error: mapped?.error ?? (status < 500 ? err.message : 'Internal server error') };

  if (status < 500) {
    if (err.code) body.code = err.code;
    if (err.details) body.details = err.details;
    if (err.hint) body.hint = err.hint;
  } else {
    console.error(err);
  }
  res.status(status).json(body);
}
