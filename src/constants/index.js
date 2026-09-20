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
  // These match the exact permission strings the backend requires
  // (returned by GET /auth/me and checked by requirePermission middleware)
  CLIENTS_VIEW:    'CUSTOMER_MANAGE',
  CLIENTS_MANAGE:  'CUSTOMER_MANAGE',
  DRIVERS_VIEW:    'DRIVER_APPROVE',
  DRIVERS_MANAGE:  'DRIVER_APPROVE',
  VEHICLES_VIEW:   'VEHICLE_MANAGE',
  VEHICLES_MANAGE: 'VEHICLE_MANAGE',
  BOOKINGS_VIEW:   'BOOKING_MANAGE',
  BOOKINGS_MANAGE: 'BOOKING_MANAGE',
  DISPATCH_MANAGE: 'DISPATCH_MANAGE',
  TRIPS_VIEW:      'BOOKING_MANAGE',
  PAYMENTS_VIEW:   'PAYMENT_VIEW',
  PAYMENTS_MANAGE: 'PAYMENT_VIEW',
  INVOICES_VIEW:   'PAYMENT_VIEW',
  INVOICES_MANAGE: 'PAYMENT_VIEW',
  REPORTS_VIEW:    'REPORT_VIEW',
  SUPPORT_MANAGE:  'SUPPORT_MANAGE',
  USERS_MANAGE:    'USER_MANAGE',
  MASTERS_MANAGE:  'SETTINGS_MANAGE',
  SETTINGS_MANAGE: 'SETTINGS_MANAGE',
  DASHBOARD_VIEW:  'REPORT_VIEW',
  AUDIT_VIEW:      'AUDIT_VIEW',
  BOOKING_CANCEL:  'BOOKING_CANCEL',
  BOOKING_CREATE:  'BOOKING_CREATE',
};

// Backend permission strings granted to each staff role — copied verbatim
// from the actual seeded grants (prisma/migrations/.../day1_constraints,
// the INSERT INTO role_permissions block), not guessed from the role names.
// Keyed by the real, uppercase Role enum values (ADMIN/OPS/FINANCE/FLEET/
// SUPPORT) — this is what UsersRoles.jsx's PermissionsPanel looks up by the
// role actually selected in that form, which is one of those 5 uppercase
// values, not ROLES.ADMIN (lowercase, used elsewhere for auth/route-guard
// comparisons and unrelated to this).
export const ROLE_PERMISSIONS = {
  // ADMIN also bypasses permission checks entirely at the backend middleware
  // level (role === 'ADMIN' short-circuits before any permission lookup),
  // so this list is for display only — it doesn't limit what ADMIN can do.
  ADMIN: [
    'CORPORATE_MANAGE', 'BOOKING_CREATE', 'BOOKING_MANAGE', 'BOOKING_CANCEL',
    'FARE_EDIT', 'DISPATCH_MANAGE', 'VEHICLE_MANAGE', 'DRIVER_APPROVE',
    'PAYMENT_VIEW', 'PAYMENT_REFUND', 'INVOICE_MANAGE', 'REPORT_VIEW',
    'SETTINGS_MANAGE', 'AUDIT_VIEW',
  ],
  OPS: [
    'CUSTOMER_MANAGE', 'BOOKING_CREATE', 'BOOKING_MANAGE', 'BOOKING_CANCEL',
    'DISPATCH_MANAGE', 'REPORT_VIEW',
  ],
  FINANCE: [
    'PAYMENT_VIEW', 'PAYMENT_REFUND', 'INVOICE_MANAGE', 'CORPORATE_MANAGE', 'REPORT_VIEW',
  ],
  FLEET: [
    'VEHICLE_MANAGE', 'DRIVER_APPROVE', 'DISPATCH_MANAGE', 'REPORT_VIEW',
  ],
  SUPPORT: [
    'CUSTOMER_MANAGE', 'BOOKING_MANAGE', 'BOOKING_CANCEL', 'PAYMENT_VIEW',
  ],
  [ROLES.DRIVER]: ['TRIP_MANAGE'],
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
  ALLOCATED: 'ALLOCATED',
  EN_ROUTE:  'EN_ROUTE',
  ONGOING:   'ONGOING',
  ARRIVED:   'ARRIVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const PAYMENT_STATUS = {
  CREATED:        'CREATED',
  AUTHORISED:     'AUTHORISED',
  CAPTURED:       'CAPTURED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  FAILED:         'FAILED',
  REFUNDED:       'REFUNDED',
};

export const PAYMENT_METHODS = ['UPI', 'Card', 'Net Banking', 'Wallet', 'Cash', 'Bank Transfer', 'Cheque'];

export const INVOICE_STATUS = {
  DRAFT:     'DRAFT',
  ISSUED:    'ISSUED',
  PAID:      'PAID',
  CANCELLED: 'CANCELLED',
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
  { label: 'Rate Cards',   to: '/admin/masters',    icon: 'Database',       permission: PERMISSIONS.MASTERS_MANAGE },
  { label: 'Notifications',to: '/admin/notifications', icon: 'Bell' },
  { label: 'Support & SOS',to: '/admin/support',    icon: 'LifeBuoy',       permission: PERMISSIONS.SUPPORT_MANAGE },
  { label: 'WhatsApp',         to: '/admin/whatsapp',         icon: 'MessageCircle',  permission: PERMISSIONS.SETTINGS_MANAGE },
  { label: 'Discounts & Offers', to: '/admin/discounts',  icon: 'Tag',            permission: PERMISSIONS.SETTINGS_MANAGE },
  { label: 'Users & Roles',      to: '/admin/users',      icon: 'ShieldCheck',    permission: PERMISSIONS.USERS_MANAGE },
  { label: 'Settings',     to: '/admin/settings',   icon: 'Settings' },
];

export const DRIVER_NAV = [
  { label: 'My Trips', to: '/driver/trips',   icon: 'Route' },
  { label: 'Profile',  to: '/driver/profile', icon: 'User'  },
];