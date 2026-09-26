/**
 * src/services/discountService.js
 *
 * Promo-code management — wired to the REAL backend (was previously a
 * local-only page). Backend contract (all behind FARE_EDIT):
 *
 *   GET    /admin/discounts?page&limit&includeInactive&search
 *   POST   /admin/discounts        { code, description, type, value, ... }
 *   PATCH  /admin/discounts/:id    { ...fields }        (no `code` — codes are frozen)
 *   DELETE /admin/discounts/:id    (disables, never deletes — redemptions keep the row)
 *   GET    /admin/discounts/:id/redemptions
 *
 * Backend field names / enums (exact casing matters):
 *   type       : 'PERCENT' | 'FLAT'
 *   appliesTo  : 'ALL_BOOKINGS' | 'FIRST_RIDE' | 'CORPORATE' | 'AIRPORT'
 *   isActive   : boolean
 *   value      : number      (PERCENT must be <= 100)
 *   maxDiscount, minFare, maxUses, maxUsesPerCustomer : number | null
 *   startsAt, expiresAt : ISO date | null
 *   id         : NUMBER (not a UUID)
 *
 * The list controller returns { items, discounts, pagination } and single
 * mutations return { discount }. apiClient unwraps the { success, data }
 * envelope, so we read res.items / res.discount here.
 */
import { apiClient } from './apiClient';

function unwrapList(res) {
  const items = res?.items ?? res?.discounts ?? (Array.isArray(res) ? res : []);
  const pagination = res?.pagination ?? res?.meta ?? null;
  return { items, pagination };
}

function unwrapOne(res) {
  return res?.discount ?? res?.data ?? res;
}

/**
 * Strip UI-only / empty values before sending. The backend rejects unknown
 * keys quietly (zod strips them) but empty strings for optional numbers/dates
 * would coerce badly, so we drop them here.
 */
function cleanPayload(input) {
  const out = {};
  const copyIf = (k, v) => { if (v !== '' && v !== undefined && v !== null) out[k] = v; };

  if (input.code != null) out.code = String(input.code).trim().toUpperCase();
  copyIf('description', input.description?.trim?.() ?? input.description);
  if (input.type) out.type = input.type;                       // 'PERCENT' | 'FLAT'
  if (input.value !== '' && input.value != null) out.value = Number(input.value);
  if (input.appliesTo) out.appliesTo = input.appliesTo;         // enum

  // Optional numerics: '' means "leave unset / unlimited" -> omit.
  if (input.minFare !== '' && input.minFare != null) out.minFare = Number(input.minFare);
  if (input.maxDiscount !== '' && input.maxDiscount != null) out.maxDiscount = Number(input.maxDiscount);
  if (input.maxUses !== '' && input.maxUses != null) out.maxUses = Number(input.maxUses);
  if (input.maxUsesPerCustomer !== '' && input.maxUsesPerCustomer != null) {
    out.maxUsesPerCustomer = Number(input.maxUsesPerCustomer);
  }

  // Dates from <input type="date"> arrive as 'YYYY-MM-DD'; backend coerces them.
  copyIf('startsAt', input.startsAt);
  copyIf('expiresAt', input.expiresAt);

  if (typeof input.isActive === 'boolean') out.isActive = input.isActive;

  return out;
}

export const discountService = {
  async list(params = {}) {
    const res = await apiClient.get('/admin/discounts', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 100,
        // Show disabled/expired/scheduled too so the toggle can re-enable them.
        includeInactive: params.includeInactive ?? true,
        ...(params.search ? { search: params.search } : {}),
      },
    });
    return unwrapList(res);
  },

  async create(input) {
    const res = await apiClient.post('/admin/discounts', cleanPayload(input));
    return unwrapOne(res);
  },

  async update(id, input) {
    // `code` can never be changed on the backend — never send it on update.
    const { code, ...rest } = cleanPayload(input);
    const res = await apiClient.patch(`/admin/discounts/${id}`, rest);
    return unwrapOne(res);
  },

  /** DELETE disables the code (keeps it for dispute history). */
  async disable(id) {
    const res = await apiClient.delete(`/admin/discounts/${id}`);
    return unwrapOne(res);
  },

  /** Re-enable a disabled code via PATCH { isActive: true }. */
  async enable(id) {
    const res = await apiClient.patch(`/admin/discounts/${id}`, { isActive: true });
    return unwrapOne(res);
  },

  async redemptions(id) {
    const res = await apiClient.get(`/admin/discounts/${id}/redemptions`);
    return { count: res?.count ?? 0, redemptions: res?.redemptions ?? [] };
  },
};

export default discountService;
