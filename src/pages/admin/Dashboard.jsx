import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, CalendarCheck, IndianRupee, Gauge, Radio, Zap } from 'lucide-react';
import PageHeader   from '../../components/ui/PageHeader';
import Card         from '../../components/ui/Card';
import KpiCard      from '../../components/dashboard/KpiCard';
import BarChart     from '../../components/dashboard/BarChart';
import DonutChart   from '../../components/dashboard/DonutChart';
import StatusBadge  from '../../components/ui/StatusBadge';
import Badge        from '../../components/ui/Badge';
import { useApi }   from '../../hooks/useApi';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import { bookingService, driverService, reportsService } from '../../services';
import { apiClient } from '../../services/apiClient';
import { CardSkeleton } from '../../components/ui/Skeleton';
import ErrorState   from '../../components/ui/ErrorState';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';

const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const FEED_LABEL = {
  'booking:created':   { text: 'New booking',       color: '#166534', bg: '#f0fdf4' },
  'booking:attempted': { text: 'Booking attempt',   color: '#6B7280', bg: '#F7F8FC' },
  'admin:alert':       { text: 'Attempt failed',    color: '#991B1B', bg: '#fef2f2' },
  'trip:status':       { text: 'Status changed',    color: '#1e3a8a', bg: '#eef2fb' },
  'booking:allocated': { text: 'Vehicle allocated', color: '#7c3aed', bg: '#f5f3ff' },
  'payment:received':  { text: 'Payment received',  color: '#166534', bg: '#f0fdf4' },
};

// Helper — backend returns address as { address: "..." } object
function addr(val) {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.address || val.formattedAddress || '—';
}

function last30Days() {
  const to   = new Date();
  const from = new Date(Date.now() - 30 * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { connected, feed, lastBookingEventId } = useAdminRealtimeContext();
  const range = useMemo(() => last30Days(), []);

  // Weekly bookings — static shape for chart (no per-day endpoint exists)
  const bookingsWeekly = useMemo(
    () => weekLabels.map((label) => ({ label, value: 8 + Math.floor(Math.random() * 20) })),
    []
  );

  // Real backend reports
  const executiveApi = useApi(() => reportsService.executive(range), []);
  const fleetApi     = useApi(() => reportsService.fleet(range), []);

  // Recent bookings — GET /admin/bookings?page=1&limit=6&sortBy=createdAt
  const { data: bookingsData, status, error, refetch } = useApi(
    () => bookingService.list({ page: 1, limit: 6, sortBy: 'createdAt' }),
    []
  );

  // Pending KYC applications count — GET /admin/drivers?kycStatus=PENDING&limit=1
  const { data: pendingKycData } = useApi(
    () => apiClient.get('/admin/drivers', { params: { kycStatus: 'PENDING', limit: 1, page: 1 } }),
    []
  );
  const pendingKycCount = pendingKycData?.pagination?.total ?? pendingKycData?.meta?.total ?? 0;

  // Refetch everything when a new booking arrives via socket
  useEffect(() => {
    if (!lastBookingEventId) return;
    refetch();
    executiveApi.refetch();
    fleetApi.refetch();
  }, [lastBookingEventId]);

  const loading =
    status === 'loading' ||
    executiveApi.status === 'loading' ||
    fleetApi.status === 'loading';

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }
  if (status === 'error')          return <ErrorState message={error?.message}               onRetry={refetch} />;
  if (executiveApi.status === 'error') return <ErrorState message={executiveApi.error?.message} onRetry={executiveApi.refetch} />;
  if (fleetApi.status === 'error')     return <ErrorState message={fleetApi.error?.message}     onRetry={fleetApi.refetch} />;

  const exec       = executiveApi.data || {};
  const fleetRaw   = fleetApi.data;
  // Fleet can be array (mock) or object with { fleet: {...} } (real)
  const fleet = Array.isArray(fleetRaw)
    ? { total: fleetRaw.reduce((s,v)=>s+v.count,0), active: fleetRaw.filter(v=>v.status!=='INACTIVE').reduce((s,v)=>s+v.count,0), utilisation: 0, byStatus: Object.fromEntries(fleetRaw.map(v=>[v.type||v.status, v.count])) }
    : (fleetRaw?.fleet || fleetRaw || {});
  const fleetStatus = Object.entries(fleet.byStatus || {}).map(([label, value]) => ({ label: titleCase(label), value }));

  // bookingService.list returns { data: [...], pagination: {...} } via crudFactory
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Fleet Vehicles"    value={fleet.total ?? 0}
          icon={Truck} tone="purple" />
        <KpiCard label="Fleet Utilisation" value={`${Math.round((fleet.utilisation || 0) * 100)}%`}
          icon={Gauge} tone="primary" />
        <KpiCard label="Bookings (30d)"    value={exec.volume?.totalBookings ?? 0}
          icon={CalendarCheck} tone="accent" />
        <KpiCard label="Revenue Collected" value={formatCurrency(exec.cash?.collected || 0)}
          icon={IndianRupee} tone="green" />
      </div>

      {/* ── Pending KYC banner ── */}
      {pendingKycCount > 0 && (
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3 mb-5 cursor-pointer"
          style={{ backgroundColor: '#fffbea', border: '1px solid #FCD34D' }}
          onClick={() => navigate('/admin/drivers')}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: '#92400E' }}>
              🔔 {pendingKycCount} driver application{pendingKycCount > 1 ? 's' : ''} pending KYC review
            </span>
          </div>
          <span className="text-xs font-semibold" style={{ color: '#B45309' }}>
            Review →
          </span>
        </div>
      )}

      {/* ── Charts ── */}
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
                  {/* FIXED: customer name is nested under b.customer.user.name */}
                  <p className="font-medium" style={{ color: '#1F2937' }}>
                    {b.customer?.user?.name || b.corporate?.companyName || '—'}
                  </p>
                  {/* FIXED: addresses are objects { address: "..." } */}
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
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {cfg.text}
                    </span>
                    <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{formatDateTime(item.at)}</span>
                  </div>
                  <p className="mt-1.5 text-xs" style={{ color: '#374151' }}>
                    {item.bookingNumber || item.bookingId || item.attemptId}
                    {item.status  ? ` — ${titleCase(item.status)}`  : ''}
                    {item.reason  ? ` — ${item.reason}` : ''}
                    {item.amount  ? ` — ₹${item.amount}` : ''}
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
