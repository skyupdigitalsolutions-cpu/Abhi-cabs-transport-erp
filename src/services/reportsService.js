/**
 * Admin reports service. Endpoints: /api/v1/admin/reports/*
 * All accept ?from=&to= (default last 30 days).
 */
import { apiClient, withMockFallback, ApiError } from './apiClient';
import { mockResolve } from './mockUtils';
import { bookings, drivers, payments, invoices, vehicles } from './mockDb';

function defaultRange() {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 86400000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export const reportsService = {
  /** GET /admin/reports/executive — volume, completion/cancellation, revenue distribution. */
  async executive(range = {}) {
    const params = { ...defaultRange(), ...range };
    return withMockFallback(
      () => apiClient.get('/admin/reports/executive', { params }),
      () => {
        const total = bookings.length;
        const completed = bookings.filter((b) => b.status === 'COMPLETED').length;
        const cancelled = bookings.filter((b) => b.status === 'CANCELLED').length;
        const revenue = payments.filter((p) => p.status === 'CAPTURED' || p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
        return mockResolve({
          totalBookings: total,
          completedBookings: completed,
          cancelledBookings: cancelled,
          completionRate: total ? +(completed / total * 100).toFixed(1) : 0,
          cancellationRate: total ? +(cancelled / total * 100).toFixed(1) : 0,
          totalRevenue: revenue,
        });
      }
    );
  },

  /** GET /admin/reports/fleet — utilisation + revenue per vehicle class. */
  async fleet(range = {}) {
    const params = { ...defaultRange(), ...range };
    return withMockFallback(
      () => apiClient.get('/admin/reports/fleet', { params }),
      () => {
        const byType = {};
        vehicles.forEach((v) => {
          byType[v.type] = byType[v.type] || { type: v.type, count: 0, onTrip: 0 };
          byType[v.type].count += 1;
          if (v.status === 'ON_TRIP') byType[v.type].onTrip += 1;
        });
        return mockResolve(Object.values(byType));
      }
    );
  },

  /** GET /admin/reports/driver-performance — per-driver trips, earnings, rating, acceptance. */
  async driverPerformance(range = {}) {
    const params = { ...defaultRange(), ...range };
    return withMockFallback(
      () => apiClient.get('/admin/reports/driver-performance', { params }),
      () => mockResolve(
        drivers.slice(0, 20).map((d) => ({
          driverId: d.id,
          name: d.name,
          trips: Math.floor(Math.random() * 40) + 5,
          earnings: Math.floor(Math.random() * 40000) + 5000,
          rating: (3.8 + Math.random() * 1.2).toFixed(1),
          acceptanceRate: Math.floor(Math.random() * 30) + 70,
        }))
      )
    );
  },

  /** GET /admin/reports/business-trend — daily time series of bookings + revenue. */
  async businessTrend(range = {}) {
    const params = { ...defaultRange(), ...range };
    return withMockFallback(
      () => apiClient.get('/admin/reports/business-trend', { params }),
      () => {
        const days = 14;
        const series = Array.from({ length: days }, (_, i) => {
          const d = new Date(Date.now() - (days - i) * 86400000);
          return {
            date: d.toISOString().slice(0, 10),
            bookings: Math.floor(Math.random() * 20) + 5,
            revenue: Math.floor(Math.random() * 60000) + 10000,
          };
        });
        return mockResolve(series);
      }
    );
  },

  /** GET /admin/reports/gst — GST summary from issued invoices. */
  async gstSummary(range = {}) {
    const params = { ...defaultRange(), ...range };
    return withMockFallback(
      () => apiClient.get('/admin/reports/gst', { params }),
      () => {
        const taxInvoices = invoices.filter((i) => i.type === 'TAX' || i.tax > 0);
        const totalTax = taxInvoices.reduce((s, i) => s + (i.tax || 0), 0);
        const totalTaxable = taxInvoices.reduce((s, i) => s + (i.amount || 0), 0);
        return mockResolve({ invoiceCount: taxInvoices.length, totalTaxable, totalTax });
      }
    );
  },

  /**
   * POST /admin/reports/:type/export — queues a CSV export, returns 202 + a
   * poll token. GET /admin/reports/exports/:token — 425 until ready, then
   * the file. exportReport() below wraps the full queue→poll cycle.
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

  /** Convenience: queue then poll until the CSV is ready (or give up). */
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
