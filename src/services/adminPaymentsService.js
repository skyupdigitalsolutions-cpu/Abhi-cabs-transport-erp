/**
 * Admin — business-wide payments listing, cash handover reconciliation, and
 * refund recording. Endpoint: /api/v1/admin/payments
 *
 * Real, confirmed contract:
 *   GET   /admin/payments                       — paginated (unchanged)
 *   GET   /admin/payments/cash-handovers         — driver cash awaiting handover
 *   GET   /admin/payments/cash-handovers/summary — cash-in-hand per driver
 *   PATCH /admin/payments/cash-handovers/:id/confirm — mark received
 *   GET   /admin/payments/refundable/:bookingId  — what a booking can refund
 *   POST  /admin/payments/refunds                — record a refund
 *
 * Refund history is just the existing list() filtered to purpose=REFUND —
 * there's no second listing endpoint; the backend added a `purpose` filter to
 * the one that already existed.
 */
import { apiClient } from './apiClient';
import { getStoredUser } from './authStorage';

/* ------------------------------------------------------------------ *
 * Cash handover helpers (frontend-only)
 * ------------------------------------------------------------------ */

const PAGE_LIMIT = 100;  // backend max for every list endpoint
const MAX_PAGES  = 20;   // safety cap → up to 2,000 rows per source
const CACHE_MS   = 15000;

/** Confirmations, kept in this browser: { [paymentId]: { confirmedAt, confirmedBy, note } } */
const cashHandoverStore = {
  KEY: 'abhi_cash_handovers_v1',
  read() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '{}') || {}; } catch { return {}; }
  },
  write(obj) {
    try { localStorage.setItem(this.KEY, JSON.stringify(obj)); } catch { /* storage full / blocked */ }
  },
};

/** Fetch every page of a list endpoint (stops at MAX_PAGES). */
async function fetchAllPages(url, params = {}) {
  const out = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await apiClient.get(url, { params: { ...params, page, limit: PAGE_LIMIT } });
    const rows = res?.items ?? res?.data ?? (Array.isArray(res) ? res : []);
    out.push(...rows);
    totalPages = res?.pagination?.totalPages ?? res?.meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= MAX_PAGES);
  return out;
}

// List + summary are requested together on every refresh — share one load.
let cashCache = null; // { at, promise }

function loadCashHandoverRows() {
  if (cashCache && Date.now() - cashCache.at < CACHE_MS) return cashCache.promise;
  const promise = buildCashHandoverRows().catch((e) => { cashCache = null; throw e; });
  cashCache = { at: Date.now(), promise };
  return promise;
}

async function buildCashHandoverRows() {
  // 1. Every captured cash payment (the source of truth). Refund records are
  //    excluded — they are money going OUT, not cash a driver holds.
  const payments = (await fetchAllPages('/admin/payments', {
    method: 'CASH', status: 'CAPTURED', sortBy: 'paidAt', order: 'desc',
  })).filter((p) => p.purpose !== 'REFUND');

  // 2. Who collected it: the driver app writes a CASH_COLLECTED audit entry
  //    (actor = the driver, entityId = the booking). Needs AUDIT_VIEW; if the
  //    audit log can't be read, rows still show, just without a driver name.
  const collectorByBooking = new Map();
  try {
    const audits = await fetchAllPages('/admin/audit', { action: 'CASH_COLLECTED' });
    for (const a of audits) {
      if (a.entityId && !collectorByBooking.has(a.entityId)) {
        collectorByBooking.set(a.entityId, { id: a.actorId || a.actor?.id || null, name: a.actor?.name || null });
      }
    }
  } catch { /* no audit access — driver column shows "—" */ }

  // 3. Driver phone numbers (optional nicety).
  const phoneByDriver = new Map();
  try {
    const drivers = await fetchAllPages('/admin/drivers');
    for (const d of drivers) {
      const id = d.userId || d.user?.id || d.id;
      if (id) phoneByDriver.set(id, { name: d.user?.name || d.name || null, phone: d.user?.phone || d.phone || null });
    }
  } catch { /* phone just won't show */ }

  const confirmed = cashHandoverStore.read();

  return payments.map((p) => {
    const collector = collectorByBooking.get(p.bookingId) || null;
    const driverId = collector?.id || null;
    const extra = driverId ? phoneByDriver.get(driverId) : null;
    const c = confirmed[p.id] || null;
    return {
      id: p.id,
      amount: p.amount,
      status: c ? 'CONFIRMED' : 'PENDING',
      driverId,
      driver: driverId
        ? { userId: driverId, user: { name: collector?.name || extra?.name || 'Driver', phone: extra?.phone || '' } }
        : null,
      createdAt: p.paidAt || p.createdAt,
      confirmedAt: c?.confirmedAt || null,
      confirmedBy: c?.confirmedBy || null,
      note: c?.note || null,
      payment: { id: p.id, paidAt: p.paidAt, booking: p.booking || null },
    };
  });
}

