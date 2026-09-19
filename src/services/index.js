/**
 * src/services/index.js
 */
import { createCrudService } from './crudFactory';
import { apiClient } from './apiClient';
import * as db from './mockDb';

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

export const vehicleService = createCrudService({
  resource:     'admin/vehicles',
  store:        db.vehicles,
  searchFields: ['registrationNumber', 'makeModel'],
  idPrefix:     'VEH',
});

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