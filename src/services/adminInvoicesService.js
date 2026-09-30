/**
 * Admin — invoices. GET /api/v1/admin/invoices/*
 *
 * FIX: this used to have no real list endpoint to call, so it worked around
 * that by paging GET /admin/bookings (?status=COMPLETED) and calling
 * GET /admin/invoices/booking/:bookingId once per booking to assemble a list.
 * That workaround is why invoices were not fetching for the FINANCE role —
 * exactly the role this page is for: GET /admin/bookings requires
 * BOOKING_MANAGE, which FINANCE was never granted (it holds PAYMENT_VIEW /
 * INVOICE_MANAGE instead), so the very first call 403'd and the whole list
 * failed before a single real invoice endpoint was ever reached. ADMIN never
 * noticed, because ADMIN bypasses every permission check.
 *
 * The backend now has a real GET /admin/invoices list route (paginated,
 * filterable, gated on PAYMENT_VIEW — same permission as the other three
 * invoice endpoints), so this is a normal, single-call service again.
 *
 * Real, confirmed contract:
 *   GET /admin/invoices                       — paginated list
 *   GET /admin/invoices/:id                    — one invoice by UUID
 *   GET /admin/invoices/booking/:bookingId     — the invoice for a booking
 *   GET /admin/invoices/booking/:bookingId/ledger — its ledger entries
 */
import { apiClient, ApiError } from './apiClient';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const adminInvoicesService = {
  async list(params = {}) {
    return apiClient.get('/admin/invoices', { params });
  },

  async getOne(id) {
    const data = await apiClient.get(`/admin/invoices/${id}`);
    return data.invoice || data;
  },

  async getForBooking(bookingId) {
    const data = await apiClient.get(`/admin/invoices/booking/${bookingId}`);
    return data.invoice || data;
  },

  /**
   * The full booking for a booking id (UUID) OR a booking number (ABH-2026-001044).
   *
   *   number → GET /admin/bookings?search=<number>   (find the exact match)
   *   then   → GET /admin/bookings/:id               (full record)
   *
   * Uses apiClient directly, NOT withMockFallback: if the backend is down this
   * must fail loudly. A mock booking must never end up on a real invoice.
   * Needs BOOKING_MANAGE (same permission as the Bookings page).
   */
  async lookupBooking(raw) {
    const q = String(raw || '').trim();
    if (!q) throw new ApiError('Enter a booking id or number.', { status: 400 });

    let id = q;
    if (!UUID_RE.test(q)) {
      const res = await apiClient.get('/admin/bookings', { params: { search: q, limit: 10 } });
      const rows = res?.data ?? res?.items ?? [];
      const hit = rows.find((r) => String(r.bookingNumber || '').toLowerCase() === q.toLowerCase());
      if (!hit) throw new ApiError(`No booking found with number ${q}.`, { status: 404, code: 'BOOKING_NOT_FOUND' });
      id = hit.id;
    }

    const res = await apiClient.get(`/admin/bookings/${id}`);
    const booking = res?.booking ?? res;
    if (!booking || !booking.id) throw new ApiError('Booking not found.', { status: 404, code: 'BOOKING_NOT_FOUND' });
    return booking;
  },

  /** { ledger: LedgerEntry[], balance: {...} } */
  async ledgerForBooking(bookingId) {
    return apiClient.get(`/admin/invoices/booking/${bookingId}/ledger`);
  },
};
