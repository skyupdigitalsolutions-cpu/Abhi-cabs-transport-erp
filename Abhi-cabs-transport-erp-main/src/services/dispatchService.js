/**
 * Dispatch & location service.
 * Endpoints: /api/v1/admin/dispatch/* , /api/v1/admin/location/*
 */
import { apiClient, withMockFallback } from './apiClient';
import { mockResolve } from './mockUtils';
import { bookings, drivers, vehicles, uid } from './mockDb';
import { BOOKING_STATUS, VEHICLE_STATUS, DRIVER_STATUS } from '../constants';

export const dispatchService = {
  /** GET /admin/dispatch/board — bookings needing a vehicle. */
  async board() {
    return withMockFallback(
      () => apiClient.get('/admin/dispatch/board'),
      () => mockResolve(
        bookings.filter((b) => b.status === BOOKING_STATUS.PENDING || b.status === BOOKING_STATUS.CONFIRMED).slice(0, 20)
      )
    );
  },

  /** GET /admin/dispatch/pending — pending allocations. */
  async pending() {
    return withMockFallback(
      () => apiClient.get('/admin/dispatch/pending'),
      () => mockResolve(bookings.filter((b) => b.status === BOOKING_STATUS.CONFIRMED))
    );
  },

  /** GET /admin/dispatch/live — live/active trips. */
  async live() {
    return withMockFallback(
      () => apiClient.get('/admin/dispatch/live'),
      () => mockResolve(bookings.filter((b) => [BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.ONGOING].includes(b.status)))
    );
  },

  /** GET /admin/dispatch/vehicles — currently available vehicles. */
  async availableVehicles() {
    return withMockFallback(
      () => apiClient.get('/admin/dispatch/vehicles'),
      () => mockResolve(vehicles.filter((v) => v.status === VEHICLE_STATUS.AVAILABLE))
    );
  },

  /** POST /admin/dispatch/bookings/:bookingId/assign — manual assignment. */
  async assign(bookingId, { driverId, vehicleId }) {
    return withMockFallback(
      () => apiClient.post(`/admin/dispatch/bookings/${bookingId}/assign`, { driverId, vehicleId }),
      () => mockAssign(bookingId, driverId, vehicleId)
    );
  },

  /** GET /admin/dispatch/bookings/:bookingId/allocation */
  async allocation(bookingId) {
    return withMockFallback(
      () => apiClient.get(`/admin/dispatch/bookings/${bookingId}/allocation`),
      () => mockResolve(null)
    );
  },

  /** GET /admin/location/nearby?lat=&lng= — drivers near a point. */
  async nearbyDrivers(lat, lng, { radiusKm, limit } = {}) {
    return withMockFallback(
      () => apiClient.get('/admin/location/nearby', { params: { lat, lng, radiusKm, limit } }),
      () => mockResolve([])
    );
  },

  /** GET /admin/location/driver/:driverId — a driver's latest location. */
  async driverLocation(driverId) {
    return withMockFallback(
      () => apiClient.get(`/admin/location/driver/${driverId}`),
      () => mockResolve(null)
    );
  },

  /** GET /admin/location/trip/:bookingId/trail — full GPS trail for a trip. */
  async tripTrail(bookingId) {
    return withMockFallback(
      () => apiClient.get(`/admin/location/trip/${bookingId}/trail`),
      () => mockResolve([])
    );
  },
};

function mockAssign(bookingId, driverId, vehicleId) {
  const driver = drivers.find((d) => d.id === driverId);
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const idx = bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) throw Object.assign(new Error('Booking not found'), { status: 404 });

  bookings[idx] = {
    ...bookings[idx],
    status: BOOKING_STATUS.ALLOCATED,
    assignedDriverId: driverId,
    assignedDriverName: driver?.name,
    assignedVehicleId: vehicleId,
    assignedVehicleReg: vehicle?.regNo,
    statusHistory: [
      ...(bookings[idx].statusHistory || []),
      { from: bookings[idx].status, to: BOOKING_STATUS.ALLOCATED, at: new Date().toISOString(), by: 'Dispatch' },
    ],
  };

  const vIdx = vehicles.findIndex((v) => v.id === vehicleId);
  if (vIdx !== -1) vehicles[vIdx] = { ...vehicles[vIdx], status: VEHICLE_STATUS.ASSIGNED };

  return mockResolve({ booking: bookings[idx], allocationId: uid('ALC') });
}
