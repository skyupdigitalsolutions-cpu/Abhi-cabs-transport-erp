/**
 * Booking requests — enquiries for trips outside the states we operate in.
 * Saved by the customer website / app via POST /booking-requests.
 *
 *   GET   /admin/booking-requests        → { requests, total }
 *                                          (no status = the open queue: NEW, REVIEWING, QUOTED;
 *                                           oldest first, so the longest-waiting is on top)
 *   GET   /admin/booking-requests/:id    → { request }
 *   PATCH /admin/booking-requests/:id    body: { status?, adminNote?, convertedBookingId? }
 *
 * Permission: BOOKING_MANAGE. Real backend only — no mock fallback, so a
 * request that looks handled but wasn't can never appear.
 */
import { apiClient } from './apiClient';

export const bookingRequestService = {
  /** Shaped for useResourceList: { data: rows, meta: { total, limit, totalPages } }. */
  async list({ page = 1, limit = 15, status } = {}) {
    const take = Number(limit) || 15;
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const res = await apiClient.get('/admin/booking-requests', {
      params: { take, skip, ...(status ? { status } : {}) },
    });
    const total = Number(res?.total ?? 0);
    return {
      data: res?.requests ?? [],
      meta: { total, limit: take, totalPages: Math.max(Math.ceil(total / take), 1) },
    };
  },

  async get(id) {
    const res = await apiClient.get(`/admin/booking-requests/${id}`);
    return res?.request ?? res;
  },

  async update(id, payload) {
    const res = await apiClient.patch(`/admin/booking-requests/${id}`, payload);
    return res?.request ?? res;
  },
};
