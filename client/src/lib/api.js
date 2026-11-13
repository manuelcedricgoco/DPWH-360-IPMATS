import { supabase } from './supabaseClient.js';

/** Error thrown by api(): message is the server's { error }, plus status and field errors. */
export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

/**
 * api('/projects', { method: 'POST', body: {...} })
 * Calls the Express API under /api with the current session's access token.
 * Returns the parsed JSON body; throws ApiError with the server's message on failure.
 */
export async function api(path, { method = 'GET', body, query, signal } = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const headers = { Accept: 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let url = `/api${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.append(key, value);
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the server. Is it running on port 4000?', 0);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload?.errors || []);
  }
  return payload;
}
