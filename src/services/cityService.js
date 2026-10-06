/**
 * City service — /api/v1/admin/cities/*
 *
 * Reads and WRITES the real `cities` table. Until this existed the only city
 * endpoint in the API was the read-only dropdown feed at
 * GET /admin/fare-configs/cities, and Masters.jsx posted its "Add City" form
 * to that same path. Express answers 404 for a path that exists but not for
 * that method, so the failure looked identical to a missing route — which is
 * what the "This server can't add new cities yet" toast was reporting.
 *
 * Reads accept SETTINGS_MANAGE or FARE_EDIT; writes need SETTINGS_MANAGE.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO MOCK FALLBACK
 * ---------------------------------------------------------------------------
 * Same rule as fareConfigService: a city that looks saved but wasn't is worse
 * than an error, because a rate card can then be built against an id that does
 * not exist on the server. The old handler's `|| { id: Date.now(), ... }`
 * fallback did exactly that — it minted a fake city whose id was a timestamp,
 * which is why `stateCityList` has to filter on `Number(c.id) < 1000000`.
 * Nothing here invents a city.
 */
import { apiClient } from './apiClient';

/**
 * Return the payload regardless of how far apiClient already unwrapped it.
 * Identical to fareConfigService's — a raw axios response, a body, or a bare
 * payload all land on the same object.
 */
function unwrap(res) {
  if (!res || typeof res !== 'object') return {};
  const body = res.data && res.data.success !== undefined ? res.data : res;
  return body && body.data !== undefined ? body.data : body;
}

export const cityService = {
  /**
   * GET /admin/cities — payload: { cities, total }
   *
   * Richer than the fare-config dropdown feed: each row carries
   * `_count: { fareConfigs, rentalPackages, vehicles }`, so a city that exists
   * but cannot quote anything is visible before ops discovers it through a
   * failed booking.
   */
  async list(params = {}) {
    const data = unwrap(await apiClient.get('/admin/cities', {
      params: { includeInactive: true, ...params },
    }));
    return data.cities || [];
  },

  /** GET /admin/cities/:id — payload: { city } */
  async getOne(id) {
    const data = unwrap(await apiClient.get(`/admin/cities/${id}`));
    return data.city;
  },

  /**
   * GET /admin/cities/suggest?name=&state= — where the map puts a place, and
   * how wide its radius needs to be.
   *
   * Writes nothing. Lets the form show the centre and radius BEFORE the admin
   * commits, including the one-line explanation of what widened the radius
   * (usually an airport sitting outside the city's administrative boundary).
   */
  async suggest(name, state) {
    return unwrap(await apiClient.get('/admin/cities/suggest', { params: { name, state } }));
  },

  /**
   * POST /admin/cities — payload: { city, copied, resolved, warning }
   *
   * Only `name` and `state` are required. Omit centreLat/centreLng and the
   * backend geocodes the name and derives the radius; supply BOTH to override.
   * Supplying exactly one is a 400 — a half-specified centre is a typo.
   *
   * `country` must be the two-letter ISO code. The old handler sent "India",
   * which the column (CHAR(2)) cannot hold, so even on the right path it would
   * have failed VALIDATION_ERROR.
   *
   * `copyFromCityId` seeds the new city's rate cards and rental packages from
   * an existing city in one transaction. Without it the city is created with
   * no pricing and quotes nothing.
   *
   * Read the response, don't discard it:
   *   resolved  non-null when the centre was derived — carries `explanation`
   *   warning   non-null when the state is not on the service-state allowlist,
   *             which means every pickup there will be refused
   */
  async create({ name, state, copyFromCityId, ...rest }) {
    return unwrap(await apiClient.post('/admin/cities', {
      name: name.trim(),
      state: state.trim(),
      country: 'IN',
      ...(copyFromCityId ? { copyFromCityId } : {}),
      ...rest,
    }));
  },

  /** PATCH /admin/cities/:id — payload: { city, warning } */
  async update(id, payload) {
    return unwrap(await apiClient.patch(`/admin/cities/${id}`, payload));
  },

  /**
   * DELETE deactivates; PATCH /:id/activate turns it back on. Nothing here
   * removes a city — it is a foreign key on bookings, vehicles and rate cards,
   * and the row is the evidence for what a customer was charged.
   *
   * Expect LAST_ACTIVE_CITY (400) when it is the only one left: deactivating
   * it would refuse every quote in the country.
   */
  async setActive(id, active) {
    const res = active
      ? await apiClient.patch(`/admin/cities/${id}/activate`)
      : await apiClient.del(`/admin/cities/${id}`);
    const data = unwrap(res);
    return data.city;
  },
};
