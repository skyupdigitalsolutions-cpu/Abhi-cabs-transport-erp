import { useState, useMemo } from 'react';
import { Download, TrendingUp, Truck, Users, CalendarCheck } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import BarChart from '../../components/dashboard/BarChart';
import DonutChart from '../../components/dashboard/DonutChart';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { reportsService, bookingService, adminPaymentsService } from '../../services';
import { formatCurrency, titleCase } from '../../utils/formatters';

const REPORT_TABS = [
  { key: 'overview',  label: 'Overview' },
  { key: 'financial', label: 'Financial' },
  { key: 'fleet',     label: 'Fleet' },
  { key: 'drivers',   label: 'Drivers' },
  { key: 'customers', label: 'Customers' },
  { key: 'locations', label: 'Locations' },
];

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
function rangeFor(rangeKey) {
  const days = RANGE_DAYS[rangeKey] || 30;
  const to = new Date();
  const from = new Date(Date.now() - days * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

// The backend returns every fare/money value as a STRING — confirmed:
// report.service.js's money() helper does `.toFixed(2)` (always a string),
// and Prisma's Decimal(12,2) fields (Booking.estimatedFare/finalFare)
// serialize to JSON as strings too (decimal.js's default toJSON()). Every
// place that adds, sorts, or charts one of these values MUST wrap it in
// Number() first, or "+" silently does string concatenation instead of
// addition (e.g. 0 + "120.00" + "80.00" -> "0120.0080.00", not 200).
const n = (v) => Number(v) || 0;

function KpiTile({ icon: Icon, label, value, sub, tone = 'blue' }) {
  const TONES = {
    blue: { bg: '#eef2fb', color: '#3B65DB' },
    green: { bg: '#f0fdf4', color: '#38B763' },
    amber: { bg: '#fffbeb', color: '#F59E0B' },
    purple: { bg: '#f5f3ff', color: '#7c3aed' },
  };
  const t = TONES[tone];
  return (
    <Card className="flex items-center gap-4">
      <div className="h-11 w-11 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: t.bg }}>
        <Icon size={19} style={{ color: t.color }} />
      </div>
      <div>
        <p className="text-xs" style={{ color: '#6B7280' }}>{label}</p>
        <p className="text-lg font-bold" style={{ color: '#1F2937' }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{sub}</p>}
      </div>
    </Card>
  );
}

// ── Customer tier breakdown ─────────────────────────────────────────────────
// Computed client-side from a real bookingService.list() call (there is no
// dedicated "customer tiers" report endpoint on the backend). Field names
// below are confirmed against the real Booking record shape:
// customer.user.name (not clientName), finalFare/estimatedFare (not fare) —
// and both fare fields are strings, wrapped in n() before any arithmetic.
const CUSTOMER_TIERS = [
  { key: 'platinum', label: 'Platinum', minBookings: 20, color: '#7c3aed', bg: '#f5f3ff', icon: '◆' },
  { key: 'gold',     label: 'Gold',     minBookings: 10, color: '#F59E0B', bg: '#fffbeb', icon: '●' },
  { key: 'silver',   label: 'Silver',   minBookings: 5,  color: '#6B7280', bg: '#F7F8FC', icon: '●' },
  { key: 'bronze',   label: 'Bronze',   minBookings: 1,  color: '#b45309', bg: '#fff7ed', icon: '●' },
];

function getTier(bookingCount) {
  for (const tier of CUSTOMER_TIERS) if (bookingCount >= tier.minBookings) return tier;
  return CUSTOMER_TIERS[CUSTOMER_TIERS.length - 1];
}

function CustomerReport() {
  const allBookings = useApi(() => bookingService.list({ page: 1, limit: 100 }), []);
  const rows = allBookings.data?.data || [];

  const customerStats = useMemo(() => {
    const map = {};
    rows.forEach((b) => {
      const name = b.customer?.user?.name || b.corporate?.companyName;
      if (!name) return;
      if (!map[name]) {
        map[name] = { name, phone: b.customer?.user?.phone || '—', totalBookings: 0, totalSpend: 0, lastBooking: null, statuses: {} };
      }
      map[name].totalBookings++;
      map[name].totalSpend += n(b.finalFare ?? b.estimatedFare);
      if (!map[name].lastBooking || new Date(b.createdAt) > new Date(map[name].lastBooking)) {
        map[name].lastBooking = b.createdAt;
      }
      map[name].statuses[b.status] = (map[name].statuses[b.status] || 0) + 1;
    });
    return Object.values(map).map((c) => ({ ...c, tier: getTier(c.totalBookings) })).sort((a, b) => b.totalBookings - a.totalBookings);
  }, [rows]);

  const tierCounts = useMemo(() => {
    const counts = {};
    CUSTOMER_TIERS.forEach((t) => { counts[t.key] = customerStats.filter((c) => c.tier.key === t.key).length; });
    return counts;
  }, [customerStats]);

  if (allBookings.status === 'loading') return <LoadingState label="Loading customer data…" />;
  if (allBookings.status === 'error') return <ErrorState message={allBookings.error?.message} onRetry={allBookings.refetch} />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CUSTOMER_TIERS.map((tier) => (
          <div key={tier.key} className="rounded-xl border p-4" style={{ backgroundColor: tier.bg, borderColor: tier.bg }}>
            <p className="text-2xl mb-1" style={{ color: tier.color }}>{tier.icon}</p>
            <p className="text-2xl font-black" style={{ color: tier.color }}>{tierCounts[tier.key]}</p>
            <p className="text-xs font-semibold" style={{ color: tier.color }}>{tier.label} customers</p>
            <p className="text-[10px] mt-0.5" style={{ color: tier.color, opacity: 0.7 }}>≥{tier.minBookings} bookings</p>
          </div>
        ))}
      </div>

      <Card padded={false}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold" style={{ color: '#1F2937' }}>All Customers by Loyalty Tier</h3>
          <p className="text-xs" style={{ color: '#6B7280' }}>{customerStats.length} total</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F7F8FC', borderBottom: '1px solid #E5E7EB' }}>
                {['Customer', 'Tier', 'Bookings', 'Total Spend', 'Completed', 'Last Booking'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wide" style={{ color: '#6B7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customerStats.map((c, i) => (
                <tr key={c.name} style={{ borderTop: i > 0 ? '1px solid #F7F8FC' : 'none' }}>
                  <td className="px-4 py-3">
                    <p className="font-semibold" style={{ color: '#1F2937' }}>{c.name}</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>{c.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: c.tier.bg, color: c.tier.color }}>
                      {c.tier.icon} {c.tier.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: '#1F2937' }}>{c.totalBookings}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: '#3B65DB' }}>{formatCurrency(c.totalSpend)}</td>
                  <td className="px-4 py-3" style={{ color: '#38B763' }}>{c.statuses.COMPLETED || 0}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#6B7280' }}>{c.lastBooking ? new Date(c.lastBooking).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Location/destination statistics ─────────────────────────────────────────
