/**
 * src/services/crudFactory.js
 *
 * FIX: get() double-wrap bug.
 *
 * Backend single-resource endpoints return:
 *   { success: true, data: { booking: {...} } }   ← for bookings
 *   { success: true, data: { driver: {...} } }    ← for drivers
 *   { success: true, data: { vehicle: {...} } }   ← for vehicles
 *
 * apiClient.unwrap() strips { success, data } → returns { booking: {...} }
 * The old get() returned that directly, so callers received { booking: {...} }
 * instead of the booking object itself. BookingDetail read booking.id = undefined.
 *
 * Fix: after the live call, if the result is a plain object with exactly ONE
 * key whose value is also a non-array object, unwrap it. This matches every
 * single-resource backend response shape without hardcoding resource names.
 *
 * Examples:
 *   { booking: {...} }  → {...}   ✅
 *   { driver: {...} }   → {...}   ✅
 *   { id, name, ... }   → as-is  ✅ (already a flat object, multiple keys)
 *   { items: [], pagination: {} } → as-is  ✅ (list shape, handled by list())
 */
import { apiClient, withMockFallback } from './apiClient';
import { mockResolve, paginate } from './mockUtils';
import { uid } from './mockDb';

function unwrapSingleResource(data) {
  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Object.keys(data).length === 1
  ) {
    const val = data[Object.keys(data)[0]];
    if (val && typeof val === 'object' && !Array.isArray(val)) return val;
  }
  return data;
}

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
        async () => {
          const data = await apiClient.get(`/${resource}/${id}`);
          // Unwrap single-resource envelope: { booking: {...} } → {...}
          return unwrapSingleResource(data);
        },
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
