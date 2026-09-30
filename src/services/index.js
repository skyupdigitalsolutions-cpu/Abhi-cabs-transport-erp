/**
 * src/services/index.js
 */
import { createCrudService } from './crudFactory';
import { apiClient, withMockFallback } from './apiClient';
import { mockResolve } from './mockUtils';
import * as db from './mockDb';
import { uid } from './mockDb';

// Simple, real-only wrapper — used by Support.jsx and now also the
// Dashboard's abandoned-bookings widget, the live Notifications feed
// (polled, not push — see AdminRealtimeContext.jsx), and the Reports
// "Abandoned Bookings" tab. All three share this one definition rather
// than each re-declaring their own copy of the same GET /admin/contacts call.
export const contactService = {
  list: (params) => apiClient.get('/admin/contacts', { params }),
};

// ── Real backend CRUD resources ───────────────────────────────────────────────

export const driverService = createCrudService({
  resource:     'admin/drivers',
  store:        db.drivers,
  searchFields: ['name', 'phone', 'licenceNumber'],
  idPrefix:     'DRV',
});

// Temporary drivers: a separate, minimal creation endpoint rather than
// driverService.create() — the real /admin/drivers schema requires name +
// phone + licenceNumber (see DriverFormDrawer), which a temporary,
// email-only account deliberately skips. Backend contract:
//   POST /admin/drivers/temporary
//   { email, name?, assignedVehicleId? }   — pick from the fleet, OR
//   { email, name?, vehicleNumber? }       — a plain registration number,
//     typed manually, not tied to any Vehicle record (a borrowed/one-off
//     vehicle that was never added to the fleet). Exactly one of the two
//     vehicle fields is sent, never both.
//   → creates User(role=DRIVER) + Driver{ driverType:'TEMPORARY',
//     kycStatus:'VERIFIED', isOnline:false } with NO phone/licence, so it
//     never enters the KYC/onboarding flow. The driver app logs this
//     account in via email OTP (POST /auth/otp/request-email /
//     /auth/otp/verify-email) instead of phone OTP.
driverService.createTemporary = (payload) =>
  withMockFallback(
    () => apiClient.post('/admin/temporary-drivers', payload),
    async () => {
      await mockResolve(null);
      const assignedVehicle = payload.vehicleNumber
        ? { registrationNumber: payload.vehicleNumber, vehicleClass: null }
        : (() => {
            const vehicle = db.vehicles.find((v) => v.id === payload.assignedVehicleId);
            return vehicle ? { registrationNumber: vehicle.registrationNumber, vehicleClass: vehicle.vehicleClass } : null;
          })();
      const item = {
        id: uid('DRV'),
        userId: uid('USR'),
        createdAt: new Date().toISOString(),
        driverType: 'TEMPORARY',
        kycStatus: 'VERIFIED',
        isOnline: false,
        licenceNumber: null,
        assignedVehicleId: payload.assignedVehicleId || null,
        assignedVehicle,
        user: { name: payload.name || 'Temporary Driver', email: payload.email },
      };
      db.drivers.unshift(item);
      return item;
    }
  );

// Assigning (or re-assigning) a vehicle that ALREADY EXISTS in the fleet to a
// driver: PATCH /admin/drivers/:userId { assignedVehicleId }.
//
// That is the only vehicle field the backend's driver update accepts. It used to
// send a typed { vehicleNumber, vehicleClass }, which the backend drops (and then
// rejects the empty body), and typing a class by hand is how vehicles ended up
// with a class no booking uses ("Vehicle is sedan, booking needs swift-dzire").
// A vehicle keeps the class it already has in the fleet, so nothing can mismatch
// here; new vehicles are added under Vehicles.
driverService.assignVehicle = (driverId, spec) =>
  withMockFallback(
    async () => {
      if (!spec?.assignedVehicleId) throw new Error('Select a vehicle from the fleet.');
      return apiClient.patch(`/admin/drivers/${driverId}`, { assignedVehicleId: spec.assignedVehicleId });
    },
    async () => {
      await mockResolve(null);
      const idx = db.drivers.findIndex((d) => d.id === driverId || d.userId === driverId);
      if (idx === -1) throw Object.assign(new Error('Not found'), { status: 404 });
      const assignedVehicle = spec.vehicleNumber
        ? { registrationNumber: spec.vehicleNumber, vehicleClass: null }
        : (() => {
            const vehicle = db.vehicles.find((v) => v.id === spec.assignedVehicleId);
            return vehicle ? { registrationNumber: vehicle.registrationNumber, vehicleClass: vehicle.vehicleClass } : null;
          })();
      db.drivers[idx] = {
        ...db.drivers[idx],
        assignedVehicleId: spec.assignedVehicleId || null,
        assignedVehicle,
      };
      return db.drivers[idx];
    }
  );

// List all temporary drivers — GET /admin/temporary-drivers
driverService.listTemporary = () =>
  withMockFallback(
    () => apiClient.get('/admin/temporary-drivers'),
    async () => {
      await mockResolve(null);
      return { data: db.drivers.filter((d) => d.driverType === 'TEMPORARY') };
    }
  );

