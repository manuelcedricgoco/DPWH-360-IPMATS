const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

/** 4800000 → "₱4,800,000.00"; empty → "—" */
export function formatPeso(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? peso.format(n) : '—';
}

/** "2026-12-01" → "Dec 1, 2026"; empty → "—" */
export function formatDate(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

/**
 * Same rule as the database: target = notice_to_proceed + duration_days − 1.
 * Returns "YYYY-MM-DD" or "" when it cannot be computed.
 */
export function computeTargetDate(noticeToProceed, durationDays) {
  const days = Number(durationDays);
  if (!noticeToProceed || !Number.isInteger(days) || days <= 0) return '';
  const [y, m, d] = noticeToProceed.split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(Date.UTC(y, m - 1, d + days - 1));
  return date.toISOString().slice(0, 10);
}

export const PROJECT_TYPES = [
  { value: 'road', label: 'Road' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'flood_control', label: 'Flood control' },
];

export const PROJECT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const labelOf = (list, value) => list.find((item) => item.value === value)?.label || value || '—';
