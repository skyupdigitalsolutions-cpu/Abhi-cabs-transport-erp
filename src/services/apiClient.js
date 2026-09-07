/**
 * Centralized API client.
 * - Reads base URL + mock toggle from environment config (never hardcoded).
 * - Attaches the JWT access token, auto-refreshes it on 401 (single-use
 *   rotating refresh token, matching the backend's auth model), retries the
 *   original request once, and normalizes errors.
 * - Unwraps the backend's { success, data } / { success, error } envelope
 *   so callers just get the payload back.
 * - When VITE_USE_MOCK=false but the backend is unreachable, optionally
 *   falls back to mock data (VITE_MOCK_FALLBACK, default true) so the UI
 *   keeps working while the backend is being stood up.
 */
import { getToken, getRefreshToken, setTokens, clearSession } from './authStorage';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') === 'true';
export const MOCK_FALLBACK = (import.meta.env.VITE_MOCK_FALLBACK ?? 'true') === 'true';
const DEFAULT_TIMEOUT = 15000;

export class ApiError extends Error {
  constructor(message, { status, code, fieldErrors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors || null;
  }
}

// Thrown internally to signal "backend unreachable" so withMockFallback()
// can decide whether to fall back to mock data. Real 4xx/5xx from a live
// server are always surfaced as ApiError, never silently swallowed.
export class NetworkUnavailableError extends ApiError {
  constructor(message) { super(message, { status: 0, code: 'NETWORK' }); }
}

// Thrown when the backend responds but the ROUTE itself was never mounted
// (Express's catch-all "Route GET /x not found" handler) — as opposed to a
// legitimate "this specific record doesn't exist" 404 from a route that DOES
// exist. withMockFallback() treats this the same as an unreachable backend:
// several ERP features (Drivers, Vehicles, Trips, Clients, Masters,
// Notifications, Tickets, Payments list-all) call endpoints not yet built on
// this backend. Falling back to mock data for these specific cases keeps the
// ERP fully demoable today; the moment the real endpoint is added, this class
// simply stops being thrown and live data takes over with no frontend change.
export class EndpointNotImplementedError extends ApiError {
  constructor(message) { super(message, { status: 404, code: 'ENDPOINT_NOT_IMPLEMENTED' }); }
}

function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { promise: promise(controller.signal), cancel: () => clearTimeout(timer) };
}

// Prevent concurrent refreshes piling up — share one in-flight promise.
let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new ApiError('Not authenticated', { status: 401, code: 'NO_REFRESH_TOKEN' });
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        clearSession();
        throw new ApiError('Session expired. Please log in again.', { status: 401, code: 'REFRESH_FAILED' });
      }
      const data = json.data || json;
      // Refresh tokens are single-use — persist the rotated pair immediately.
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data.accessToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Unwrap the backend's standard envelope: { success, data } | { success, error }.
function unwrap(json) {
  if (json && typeof json === 'object' && 'success' in json) {
    if (json.success === false) {
      const e = json.error || {};
      throw new ApiError(e.message || 'Request failed', { code: e.code, fieldErrors: e.fields });
    }

    const payload = json.data;

    // Real backend shape for every paginated list endpoint (bookings, drivers,
    // vehicles, invoices, payments, users, ...):
    //   { success, data: { items: [...], pagination: { page, limit, total, ... } } }
    // The whole app (built against the mock's paginate() helper) expects:
    //   { data: [...], meta: { page, limit, total, ... } }
    // Translate once here so every list() call site works unchanged, whether
    // it's hitting the mock store or the real API.
    if (payload && typeof payload === 'object' && Array.isArray(payload.items) && payload.pagination) {
      return { data: payload.items, meta: payload.pagination };
    }

    // Some endpoints already use the { data: [...], meta } convention directly.
    if (json.meta !== undefined) return { data: payload, meta: json.meta };

    // Single-resource endpoints: { success, data: {...} } → just the resource.
    return payload !== undefined ? payload : json;
  }
  return json;
}

