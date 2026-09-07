/**
 * Customer self-service. Endpoints: /api/v1/users, /api/v1/customers
 */
import { apiClient, withMockFallback } from './apiClient';
import { mockResolve } from './mockUtils';

export const customerService = {
  /** GET /users/profile */
  async getProfile() {
    return withMockFallback(
      () => apiClient.get('/users/profile'),
      () => mockResolve(null)
    );
  },
  /** PATCH /users/profile */
  async updateProfile(fields) {
    return withMockFallback(
      () => apiClient.patch('/users/profile', fields),
      () => mockResolve(fields)
    );
  },

  /** GET /customers/me — loyalty, totals, account type. */
  async getMe(userId) {
    return withMockFallback(
      () => apiClient.get('/customers/me'),
      () => mockResolve({ id: userId, accountType: 'RETAIL', loyaltyPoints: 0 })
    );
  },
  /** PATCH /customers/me */
  async updateMe(fields) {
    return withMockFallback(
      () => apiClient.patch('/customers/me', fields),
      () => mockResolve(fields)
    );
  },
  /** GET /customers/me/billing — corporate/GST billing details. */
  async getBilling() {
    return withMockFallback(
      () => apiClient.get('/customers/me/billing'),
      () => mockResolve(null)
    );
  },

  /** GET /customers/me/addresses */
  async listAddresses() {
    return withMockFallback(
      () => apiClient.get('/customers/me/addresses'),
      () => mockResolve([])
    );
  },
  /** POST /customers/me/addresses */
  async addAddress(address) {
    return withMockFallback(
      () => apiClient.post('/customers/me/addresses', address),
      () => mockResolve(address)
    );
  },
  /** PATCH /customers/me/addresses/:id */
  async updateAddress(id, address) {
    return withMockFallback(
      () => apiClient.patch(`/customers/me/addresses/${id}`, address),
      () => mockResolve(address)
    );
  },
  /** DEL /customers/me/addresses/:id */
  async deleteAddress(id) {
    return withMockFallback(
      () => apiClient.del(`/customers/me/addresses/${id}`),
      () => mockResolve({ success: true })
    );
  },
};
