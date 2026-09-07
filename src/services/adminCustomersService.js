/**
 * Admin — Customer management. Endpoint: /api/v1/admin/customers
 *
 * Real backend confirmed contract (src/routes/adminCustomer.routes.js,
 * src/controllers/customer.controller.js, src/models/customer.model.js):
 *   GET    /admin/customers            list (paginated)
 *   GET    /admin/customers/:id        one customer
 *   PATCH  /admin/customers/:id        update — ONLY these fields are
 *                                      editable by staff: accountType,
 *                                      corporateAccountId, alternatePhone,
 *                                      gstin, loyaltyPoints, notes
 *   GET    /admin/customers/:id/billing
 *   GET    /admin/customers/:id/addresses
 *   POST   /admin/customers/:id/addresses
 *   GET    /admin/customers/:id/audit
 *   GET    /admin/customers/stats
 *
 * There is NO create or delete — customers self-register through the
 * customer app; staff can only view and adjust the fields above.
 */
import { apiClient } from './apiClient';

export const adminCustomersService = {
  async list(params = {}) {
    return apiClient.get('/admin/customers', { params });
  },
  async get(id) {
    const data = await apiClient.get(`/admin/customers/${id}`);
    return data.customer || data;
  },
  async update(id, payload) {
    const data = await apiClient.patch(`/admin/customers/${id}`, payload);
    return data.customer || data;
  },
  async getBilling(id) {
    const data = await apiClient.get(`/admin/customers/${id}/billing`);
    return data.billing || data;
  },
  async listAddresses(customerId) {
    return apiClient.get(`/admin/customers/${customerId}/addresses`);
  },
  async addAddress(customerId, payload) {
    return apiClient.post(`/admin/customers/${customerId}/addresses`, payload);
  },
  async getAuditTrail(customerId, params = {}) {
    return apiClient.get(`/admin/customers/${customerId}/audit`, { params });
  },
  async stats() {
    return apiClient.get('/admin/customers/stats');
  },
};
