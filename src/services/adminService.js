/**
 * src/services/adminService.js
 *
 * FIXES:
 * 1. /admin/stats — GET /admin/stats is correctly mounted. ✅
 * 2. /admin/users — GET/POST/PATCH/DELETE /admin/users are all mounted. ✅
 *    Previously createUser / getUser / updateUser / deleteUser were missing —
 *    they existed on the backend but weren't called anywhere.
 * 3. Permission routes: /admin/permissions/* — SETTINGS_MANAGE required. ✅
 * 4. /admin/customers — CUSTOMER_MANAGE required. ✅
 * 5. /admin/audit — AUDIT_VIEW required. ✅
 * 6. /admin/corporate — corporate accounts list. ✅
 */
import { apiClient, withMockFallback } from './apiClient';
import { mockResolve, paginate } from './mockUtils';
import { bookings, drivers, vehicles, payments, users } from './mockDb';
import { DRIVER_STATUS, PAYMENT_STATUS } from '../constants';

export const adminService = {
  // ── Dashboard stats ──────────────────────────────────────────────────────
  async stats() {
    return withMockFallback(
      () => apiClient.get('/admin/stats'),
      () => mockResolve({
        activeDrivers:  drivers.filter((d) => d.status === DRIVER_STATUS.ACTIVE || d.status === DRIVER_STATUS.ON_TRIP).length,
        fleetVehicles:  vehicles.length,
        bookings30d:    bookings.length,
        revenuePaid:    payments.filter((p) => p.status === PAYMENT_STATUS.CAPTURED).reduce((s, p) => s + p.amount, 0),
      })
    );
  },

  // ── User management — /admin/users — USER_MANAGE ─────────────────────────
  async listUsers(params = {}) {
    return withMockFallback(
      () => apiClient.get('/admin/users', { params }),
      () => mockResolve(paginate(users, params))
    );
  },

  async createUser(payload) {
    return withMockFallback(
      () => apiClient.post('/admin/users', payload),
      () => {
        const u = { id: `USR-${Date.now()}`, ...payload, status: 'active', createdAt: new Date().toISOString() };
        users.unshift(u);
        return mockResolve(u);
      }
    );
  },

  async getUser(id) {
    return withMockFallback(
      () => apiClient.get(`/admin/users/${id}`),
      () => mockResolve(users.find((u) => u.id === id) || null)
    );
  },

  async updateUser(id, payload) {
    return withMockFallback(
      () => apiClient.patch(`/admin/users/${id}`, payload),
      () => {
        const u = users.find((x) => x.id === id);
        if (u) Object.assign(u, payload);
        return mockResolve(u);
      }
    );
  },

  async deleteUser(id) {
    return withMockFallback(
      () => apiClient.del(`/admin/users/${id}`),
      () => {
        const idx = users.findIndex((u) => u.id === id);
        if (idx !== -1) users.splice(idx, 1);
        return mockResolve({ success: true });
      }
    );
  },

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

  // ── Permission management — /admin/permissions — SETTINGS_MANAGE ─────────
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

  // ── Customer management (staff view) — /admin/customers ──────────────────
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

  // ── Corporate accounts — /admin/corporate ─────────────────────────────────
  async listCorporateAccounts(params = {}) {
    return withMockFallback(
      () => apiClient.get('/admin/corporate', { params }),
      () => mockResolve(paginate([], params))
    );
  },

  // ── Audit log — /admin/audit — AUDIT_VIEW ────────────────────────────────
  async auditLog(params = {}) {
    return withMockFallback(
      () => apiClient.get('/admin/audit', { params }),
      () => mockResolve(paginate([], params))
    );
  },

  // ── Invoices (per booking only — no list-all endpoint on backend) ─────────
  async getInvoiceForBooking(bookingId) {
    return withMockFallback(
      () => apiClient.get(`/admin/invoices/booking/${bookingId}`),
      () => mockResolve(null)
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
      () => mockResolve(null)
    );
  },
};