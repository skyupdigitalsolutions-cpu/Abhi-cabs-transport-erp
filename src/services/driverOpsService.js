/**
 * Driver-app operational service. Endpoints:
 *   /api/v1/driver/location/*  — online/offline toggle + frequent GPS pings
 * GPS pings are high-frequency and go straight to Redis on the backend, not
 * the main DB — so this fires-and-forgets by design (no retry storms).
 *
 * DEAD: acceptOffer() / declineOffer() below call
 * /driver/offers/:allocationId/accept and /decline, which NO LONGER EXIST.
 * The backend removed that router deliberately — see dispatch.routes.js:
 * "Dispatch assigns; the driver is told, not asked." The empty router is
 * still mounted there so the app boots, which means these calls get a 404
 * rather than a connection error.
 *
 * Nothing in this app calls them (the only reference is the re-export in
 * services/index.js), so they are left here documented rather than removed,
 * in case a future driver-facing screen is tempted to use them. It should
 * not: allocation is push-final.
 */
import { apiClient, withMockFallback } from './apiClient';
import { mockResolve } from './mockUtils';

export const driverOpsService = {
  /** POST /driver/offers/:allocationId/accept */
  async acceptOffer(allocationId) {
    return withMockFallback(
      () => apiClient.post(`/driver/offers/${allocationId}/accept`, {}),
      () => mockResolve({ success: true })
    );
  },

  /** POST /driver/offers/:allocationId/decline */
  async declineOffer(allocationId, reason) {
    return withMockFallback(
      () => apiClient.post(`/driver/offers/${allocationId}/decline`, { reason }),
      () => mockResolve({ success: true })
    );
  },

  /** POST /driver/location/online — driver becomes available for dispatch. */
  async goOnline() {
    return withMockFallback(
      () => apiClient.post('/driver/location/online', {}),
      () => mockResolve({ online: true })
    );
  },

  /** POST /driver/location/offline */
  async goOffline() {
    return withMockFallback(
      () => apiClient.post('/driver/location/offline', {}),
      () => mockResolve({ online: false })
    );
  },

  /**
   * POST /driver/location/ping — send a GPS ping during a trip. Frequent
   * (every few seconds); failures are swallowed so a flaky network doesn't
   * spam the UI with errors mid-trip.
   */
  async ping({ lat, lng, speedKmph, heading, bookingId }) {
    try {
      return await withMockFallback(
        () => apiClient.post('/driver/location/ping', { lat, lng, speedKmph, heading, bookingId }),
        () => mockResolve({ ok: true })
      );
    } catch {
      return { ok: false };
    }
  },
};
