// ============================================================
// ABHI CABS Transport ERP — Constants
// Roles: ADMIN (full ERP access) | DRIVER (mobile/field app)
// ============================================================

export const APP_NAME = 'ABHI CABS';
export const APP_TAGLINE = 'Transport ERP';

export const ROLES = {
  ADMIN:  'admin',
  DRIVER: 'driver',
};

export const PERMISSIONS = {
  CLIENTS_VIEW:    'clients.view',
  CLIENTS_MANAGE:  'clients.manage',
  DRIVERS_VIEW:    'drivers.view',
  DRIVERS_MANAGE:  'drivers.manage',
  VEHICLES_VIEW:   'vehicles.view',
  VEHICLES_MANAGE: 'vehicles.manage',
  BOOKINGS_VIEW:   'bookings.view',
  BOOKINGS_MANAGE: 'bookings.manage',
  DISPATCH_MANAGE: 'dispatch.manage',
  TRIPS_VIEW:      'trips.view',
  PAYMENTS_VIEW:   'payments.view',
  PAYMENTS_MANAGE: 'payments.manage',
  INVOICES_VIEW:   'invoices.view',
  INVOICES_MANAGE: 'invoices.manage',
  REPORTS_VIEW:    'reports.view',
  SUPPORT_MANAGE:  'support.manage',
  USERS_MANAGE:    'users.manage',
  MASTERS_MANAGE:  'masters.manage',
  SETTINGS_MANAGE: 'settings.manage',
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]:  Object.values(PERMISSIONS),  // full access
  [ROLES.DRIVER]: [PERMISSIONS.TRIPS_VIEW],    // trip-only access
};

// Real backend enum (src/models/booking.model.js) — confirmed uppercase,
// and a genuinely different set of statuses than what was here before
// (which used lowercase pending/confirmed/assigned/in_transit/completed/
// cancelled — none of which ever matched a real booking's actual status
// string, so every transition-button lookup silently returned nothing).
export const BOOKING_STATUS = {
  PENDING:   'PENDING',
  CONFIRMED: 'CONFIRMED',
  ALLOCATED: 'ALLOCATED',
  EN_ROUTE:  'EN_ROUTE',
  ONGOING:   'ONGOING',
  ARRIVED:   'ARRIVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED:   'EXPIRED',
};

export const TRIP_STATUS = {
  SCHEDULED: 'scheduled',
  ONGOING:   'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const PAYMENT_STATUS = {
  PENDING:  'pending',
  PAID:     'paid',
  FAILED:   'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_METHODS = ['UPI', 'Card', 'Net Banking', 'Wallet', 'Cash', 'Bank Transfer', 'Cheque'];

export const INVOICE_STATUS = {
  DRAFT:   'draft',
  ISSUED:  'issued',
  PAID:    'paid',
  OVERDUE: 'overdue',
};

/**
 * RECONSTRUCTED — another export that existed in the live codebase but
 * wasn't visible when this file was rebuilt (same situation as
 * BOOKING_TRANSITION_ACTION above). Confirmed directly against the real
 * backend's KycStatus enum (prisma/schema.prisma).
 */
export const KYC_STATUS = {
  PENDING:   'PENDING',
  VERIFIED:  'VERIFIED',
  REJECTED:  'REJECTED',
  SUSPENDED: 'SUSPENDED',
};

export const DRIVER_STATUS = {
  ACTIVE:    'active',
  INACTIVE:  'inactive',
  ON_TRIP:   'on_trip',
  SUSPENDED: 'suspended',
};

export const VEHICLE_STATUS = {
  AVAILABLE:   'AVAILABLE',
  ASSIGNED:    'ASSIGNED',
  ON_TRIP:     'ON_TRIP',
  MAINTENANCE: 'MAINTENANCE',
  INACTIVE:    'INACTIVE',
};

export const TICKET_STATUS = {
  OPEN:        'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED:    'resolved',
  CLOSED:      'closed',
};

export const STATUS_COLORS = {
  // Real booking statuses (uppercase, matching the backend exactly) —
  // added alongside the existing lowercase entries below, which are used
  // by other status types (driver/vehicle/ticket) not yet re-verified
  // against their own real backend enums.
  PENDING:   'amber',
  CONFIRMED: 'blue',
  ALLOCATED: 'blue',
  EN_ROUTE:  'purple',
  ONGOING:   'purple',
  ARRIVED:   'purple',
  COMPLETED: 'green',
  CANCELLED: 'red',
  EXPIRED:   'slate',

  AVAILABLE:   'green',
  ASSIGNED:    'blue',
  ON_TRIP:     'purple',
  MAINTENANCE: 'amber',
  INACTIVE:    'slate',
  VERIFIED:    'green',
  REJECTED:    'red',
  SUSPENDED:   'red',

  pending:     'amber',
  confirmed:   'blue',
  assigned:    'blue',
  in_transit:  'purple',
  scheduled:   'blue',
  ongoing:     'purple',
  completed:   'green',
  paid:        'green',
  active:      'green',
  available:   'green',
  resolved:    'green',
  closed:      'slate',
  cancelled:   'red',
  failed:      'red',
  suspended:   'red',
  inactive:    'slate',
  maintenance: 'amber',
  refunded:    'slate',
  draft:       'slate',
  issued:      'blue',
  overdue:     'red',
  open:        'amber',
  in_progress: 'blue',
  on_trip:     'purple',
  in_use:      'purple',
};

// Valid status transitions for bookings — confirmed directly against the
// real backend's TRANSITIONS table (lifecycle.service.js) and CANCELLABLE
// list (cancellation.service.js). Cancellation is only allowed up through
// EN_ROUTE — once a trip actually starts (ONGOING) there's no cancelling
// it anymore, only completing it. This is the exact bug that made the
// "Cancel" button (and every other status-transition button) never show
// up at all: the old lowercase keys here never matched a real booking's
// actual (uppercase) status, so this lookup always returned [] regardless
// of the booking's real state.
export const BOOKING_TRANSITIONS = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ALLOCATED', 'CANCELLED'],
  ALLOCATED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE:  ['ONGOING', 'CANCELLED'],
  ONGOING:   ['ARRIVED'],   // no longer cancellable once the trip has started
  ARRIVED:   ['COMPLETED'], // no longer cancellable
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED:   [],
};

