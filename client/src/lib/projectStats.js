import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { PROJECT_TYPES } from './format.js';

// Display helpers for values the DATABASE computes (flags, progress, completion,
// audit status). Nothing here evaluates or writes a flag: it only reads and counts
// the rows returned by GET /api/projects (v_project_details).

export const FLAG_META = {
  green: { short: 'On track', long: 'On track or completed', tone: 'green', icon: 'checkCircle', bar: 'bg-flag-green' },
  yellow: { short: 'Needs attention', long: 'Needs attention', tone: 'yellow', icon: 'alert', bar: 'bg-flag-yellow' },
  red: { short: 'For investigation', long: 'For investigation', tone: 'red', icon: 'alertOctagon', bar: 'bg-flag-red' },
  none: { short: 'Not evaluated', long: 'Not evaluated yet', tone: 'gray', icon: 'clock', bar: 'bg-ink-3' },
};

export const COMPLETION_LABEL = {
  not_started: 'Not started',
  ongoing: 'Ongoing',
  delayed: 'Delayed',
  completed: 'Completed',
};

export const AUDIT_STATUS_LABEL = {
  not_audited: 'Not audited',
  under_review: 'Under review',
  audited: 'Audited',
  for_investigation: 'For investigation',
  cleared: 'Cleared',
};

/** Same rule as v_map_projects: coalesce(effective_flag, auto_flag). */
export function projectFlag(project) {
  return project?.effective_flag || project?.auto_flag || 'none';
}

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function countBy(items, keyFn) {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

/** Aggregates for dashboards. Input: rows of v_project_details. */
export function computeProjectStats(projects = []) {
  const flags = { green: 0, yellow: 0, red: 0, none: 0 };
  projects.forEach((p) => { flags[projectFlag(p)] = (flags[projectFlag(p)] || 0) + 1; });

  const completion = countBy(projects, (p) => p.completion_status || 'not_started');
  const audit = countBy(projects, (p) => p.audit_status || 'not_audited');

  const municipalityMap = new Map();
  projects.forEach((p) => {
    const key = p.municipality || 'Unspecified';
    const entry = municipalityMap.get(key) || { label: key, count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += num(p.contract_amount ?? p.approved_budget);
    municipalityMap.set(key, entry);
  });

  const byType = PROJECT_TYPES.map((t) => {
    const rows = projects.filter((p) => p.project_type === t.value);
    return {
      key: t.value,
      label: t.label,
      count: rows.length,
      amount: rows.reduce((sum, p) => sum + num(p.contract_amount ?? p.approved_budget), 0),
    };
  });

  const progressed = projects.filter((p) => p.overall_progress !== null && p.overall_progress !== undefined);

  return {
    total: projects.length,
    flags,
    needsReview: projects.filter((p) => p.needs_review).length,
    completion: Object.keys(COMPLETION_LABEL).map((key) => ({ key, label: COMPLETION_LABEL[key], count: completion.get(key) || 0 })),
    completed: completion.get('completed') || 0,
    delayed: completion.get('delayed') || 0,
    ongoing: completion.get('ongoing') || 0,
    audit: Object.keys(AUDIT_STATUS_LABEL).map((key) => ({ key, label: AUDIT_STATUS_LABEL[key], count: audit.get(key) || 0 })),
    byMunicipality: [...municipalityMap.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    byType,
    totalApproved: projects.reduce((sum, p) => sum + num(p.approved_budget), 0),
    totalContract: projects.reduce((sum, p) => sum + num(p.contract_amount), 0),
    avgProgress: progressed.length ? progressed.reduce((s, p) => s + num(p.overall_progress), 0) / progressed.length : 0,
    published: projects.filter((p) => p.is_published).length,
    withoutImage: projects.filter((p) => p.completion_status && p.completion_status !== 'not_started' && !p.latest_image_path).length,
    suspended: projects.filter((p) => p.status === 'suspended').length,
  };
}

/** Flag reasons stored by the engine: [{ check, severity, message, value }]. */
export function flagReasons(project) {
  const reasons = Array.isArray(project?.flag_reasons) ? project.flag_reasons : [];
  return reasons.filter((r) => r && r.message);
}

/** Most recently changed first. */
export function recentlyUpdated(projects, limit = 6) {
  return [...projects]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, limit);
}

/** Yellow/red projects: needs review first, then red, then yellow (same order as v_flagged_projects). */
export function flaggedQueue(projects) {
  const rank = { red: 0, yellow: 1 };
  return projects
    .filter((p) => ['yellow', 'red'].includes(projectFlag(p)))
    .sort((a, b) => (Number(b.needs_review) - Number(a.needs_review))
      || (rank[projectFlag(a)] - rank[projectFlag(b)])
      || new Date(b.last_evaluated_at || 0) - new Date(a.last_evaluated_at || 0));
}

/** ₱1.25B / ₱340.5M / ₱12,500 */
export function compactPeso(value) {
  const n = num(value);
  if (Math.abs(n) >= 1e9) return `₱${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `₱${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e4) return `₱${(n / 1e3).toFixed(0)}K`;
  return `₱${Math.round(n).toLocaleString('en-PH')}`;
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
/** "3 days ago", "yesterday", "just now" */
export function relativeTime(value) {
  if (!value) return '—';
  const diff = (new Date(value).getTime() - Date.now()) / 1000;
  if (!Number.isFinite(diff)) return '—';
  const abs = Math.abs(diff);
  if (abs < 60) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), 'month');
  return rtf.format(Math.round(diff / (86400 * 365)), 'year');
}

const LIST_LIMIT = 500; // the API's maximum page size

/**
 * Loads projects visible to the signed-in user (RLS decides which) from the
 * existing GET /api/projects endpoint.
 * Returns { projects, count, partial, loading, error, reload }.
 */
export function useProjects() {
  const [state, setState] = useState({ projects: [], count: 0, loading: true, error: '' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: '' }));
    api('/projects', { query: { limit: LIST_LIMIT }, signal: controller.signal })
      .then(({ data, count }) => setState({ projects: data || [], count: count ?? (data || []).length, loading: false, error: '' }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ projects: [], count: 0, loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, partial: state.count > state.projects.length, reload };
}