export const adminPaymentsService = {
  async list(params = {}) {
    return apiClient.get('/admin/payments', { params });
  },

  /** Convenience: same list(), pre-filtered to refund records. */
  async listRefunds(params = {}) {
    return apiClient.get('/admin/payments', { params: { ...params, purpose: 'REFUND' } });
  },

  // ---- Cash handovers (FRONTEND-ONLY) ---------------------------------------
  // The backend has no /admin/payments/cash-handovers routes, so this is
  // assembled from endpoints that DO exist:
  //   GET /admin/payments?method=CASH&status=CAPTURED  → every cash collection
  //   GET /admin/audit?action=CASH_COLLECTED           → which driver collected it
  //   GET /admin/drivers                               → driver phone numbers
  // "Confirm receipt" is stored in this browser (localStorage) — see
  // cashHandoverStore below — because there is no backend endpoint to save it.

  async cashHandovers(params = {}) {
    const { page = 1, limit = 10, status, driverId } = params;
    let rows = await loadCashHandoverRows();
    if (status)   rows = rows.filter((r) => r.status === status);
    if (driverId) rows = rows.filter((r) => r.driverId === driverId);
    const total = rows.length;
    return {
      items: rows.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  },

  /** { drivers: [{driverId, driverName, driverPhone, pendingAmount, pendingCount}], totalPending } */
  async cashHandoverSummary() {
    const pending = (await loadCashHandoverRows()).filter((r) => r.status === 'PENDING');
    const byDriver = new Map();
    let totalPending = 0;
    for (const r of pending) {
      const amt = Number(r.amount) || 0;
      totalPending += amt;
      const key = r.driverId || 'unknown';
      const cur = byDriver.get(key) || {
        driverId: key,
        driverName: r.driver?.user?.name || 'Unknown driver',
        driverPhone: r.driver?.user?.phone || null,
        pendingAmount: 0,
        pendingCount: 0,
      };
      cur.pendingAmount += amt;
      cur.pendingCount += 1;
      byDriver.set(key, cur);
    }
    const drivers = [...byDriver.values()]
      .map((d) => ({ ...d, pendingAmount: Math.round(d.pendingAmount * 100) / 100 }))
      .sort((a, b) => b.pendingAmount - a.pendingAmount);
    return { drivers, totalPending: Math.round(totalPending * 100) / 100 };
  },

  async confirmCashHandover(id, note) {
    const store = cashHandoverStore.read();
    if (store[id]) throw new Error('This cash handover is already confirmed');
    const me = getStoredUser();
    store[id] = {
      confirmedAt: new Date().toISOString(),
      confirmedBy: { id: me?.id || null, name: me?.name || me?.email || 'Admin' },
      note: note || null,
    };
    cashHandoverStore.write(store);
    cashCache = null; // next read reflects the confirmation
    return { id, status: 'CONFIRMED', ...store[id] };
  },

  // ---- Refunds --------------------------------------------------------------

  /** GET /admin/payments/refundable/:bookingId — booking summary + refundable balance. */
  async refundableBalance(bookingId) {
    return apiClient.get(`/admin/payments/refundable/${bookingId}`);
  },

  /** { bookingId, amount, method, reason, reference?, notes? } */
  async createRefund(payload) {
    return apiClient.post('/admin/payments/refunds', payload);
  },

  /**
   * Look up a booking by its human-readable number (ABH-2026-000123) so the
   * refund form can take what staff actually have on hand — not a UUID.
   * Reuses the existing customer-facing lookup route; staff roles bypass its
   * ownership filter server-side (booking.service.js findByNumber).
   */
  async findBookingByNumber(bookingNumber) {
    const data = await apiClient.get(`/bookings/number/${encodeURIComponent(bookingNumber)}`);
    return data.booking || data;
  },
};
