/**
 * Admin core service. Endpoints:
 *   /api/v1/admin, /admin/customers, /admin/corporate, /admin/invoices, /admin/audit
 */
import { apiClient, withMockFallback } from './apiClient';
import { mockResolve, paginate } from './mockUtils';
import { bookings, drivers, vehicles, payments, users, invoices } from './mockDb';
import { DRIVER_STATUS, PAYMENT_STATUS } from '../constants';

export const adminService = {
  /** GET /admin/stats — top-level dashboard counters. */
  async stats() {
    return withMockFallback(
      () => apiClient.get('/admin/stats'),
      () => mockResolve({
        activeDrivers: drivers.filter((d) => d.status === DRIVER_STATUS.ACTIVE || d.status === DRIVER_STATUS.ON_TRIP).length,
        fleetVehicles: vehicles.length,
        bookings30d: bookings.length,
        revenuePaid: payments.filter((p) => p.status === PAYMENT_STATUS.CAPTURED).reduce((s, p) => s + p.amount, 0),
        fleetByStatus: Object.entries(
          vehicles.reduce((acc, v) => ({ ...acc, [v.status]: (acc[v.status] || 0) + 1 }), {})
        ).map(([label, value]) => ({ label, value })),
      })
    );
  },

  /** GET /admin/users — staff/user management. */
  async listUsers(params = {}) {
    return withMockFallback(
      () => apiClient.get('/admin/users', { params }),
      () => mockResolve(paginate(users, params))
    );
  },

  /** PATCH /admin/users/:id/activate | /deactivate */
  async setUserActive(userId, active) {
    return withMockFallback(
      () => apiClient.patch(`/admin/users/${userId}/${active ? 'activate' : 'deactivate'}`, {}),
      () => {
        const u = users.find((x) => x.id === userId);
        if (u) u.status = active ? 'active' : 'inactive';
        return mockResolve(u);
      }
    );
  },

  /** GET /admin/permissions · /admin/permissions/catalogue */
  async listPermissions() {
    return withMockFallback(
      () => apiClient.get('/admin/permissions'),
      () => mockResolve([])
    );
  },
  async permissionsCatalogue() {
    return withMockFallback(
      () => apiClient.get('/admin/permissions/catalogue'),
      () => mockResolve([])
    );
  },
  async grantPermission(role, permission) {
    return withMockFallback(
      () => apiClient.post('/admin/permissions/grant', { role, permission }),
      () => mockResolve({ success: true })
    );
  },
  async revokePermission(role, permission) {
    return withMockFallback(
      () => apiClient.post('/admin/permissions/revoke', { role, permission }),
      () => mockResolve({ success: true })
    );
  },

  /** GET /admin/customers — list, detail, billing, addresses. */
  async listCustomers(params = {}) {
    return withMockFallback(
      () => apiClient.get('/admin/customers', { params }),
      () => mockResolve(paginate([], params))
    );
  },
  async getCustomer(id) {
    return withMockFallback(
      () => apiClient.get(`/admin/customers/${id}`),
      () => mockResolve(null)
    );
  },

  /** GET /admin/corporate — corporate accounts + employees + activate/deactivate. */
  async listCorporateAccounts(params = {}) {
    return withMockFallback(
      () => apiClient.get('/admin/corporate', { params }),
      () => mockResolve(paginate([], params))
    );
  },
  async setCorporateActive(accountId, active) {
    return withMockFallback(
      () => apiClient.patch(`/admin/corporate/${accountId}/${active ? 'activate' : 'deactivate'}`, {}),
      () => mockResolve({ success: true })
    );
  },

  /** GET /admin/invoices/booking/:bookingId (+ /ledger) · /admin/invoices/:id */
  async getInvoiceForBooking(bookingId) {
    return withMockFallback(
      () => apiClient.get(`/admin/invoices/booking/${bookingId}`),
      () => mockResolve(invoices.find((i) => i.bookingId === bookingId) || null)
    );
  },
  async getLedgerForBooking(bookingId) {
    return withMockFallback(
      () => apiClient.get(`/admin/invoices/booking/${bookingId}/ledger`),
      () => mockResolve([])
    );
  },
  async getInvoice(id) {
    return withMockFallback(
      () => apiClient.get(`/admin/invoices/${id}`),
      () => mockResolve(invoices.find((i) => i.id === id) || null)
    );
  },

  /** GET /admin/audit — who did what. */
  async auditLog(params = {}) {
    return withMockFallback(
      () => apiClient.get('/admin/audit', { params }),
      () => mockResolve(paginate([], params))
    );
  },
};