/**
 * RECONSTRUCTED — this export existed in the live codebase but wasn't
 * visible when I rebuilt this file, so bookingOpsService.js's import
 * broke. Confirmed directly against the real backend's actual mounted
 * routes (adminBooking.routes.js) — each target status here maps to the
 * literal URL action segment PATCH /admin/bookings/:id/<action> (or POST
 * for cancel). If bookingOpsService.js expects a different shape (e.g.
 * an object with more fields per status, not just a string), let me know
 * the exact error and I'll adjust this to match.
 */
export const BOOKING_TRANSITION_ACTION = {
  CONFIRMED: 'confirm',
  ALLOCATED: 'allocate',
  EN_ROUTE:  'en-route',
  ONGOING:   'start',
  ARRIVED:   'arrive',
  COMPLETED: 'complete',
  CANCELLED: 'cancel',
  EXPIRED:   'expire',
};

export const ADMIN_NAV = [
  { label: 'Dashboard',    to: '/admin/dashboard',  icon: 'LayoutDashboard' },
  { label: 'Clients',      to: '/admin/clients',    icon: 'Users',          permission: PERMISSIONS.CLIENTS_VIEW },
  { label: 'Drivers',      to: '/admin/drivers',    icon: 'IdCard',         permission: PERMISSIONS.DRIVERS_VIEW },
  { label: 'Vehicles',     to: '/admin/vehicles',   icon: 'Truck',          permission: PERMISSIONS.VEHICLES_VIEW },
  { label: 'Bookings',     to: '/admin/bookings',   icon: 'CalendarCheck',  permission: PERMISSIONS.BOOKINGS_VIEW },
  { label: 'Dispatch',     to: '/admin/dispatch',   icon: 'Radio',          permission: PERMISSIONS.DISPATCH_MANAGE },
  { label: 'Trips',        to: '/admin/trips',      icon: 'Route',          permission: PERMISSIONS.TRIPS_VIEW },
  { label: 'Live Tracking',to: '/admin/tracking',   icon: 'MapPin',         permission: PERMISSIONS.TRIPS_VIEW },
  { label: 'Payments',     to: '/admin/payments',   icon: 'CreditCard',     permission: PERMISSIONS.PAYMENTS_VIEW },
  { label: 'Invoices',     to: '/admin/invoices',   icon: 'FileText',       permission: PERMISSIONS.INVOICES_VIEW },
  { label: 'Reports',      to: '/admin/reports',    icon: 'BarChart3',      permission: PERMISSIONS.REPORTS_VIEW },
  { label: 'Masters',      to: '/admin/masters',    icon: 'Database',       permission: PERMISSIONS.MASTERS_MANAGE },
  { label: 'Notifications',to: '/admin/notifications', icon: 'Bell' },
  { label: 'Support & SOS',to: '/admin/support',    icon: 'LifeBuoy',       permission: PERMISSIONS.SUPPORT_MANAGE },
  { label: 'Users',        to: '/admin/users',      icon: 'ShieldCheck',    permission: PERMISSIONS.USERS_MANAGE },
  { label: 'Settings',     to: '/admin/settings',   icon: 'Settings' },
];

export const DRIVER_NAV = [
  { label: 'My Trips', to: '/driver/trips',   icon: 'Route' },
  { label: 'Profile',  to: '/driver/profile', icon: 'User'  },
];