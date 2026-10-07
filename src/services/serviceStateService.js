/**
 * Service-state service — /api/v1/admin/service-states/*
 *
 * The allowlist of states a pickup may start in. Requires SETTINGS_MANAGE.
 *
 * Opening a state here is NOT enough to sell rides in it: the state also needs
 * an active city with rate cards and rental packages (Masters → Rate Cards).
 * This list only decides whether a pickup is accepted or becomes a booking
 * request.
 *
 * No mock fallback, same rule as cityService: a state that looks saved but
 * wasn't would tell ops they are live when customers are still being refused.
 */
import { apiClient } from './apiClient';

function unwrap(res) {
  if (!res || typeof res !== 'object') return {};
  const body = res.data && res.data.success !== undefined ? res.data : res;
  return body && body.data !== undefined ? body.data : body;
}

export const serviceStateService = {
  /** GET /admin/service-states — payload: { states, total } */
  async list(params = {}) {
    const data = unwrap(await apiClient.get('/admin/service-states', {
      params: { includeInactive: true, ...params },
    }));
    return data.states || [];
  },

  /** POST /admin/service-states — payload: { state, backfilled } */
  async create(body) {
    return unwrap(await apiClient.post('/admin/service-states', body));
  },

  /** PATCH /admin/service-states/:id — payload: { state } */
  async update(id, body) {
    const data = unwrap(await apiClient.patch(`/admin/service-states/${id}`, body));
    return data.state;
  },

  /**
   * DELETE deactivates, never removes. Expect LAST_ACTIVE_STATE (400) when it
   * is the only one left open.
   */
  async deactivate(id) {
    const data = unwrap(await apiClient.del(`/admin/service-states/${id}`));
    return data.state;
  },

  /** POST /admin/service-states/seed-defaults — idempotent. */
  async seedDefaults() {
    return unwrap(await apiClient.post('/admin/service-states/seed-defaults', {}));
  },
};
