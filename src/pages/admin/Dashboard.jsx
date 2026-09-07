import { useMemo, useEffect } from 'react';
import { Truck, CalendarCheck, IndianRupee, Gauge, Radio, Zap } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import KpiCard from '../../components/dashboard/KpiCard';
import BarChart from '../../components/dashboard/BarChart';
import DonutChart from '../../components/dashboard/DonutChart';
import StatusBadge from '../../components/ui/StatusBadge';
import { useApi } from '../../hooks/useApi';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import { bookingService, reportsService } from '../../services';
import { CardSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';

const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const FEED_LABEL = {
  'booking:created':   { text: 'New booking', color: '#166534', bg: '#f0fdf4' },
  'booking:attempted': { text: 'Booking attempt', color: '#6B7280', bg: '#F7F8FC' },
  'admin:alert':       { text: 'Attempt failed', color: '#991B1B', bg: '#fef2f2' },
  'trip:status':       { text: 'Status changed', color: '#1e3a8a', bg: '#eef2fb' },
  'booking:allocated': { text: 'Vehicle allocated', color: '#7c3aed', bg: '#f5f3ff' },
  'payment:received':  { text: 'Payment received', color: '#166534', bg: '#f0fdf4' },
};

// Last-30-days window, matching the real backend's report range params exactly
// (executiveReport / fleetReport both accept { from, to } ISO strings).
function last30Days() {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function Dashboard() {
  const bookingsWeekly = useMemo(
    () => weekLabels.map((label) => ({ label, value: 8 + Math.floor(Math.random() * 20) })),
    []
  );

  // Shared live socket connection — established once in AdminLayout via
  // AdminRealtimeProvider; this just reads the same state.
  const { connected, feed, lastBookingEventId } = useAdminRealtimeContext();

  const range = useMemo(() => last30Days(), []);

  // These two hit your real backend's /admin/reports/executive and
  // /admin/reports/fleet endpoints — the ONLY endpoints that actually
  // aggregate fleet/booking/revenue numbers on this backend. There is no
  // single "dashboard stats" endpoint, and no /drivers or /vehicles REST
  // resource at all, so driver-count style KPIs aren't sourced from
  // anywhere real yet — see the note below "Fleet Utilisation".
  const executiveApi = useApi(() => reportsService.executive(range), []);
  const fleetApi = useApi(() => reportsService.fleet(range), []);

  const { data, status, error, refetch } = useApi(
    () => bookingService.list({ page: 1, limit: 6, sortBy: 'createdAt' }),
    []
  );

  // Whenever a booking:created event arrives, refetch the "recent bookings"
  // list and the report numbers so the dashboard reflects it immediately —
  // this is the "ping" the customer website triggers on the admin side.
  useEffect(() => {
    if (!lastBookingEventId) return;
    refetch();
    executiveApi.refetch();
    fleetApi.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBookingEventId]);

  const loading = status === 'loading' || executiveApi.status === 'loading' || fleetApi.status === 'loading';
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }
  if (status === 'error') return <ErrorState message={error?.message} onRetry={refetch} />;
  if (executiveApi.status === 'error') return <ErrorState message={executiveApi.error?.message} onRetry={executiveApi.refetch} />;
  if (fleetApi.status === 'error') return <ErrorState message={fleetApi.error?.message} onRetry={fleetApi.refetch} />;

  // Real shapes, straight from report.service.js on the backend:
  //   executive: { volume: { totalBookings, ... }, cash: { collected, ... } }
  //   fleet:     { fleet: { total, active, byStatus: {STATUS: count}, utilisation } }
  const exec = executiveApi.data || {};
  const fleet = fleetApi.data?.fleet || {};
  const fleetStatus = Object.entries(fleet.byStatus || {}).map(([label, value]) => ({ label: titleCase(label), value }));

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Fleet Vehicles"    value={fleet.total ?? 0}                              icon={Truck}         tone="purple" />
        {/* No /drivers or /vehicles REST endpoint exists on the backend yet —
            Fleet Utilisation is the closest real, backend-sourced fleet-ops
            number available (vehicles actually used ÷ active fleet, last 30
            days). Swap this back to an Active Drivers count once a driver
            roster endpoint exists. */}
        <KpiCard label="Fleet Utilisation" value={`${Math.round((fleet.utilisation || 0) * 100)}%`} icon={Gauge}         tone="primary" />
        <KpiCard label="Bookings (30d)"    value={exec.volume?.totalBookings ?? 0}                icon={CalendarCheck} tone="accent" />
        <KpiCard label="Revenue Collected" value={formatCurrency(exec.cash?.collected || 0)}       icon={IndianRupee}  tone="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#1F2937' }}>Bookings this week</h3>
          <BarChart data={bookingsWeekly} />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#1F2937' }}>Fleet status</h3>
          <DonutChart data={fleetStatus} size={140} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padded={false} className="lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Recent bookings</h3>
          </div>
          <div className="divide-y" style={{ borderColor: '#F7F8FC' }}>
            {data?.data.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium" style={{ color: '#1F2937' }}>{b.clientName}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{b.pickup} → {b.drop}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={b.status} />
                  <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{formatDateTime(b.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Live activity feed — every booking/status/payment event pinged
            from the backend the instant it happens, on the customer website
            or the ERP itself. */}
        <Card padded={false}>
          <div className="flex items-center gap-2 px-5 pt-5 pb-3">
            <Zap size={14} style={{ color: '#F59E0B' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#1F2937' }}>Live activity</h3>
          </div>
          <div className="divide-y max-h-[420px] overflow-y-auto" style={{ borderColor: '#F7F8FC' }}>
            {feed.length === 0 && (
              <p className="px-5 py-6 text-xs text-center" style={{ color: '#9CA3AF' }}>
                Waiting for activity — new bookings will appear here instantly.
              </p>
            )}
            {feed.map((item) => {
              const cfg = FEED_LABEL[item.kind] || { text: item.kind, color: '#6B7280', bg: '#F7F8FC' };
              return (
                <div key={item.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {cfg.text}
                    </span>
                    <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{formatDateTime(item.at)}</span>
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
