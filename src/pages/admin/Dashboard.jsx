/**
 * src/pages/admin/Dashboard.jsx
 *
 * FIXES:
 * 1. HOISTING BUG — `bookingsWeekly` used `executiveApi.data` inside useMemo
 *    but was declared BEFORE executiveApi (which is declared after). In JS,
 *    `const` is not hoisted so `executiveApi` was undefined when `bookingsWeekly`
 *    ran on first render, crashing with "Cannot read properties of undefined".
 *    Fixed by moving `bookingsWeekly` below the `executiveApi` declaration.
 *
 * 2. WRONG exec SHAPE — reportsService.executive() returns a flat object:
 *    { totalBookings, completedBookings, cancelledBookings, totalRevenue, ... }
 *    Dashboard was reading `exec.volume?.totalBookings` and `exec.cash?.collected`
 *    (nested shape from an older spec) — both returned undefined, so KPI cards
 *    showed 0 and the bar chart was empty even with real data. Fixed to read
 *    the actual flat fields from the backend response.
 *
 * 3. WRONG fleet SHAPE — reportsService.fleet() returns an array from the mock
 *    and `{ fleet: { byStatus, total, utilisation } }` from the real backend.
 *    The old code did `const fleet = fleetRaw?.fleet || fleetRaw` then
 *    `fleet.byStatus` — but the mock returns an array, so `fleet.byStatus`
 *    was undefined and the DonutChart rendered nothing. Fixed to handle both.
 *
 * 4. LOADING before executiveApi is in scope — the loading guard read
 *    `executiveApi.status` before executiveApi was declared (same hoisting
 *    issue). Moved the `loading` computation below all useApi declarations.
 */
import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, CalendarCheck, IndianRupee, Gauge, Radio, Zap, AlertTriangle } from 'lucide-react';
import PageHeader   from '../../components/ui/PageHeader';
import Card         from '../../components/ui/Card';
import KpiCard      from '../../components/dashboard/KpiCard';
import BarChart     from '../../components/dashboard/BarChart';
import DonutChart   from '../../components/dashboard/DonutChart';
import StatusBadge  from '../../components/ui/StatusBadge';
import { useApi }   from '../../hooks/useApi';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import { bookingService, reportsService, contactService } from '../../services';
import { apiClient } from '../../services/apiClient';
import { CardSkeleton } from '../../components/ui/Skeleton';
import ErrorState   from '../../components/ui/ErrorState';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';


// FIX: the bookings chart used to be entirely fabricated — it took the
// 30-day total, divided by 30 for a daily "average", then multiplied by
// made-up weighting factors ([0.9, 1.1, 1.0, ...]) with no relationship to
// any real day. The backend already has a genuine per-day endpoint
// (GET /admin/reports/business-trend, confirmed real: date_trunc('day', ...)
// grouped booking/revenue counts) — this now uses that instead, and
// aggregates it client-side into Daily / Weekly / Monthly buckets.
const PERIODS = [
  { key: 'daily',   label: 'Daily',   days: 7   },
  { key: 'weekly',  label: 'Weekly',  days: 56  }, // ~8 weeks
  { key: 'monthly', label: 'Monthly', days: 180 }, // ~6 months
];

function aggregateTrend(rows, period) {
  if (!rows?.length) return [];
  if (period === 'daily') {
    return rows.slice(-7).map((r) => ({
      label: new Date(r.date || r.day).toLocaleDateString('en-IN', { weekday: 'short' }),
      value: Number(r.bookings) || 0,
    }));
  }
  if (period === 'weekly') {
    const buckets = new Map(); // isoWeekStart -> total
    for (const r of rows) {
      const d = new Date(r.date || r.day);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay()); // Sunday-start bucket, simple + consistent
      const key = weekStart.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) || 0) + (Number(r.bookings) || 0));
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([key, value]) => ({
        label: new Date(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        value,
      }));
  }
  // monthly
  const buckets = new Map(); // "YYYY-MM" -> total
  for (const r of rows) {
    const d = new Date(r.date || r.day);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, (buckets.get(key) || 0) + (Number(r.bookings) || 0));
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, value]) => {
      const [y, m] = key.split('-');
      return { label: new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short' }), value };
    });
}

