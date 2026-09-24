/**
 * Admin — business-wide payments listing, cash handover reconciliation, and
 * refund recording. Endpoint: /api/v1/admin/payments
 *
 * Real, confirmed contract:
 *   GET   /admin/payments                       — paginated (unchanged)
 *   GET   /admin/payments/cash-handovers         — driver cash awaiting handover
 *   GET   /admin/payments/cash-handovers/summary — cash-in-hand per driver
 *   PATCH /admin/payments/cash-handovers/:id/confirm — mark received
 *   GET   /admin/payments/refundable/:bookingId  — what a booking can refund
 *   POST  /admin/payments/refunds                — record a refund
 *
 * Refund history is just the existing list() filtered to purpose=REFUND —
 * there's no second listing endpoint; the backend added a `purpose` filter to
 * the one that already existed.
 */
import { apiClient } from './apiClient';

export const adminPaymentsService = {
  async list(params = {}) {
    return apiClient.get('/admin/payments', { params });
  },

  /** Convenience: same list(), pre-filtered to refund records. */
  async listRefunds(params = {}) {
    return apiClient.get('/admin/payments', { params: { ...params, purpose: 'REFUND' } });
  },

  // ---- Cash handovers ------------------------------------------------------

  async cashHandovers(params = {}) {
    return apiClient.get('/admin/payments/cash-handovers', { params });
  },

  /** { drivers: [{driverId, driverName, driverPhone, pendingAmount, pendingCount}], totalPending } */
  async cashHandoverSummary() {
    return apiClient.get('/admin/payments/cash-handovers/summary');
  },

  async confirmCashHandover(id, note) {
    return apiClient.patch(`/admin/payments/cash-handovers/${id}/confirm`, note ? { note } : {});
  },

  // ---- Refunds --------------------------------------------------------------

  /** GET /admin/payments/refundable/:bookingId — booking summary + refundable balance. */
  async refundableBalance(bookingId) {
    return apiClient.get(`/admin/payments/refundable/${bookingId}`);
  },

  /** { bookingId, amount, method, reason, reference?, notes? } */
  async createRefund(payload) {
    return apiClient.post('/admin/payments/refunds', payload);
  },

  /**
   * Look up a booking by its human-readable number (ABH-2026-000123) so the
   * refund form can take what staff actually have on hand — not a UUID.
   * Reuses the existing customer-facing lookup route; staff roles bypass its
   * ownership filter server-side (booking.service.js findByNumber).
   */
  async findBookingByNumber(bookingNumber) {
    const data = await apiClient.get(`/bookings/number/${encodeURIComponent(bookingNumber)}`);
    return data.booking || data;
  },
};
