/**
 * Service-state (state allowlist) service — /api/v1/admin/service-states/*
 *
 * The allowlist decides which states a pickup may be booked in. A pickup in a
 * state that isn't active is refused with OUTSIDE_SERVICE_STATES and becomes a
 * booking request instead. Until this screen existed the list could only be
 * changed by calling the API directly — which is why adding a city in a new
 * state kept getting its bookings refused with no obvious cause.
 *
 * Reads/writes need SETTINGS_MANAGE (same as cities — both decide where the
 * company operates). No mock fallback: a state that looks enabled but isn't
 * silently refuses every booking there, which is worse than an error.
 *
 * IMPORTANT (the "built-in four"): on a fresh backend the table is EMPTY, yet
 * Karnataka, Telangana, Andhra Pradesh and Maharashtra are in service
 * implicitly. The backend records those four automatically the first time any
 * state is added (create → `backfilled`), so adding a state never silently
 * drops the originals. list() therefore returns [] on such a backend even
 * though four states are live — the UI explains this rather than showing
 * "no states".
 */
import { apiClient } from './apiClient';

/** Return the payload no matter how far apiClient already unwrapped it. */
function unwrap(res) {
  if (!res || typeof res !== 'object') return {};
  const body = res.data && res.data.success !== undefined ? res.data : res;
  return body && body.data !== undefined ? body.data : body;
}

export const serviceStateService = {
  /** GET /admin/service-states — payload: { states, total }. Includes inactive. */
  async list(params = {}) {
    const data = unwrap(await apiClient.get('/admin/service-states', {
      params: { includeInactive: true, ...params },
    }));
    return data.states || [];
  },

  /**
   * POST /admin/service-states — payload: { state, backfilled }
   *
   * `name` is required; `code` (2-letter), `aliases` (string[]) and `note` are
   * optional. `backfilled` lists any built-in states the backend recorded in the
   * same transaction (non-empty only on the very first add) — surface it so the
   * admin understands why extra rows appeared.
   */
  async create({ name, code, aliases, note }) {
    return unwrap(await apiClient.post('/admin/service-states', {
      name: String(name).trim(),
      ...(code ? { code: String(code).trim().toUpperCase() } : {}),
      ...(Array.isArray(aliases) && aliases.length ? { aliases } : {}),
      ...(note ? { note } : {}),
    }));
  },

  /** PATCH /admin/service-states/:id — payload: { state } */
  async update(id, payload) {
    return unwrap(await apiClient.patch(`/admin/service-states/${id}`, payload)).state;
  },

  /**
   * Enable/disable a state. DELETE deactivates (the row survives so the requests
   * it produced still explain themselves); PATCH { isActive: true } reactivates.
   * Expect LAST_ACTIVE_STATE (400) when disabling the only active one.
   */
  async setActive(id, active) {
    const res = active
      ? await apiClient.patch(`/admin/service-states/${id}`, { isActive: true })
      : await apiClient.del(`/admin/service-states/${id}`);
    return unwrap(res).state;
  },
};
