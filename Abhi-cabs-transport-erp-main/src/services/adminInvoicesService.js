/**
 * Admin — invoices. There is NO "list all invoices" endpoint on this
 * backend (exhaustively confirmed — checked every route, controller, and
 * service file that mentions "invoice"; only per-booking and per-ID lookups
 * exist, plus an aggregate-only GST report). This service works around
 * that using only real, existing endpoints:
 *
 *   1. GET /bookings (?status=COMPLETED) — real, paginated, already used
 *      elsewhere in the ERP — gives every completed booking, since an
 *      invoice is only ever created when a trip completes
 *      (billing.service.js's finaliseBooking()).
 *   2. GET /admin/invoices/booking/:bookingId — real, confirmed — fetched
 *      once per completed booking to assemble the actual invoice list.
 *
 * This is an N+1 pattern (one call per booking), which is fine at current
 * data volumes but won't scale forever — if your completed-booking count
 * grows large, this is exactly the case for finally adding a real
 * GET /admin/invoices list route on the backend (see the APIs Needed doc).
 */
import { apiClient } from './apiClient';

export const adminInvoicesService = {
  /**
   * Assembles an invoice list by walking completed bookings. `limit` caps
   * how many completed bookings are checked (and therefore how many
   * invoice look-ups fire) — keep this reasonable until a real list
   * endpoint exists.
   */
  async list({ limit = 100 } = {}) {
    const bookingsRes = await apiClient.get('/admin/bookings', {
      params: { limit, sortBy: 'createdAt', status: 'COMPLETED' },
    });
    const completedBookings = bookingsRes.data || [];

    const results = await Promise.allSettled(
      completedBookings.map((b) => apiClient.get(`/admin/invoices/booking/${b.id}`))
    );

    const invoices = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value?.invoice) {
        invoices.push({ ...r.value.invoice, booking: completedBookings[i] });
      }
      // A completed booking with no invoice yet (rare — e.g. finalisation
      // in progress) is silently skipped rather than shown as an error.
    });

    invoices.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
    return { data: invoices, meta: { total: invoices.length, checkedBookings: completedBookings.length } };
  },

  async getOne(id) {
    const data = await apiClient.get(`/admin/invoices/${id}`);
    return data.invoice || data;
  },
};