// There is no city/location-grouping report endpoint on the backend at all
// (confirmed — every real report groups by status, vehicle class, or
// driver, never location). Rather than wait on that, this computes a real,
// genuine breakdown client-side from the same bookingService.list() call
// already used elsewhere — grouping by destination (dropAddress), since
// that's what's actually informative with the data available today (which
// routes are most popular), and needs zero backend changes.
//
// If your backend later adds real structured city/zone fields (rather than
// free-text addresses) or a dedicated report endpoint, this can be swapped
// for that directly — the rest of this component (table, sorting) stays
// the same either way.
function LocationReport() {
  const allBookings = useApi(() => bookingService.list({ page: 1, limit: 100 }), []);
  const rows = allBookings.data?.data || [];

  const byDestination = useMemo(() => {
    const map = {};
    rows.forEach((b) => {
      // Addresses are free text (e.g. "Bengaluru, Karnataka, India" or a
      // full pickup point) — using the raw drop address as the grouping
      // key keeps this honest about what data actually exists, rather than
      // guessing at city-name parsing that could silently misgroup routes.
      const dest = b.dropAddress || 'Unknown';
      if (!map[dest]) map[dest] = { destination: dest, bookings: 0, revenue: 0, completed: 0 };
      map[dest].bookings++;
      map[dest].revenue += n(b.finalFare ?? b.estimatedFare);
      if (b.status === 'COMPLETED') map[dest].completed++;
    });
    return Object.values(map).sort((a, b) => b.bookings - a.bookings);
  }, [rows]);

  if (allBookings.status === 'loading') return <LoadingState label="Loading location data…" />;
  if (allBookings.status === 'error') return <ErrorState message={allBookings.error?.message} onRetry={allBookings.refetch} />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile icon={TrendingUp} label="Destinations Served" value={byDestination.length} tone="blue" />
        <KpiTile icon={CalendarCheck} label="Top Destination" value={byDestination[0]?.destination?.split(',')[0] || '—'} tone="green" />
        <KpiTile icon={TrendingUp} label="Top Destination Bookings" value={byDestination[0]?.bookings ?? 0} tone="amber" />
        <KpiTile icon={TrendingUp} label="Top Destination Revenue" value={formatCurrency(byDestination[0]?.revenue ?? 0)} tone="purple" />
      </div>

      <Card>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Bookings by destination</h3>
        <BarChart data={byDestination.slice(0, 8).map((d) => ({ label: d.destination.split(',')[0], value: d.bookings }))} height={220} />
      </Card>

      <Card padded={false}>
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-bold" style={{ color: '#1F2937' }}>All destinations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F7F8FC', borderBottom: '1px solid #E5E7EB' }}>
                {['Destination', 'Bookings', 'Completed', 'Revenue'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wide" style={{ color: '#6B7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byDestination.map((d, i) => (
                <tr key={d.destination} style={{ borderTop: i > 0 ? '1px solid #F7F8FC' : 'none' }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: '#1F2937' }}>{d.destination}</td>
                  <td className="px-4 py-3" style={{ color: '#1F2937' }}>{d.bookings}</td>
                  <td className="px-4 py-3" style={{ color: '#38B763' }}>{d.completed}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: '#3B65DB' }}>{formatCurrency(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function Reports() {
  const [rangeKey, setRangeKey] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);

  const executive = useApi(() => reportsService.executive(range), [rangeKey]);
  const fleetApi = useApi(() => reportsService.fleet(range), [rangeKey]);
  const driverPerf = useApi(() => reportsService.driverPerformance(range), [rangeKey]);
  const trend = useApi(() => reportsService.businessTrend(range), [rangeKey]);
  const bookingsApi = useApi(() => bookingService.list({ limit: 100 }), []);
  const paymentsApi = useApi(() => adminPaymentsService.list({ limit: 100 }), [rangeKey]);

  const bookings = bookingsApi.data?.data || [];
  const payments = paymentsApi.data?.data || [];
  const fleet = fleetApi.data?.fleet || {};

  // FIX 1: the real /admin/reports/driver-performance response is
  // { window, summary, drivers: [...], generatedAt } — the array is nested
  // under .drivers, not the top-level data itself (that's the whole object,
  // not an array — the mismatch that caused "drivers.reduce is not a
  // function"). Field names also confirmed exactly: offersReceived /
  // offersAccepted / acceptanceRate (precomputed 0-1 ratio), not the
  // offers/accepted names used before.
  const drivers = driverPerf.data?.drivers || [];

  const bookingsByStatus = useMemo(
    () => Object.entries(bookings.reduce((acc, b) => ({ ...acc, [b.status]: (acc[b.status] || 0) + 1 }), {}))
      .map(([label, value]) => ({ label: titleCase(label), value })),
    [bookings]
  );
  const fleetByStatus = useMemo(
    () => Object.entries(fleet.byStatus || {}).map(([label, value]) => ({ label: titleCase(label), value })),
    [fleet]
  );
  const topClients = useMemo(
    () => Object.entries(
      bookings.reduce((acc, b) => {
        const name = b.customer?.user?.name || b.corporate?.companyName || 'Unknown';
        return { ...acc, [name]: (acc[name] || 0) + n(b.finalFare ?? b.estimatedFare) };
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value })),
    [bookings]
  );

  // FIX 2: the real /admin/reports/business-trend response nests the array
  // under .series (confirmed), and each point's date field is called "day",
  // not "date" (confirmed against buildBusinessTrend's `series.map(r => ({
  // day, bookings, completed, cancelled, revenue }))`). revenue is a money()
  // string, wrapped in n() before charting.
  const revenueByMonth = (trend.data?.series || []).map((d) => ({ label: String(d.day).slice(5), value: n(d.revenue) }));

  const avgFare = bookings.length
    ? Math.round(bookings.reduce((s, b) => s + n(b.finalFare ?? b.estimatedFare), 0) / bookings.length)
    : 0;

  const handleExport = async (type) => {
    setExporting(true);
    toast.info('Preparing CSV export…');
    try {
      await reportsService.exportReport(type, range);
      toast.success('Export ready — check your downloads.');
    } catch (e) {
      toast.error(e.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const loading = executive.status === 'loading' || fleetApi.status === 'loading' || driverPerf.status === 'loading' || trend.status === 'loading';
  if (loading) return <LoadingState label="Loading reports…" />;
  if (executive.status === 'error') return <ErrorState message={executive.error?.message} onRetry={executive.refetch} />;

  const ex = executive.data || {};

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Fleet performance, revenue analysis and operational insights."
        actions={
          <div className="flex items-center gap-2">
            <Select value={rangeKey} onChange={(e) => setRangeKey(e.target.value)}
              options={[
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: '90d', label: 'Last 90 days' },
                { value: '1y', label: 'This year' },
              ]}
            />
            <Button variant="secondary" icon={Download} loading={exporting} onClick={() => handleExport(activeTab)}>
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: '#E5E7EB' }}>
        {REPORT_TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px focus-ring"
            style={{ borderColor: activeTab === t.key ? '#3B65DB' : 'transparent', color: activeTab === t.key ? '#3B65DB' : '#6B7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile icon={TrendingUp} label="Revenue Collected" value={formatCurrency(n(ex.cash?.collected))} tone="green" />
            <KpiTile icon={CalendarCheck} label="Total Bookings" value={ex.volume?.totalBookings ?? 0} tone="blue" />
            <KpiTile icon={Users} label="Drivers Active" value={drivers.length} sub={`in this period`} tone="purple" />
            <KpiTile icon={Truck} label="Fleet Utilisation" value={`${Math.round(n(fleet.utilisation) * 100)}%`} sub={`${fleet.total ?? 0} vehicles total`} tone="amber" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <h3 className="text-sm font-bold mb-1" style={{ color: '#1F2937' }}>Revenue trend</h3>
              <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Total: {formatCurrency(revenueByMonth.reduce((s, d) => s + d.value, 0))}</p>
              <BarChart data={revenueByMonth} height={200} />
            </Card>
            <Card>
              <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Bookings by status</h3>
              <DonutChart data={bookingsByStatus} size={130} />
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'financial' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile icon={TrendingUp} label="Revenue Collected" value={formatCurrency(n(ex.cash?.collected))} tone="green" />
            <KpiTile icon={TrendingUp} label="Pending Payments" value={formatCurrency(payments.filter((p) => p.status === 'CREATED' || p.status === 'AUTHORISED').reduce((s, p) => s + n(p.amount), 0))} tone="amber" />
            <KpiTile icon={TrendingUp} label="Average Fare" value={formatCurrency(avgFare)} tone="blue" />
            <KpiTile icon={TrendingUp} label="Total Bookings" value={ex.volume?.totalBookings ?? 0} tone="purple" />
          </div>
          <Card>
            <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Top customers by revenue</h3>
            <BarChart data={topClients} height={220} />
          </Card>
          <Card>
            <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Payment method breakdown</h3>
            <DonutChart size={140} data={
              Object.entries(payments.reduce((acc, p) => ({ ...acc, [p.method]: (acc[p.method] || 0) + 1 }), {}))
                .map(([label, value]) => ({ label: titleCase(label), value }))
            } />
          </Card>
          {payments.some((p) => p.status === 'FAILED') && (
            <Alert type="warning">
              {payments.filter((p) => p.status === 'FAILED').length} failed payment(s) in this list — check the
              Payments page for details and failure reasons.
            </Alert>
          )}
        </div>
      )}

      {activeTab === 'fleet' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile icon={Truck} label="Total Vehicles" value={fleet.total ?? 0} tone="blue" />
            <KpiTile icon={Truck} label="Active" value={fleet.active ?? 0} tone="green" />
            <KpiTile icon={Truck} label="Utilisation" value={`${Math.round(n(fleet.utilisation) * 100)}%`} tone="amber" />
          </div>
          <Card>
            <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Fleet status</h3>
            <DonutChart data={fleetByStatus} size={140} />
          </Card>
          <Alert type="info">
            A "vehicles by type" breakdown isn't shown — the backend's fleet report groups only by status, not by
            vehicle class. A per-class breakdown would need a small addition to /admin/reports/fleet.
          </Alert>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="space-y-5">
          <Alert type="info">
            These numbers come from booking activity in the selected period (/admin/reports/driver-performance) —
            there's no driver roster endpoint yet, so a driver with zero trips in this window won't appear at all,
            and fields like phone/licence/status aren't available here.
          </Alert>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiTile icon={Users} label="Active Drivers" value={drivers.length} sub="in this period" tone="blue" />
            <KpiTile icon={Users} label="Total Completed Trips" value={drivers.reduce((s, d) => s + n(d.completedTrips), 0)} tone="green" />
            <KpiTile icon={TrendingUp} label="Total Driver Earnings" value={formatCurrency(drivers.reduce((s, d) => s + n(d.earnings), 0))} tone="purple" />
          </div>
          <Card padded={false}>
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-sm font-bold" style={{ color: '#1F2937' }}>Driver performance</h3>
            </div>
            <div>
              {drivers.slice(0, 8).map((d, i) => {
                // acceptanceRate is precomputed by the backend as a 0-1
                // ratio (confirmed: offersReceived ? accepted/offers : 0) —
                // multiply by 100 for display, don't recompute it here.
                const rate = Math.round(n(d.acceptanceRate) * 100);
                return (
                  <div key={d.driverId || i} className="flex items-center gap-3 px-5 py-3" style={{ borderTop: i > 0 ? '1px solid #F7F8FC' : 'none' }}>
                    <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: '#3B65DB' }}>
                      {(d.name || 'D').slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1F2937' }}>{d.name}</p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{n(d.completedTrips)} trips · {rate}% acceptance</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: '#38B763' }}>{n(d.ratingAvg).toFixed(1)} ★</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'customers' && <CustomerReport />}
      {activeTab === 'locations' && <LocationReport />}
    </div>
  );
}