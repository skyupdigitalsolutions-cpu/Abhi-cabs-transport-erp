/**
 * Vehicle Rate Card service — wired to the real backend endpoints added for
 * this feature: /api/v1/admin/fare-configs/*. Unlike mastersService (Cargo
 * Types, Zones, the standalone "Rate Cards" tab, all still mock-only), this
 * one reads and writes the actual `fare_configs` table that quote.service.js
 * uses for every real fare calculation. Requires the FARE_EDIT permission.
 *
 * There is deliberately no mock fallback for writes here: a rate card that
 * looks saved but wasn't would be the exact fake-success problem removed
 * from the rest of this app. Reads fall back to an empty list (rather than
 * fabricated rows) if the backend is genuinely unreachable, so the page
 * still renders a clear empty/error state instead of a blank crash.
 */
import { apiClient } from './apiClient';

export const fareConfigService = {
  /** GET /admin/fare-configs/cities — for the city picker on the form. */
  async cities() {
    const res = await apiClient.get('/admin/fare-configs/cities');
    return res.data?.cities || [];
  },

  /** GET /admin/fare-configs — optionally filtered. */
  async list(params = {}) {
    const res = await apiClient.get('/admin/fare-configs', { params });
    return res.data || { rows: [], total: 0 };
  },

  async getOne(id) {
    const res = await apiClient.get(`/admin/fare-configs/${id}`);
    return res.data?.rateCard;
  },

  /** POST /admin/fare-configs — cityId, vehicleClass, tripType, baseFare,
   *  perKm, minimumFare required; every other field optional (Advanced mode). */
  async create(payload) {
    const res = await apiClient.post('/admin/fare-configs', payload);
    return res.data?.rateCard;
  },

  /** PATCH /admin/fare-configs/:id — identity fields (city/class/tripType)
   *  are not editable; only fare fields. */
  async update(id, payload) {
    const res = await apiClient.patch(`/admin/fare-configs/${id}`, payload);
    return res.data?.rateCard;
  },

  async setActive(id, isActive) {
    const res = await apiClient.patch(`/admin/fare-configs/${id}/active`, { isActive });
    return res.data?.rateCard;
  },

  async remove(id) {
    await apiClient.del(`/admin/fare-configs/${id}`);
    return { deleted: true };
  },
};
