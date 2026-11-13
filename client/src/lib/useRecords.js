import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

/**
 * Loads a list from the API (e.g. '/contractors') with a debounced search.
 * Returns { records, loading, error, search, setSearch, reload }.
 */
export function useRecords(path) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api(path, { query: { search: debounced }, signal: controller.signal })
      .then(({ data }) => setRecords(data))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, debounced, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { records, loading, error, search, setSearch, reload };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (value) => EMAIL_RE.test(String(value).trim());

/** Form state → API body: trims text, sends empty optional fields as null. */
export function toBody(form) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => {
    if (typeof value !== 'string') return [key, value];
    const trimmed = value.trim();
    return [key, trimmed === '' ? null : trimmed];
  }));
}
