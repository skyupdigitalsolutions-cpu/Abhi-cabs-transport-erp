import { apiClient, withMockFallback } from './apiClient';
import { mockResolve, paginate } from './mockUtils';
import { uid } from './mockDb';

/**
 * Builds a consistent { list, get, create, update, remove } service for a
 * resource, backed by the mock store today and the real REST endpoint once
 * VITE_USE_MOCK=false. Every module (customers, drivers, vehicles, ...) is
 * defined by one call to this factory so behaviour never drifts per-page.
 *
 * Each method goes through withMockFallback(), so if the real backend
 * genuinely hasn't implemented this resource yet (a true "Route not found"
 * from Express's catch-all — see apiClient's EndpointNotImplementedError),
 * it transparently falls back to demo data instead of showing an error
 * screen. A real backend error for a resource that DOES exist (validation,
 * auth, a genuine "record not found") is never masked — only a wholly
 * unmounted route triggers the fallback. The moment the backend team adds
 * the real endpoint, this fallback simply stops firing and live data takes
 * over automatically, with no frontend change needed.
 */
export function createCrudService({ resource, store, searchFields = [], idPrefix }) {
  return {
    async list(params = {}) {
      return withMockFallback(
        () => apiClient.get(`/${resource}`, { params }),
        () => mockResolve(paginate(store, params))
      );
    },
    async get(id) {
      return withMockFallback(
        () => apiClient.get(`/${resource}/${id}`),
        async () => {
          await mockResolve(null);
          const item = store.find((r) => r.id === id);
          if (!item) throw Object.assign(new Error('Not found'), { status: 404 });
          return item;
        }
      );
    },
    async create(payload) {
      return withMockFallback(
        () => apiClient.post(`/${resource}`, payload),
        async () => {
          await mockResolve(null);
          const item = { id: uid(idPrefix), createdAt: new Date().toISOString(), ...payload };
          store.unshift(item);
          return item;
        }
      );
    },
    async update(id, payload) {
      return withMockFallback(
        // Every real update endpoint on this backend uses PATCH, never PUT
        // (confirmed: zero PUT routes exist anywhere in src/routes/*.js).
        () => apiClient.patch(`/${resource}/${id}`, payload),
        async () => {
          await mockResolve(null);
          const idx = store.findIndex((r) => r.id === id);
          if (idx === -1) throw Object.assign(new Error('Not found'), { status: 404 });
          store[idx] = { ...store[idx], ...payload };
          return store[idx];
        }
      );
    },
    async remove(id) {
      return withMockFallback(
        () => apiClient.del(`/${resource}/${id}`),
        async () => {
          await mockResolve(null);
          const idx = store.findIndex((r) => r.id === id);
          if (idx !== -1) store.splice(idx, 1);
          return { success: true };
        }
      );
    },
  };
}
