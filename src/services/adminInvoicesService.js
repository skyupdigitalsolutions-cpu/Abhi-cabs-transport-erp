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
import { apiClient } from './apiClient';

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

  /** { ledger: LedgerEntry[], balance: {...} } */
  async ledgerForBooking(bookingId) {
    return apiClient.get(`/admin/invoices/booking/${bookingId}/ledger`);
  },
};
