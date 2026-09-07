/**
 * Admin — business-wide payments listing. Endpoint: /api/v1/admin/payments
 *
 * Real, confirmed contract (src/routes/adminPayment.routes.js,
 * src/services/adminPayment.service.js — read-only, GET only):
 *   GET /admin/payments — paginated, filter by ?status=, ?method=,
 *       ?from=, ?to=, ?bookingId=
 *
 * Each row includes a slice of its booking (bookingNumber, status,
 * customer.user.{name,phone}) so the Payments page can render a full table
 * without a second call per row.
 */
import { apiClient } from './apiClient';

export const adminPaymentsService = {
  async list(params = {}) {
    return apiClient.get('/admin/payments', { params });
  },
};
