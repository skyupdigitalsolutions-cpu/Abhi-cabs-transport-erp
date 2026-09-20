/**
 * Booking status-transition service.
 *
 * The backend does NOT accept a generic PUT with an arbitrary `status`
 * field — status changes are dedicated, validated PATCH actions:
 *   PATCH /admin/bookings/:id/confirm    PENDING   → CONFIRMED
 *   PATCH /admin/bookings/:id/allocate   CONFIRMED → ALLOCATED
 *   PATCH /admin/bookings/:id/en-route   ALLOCATED → EN_ROUTE
 *   PATCH /admin/bookings/:id/start      EN_ROUTE  → ONGOING
 *   PATCH /admin/bookings/:id/complete   ONGOING   → COMPLETED (writes invoice + ledger)
 *   PATCH /admin/bookings/:id/expire     PENDING   → EXPIRED
 *   POST  /admin/bookings/:id/cancel     any       → CANCELLED
 * This module is the single place that calls those endpoints; pages should
 * never PUT a `status` field onto a booking directly.
 */
import { apiClient, withMockFallback } from './apiClient';
import { mockResolve } from './mockUtils';
import { bookings } from './mockDb';
import { BOOKING_TRANSITION_ACTION, BOOKING_TRANSITIONS } from '../constants';

function mockTransition(bookingId, nextStatus, extra = {}) {
  const idx = bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) throw Object.assign(new Error('Booking not found'), { status: 404 });
  const historyEntry = { from: bookings[idx].status, to: nextStatus, at: new Date().toISOString(), by: 'Admin' };
  bookings[idx] = {
    ...bookings[idx],
    status: nextStatus,
    ...extra,
    statusHistory: [...(bookings[idx].statusHistory || []), historyEntry],
  };
  return mockResolve(bookings[idx]);
}

export const bookingOpsService = {
  /**
   * GET /admin/bookings/:id — full booking record (already exists on the
   * backend). Used here to read pickupLat/pickupLng for driver-suggestion
   * distance ranking on the Dispatch board — no backend change required.
   */
  async getOne(bookingId) {
    return withMockFallback(
      () => apiClient.get(`/admin/bookings/${bookingId}`),
      () => {
        const b = bookings.find((x) => x.id === bookingId);
        return mockResolve(b ? { booking: b } : null);
      }
    );
  },

  /** GET /admin/bookings/:id/actions — which transitions are valid right now. */
  async getValidActions(bookingId) {
    return withMockFallback(
      () => apiClient.get(`/admin/bookings/${bookingId}/actions`),
      () => {
        const b = bookings.find((x) => x.id === bookingId);
        return mockResolve({ actions: b ? BOOKING_TRANSITIONS[b.status] || [] : [] });
      }
    );
  },

  /** Drive a booking to `nextStatus` via its dedicated PATCH action. */
  async transition(bookingId, nextStatus, extra = {}) {
    const action = BOOKING_TRANSITION_ACTION[nextStatus];
    if (!action) throw new Error(`No backend action mapped for status "${nextStatus}"`);
    return withMockFallback(
      () => apiClient.patch(`/admin/bookings/${bookingId}/${action}`, extra),
      () => mockTransition(bookingId, nextStatus, extra)
    );
  },

  confirm:  (bookingId, extra) => bookingOpsService.transition(bookingId, 'CONFIRMED', extra),
  allocate: (bookingId, extra) => bookingOpsService.transition(bookingId, 'ALLOCATED', extra),
  enRoute:  (bookingId, extra) => bookingOpsService.transition(bookingId, 'EN_ROUTE', extra),
  start:    (bookingId, extra) => bookingOpsService.transition(bookingId, 'ONGOING', extra),
  complete: (bookingId, extra) => bookingOpsService.transition(bookingId, 'COMPLETED', extra),
  expire:   (bookingId, extra) => bookingOpsService.transition(bookingId, 'EXPIRED', extra),

  /** GET /admin/bookings/:id/cancellation-quote — fee/refund preview. */
  async cancellationQuote(bookingId) {
    return withMockFallback(
      () => apiClient.get(`/admin/bookings/${bookingId}/cancellation-quote`),
      () => mockResolve({ fee: 0, refund: 0 })
    );
  },

  /**
   * POST /admin/bookings/:id/cancel
   * Body field is `cancelledByType` (CUSTOMER/DRIVER/ADMIN/SYSTEM) — matches
   * lifecycle.schemas.js's adminCancelSchema. This used to send
   * `cancelledBy`, a key the backend doesn't recognize; Zod silently strips
   * unknown keys rather than rejecting them, so it never errored — it just
   * meant the value was never actually received, and the service fell back
   * to its own 'ADMIN' default every time regardless of what was passed.
   */
  async cancel(bookingId, { reason, cancelledByType = 'ADMIN' } = {}) {
    return withMockFallback(
      () => apiClient.post(`/admin/bookings/${bookingId}/cancel`, { reason, cancelledByType }),
      () => mockTransition(bookingId, 'CANCELLED', { cancelReason: reason, cancelledByType })
    );
  },

  /** GET /admin/bookings/stats — booking counters for the dashboard. */
  async stats() {
    return withMockFallback(
      () => apiClient.get('/admin/bookings/stats'),
      () => {
        const byStatus = {};
        bookings.forEach((b) => { byStatus[b.status] = (byStatus[b.status] || 0) + 1; });
        return mockResolve({ total: bookings.length, byStatus });
      }
    );
  },

  /** GET /admin/bookings/attempts — includes abandoned funnel data. */
  async attempts(params = {}) {
    return withMockFallback(
      () => apiClient.get('/admin/bookings/attempts', { params }),
      () => mockResolve({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } })
    );
  },
};