async function request(path, { method = 'GET', body, params, timeout = DEFAULT_TIMEOUT, retry = 0, _retried = false } = {}) {
  const url = new URL(API_BASE_URL + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === '') return;
      // `filters` is a nested object in the mock's paginate() contract
      // ({ filters: { status: 'X' } }); flatten it into top-level query
      // params (?status=X) so a real backend receives normal REST filters
      // instead of a stringified "[object Object]".
      if (k === 'filters' && v && typeof v === 'object') {
        Object.entries(v).forEach(([fk, fv]) => {
          if (fv !== undefined && fv !== '' && fv !== 'all') url.searchParams.set(fk, fv);
        });
        return;
      }
      url.searchParams.set(k, v);
    });
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const attempt = async () => {
    const { promise, cancel } = withTimeout(
      (signal) =>
        fetch(url.toString(), {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal,
        }),
      timeout
    );
    try {
      const res = await promise;
      cancel();

      if (res.status === 401 && !_retried && getRefreshToken()) {
        await refreshAccessToken();
        return request(path, { method, body, params, timeout, retry, _retried: true });
      }
      if (res.status === 401) {
        clearSession();
        throw new ApiError('Session expired. Please log in again.', { status: 401, code: 'UNAUTHORIZED' });
      }
      if (res.status === 403) {
        throw new ApiError('You do not have permission to perform this action.', { status: 403, code: 'FORBIDDEN' });
      }
      if (res.status === 404) {
        let payload = {};
        try { payload = await res.json(); } catch { /* noop */ }
        const msg = payload.error?.message || payload.message || '';
        // Express's catch-all 404 handler always phrases it exactly this way
        // for a route that was never mounted at all — see src/middlewares/
        // error.js:notFound() on the backend. A legitimate "this record
        // doesn't exist" 404 from a route that DOES exist uses different
        // wording (e.g. "Record not found"), so this check never masks a
        // real not-found error, only a genuinely unbuilt endpoint.
        if (/^Route\s+\w+\s+.+\s+not found$/i.test(msg)) {
          throw new EndpointNotImplementedError(msg);
        }
        throw new ApiError(msg || 'The requested resource was not found.', { status: 404, code: payload.error?.code || 'NOT_FOUND' });
      }
      if (res.status === 409) {
        throw new ApiError('This conflicts with an existing record (e.g. a double-booked vehicle).', { status: 409, code: 'CONFLICT' });
      }
      if (res.status === 429) {
        throw new ApiError('Too many requests. Please slow down and try again.', { status: 429, code: 'RATE_LIMITED' });
      }
      if (res.status === 202) {
        const payload = await res.json().catch(() => ({}));
        return unwrap(payload);
      }
      if (!res.ok) {
        let payload = {};
        try { payload = await res.json(); } catch { /* noop */ }
        throw new ApiError(payload.error?.message || payload.message || 'Something went wrong. Please try again.', {
          status: res.status,
          code: payload.error?.code || payload.code,
          fieldErrors: payload.error?.fields || payload.errors,
        });
      }
      if (res.status === 204) return null;
      const json = await res.json();
      return unwrap(json);
    } catch (err) {
      cancel();
      if (err.name === 'AbortError') {
        throw new NetworkUnavailableError('Request timed out. Please check your connection.');
      }
      if (err instanceof ApiError) throw err;
      throw new NetworkUnavailableError('Cannot reach the server. Please check your connection.');
    }
  };

  const idempotent = method === 'GET';
  let lastErr;
  for (let i = 0; i <= (idempotent ? retry : 0); i++) {
    try {
      return await attempt();
    } catch (err) {
      lastErr = err;
      if (!idempotent || i === retry) break;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastErr instanceof ApiError ? lastErr : new NetworkUnavailableError('Network error. Please check your connection.');
}

export const apiClient = {
  get: (path, opts) => request(path, { ...opts, method: 'GET', retry: opts?.retry ?? 1 }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

/**
 * Wrap a live-API call so that, when MOCK_FALLBACK is enabled and the
 * backend is unreachable, it transparently falls back to mock data instead
 * of surfacing an error. Real 4xx/5xx errors from a reachable server are
 * never swallowed — only genuine network failures trigger the fallback.
 */
export async function withMockFallback(liveCall, mockCall) {
  if (USE_MOCK) return mockCall();
  try {
    return await liveCall();
  } catch (err) {
    if (MOCK_FALLBACK && (err instanceof NetworkUnavailableError || err instanceof EndpointNotImplementedError)) {
      return mockCall();
    }
    throw err;
  }
}