const FEED_LABEL = {
  'booking:created':   { text: 'New booking',       color: '#166534', bg: '#f0fdf4' },
  'booking:attempted': { text: 'Booking attempt',   color: '#6B7280', bg: '#F7F8FC' },
  'admin:alert':       { text: 'Attempt failed',    color: '#991B1B', bg: '#fef2f2' },
  'trip:status':       { text: 'Status changed',    color: '#1e3a8a', bg: '#eef2fb' },
  'booking:allocated': { text: 'Vehicle allocated', color: '#7c3aed', bg: '#f5f3ff' },
  'payment:received':  { text: 'Payment received',  color: '#166534', bg: '#f0fdf4' },
};

// Backend returns address as { address: "..." } object or a plain string
function addr(val) {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.address || val.formattedAddress || '—';
}

function last30Days() {
  const to   = new Date();
  const from = new Date(Date.now() - 30 * 86400000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { connected, feed, lastBookingEventId } = useAdminRealtimeContext();
  const range = useMemo(() => last30Days(), []);

  // ── FIX 1: declare ALL useApi calls before any useMemo that reads their data ──

  // Real backend reports
  const executiveApi = useApi(() => reportsService.executive(range), []);
  const fleetApi     = useApi(() => reportsService.fleet(range), []);

  // Recent bookings — GET /admin/bookings?page=1&limit=6&sortBy=createdAt
  const { data: bookingsData, status, error, refetch } = useApi(
    () => bookingService.list({ page: 1, limit: 6, sortBy: 'createdAt', order: 'desc' }),
    []
  );

  // Pending KYC applications count — GET /admin/drivers?kycStatus=PENDING&limit=1
  const { data: pendingKycData } = useApi(
    () => apiClient.get('/admin/drivers', { params: { kycStatus: 'PENDING', limit: 1, page: 1 } }),
    []
  );

  // ── FIX 2: compute loading AFTER all useApi calls ──
  const loading =
    status === 'loading' ||
    executiveApi.status === 'loading' ||
    fleetApi.status === 'loading';

  // ── FIX 3: read the FLAT executive report shape ──
  // reportsService.executive() returns:
  //   { totalBookings, completedBookings, cancelledBookings,
  //     completionRate, cancellationRate, totalRevenue }
  // NOT { volume: { totalBookings }, cash: { collected } }
  const exec = executiveApi.data || {};
  const totalBookings   = exec.totalBookings   ?? exec.volume?.totalBookings   ?? 0;
  const totalRevenue    = exec.totalRevenue    ?? exec.cash?.collected         ?? 0;

  // ── FIX 4: handle both real backend shape and mock array shape for fleet ──
  // Real backend: { fleet: { total, utilisation, byStatus: { AVAILABLE: N, ... } } }
  // Mock:         array of { type, count, onTrip }
  const fleetRaw = fleetApi.data;
  const fleetObj = Array.isArray(fleetRaw)
    ? null  // mock — build byStatus from array
    : (fleetRaw?.fleet || fleetRaw || null);

  const fleetTotal       = fleetObj?.total ?? 0;
  const fleetUtilisation = fleetObj?.utilisation ?? 0;

  const fleetStatus = useMemo(() => {
    if (fleetObj?.byStatus) {
      return Object.entries(fleetObj.byStatus).map(([label, value]) => ({
        label: titleCase(label), value,
      }));
    }
    if (Array.isArray(fleetRaw)) {
      // Mock array: [{ type, count, onTrip }, ...]
      return fleetRaw.map((v) => ({ label: titleCase(v.type || 'Unknown'), value: v.count || 0 }));
    }
    return [];
  }, [fleetRaw, fleetObj]);

  // ── FIX 1 cont: real per-day trend data, not a fabricated weekly shape ──
  const [chartPeriod, setChartPeriod] = useState('daily');
  const periodDays = PERIODS.find((p) => p.key === chartPeriod)?.days || 7;
  const trendApi = useApi(    () => reportsService.businessTrend({
      from: new Date(Date.now() - periodDays * 86400000).toISOString(),
      to: new Date().toISOString(),
    }),
    [chartPeriod]
  );
  const bookingsChartData = useMemo(
    () => aggregateTrend(trendApi.data?.series || trendApi.data || [], chartPeriod),
    [trendApi.data, chartPeriod]
  );

  // NEW: abandoned-checkout tracking (see the customer website's checkout
  // page — fires a real Contact/Support record, topic "Abandoned Booking",
  // when a customer leaves before confirming). Reusing the existing,
  // real GET /admin/contacts endpoint with its search param, which already
  // matches against the topic field server-side — confirmed directly
  // against contact.service.js's list() query.
  const abandonedApi = useApi(
    () => contactService.list({ search: 'Abandoned Booking', limit: 5, sortBy: 'createdAt', order: 'desc' }),
    []
  );
  const abandonedCount = abandonedApi.data?.pagination?.total ?? 0;
  const abandonedRecent = abandonedApi.data?.items ?? [];

  const pendingKycCount = pendingKycData?.pagination?.total ?? pendingKycData?.meta?.total ?? 0;

  // Refetch everything when a new booking arrives via socket
  useEffect(() => {
    if (!lastBookingEventId) return;
    refetch();
    executiveApi.refetch();
    fleetApi.refetch();
    trendApi.refetch();
  }, [lastBookingEventId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }
  if (status === 'error')              return <ErrorState message={error?.message}               onRetry={refetch} />;
  if (executiveApi.status === 'error') return <ErrorState message={executiveApi.error?.message} onRetry={executiveApi.refetch} />;
  if (fleetApi.status === 'error')     return <ErrorState message={fleetApi.error?.message}     onRetry={fleetApi.refetch} />;

  // bookingService.list returns { data: [...], meta: {...} } via crudFactory → apiClient unwrap
  const recentBookings = bookingsData?.data ?? bookingsData?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Fleet operations overview — last 30 days."
        actions={
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: connected ? '#f0fdf4' : '#F7F8FC', color: connected ? '#166534' : '#9CA3AF' }}
          >
            <Radio size={12} /> {connected ? 'Live updates on' : 'Live updates offline'}
          </span>
        }
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Fleet Vehicles"    value={fleetTotal}
          icon={Truck} tone="purple" />
        <KpiCard label="Fleet Utilisation" value={`${Math.round(fleetUtilisation * 100)}%`}
          icon={Gauge} tone="primary" />
        <KpiCard label="Bookings (30d)"    value={totalBookings}
          icon={CalendarCheck} tone="accent" />
        <KpiCard label="Revenue Collected" value={formatCurrency(totalRevenue)}
          icon={IndianRupee} tone="green" />
        <KpiCard label="Abandoned Bookings" value={abandonedCount}
          icon={AlertTriangle} tone="amber" />
      </div>

      {/* ── Abandoned Bookings — recent ──
          Not a live push notification (see the honesty note on the
          customer-website checkout page for why: creating a contact
          record triggers no real-time event on the backend at all). This
          card just makes them visible without needing to open Support. */}
      {abandonedRecent.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Recent Abandoned Bookings</h3>
            <a href="/admin/reports" className="text-xs font-semibold" style={{ color: '#3B65DB' }}>View all in Reports →</a>
          </div>
          <div className="space-y-2">
            {abandonedRecent.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 py-2" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1F2937' }}>{c.name} · {c.mobile}</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>{(c.message || '').split('\n')[1] || c.message}</p>
                </div>
                <span className="text-xs whitespace-nowrap" style={{ color: '#9CA3AF' }}>
                  {c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Pending KYC banner ── */}
      {pendingKycCount > 0 && (
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3 mb-5 cursor-pointer"
          style={{ backgroundColor: '#fffbea', border: '1px solid #FCD34D' }}
          onClick={() => navigate('/admin/drivers')}
        >
          <span className="text-sm font-bold" style={{ color: '#92400E' }}>
            🔔 {pendingKycCount} driver application{pendingKycCount > 1 ? 's' : ''} pending KYC review
          </span>
          <span className="text-xs font-semibold" style={{ color: '#B45309' }}>Review →</span>
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Bookings</h3>
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: '#F3F4F6' }}>
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setChartPeriod(p.key)}
                  style={{
                    fontSize: 13.5, fontWeight: 600, padding: '5px 12px', borderRadius: 6, border: 'none',
                    backgroundColor: chartPeriod === p.key ? '#FFC107' : 'transparent',
                    color: '#111111', cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {trendApi.status === 'loading' ? (
            <div className="h-[180px] flex items-center justify-center text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>
          ) : trendApi.status === 'error' ? (
            <div className="h-[180px] flex items-center justify-center text-sm" style={{ color: '#DC2626' }}>Couldn't load booking trend.</div>
          ) : bookingsChartData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm" style={{ color: '#9CA3AF' }}>No bookings in this period.</div>
          ) : (
            <BarChart data={bookingsChartData} />
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#1F2937' }}>Fleet status</h3>
          {fleetStatus.length > 0
            ? <DonutChart data={fleetStatus} size={140} />
            : <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No fleet data yet.</p>
          }
        </Card>
      </div>

      {/* ── Recent bookings + live feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padded={false} className="lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Recent bookings</h3>
            <button
              className="text-xs font-medium"
              style={{ color: '#3B65DB' }}
              onClick={() => navigate('/admin/bookings')}
            >
              View all →
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: '#F7F8FC' }}>
            {recentBookings.length === 0 && (
              <p className="px-5 py-6 text-sm text-center" style={{ color: '#9CA3AF' }}>
                No bookings yet.
              </p>
            )}
            {recentBookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between px-5 py-3 text-sm cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/admin/bookings/${b.id}`)}
              >
                <div>
                  {/* customer name nested under b.customer.user.name */}
                  <p className="font-medium" style={{ color: '#1F2937' }}>
                    {b.customer?.user?.name || b.corporate?.companyName || '—'}
                  </p>
                  {/* addresses are objects { address: "..." } */}
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                    {addr(b.pickupAddress)} → {addr(b.dropAddress)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={b.status} />
                  <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{formatDateTime(b.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Live activity feed */}
        <Card padded={false}>
          <div className="flex items-center gap-2 px-5 pt-5 pb-3">
            <Zap size={14} style={{ color: '#F59E0B' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Live activity</h3>
          </div>
          <div className="divide-y max-h-[420px] overflow-y-auto" style={{ borderColor: '#F7F8FC' }}>
            {feed.length === 0 && (
              <p className="px-5 py-6 text-xs text-center" style={{ color: '#9CA3AF' }}>
                Waiting for activity — new bookings appear here instantly.
              </p>
            )}
            {feed.map((item) => {
              const cfg = FEED_LABEL[item.kind] || { text: item.kind, color: '#6B7280', bg: '#F7F8FC' };
              return (
                <div key={item.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[12.5px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {cfg.text}
                    </span>
                    <span className="text-[12.5px]" style={{ color: '#9CA3AF' }}>{formatDateTime(item.at)}</span>
                  </div>
                  <p className="mt-1.5 text-xs" style={{ color: '#374151' }}>
                    {item.bookingNumber || item.bookingId || item.attemptId}
                    {item.status ? ` — ${titleCase(item.status)}` : ''}
                    {item.reason ? ` — ${item.reason}` : ''}
                    {item.amount ? ` — ₹${item.amount}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}