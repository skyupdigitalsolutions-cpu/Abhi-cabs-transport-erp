/**
 * src/services/reportsService.js
 *
 * FIXES:
 * 1. MOCK SHAPE MISMATCH — Dashboard reads exec.totalBookings (flat) but
 *    old mock returned { totalBookings, ... } — that part was fine.
 *    The real problem was Dashboard reading exec.volume?.totalBookings (nested)
 *    which never existed. Mock is unchanged here; Dashboard.jsx is fixed to
 *    read the flat shape.
 *
 * 2. FLEET MOCK SHAPE — the mock returned an array of { type, count, onTrip }
 *    but Dashboard tried to read fleetRaw.fleet.byStatus (an object). The real
 *    backend returns { fleet: { total, utilisation, byStatus: {...} } }.
 *    Mock updated to return the SAME shape as the real backend so Dashboard
 *    only needs to handle one shape. Dashboard.jsx also handles both for safety.
 *
 * 3. DATE FORMAT — defaultRange() now sends YYYY-MM-DD (date-only strings)
 *    which is what the backend report controllers expect. The old version sent
 *    full ISO timestamps which the backend's date-range parser may reject.
 *
 * All endpoint paths confirmed correct:
 *   GET /admin/reports/executive         ✅
 *   GET /admin/reports/fleet             ✅
 *   GET /admin/reports/driver-performance ✅
 *   GET /admin/reports/business-trend    ✅
 *   GET /admin/reports/gst               ✅
 *   POST /admin/reports/:type/export     ✅
 *   GET /admin/reports/exports/:token    ✅
 */
import { apiClient, withMockFallback, ApiError } from './apiClient';
import { mockResolve } from './mockUtils';
import { bookings, drivers, payments, invoices, vehicles } from './mockDb';

function defaultRange() {
  const to   = new Date();
  const from = new Date(Date.now() - 30 * 86400000);
  // Backend expects YYYY-MM-DD strings, not full ISO timestamps
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  };
}

function mockFleet() {
  // Match the real backend shape: { fleet: { total, utilisation, byStatus } }
  const byStatus = {};
  vehicles.forEach((v) => {
    byStatus[v.status] = (byStatus[v.status] || 0) + 1;
  });
  const total      = vehicles.length;
  const onTrip     = byStatus['ON_TRIP'] || 0;
  const utilisation = total > 0 ? +(onTrip / total).toFixed(2) : 0;
  return { fleet: { total, utilisation, byStatus } };
}

export const reportsService = {
  /**
   * GET /admin/reports/executive
   * Returns flat object:
   *   { totalBookings, completedBookings, cancelledBookings,
   *     completionRate, cancellationRate, totalRevenue }
   */
  async executive(range = {}) {
    const params = { ...defaultRange(), ...range };
    return withMockFallback(
      () => apiClient.get('/admin/reports/executive', { params }),
      () => {
        const total     = bookings.length;
        const completed = bookings.filter((b) => b.status === 'COMPLETED').length;
        const cancelled = bookings.filter((b) => b.status === 'CANCELLED').length;
        const revenue   = payments
          .filter((p) => p.status === 'CAPTURED' || p.status === 'PAID')
          .reduce((s, p) => s + (p.amount || 0), 0);
        return mockResolve({
          totalBookings:     total,
          completedBookings: completed,
          cancelledBookings: cancelled,
          completionRate:    total ? +(completed / total * 100).toFixed(1) : 0,
          cancellationRate:  total ? +(cancelled / total * 100).toFixed(1) : 0,
          totalRevenue:      revenue,
        });
      }
    );
  },

  /**
   * GET /admin/reports/fleet
   * Returns: { fleet: { total, utilisation, byStatus: { STATUS: count } } }
   * Mock now returns the same shape to avoid dual-path handling.
   */
  async fleet(range = {}) {
    const params = { ...defaultRange(), ...range };
    return withMockFallback(
      () => apiClient.get('/admin/reports/fleet', { params }),
      () => mockResolve(mockFleet())
    );
  },

  /**
   * GET /admin/reports/driver-performance
   * Returns array of per-driver metrics.
   */
  async driverPerformance(range = {}) {
    const params = { ...defaultRange(), ...range };
    return withMockFallback(
      () => apiClient.get('/admin/reports/driver-performance', { params }),
      () => mockResolve(
        drivers.slice(0, 20).map((d) => ({
          driverId:       d.id,
          name:           d.name,
          trips:          Math.floor(Math.random() * 40) + 5,
          earnings:       Math.floor(Math.random() * 40000) + 5000,
          rating:         (3.8 + Math.random() * 1.2).toFixed(1),
          acceptanceRate: Math.floor(Math.random() * 30) + 70,
        }))
      )
    );
  },

  /**
   * GET /admin/reports/business-trend
   * Returns array of { date, bookings, revenue }.
   */
  async businessTrend(range = {}) {
    const params = { ...defaultRange(), ...range };
    return withMockFallback(
      () => apiClient.get('/admin/reports/business-trend', { params }),
      () => {
        const days = 14;
        const series = Array.from({ length: days }, (_, i) => {
          const d = new Date(Date.now() - (days - i) * 86400000);
          return {
            date:     d.toISOString().slice(0, 10),
            bookings: Math.floor(Math.random() * 20) + 5,
            revenue:  Math.floor(Math.random() * 60000) + 10000,
          };
        });
        return mockResolve(series);
      }
    );
  },

  /**
   * GET /admin/reports/gst
   * Returns { invoiceCount, totalTaxable, totalTax }.
   */
  async gstSummary(range = {}) {
    const params = { ...defaultRange(), ...range };
    return withMockFallback(
      () => apiClient.get('/admin/reports/gst', { params }),
      () => {
        const taxInvoices  = invoices.filter((i) => i.type === 'TAX' || i.tax > 0);
        const totalTax     = taxInvoices.reduce((s, i) => s + (i.tax || 0), 0);
        const totalTaxable = taxInvoices.reduce((s, i) => s + (i.amount || 0), 0);
        return mockResolve({ invoiceCount: taxInvoices.length, totalTaxable, totalTax });
      }
    );
  },

  /**
   * POST /admin/reports/:type/export — queue a CSV export (returns 202 + token).
   * GET  /admin/reports/exports/:token — poll until ready, then the file.
   */
  async queueExport(type, range = {}) {
    const params = { ...defaultRange(), ...range };
    return withMockFallback(
      () => apiClient.post(`/admin/reports/${type}/export`, params),
      () => mockResolve({ token: `mock-export-${Date.now()}` })
    );
  },

  async fetchExport(token) {
    return withMockFallback(
      () => apiClient.get(`/admin/reports/exports/${token}`),
      () => mockResolve({ ready: true, url: null, csv: 'date,bookings,revenue\n' })
    );
  },

  /** Convenience: queue then poll until CSV is ready (or give up after attempts). */
  async exportReport(type, range = {}, { attempts = 10, intervalMs = 1500 } = {}) {
    const { token } = await reportsService.queueExport(type, range);
    for (let i = 0; i < attempts; i++) {
      try {
        const result = await reportsService.fetchExport(token);
        if (result?.ready !== false) return result;
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 425) throw err;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new ApiError('Export timed out — please try again.', { code: 'EXPORT_TIMEOUT' });
  },
};