// Remove a temporary driver — DELETE /admin/temporary-drivers/:userId
driverService.deleteTemporary = (userId) =>
  withMockFallback(
    () => apiClient.delete(`/admin/temporary-drivers/${userId}`),
    async () => {
      await mockResolve(null);
      const idx = db.drivers.findIndex((d) => d.userId === userId || d.id === userId);
      if (idx !== -1) db.drivers.splice(idx, 1);
      return { success: true };
    }
  );

export const vehicleService = createCrudService({
  resource:     'admin/vehicles',
  store:        db.vehicles,
  searchFields: ['registrationNumber', 'makeModel'],
  idPrefix:     'VEH',
});

// EVERY vehicle in the fleet. The API returns at most 100 per page, so read all
// pages (capped at 20 = 2,000 vehicles). Used where a screen must pick from, or
// look up, the whole fleet rather than one page of it.
vehicleService.listAll = async ({ maxPages = 20 } = {}) => {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await apiClient.get('/admin/vehicles', { params: { page, limit: 100 } });
    all.push(...(res?.data ?? res?.items ?? res?.vehicles ?? []));
    totalPages = res?.meta?.totalPages ?? res?.pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= maxPages);
  return all;
};

// Staff-facing booking list — /admin/bookings
export const bookingService = createCrudService({
  resource:     'admin/bookings',
  store:        db.bookings,
  searchFields: ['bookingNumber'],
  idPrefix:     'BKG',
});

// tripService — alias bookingService
export const tripService = bookingService;

// invoiceService — get(id) only; adminInvoicesService handles list (N+1)
export const invoiceService = createCrudService({
  resource:     'admin/invoices',
  store:        db.invoices,
  searchFields: ['invoiceNo'],
  idPrefix:     'INV',
});

// Users (staff accounts) — /admin/users — USER_MANAGE permission required
export const userService = createCrudService({
  resource:     'admin/users',
  store:        db.users,
  searchFields: ['name', 'email'],
  idPrefix:     'USR',
});
// Alias for pages that import as 'usersService'
export const usersService = userService;

// customerService — read + limited update via /admin/customers
export { adminCustomersService } from './adminCustomersService';

// ── Mock-only resources (no backend endpoint exists) ─────────────────────────

// Tickets — no /support/tickets/* route on backend.
export const ticketService = createCrudService({
  resource:  'support/tickets',
  store:     db.tickets ?? [],
  idPrefix:  'TCK',
  mockOnly:  true,
});

// Masters — no /masters/* routes on backend.
// Masters.jsx uses mastersService.vehicleRates.{list,create,update,remove,toggle}
// and mastersService.cargoTypes / .zones / .ratecards via masterKey dynamic access.
// Must be a namespace object, NOT a flat crudService instance.
function mockMastersCrud(store, idPrefix) {
  const s = Array.isArray(store) ? store : [];
  return {
    list()           { return Promise.resolve([...s]); },
    create(item)     {
      const row = { ...item, id: `${idPrefix}-${Date.now()}`, active: item.active ?? true };
      s.push(row);
      return Promise.resolve(row);
    },
    update(id, item) {
      const idx = s.findIndex((r) => r.id === id);
      if (idx >= 0) s[idx] = { ...s[idx], ...item };
      return Promise.resolve(s[idx] ?? null);
    },
    remove(id)       {
      const idx = s.findIndex((r) => r.id === id);
      if (idx >= 0) s.splice(idx, 1);
      return Promise.resolve({ deleted: true });
    },
    toggle(id)       {
      const row = s.find((r) => r.id === id);
      if (row) row.active = !row.active;
      return Promise.resolve(row ?? null);
    },
  };
}

export const mastersService = {
  vehicleRates: mockMastersCrud(db.masters?.vehicleRates ?? db.masters?.vehicleTypes, 'VR'),
  cargoTypes:   mockMastersCrud(db.masters?.cargoTypes,   'CT'),
  zones:        mockMastersCrud(db.masters?.zones,        'ZN'),
  ratecards:    mockMastersCrud(db.masters?.ratecards,    'RC'),
  vehicleTypes: mockMastersCrud(db.masters?.vehicleTypes, 'VT'),
};

// ── Named service re-exports ──────────────────────────────────────────────────
export { authService }           from './authService';
export { adminPaymentsService }  from './adminPaymentsService';
export { notificationsService }  from './notificationsService';
export { bookingOpsService }     from './bookingOpsService';
export { dispatchService }       from './dispatchService';
export { reportsService }        from './reportsService';
export { adminService }          from './adminService';
export { driverOpsService }      from './driverOpsService';
export { adminInvoicesService }  from './adminInvoicesService';
export { fareConfigService }     from './fareConfigService';
export { vehicleCatalogService } from './vehicleCatalogService';
export { bookingRequestService } from './bookingRequestService';
