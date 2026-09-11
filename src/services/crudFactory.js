import { apiClient, withMockFallback } from './apiClient';
import { mockResolve, paginate } from './mockUtils';
import { uid } from './mockDb';

/**
 * Builds a consistent { list, get, create, update, remove } service for a
 * resource, backed by the mock store today and the real REST endpoint once
 * VITE_USE_MOCK=false.
 *
 * mockOnly: true — use this for resources where the backend endpoint is
 * confirmed to not exist yet (Support/tickets, Masters). It bypasses the
 * network entirely and always returns mock data, so VITE_MOCK_FALLBACK=false
 * does not cause the "feature not connected" error screen for these pages.
 * Remove mockOnly once the real endpoint is added — withMockFallback then
 * takes over automatically.
 */
export function createCrudService({ resource, store, searchFields = [], idPrefix, mockOnly = false }) {
  const call = (liveCall, mockCall) =>
    mockOnly ? mockCall() : withMockFallback(liveCall, mockCall);

  return {
    async list(params = {}) {
      return call(
        () => apiClient.get(`/${resource}`, { params }),
        () => mockResolve(paginate(store, params))
      );
    },
    async get(id) {
      return call(
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
      return call(
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
      return call(
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
      return call(
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
