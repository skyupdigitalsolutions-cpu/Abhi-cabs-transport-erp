import { createCrudService } from './crudFactory';
import * as db from './mockDb';

export const driverService       = createCrudService({ resource: 'admin/drivers',   store: db.drivers,       searchFields: ['name','phone','licenceNumber'],     idPrefix: 'DRV' });
export const vehicleService      = createCrudService({ resource: 'admin/vehicles',  store: db.vehicles,      searchFields: ['registrationNumber','makeModel'],  idPrefix: 'VEH' });
export const bookingService      = createCrudService({ resource: 'bookings',        store: db.bookings,      searchFields: ['clientName','pickup','drop'],       idPrefix: 'BKG' });
export const tripService         = createCrudService({ resource: 'trips',           store: db.trips,         searchFields: ['driverName','vehicleRegNo'],        idPrefix: 'TRP' });
export const invoiceService      = createCrudService({ resource: 'admin/invoices',  store: db.invoices,      searchFields: ['invoiceNo','clientName'],           idPrefix: 'INV' });
export const ticketService       = createCrudService({ resource: 'support/tickets', store: db.tickets,       searchFields: ['subject','clientName'],             idPrefix: 'TCK' });
export const userService         = createCrudService({ resource: 'admin/users',     store: db.users,         searchFields: ['name','email'],                     idPrefix: 'USR' });

// Masters — thin wrappers around the masters sub-object in mockDb
import { USE_MOCK } from './apiClient';
import { mockResolve } from './mockUtils';
import { uid } from './mockDb';
import { apiClient } from './apiClient';

function mastersCrud(key) {
  return {
    async list() {
      if (USE_MOCK) return mockResolve(db.masters[key]);
      return apiClient.get(`/masters/${key}`);
    },
    async create(item) {
      if (USE_MOCK) {
        const prefix = key.slice(0,3).toUpperCase();
        const row = { ...item, id: uid(prefix), active: item.active ?? true };
        db.masters[key].push(row);
        return mockResolve(row);
      }
      return apiClient.post(`/masters/${key}`, item);
    },
    async update(id, item) {
      if (USE_MOCK) {
        const idx = db.masters[key].findIndex(r => r.id === id);
        if (idx >= 0) db.masters[key][idx] = { ...db.masters[key][idx], ...item };
        return mockResolve(db.masters[key][idx]);
      }
      return apiClient.put(`/masters/${key}/${id}`, item);
    },
    async remove(id) {
      if (USE_MOCK) {
        const idx = db.masters[key].findIndex(r => r.id === id);
        if (idx >= 0) db.masters[key].splice(idx, 1);
        return mockResolve({ deleted: true });
      }
      return apiClient.delete(`/masters/${key}/${id}`);
    },
    async toggle(id) {
      if (USE_MOCK) {
        const row = db.masters[key].find(r => r.id === id);
        if (row) row.active = !row.active;
        return mockResolve(row);
      }
      return apiClient.patch(`/masters/${key}/${id}/toggle`);
    },
  };
}

export const mastersService = {
  cargoTypes:   mastersCrud('cargoTypes'),
  vehicleTypes: mastersCrud('vehicleTypes'),
  zones:        mastersCrud('zones'),
  ratecards:    mastersCrud('ratecards'),
  vehicleRates: mastersCrud('vehicleRates'),
};

export { authService } from './authService';
export { adminCustomersService } from './adminCustomersService';
export { adminPaymentsService } from './adminPaymentsService';
export { notificationsService } from './notificationsService';
export { bookingOpsService } from './bookingOpsService';
export { dispatchService } from './dispatchService';
export { reportsService } from './reportsService';
export { adminService } from './adminService';
export { driverOpsService } from './driverOpsService';
