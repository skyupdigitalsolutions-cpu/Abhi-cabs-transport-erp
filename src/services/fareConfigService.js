/**
 * Vehicle Rate Card service — /api/v1/admin/fare-configs/*
 *
 * Reads and writes the real `fare_configs` table that quote.service.js prices
 * every booking against. Requires the FARE_EDIT permission.
 *
 * There is deliberately no mock fallback for writes: a rate card that looks
 * saved but wasn't is the exact fake-success problem removed from the rest of
 * this app.
 *
 * ---------------------------------------------------------------------------
 * THE RESPONSE ENVELOPE
 * ---------------------------------------------------------------------------
 * Every endpoint answers with the same two-level shape:
 *
 *   { success: true, data: { ...payload } }
 *
 * Whether `apiClient` hands back the whole body or has already unwrapped it to
 * `body.data` is an apiClient detail, and guessing wrong is silent: you read
 * `res.data.cities`, get undefined, fall back to `[]`, and the page renders an
 * empty state that looks exactly like "the backend has no data". That is what
 * disabled the Add Rate Card button while the API was returning Bengaluru
 * perfectly well.
 *
 * `unwrap()` below accepts either shape, so the service cannot break again if
 * apiClient's behaviour changes.
 */
import { apiClient } from './apiClient';

/**
 * Return the payload object regardless of how far apiClient already unwrapped.
 *
 * A raw axios response is `{ data: { success, data } }`; an apiClient that
 * returns the body gives `{ success, data }`; one that returns the payload
 * gives the payload itself. All three land on the same object here.
 */
function unwrap(res) {
  if (!res || typeof res !== 'object') return {};
  // Raw axios: body sits under .data and carries the success flag.
  const body = res.data && res.data.success !== undefined ? res.data : res;
  // Envelope: payload sits under .data. Otherwise we already have the payload.
  return body && body.data !== undefined ? body.data : body;
}

export const fareConfigService = {
  /**
   * GET /admin/fare-configs/cities — the city picker on the form.
   * Payload: { cities, total }
   */
  async cities() {
    const data = unwrap(await apiClient.get('/admin/fare-configs/cities'));
    return data.cities || [];
  },

  /**
   * GET /admin/fare-configs — optionally filtered.
   *
   * Payload: { items, configs, pagination }. `items` and `configs` are the
   * SAME array under two names; there is no `rows` key, which is why the grid
   * was empty. Returned here as `rows` so the caller's destructuring keeps
   * working.
   *
   * Note the default: the backend returns only ACTIVE cards unless
   * includeInactive is passed. This tab has an Active/Inactive counter and a
   * reactivate toggle, so it needs all of them or a deactivated card vanishes
   * and can never be turned back on.
   */
  async list(params = {}) {
    const data = unwrap(
      await apiClient.get('/admin/fare-configs', {
        params: { includeInactive: true, limit: 200, ...params },
      }),
    );
    const rows = data.items || data.configs || [];
    return { rows, total: data.pagination?.total ?? rows.length, pagination: data.pagination };
  },

  /** GET /admin/fare-configs/:id — payload: { config } */
  async getOne(id) {
    const data = unwrap(await apiClient.get(`/admin/fare-configs/${id}`));
    return data.config;
  },

  /**
   * POST /admin/fare-configs
   *
   * Required: cityId, vehicleClass, tripType, baseFare, perKm, minimumFare.
   * Everything else is optional and defaults to 0, meaning "this rule is off".
   *
   * Expect 409 FARE_CONFIG_EXISTS when a card already covers that city, class
   * and trip type at the same effectiveFrom — usually a double-submit, or an
   * attempt to add a card that the Day 1 migration already seeded. Edit that
   * one, or clone it with a future date.
   */
  async create(payload) {
    const data = unwrap(await apiClient.post('/admin/fare-configs', payload));
    return data.config;
  },

  /**
   * PATCH /admin/fare-configs/:id — fare fields only.
   *
   * cityId, vehicleClass and tripType are rejected: those three plus
   * effectiveFrom are the unique key, so moving a card between cities would
   * silently retire the old city's pricing.
   *
   * This changes the price of every FUTURE quote. Bookings already made keep
   * the fare frozen in booking.fareBasis at quote time.
   */
  async update(id, payload) {
    const data = unwrap(await apiClient.patch(`/admin/fare-configs/${id}`, payload));
    return data.config;
  },

  /**
   * Activate / deactivate.
   *
   * There is no PATCH /:id/active endpoint — that call 404s, which is why the
   * toggle never worked. The two directions are deliberately different routes
   * because they are not symmetrical operations:
   *
   *   activate   -> PATCH /:id/activate
   *   deactivate -> DELETE /:id
   *
   * DELETE does NOT delete. It sets isActive false, and refuses with 400
   * LAST_ACTIVE_FARE_CONFIG if it is the only live card for that city, class
   * and trip type — removing that one does not make trips cheaper, it makes
   * them unbookable with FARE_CONFIG_MISSING at the quote step.
   */
  async setActive(id, isActive) {
    const res = isActive
      ? await apiClient.patch(`/admin/fare-configs/${id}/activate`)
      : await apiClient.del(`/admin/fare-configs/${id}`);
    return unwrap(res).config;
  },

  /**
   * Retire a rate card. Kept as `remove` for the caller, but nothing is
   * deleted — see setActive. A fare card is the evidence for what a customer
   * was charged six months ago, so the row always survives.
   */
  async remove(id) {
    const data = unwrap(await apiClient.del(`/admin/fare-configs/${id}`));
    return { deactivated: true, config: data.config };
  },

  /**
   * POST /admin/fare-configs/:id/clone
   *
   * The right way to do a price rise: clone the live card with next month's
   * effectiveFrom and edit the numbers. The quote engine picks the most recent
   * card whose effectiveFrom has passed, so the new price switches itself on
   * at that moment, and the old card stays to explain the bookings it priced.
   *
   * Also the one-click way to price a new vehicle class.
   */
  async clone(id, overrides = {}) {
    const data = unwrap(await apiClient.post(`/admin/fare-configs/${id}/clone`, overrides));
    return data.config;
  },

  /**
   * GET /admin/fare-configs/coverage/:cityId — payload: { missing, missingCount }
   *
   * Which vehicle class x trip type combinations have no live card. A missing
   * card is invisible until a customer hits FARE_CONFIG_MISSING at the quote
   * step, which looks like a broken app rather than a configuration gap.
   */
  async coverage(cityId) {
    return unwrap(await apiClient.get(`/admin/fare-configs/coverage/${cityId}`));
  },
};