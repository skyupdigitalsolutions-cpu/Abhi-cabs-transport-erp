import { useState, useMemo, useEffect } from 'react';
import { Download, TrendingUp, Truck, Users, CalendarCheck, Filter, X } from 'lucide-react';
import PageHeader  from '../../components/ui/PageHeader';
import Card        from '../../components/ui/Card';
import Select      from '../../components/ui/Select';
import Input       from '../../components/ui/Input';
import Button      from '../../components/ui/Button';
import Alert       from '../../components/ui/Alert';
import Badge       from '../../components/ui/Badge';
import BarChart    from '../../components/dashboard/BarChart';
import DonutChart  from '../../components/dashboard/DonutChart';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState  from '../../components/ui/ErrorState';
import { useApi }  from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { reportsService, bookingService, adminPaymentsService, contactService } from '../../services';
import { formatCurrency, titleCase, formatDate } from '../../utils/formatters';

// ── Constants ────────────────────────────────────────────────────────────────
const REPORT_TABS = [
  { key: 'overview',  label: 'Overview'  },
  { key: 'financial', label: 'Financial' },
  { key: 'fleet',     label: 'Fleet'     },
  { key: 'drivers',   label: 'Drivers'   },
  { key: 'customers', label: 'Customers' },
  { key: 'locations', label: 'Locations' },
  { key: 'cancellations', label: 'Cancellations' },
  { key: 'abandoned', label: 'Abandoned Bookings' },
  { key: 'gst',       label: 'GST'       },
];

const RANGE_PRESETS = [
  { value: '7d',     label: 'Last 7 days'    },
  { value: '30d',    label: 'Last 30 days'   },
  { value: '90d',    label: 'Last 90 days'   },
  { value: '1y',     label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range…'  },
];

const VEHICLE_CLASSES = ['hatchback', 'sedan', 'suv', 'tempo'];
const TRIP_TYPES      = ['ONE_WAY', 'ROUND_TRIP', 'AIRPORT', 'HOURLY'];
const BOOKING_STATUSES = ['PENDING','CONFIRMED','ALLOCATED','EN_ROUTE','ONGOING','COMPLETED','CANCELLED'];
const PAYMENT_METHODS  = ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'CASH'];
const PAYMENT_STATUSES = ['CREATED','AUTHORISED','CAPTURED','PARTIALLY_PAID','FAILED','REFUNDED'];

function rangeFor(rangeKey, customFrom, customTo) {
  if (rangeKey === 'custom' && customFrom && customTo) {
    return { from: new Date(customFrom).toISOString(), to: new Date(customTo + 'T23:59:59').toISOString() };
  }
  const DAYS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const days = DAYS[rangeKey] || 30;
  const to   = new Date();
  const from = new Date(Date.now() - days * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

const n = (v) => Number(v) || 0;

// ── Shared UI ────────────────────────────────────────────────────────────────
function KpiTile({ icon: Icon, label, value, sub, tone = 'blue' }) {
  const TONES = {
    blue:   { bg: '#eef2fb', color: '#3B65DB' },
    green:  { bg: '#f0fdf4', color: '#38B763' },
    amber:  { bg: '#fffbeb', color: '#F59E0B' },
    purple: { bg: '#f5f3ff', color: '#7c3aed' },
    red:    { bg: '#fef2f2', color: '#EF4444' },
  };
  const t = TONES[tone] || TONES.blue;
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

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
      style={{ backgroundColor: '#EEF2FF', color: '#3B65DB' }}>
      {label}
      <button onClick={onRemove}><X size={11} /></button>
    </span>
  );
}

function SectionFilter({ label, children }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4 p-3 rounded-xl"
      style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
      <Filter size={13} style={{ color: '#6B7280', flexShrink: 0 }} />
      <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>{label}:</span>
      {children}
    </div>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ executive, fleet, trend, bookings, rangeLabel }) {
  const [statusFilter, setStatusFilter]   = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [tripTypeFilter, setTripTypeFilter] = useState('');

  const filtered = useMemo(() => {
    let rows = bookings;
    if (statusFilter)   rows = rows.filter((b) => b.status === statusFilter);
    if (vehicleFilter)  rows = rows.filter((b) => b.vehicleClass === vehicleFilter);
    if (tripTypeFilter) rows = rows.filter((b) => b.tripType === tripTypeFilter);
    return rows;
  }, [bookings, statusFilter, vehicleFilter, tripTypeFilter]);

  const ex = executive.data || {};
  const fl = fleet.data?.fleet || {};

  const bookingsByStatus = useMemo(
    () => Object.entries(filtered.reduce((acc, b) => ({ ...acc, [b.status]: (acc[b.status] || 0) + 1 }), {}))
      .map(([label, value]) => ({ label: titleCase(label), value })),
    [filtered]
  );

  const trendArr = trend.data?.series || (Array.isArray(trend.data) ? trend.data : []);
  const revenueByDay = trendArr.map((d) => ({
    label: String(d.date || d.day || '').slice(5, 10),
    value: n(typeof d.revenue === 'string' ? parseFloat(d.revenue) : d.revenue),
  }));

  const activeFilters = [statusFilter, vehicleFilter, tripTypeFilter].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <SectionFilter label="Filter bookings">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="All statuses"
          options={BOOKING_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
        <Select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}
          placeholder="All vehicle classes"
          options={VEHICLE_CLASSES.map((c) => ({ value: c, label: titleCase(c) }))} />
        <Select value={tripTypeFilter} onChange={(e) => setTripTypeFilter(e.target.value)}
          placeholder="All trip types"
          options={TRIP_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
        {activeFilters > 0 && (
          <button className="text-xs font-semibold" style={{ color: '#EF4444' }}
            onClick={() => { setStatusFilter(''); setVehicleFilter(''); setTripTypeFilter(''); }}>
            Clear filters ({activeFilters})
          </button>
        )}
        {filtered.length !== bookings.length && (
          <Badge tone="blue">{filtered.length} of {bookings.length} bookings</Badge>
        )}
      </SectionFilter>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile icon={TrendingUp} label="Revenue Collected" value={formatCurrency(n(ex.cash?.collected ?? ex.revenue?.gross ?? ex.totalRevenue ?? 0))} tone="green" />
        <KpiTile icon={CalendarCheck} label={`Bookings (${rangeLabel})`} value={filtered.length} tone="blue" />
        <KpiTile icon={Users} label="Completed" value={filtered.filter((b) => b.status === 'COMPLETED').length} tone="purple" />
        <KpiTile icon={Truck} label="Fleet Utilisation" value={`${Math.round(n(fl.utilisation) * 100)}%`} sub={`${fl.total ?? 0} vehicles`} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-bold mb-1" style={{ color: '#1F2937' }}>Revenue trend</h3>
          <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
            Total: {formatCurrency(revenueByDay.reduce((s, d) => s + d.value, 0))}
          </p>
          <BarChart data={revenueByDay} height={200} />
        </Card>
        <Card>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>
            Bookings by status {activeFilters > 0 && <span style={{ color: '#3B65DB' }}>(filtered)</span>}
          </h3>
          <DonutChart data={bookingsByStatus} size={130} />
        </Card>
      </div>
    </div>
  );
}

// ── Financial tab ────────────────────────────────────────────────────────────
function FinancialTab({ executive, bookings, payments }) {
  const [methodFilter, setMethodFilter]   = useState('');
  const [pyStatusFilter, setPyStatusFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');

  const filteredPayments = useMemo(() => {
    let rows = payments;
    if (methodFilter)   rows = rows.filter((p) => p.method === methodFilter);
    if (pyStatusFilter) rows = rows.filter((p) => p.status === pyStatusFilter);
    return rows;
  }, [payments, methodFilter, pyStatusFilter]);

  const filteredBookings = useMemo(() => {
    let rows = bookings;
    if (vehicleFilter) rows = rows.filter((b) => b.vehicleClass === vehicleFilter);
    return rows;
  }, [bookings, vehicleFilter]);

  const ex = executive.data || {};

  const pendingAmount = filteredPayments
    .filter((p) => ['CREATED', 'AUTHORISED'].includes(p.status))
    .reduce((s, p) => s + n(p.amount), 0);

  const avgFare = filteredBookings.length
    ? Math.round(filteredBookings.reduce((s, b) => s + n(b.finalFare ?? b.estimatedFare), 0) / filteredBookings.length)
    : 0;

  const topClients = useMemo(
    () => Object.entries(
      filteredBookings.reduce((acc, b) => {
        const name = b.customer?.user?.name || b.corporate?.companyName || 'Unknown';
        return { ...acc, [name]: (acc[name] || 0) + n(b.finalFare ?? b.estimatedFare) };
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value })),
    [filteredBookings]
  );

  const byMethod = useMemo(
    () => Object.entries(
      filteredPayments.reduce((acc, p) => ({ ...acc, [p.method]: (acc[p.method] || 0) + 1 }), {})
    ).map(([label, value]) => ({ label: titleCase(label), value })),
    [filteredPayments]
  );

  const byPaymentStatus = useMemo(
    () => Object.entries(
      filteredPayments.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), {})
    ).map(([label, value]) => ({ label: label.replace(/_/g, ' '), value })),
    [filteredPayments]
  );

  return (
    <div className="space-y-5">
      <SectionFilter label="Filter payments">
        <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}
          placeholder="All payment methods"
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} />
        <Select value={pyStatusFilter} onChange={(e) => setPyStatusFilter(e.target.value)}
          placeholder="All payment statuses"
          options={PAYMENT_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
        <Select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}
          placeholder="All vehicle classes"
          options={VEHICLE_CLASSES.map((c) => ({ value: c, label: titleCase(c) }))} />
        {(methodFilter || pyStatusFilter || vehicleFilter) && (
          <button className="text-xs font-semibold" style={{ color: '#EF4444' }}
            onClick={() => { setMethodFilter(''); setPyStatusFilter(''); setVehicleFilter(''); }}>
            Clear
          </button>
        )}
      </SectionFilter>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile icon={TrendingUp} label="Revenue Collected" value={formatCurrency(n(ex.cash?.collected ?? ex.revenue?.gross ?? ex.totalRevenue ?? 0))} tone="green" />
        <KpiTile icon={TrendingUp} label="Pending Payments" value={formatCurrency(pendingAmount)} tone="amber" />
        <KpiTile icon={TrendingUp} label="Average Fare" value={formatCurrency(avgFare)} tone="blue"
          sub={vehicleFilter ? `${titleCase(vehicleFilter)} only` : 'All classes'} />
        <KpiTile icon={TrendingUp} label="Failed Payments" value={filteredPayments.filter((p) => p.status === 'FAILED').length} tone="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Top customers by revenue</h3>
          <BarChart data={topClients} height={220} />
        </Card>
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Payment methods</h3>
            <DonutChart size={130} data={byMethod} />
          </Card>
          <Card>
            <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Payment statuses</h3>
            <DonutChart size={110} data={byPaymentStatus} />
          </Card>
        </div>
      </div>

      {filteredPayments.some((p) => p.status === 'FAILED') && (
        <Alert type="warning">
          {filteredPayments.filter((p) => p.status === 'FAILED').length} failed payment(s) — check the Payments page for failure reasons.
        </Alert>
      )}
    </div>
  );
}

// ── Fleet tab ────────────────────────────────────────────────────────────────
function FleetTab({ fleetApi, bookings }) {
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');

  const filtered = useMemo(() => {
    let rows = bookings;
    if (vehicleFilter) rows = rows.filter((b) => b.vehicleClass === vehicleFilter);
    if (statusFilter)  rows = rows.filter((b) => b.status === statusFilter);
    return rows;
  }, [bookings, vehicleFilter, statusFilter]);

  const fleetRaw = fleetApi.data;
  const fleet = fleetRaw?.fleet || (Array.isArray(fleetRaw)
    ? { total: fleetRaw.reduce((s,v)=>s+(v.count||0),0), active: 0, byStatus: Object.fromEntries(fleetRaw.map(v=>[v.status||v.type, v.count])) }
    : fleetRaw) || {};

  const byClass = useMemo(() => {
    const map = {};
    filtered.forEach((b) => {
      const cls = b.vehicleClass || 'unknown';
      if (!map[cls]) map[cls] = { bookings: 0, revenue: 0, completed: 0 };
      map[cls].bookings++;
      map[cls].revenue += n(b.finalFare ?? b.estimatedFare);
      if (b.status === 'COMPLETED') map[cls].completed++;
    });
    return Object.entries(map).map(([label, val]) => ({ label: titleCase(label), ...val })).sort((a, b) => b.bookings - a.bookings);
  }, [filtered]);

  const byTripType = useMemo(() => {
    const map = {};
    filtered.forEach((b) => {
      const t = b.tripType || 'UNKNOWN';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([label, value]) => ({ label: label.replace(/_/g, ' '), value }));
  }, [filtered]);

  const fleetByStatus = Object.entries(fleet.byStatus || {}).map(([label, value]) => ({ label: titleCase(label), value }));

  return (
    <div className="space-y-5">
      <SectionFilter label="Filter fleet analytics">
        <Select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}
          placeholder="All vehicle classes"
          options={VEHICLE_CLASSES.map((c) => ({ value: c, label: titleCase(c) }))} />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="All booking statuses"
          options={BOOKING_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
        {(vehicleFilter || statusFilter) && (
          <button className="text-xs font-semibold" style={{ color: '#EF4444' }}
            onClick={() => { setVehicleFilter(''); setStatusFilter(''); }}>Clear</button>
        )}
        {filtered.length !== bookings.length && (
          <Badge tone="blue">{filtered.length} of {bookings.length} bookings</Badge>
        )}
      </SectionFilter>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile icon={Truck} label="Total Vehicles"   value={fleet.total ?? 0}  tone="blue" />
        <KpiTile icon={Truck} label="Active Vehicles"  value={fleet.active ?? 0} tone="green" />
        <KpiTile icon={Truck} label="Fleet Utilisation" value={`${Math.round(n(fleet.utilisation ?? fleet.utilisationPct) * 100)}%`} tone="amber" />
        <KpiTile icon={CalendarCheck} label="Filtered Bookings" value={filtered.length} tone="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Bookings by vehicle class</h3>
          <BarChart data={byClass.map((c) => ({ label: c.label, value: c.bookings }))} height={180} />
        </Card>
        <Card>
          <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Bookings by trip type</h3>
          <DonutChart data={byTripType} size={130} />
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Fleet status breakdown</h3>
        <DonutChart data={fleetByStatus} size={140} />
      </Card>

      {byClass.length > 0 && (
        <Card padded={false}>
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-sm font-bold" style={{ color: '#1F2937' }}>Revenue by vehicle class</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F7F8FC', borderBottom: '1px solid #E5E7EB' }}>
                  {['Class', 'Bookings', 'Completed', 'Revenue'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-[12.5px] uppercase tracking-wide" style={{ color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byClass.map((c, i) => (
                  <tr key={c.label} style={{ borderTop: i > 0 ? '1px solid #F7F8FC' : 'none' }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#1F2937' }}>{c.label}</td>
                    <td className="px-4 py-3" style={{ color: '#1F2937' }}>{c.bookings}</td>
                    <td className="px-4 py-3" style={{ color: '#38B763' }}>{c.completed}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: '#3B65DB' }}>{formatCurrency(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Drivers tab ──────────────────────────────────────────────────────────────
function DriversTab({ driverPerf }) {
  const [minTrips,     setMinTrips]     = useState('');
  const [minRating,    setMinRating]    = useState('');
  const [sortBy,       setSortBy]       = useState('completedTrips');
  const [minAcceptance,setMinAcceptance]= useState('');

  const allDrivers = driverPerf.data?.drivers || (Array.isArray(driverPerf.data) ? driverPerf.data : []);

  const filtered = useMemo(() => {
    let rows = [...allDrivers];
    if (minTrips)      rows = rows.filter((d) => n(d.completedTrips) >= Number(minTrips));
    if (minRating)     rows = rows.filter((d) => n(d.ratingAvg) >= Number(minRating));
    if (minAcceptance) rows = rows.filter((d) => n(d.acceptanceRate) * 100 >= Number(minAcceptance));
    rows.sort((a, b) => {
      if (sortBy === 'completedTrips') return n(b.completedTrips) - n(a.completedTrips);
      if (sortBy === 'earnings')       return n(b.earnings) - n(a.earnings);
      if (sortBy === 'rating')         return n(b.ratingAvg) - n(a.ratingAvg);
      if (sortBy === 'acceptance')     return n(b.acceptanceRate) - n(a.acceptanceRate);
      return 0;
    });
    return rows;
  }, [allDrivers, minTrips, minRating, minAcceptance, sortBy]);

  if (driverPerf.status === 'loading') return <LoadingState label="Loading driver data…" />;
  if (driverPerf.status === 'error')   return <ErrorState message={driverPerf.error?.message} onRetry={driverPerf.refetch} />;

  const activeFilters = [minTrips, minRating, minAcceptance].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <SectionFilter label="Filter & sort drivers">
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: 'completedTrips', label: 'Sort: Trips'      },
            { value: 'earnings',       label: 'Sort: Earnings'   },
            { value: 'rating',         label: 'Sort: Rating'     },
            { value: 'acceptance',     label: 'Sort: Acceptance' },
          ]} />
        <Select value={minTrips} onChange={(e) => setMinTrips(e.target.value)}
          placeholder="Min trips"
          options={[1, 5, 10, 20, 50].map((v) => ({ value: String(v), label: `≥ ${v} trips` }))} />
        <Select value={minRating} onChange={(e) => setMinRating(e.target.value)}
          placeholder="Min rating"
          options={['3.0','3.5','4.0','4.5','4.8'].map((v) => ({ value: v, label: `≥ ${v} ★` }))} />
        <Select value={minAcceptance} onChange={(e) => setMinAcceptance(e.target.value)}
          placeholder="Min acceptance"
          options={['50','70','80','90'].map((v) => ({ value: v, label: `≥ ${v}%` }))} />
        {activeFilters > 0 && (
          <button className="text-xs font-semibold" style={{ color: '#EF4444' }}
            onClick={() => { setMinTrips(''); setMinRating(''); setMinAcceptance(''); }}>
            Clear ({activeFilters})
          </button>
        )}
        <Badge tone="blue">{filtered.length} of {allDrivers.length} drivers</Badge>
      </SectionFilter>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiTile icon={Users} label="Drivers Shown"        value={filtered.length} sub="in this period" tone="blue" />
        <KpiTile icon={Users} label="Total Completed Trips" value={filtered.reduce((s, d) => s + n(d.completedTrips), 0)} tone="green" />
        <KpiTile icon={TrendingUp} label="Total Driver Earnings" value={formatCurrency(filtered.reduce((s, d) => s + n(d.earnings), 0))} tone="purple" />
      </div>

      <Card padded={false}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold" style={{ color: '#1F2937' }}>Driver performance</h3>
          <span className="text-xs" style={{ color: '#6B7280' }}>{filtered.length} drivers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F7F8FC', borderBottom: '1px solid #E5E7EB' }}>
                {['Driver', 'Rating', 'Trips', 'Acceptance', 'Earnings'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[12.5px] font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const rate = Math.round(n(d.acceptanceRate) * 100);
                return (
                  <tr key={d.driverId || i} style={{ borderTop: i > 0 ? '1px solid #F7F8FC' : 'none' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full grid place-items-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: '#3B65DB' }}>
                          {(d.name || 'D').slice(0, 1)}
                        </div>
                        <span className="font-semibold" style={{ color: '#1F2937' }}>{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: '#F59E0B' }}>{n(d.ratingAvg).toFixed(1)} ★</td>
                    <td className="px-4 py-3" style={{ color: '#1F2937' }}>{n(d.completedTrips)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: rate >= 80 ? '#f0fdf4' : rate >= 50 ? '#fffbeb' : '#fef2f2', color: rate >= 80 ? '#16a34a' : rate >= 50 ? '#92400e' : '#991b1b' }}>
                        {rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: '#38B763' }}>{formatCurrency(n(d.earnings))}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: '#9CA3AF' }}>No drivers match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Customers tab ─────────────────────────────────────────────────────────────
const CUSTOMER_TIERS = [
  { key: 'platinum', label: 'Platinum', minBookings: 20, color: '#7c3aed', bg: '#f5f3ff', icon: '◆' },
  { key: 'gold',     label: 'Gold',     minBookings: 10, color: '#F59E0B', bg: '#fffbeb', icon: '●' },
  { key: 'silver',   label: 'Silver',   minBookings: 5,  color: '#6B7280', bg: '#F7F8FC', icon: '●' },
  { key: 'bronze',   label: 'Bronze',   minBookings: 1,  color: '#b45309', bg: '#fff7ed', icon: '●' },
];
function getTier(count) {
  for (const tier of CUSTOMER_TIERS) if (count >= tier.minBookings) return tier;
  return CUSTOMER_TIERS[CUSTOMER_TIERS.length - 1];
}

function CustomersTab({ bookings }) {
  const [tierFilter,   setTierFilter]   = useState('');
  const [sortBy,       setSortBy]       = useState('bookings');
  const [minSpend,     setMinSpend]     = useState('');

  const allCustomers = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const name = b.customer?.user?.name || b.corporate?.companyName;
      if (!name) return;
      if (!map[name]) map[name] = { name, phone: b.customer?.user?.phone || '—', totalBookings: 0, totalSpend: 0, lastBooking: null, statuses: {} };
      map[name].totalBookings++;
      map[name].totalSpend += n(b.finalFare ?? b.estimatedFare);
      if (!map[name].lastBooking || new Date(b.createdAt) > new Date(map[name].lastBooking)) map[name].lastBooking = b.createdAt;
      map[name].statuses[b.status] = (map[name].statuses[b.status] || 0) + 1;
    });
    return Object.values(map).map((c) => ({ ...c, tier: getTier(c.totalBookings) }));
  }, [bookings]);

  const filtered = useMemo(() => {
    let rows = [...allCustomers];
    if (tierFilter) rows = rows.filter((c) => c.tier.key === tierFilter);
    if (minSpend)   rows = rows.filter((c) => c.totalSpend >= Number(minSpend));
    rows.sort((a, b) => sortBy === 'spend' ? b.totalSpend - a.totalSpend : b.totalBookings - a.totalBookings);
    return rows;
  }, [allCustomers, tierFilter, minSpend, sortBy]);

  const tierCounts = useMemo(() => {
    const counts = {};
    CUSTOMER_TIERS.forEach((t) => { counts[t.key] = allCustomers.filter((c) => c.tier.key === t.key).length; });
    return counts;
  }, [allCustomers]);

  const activeFilters = [tierFilter, minSpend].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <SectionFilter label="Filter customers">
        <Select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}
          placeholder="All tiers"
          options={CUSTOMER_TIERS.map((t) => ({ value: t.key, label: `${t.label} (≥${t.minBookings} bookings)` }))} />
        <Select value={minSpend} onChange={(e) => setMinSpend(e.target.value)}
          placeholder="Min spend"
          options={[1000, 5000, 10000, 25000, 50000].map((v) => ({ value: String(v), label: `≥ ₹${v.toLocaleString('en-IN')}` }))} />
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          options={[{ value: 'bookings', label: 'Sort: Bookings' }, { value: 'spend', label: 'Sort: Spend' }]} />
        {activeFilters > 0 && (
          <button className="text-xs font-semibold" style={{ color: '#EF4444' }}
            onClick={() => { setTierFilter(''); setMinSpend(''); }}>Clear</button>
        )}
        <Badge tone="blue">{filtered.length} of {allCustomers.length} customers</Badge>
      </SectionFilter>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CUSTOMER_TIERS.map((tier) => (
          <div key={tier.key} className="rounded-xl border p-4 cursor-pointer"
            style={{ backgroundColor: tierFilter === tier.key ? tier.bg : '#fff', borderColor: tierFilter === tier.key ? tier.color : '#E5E7EB' }}
            onClick={() => setTierFilter(tierFilter === tier.key ? '' : tier.key)}>
            <p className="text-2xl mb-1" style={{ color: tier.color }}>{tier.icon}</p>
            <p className="text-2xl font-black" style={{ color: tier.color }}>{tierCounts[tier.key]}</p>
            <p className="text-xs font-semibold" style={{ color: tier.color }}>{tier.label}</p>
            <p className="text-[11.5px]" style={{ color: tier.color, opacity: 0.7 }}>≥{tier.minBookings} bookings</p>
          </div>
        ))}
      </div>

      <Card padded={false}>
        <div className="px-5 pt-5 pb-3 flex justify-between">
          <h3 className="text-sm font-bold" style={{ color: '#1F2937' }}>Customers</h3>
          <span className="text-xs" style={{ color: '#6B7280' }}>{filtered.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F7F8FC', borderBottom: '1px solid #E5E7EB' }}>
                {['Customer', 'Tier', 'Bookings', 'Total Spend', 'Completed', 'Last Booking'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-[12.5px] uppercase tracking-wide" style={{ color: '#6B7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
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
                  <td className="px-4 py-3 text-xs" style={{ color: '#6B7280' }}>
                    {c.lastBooking ? new Date(c.lastBooking).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Locations tab ────────────────────────────────────────────────────────────
function LocationsTab({ bookings }) {
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [sortBy,        setSortBy]        = useState('bookings');

  const filtered = useMemo(() => {
    let rows = bookings;
    if (vehicleFilter) rows = rows.filter((b) => b.vehicleClass === vehicleFilter);
    if (statusFilter)  rows = rows.filter((b) => b.status === statusFilter);
    return rows;
  }, [bookings, vehicleFilter, statusFilter]);

  function addrStr(val) {
    if (!val) return 'Unknown';
    if (typeof val === 'string') return val;
    return val.address || val.formattedAddress || 'Unknown';
  }

  const byDestination = useMemo(() => {
    const map = {};
    filtered.forEach((b) => {
      const dest = addrStr(b.dropAddress);
      if (!map[dest]) map[dest] = { destination: dest, bookings: 0, revenue: 0, completed: 0 };
      map[dest].bookings++;
      map[dest].revenue += n(b.finalFare ?? b.estimatedFare);
      if (b.status === 'COMPLETED') map[dest].completed++;
    });
    const rows = Object.values(map);
    return rows.sort((a, b) => sortBy === 'revenue' ? b.revenue - a.revenue : b.bookings - a.bookings);
  }, [filtered, sortBy]);

  return (
    <div className="space-y-5">
      <SectionFilter label="Filter locations">
        <Select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}
          placeholder="All vehicle classes"
          options={VEHICLE_CLASSES.map((c) => ({ value: c, label: titleCase(c) }))} />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="All statuses"
          options={BOOKING_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          options={[{ value: 'bookings', label: 'Sort: Bookings' }, { value: 'revenue', label: 'Sort: Revenue' }]} />
        {(vehicleFilter || statusFilter) && (
          <button className="text-xs font-semibold" style={{ color: '#EF4444' }}
            onClick={() => { setVehicleFilter(''); setStatusFilter(''); }}>Clear</button>
        )}
        <Badge tone="blue">{byDestination.length} destinations</Badge>
      </SectionFilter>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile icon={TrendingUp} label="Destinations Served" value={byDestination.length} tone="blue" />
        <KpiTile icon={CalendarCheck} label="Top Destination" value={byDestination[0]?.destination?.split(',')[0] || '—'} tone="green" />
        <KpiTile icon={TrendingUp} label="Top Dest. Bookings" value={byDestination[0]?.bookings ?? 0} tone="amber" />
        <KpiTile icon={TrendingUp} label="Top Dest. Revenue" value={formatCurrency(byDestination[0]?.revenue ?? 0)} tone="purple" />
      </div>

      <Card>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#1F2937' }}>Bookings by destination (top 8)</h3>
        <BarChart data={byDestination.slice(0, 8).map((d) => ({ label: d.destination.split(',')[0], value: d.bookings }))} height={220} />
      </Card>

      <Card padded={false}>
        <div className="px-5 pt-5 pb-3"><h3 className="text-sm font-bold" style={{ color: '#1F2937' }}>All destinations</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F7F8FC', borderBottom: '1px solid #E5E7EB' }}>
                {['Destination', 'Bookings', 'Completed', 'Revenue'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-[12.5px] uppercase tracking-wide" style={{ color: '#6B7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byDestination.map((d, i) => (
                <tr key={d.destination} style={{ borderTop: i > 0 ? '1px solid #F7F8FC' : 'none' }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: '#1F2937', maxWidth: 300 }}>{d.destination}</td>
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

// ── GST tab ──────────────────────────────────────────────────────────────────
// FIX: cancellation reasons are collected from customers (a required,
// fixed set of categories — see the customer website's cancel dialog) and
// stored on the booking, but nothing anywhere in this dashboard ever
// showed or counted them. GET /admin/bookings (used for `bookings` above)
// doesn't even return the reason field — only the single-booking detail
// endpoint does — so this fetches each cancelled booking's real reason
// individually. Frontend-only, by request: no backend change to add the
// field to the list endpoint, which would've been one call instead of N.
const CANCEL_REASON_CATEGORIES = [
  'Change of plans',
  'Booked by mistake',
  'Found a better price elsewhere',
  'Trip is no longer needed',
];

function CancellationsTab({ bookings, onRefresh, refreshing }) {
  const cancelledBookings = useMemo(
    () => bookings.filter((b) => b.status === 'CANCELLED'),
    [bookings]
  );
  const [reasons, setReasons] = useState({}); // bookingId -> reason string
  const [status, setStatus] = useState(cancelledBookings.length ? 'loading' : 'ready');
  // Bumped by the Refresh button to force the per-booking reason re-fetch
  // below to run again even if the cancelled-booking id list itself didn't
  // change (e.g. a booking that was already cancelled just got its reason
  // corrected, or was cancelled moments after this list was first loaded).
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (cancelledBookings.length === 0) { setStatus('ready'); return; }
    setStatus('loading');

    Promise.all(
      cancelledBookings.map((b) =>
        bookingService.get(b.id)
          .then((full) => [b.id, full?.cancellationReason || null])
          .catch(() => [b.id, null])
      )
    ).then((pairs) => {
      if (cancelled) return;
      const map = {};
      for (const [id, reason] of pairs) map[id] = reason;
      setReasons(map);
      setStatus('ready');
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelledBookings.map((b) => b.id).join(','), reloadTick]);

  function handleRefresh() {
    // Re-fetches the underlying booking list (picks up any newly cancelled
    // bookings, or status changes, since this page's list is only fetched
    // once on load otherwise) AND re-runs the per-booking reason fetch.
    onRefresh?.();
    setReloadTick((t) => t + 1);
  }

  const counts = useMemo(() => {
    const tally = {};
    for (const cat of CANCEL_REASON_CATEGORIES) tally[cat] = 0;
    tally['Other'] = 0;
    tally['Not recorded'] = 0;
    for (const b of cancelledBookings) {
      const reason = reasons[b.id];
      if (!reason) { tally['Not recorded']++; continue; }
      if (CANCEL_REASON_CATEGORIES.includes(reason)) tally[reason]++;
      else tally['Other']++;
    }
    return tally;
  }, [cancelledBookings, reasons]);

  const total = cancelledBookings.length;
  const maxCount = Math.max(1, ...Object.values(counts));

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-500">
            Based on the {bookings.length} most recently loaded bookings ({total} of them cancelled) — not
            every cancellation ever made. "Not recorded" covers cancellations made before reason-collection
            existed, or ones where no reason was saved. This list is only fetched when the page loads —
            use Refresh below if you just cancelled something and don't see it reflected yet.
          </p>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || status === 'loading'}>
            {refreshing || status === 'loading' ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold mb-4">Cancellation Reasons</h3>
        {status === 'loading' ? (
          <p className="text-sm text-gray-500 py-8 text-center">Loading reasons for {total} cancelled booking{total === 1 ? '' : 's'}…</p>
        ) : total === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No cancelled bookings in this data set.</p>
        ) : (
          <>
            <div className="space-y-3">
              {Object.entries(counts).map(([reason, count]) => (
                <div key={reason}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{reason}</span>
                    <span className="text-gray-500">{count} ({total ? Math.round((count / total) * 100) : 0}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: reason === 'Not recorded' ? '#D1D5DB' : '#FFC107' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Raw per-booking list — so a mismatch (e.g. a real reason that
                doesn't match one of the fixed categories) is immediately
                visible, rather than silently disappearing into a bucket. */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Individual Cancelled Bookings</p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {cancelledBookings.map((b) => (
                  <div key={b.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700 font-medium">{b.bookingNumber}</span>
                    <span className={reasons[b.id] ? 'text-gray-600' : 'text-gray-400 italic'}>
                      {reasons[b.id] || 'no reason on record'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// NEW: real list of abandoned checkouts, fed by the customer website's
// checkout page (see its beforeunload/pagehide tracking) via the existing
// Contact/Support system — GET /admin/contacts?search=Abandoned Booking
// genuinely matches these server-side (confirmed against contact.service.js:
// search matches name/email/topic/mobile). Not a live feed on this tab —
// just a real, paginated, on-demand list.
function AbandonedBookingsTab() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data, status, error, refetch } = useApi(
    () => contactService.list({ search: 'Abandoned Booking', page, limit, sortBy: 'createdAt', order: 'desc' }),
    [page]
  );
  const items = data?.items ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold">Abandoned Bookings</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Customers who reached checkout with their details filled in, but left before confirming.
            {total > 0 && ` ${total} total.`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      {status === 'loading' ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState message={error?.message || 'Could not load abandoned bookings'} onRetry={refetch} />
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No abandoned bookings recorded.</p>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((c) => {
              const lines = (c.message || '').split('\n');
              return (
                <div key={c.id} className="p-3 rounded-lg" style={{ backgroundColor: '#FAFAFA', border: '1px solid #F0F0F0' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{c.name} · {c.mobile}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                    {lines.slice(1).map((line, i) => <p key={i}>{line}</p>)}
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid #F0F0F0' }}>
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GstTab({ range }) {
  const gst = useApi(() => reportsService.gstSummary(range), [JSON.stringify(range)]);
  if (gst.status === 'loading') return <LoadingState label="Loading GST data…" />;
  if (gst.status === 'error')   return <ErrorState message={gst.error?.message} onRetry={gst.refetch} />;
  const g = gst.data || {};

  return (
    <div className="space-y-5">
      <Alert type="info">
        GST report covers ISSUED and PAID invoices only. Draft and cancelled invoices are excluded as per GST filing rules.
      </Alert>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile icon={TrendingUp} label="Taxable Value"   value={formatCurrency(n(g.taxable?.taxableValue ?? 0))} tone="blue" />
        <KpiTile icon={TrendingUp} label="CGST Collected"  value={formatCurrency(n(g.taxable?.cgst ?? 0))}         tone="green" />
        <KpiTile icon={TrendingUp} label="SGST Collected"  value={formatCurrency(n(g.taxable?.sgst ?? 0))}         tone="amber" />
        <KpiTile icon={TrendingUp} label="IGST Collected"  value={formatCurrency(n(g.taxable?.igst ?? 0))}         tone="purple" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiTile icon={TrendingUp} label="Total Tax Invoices" value={g.taxable?.invoiceCount ?? 0} tone="blue" />
        <KpiTile icon={TrendingUp} label="Exempt Invoices"    value={g.exempt?.invoiceCount ?? 0}  tone="amber" />
        <KpiTile icon={TrendingUp} label="Exempt Value"       value={formatCurrency(n(g.exempt?.totalAmount ?? 0))} tone="green" />
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Reports() {
  const [rangeKey,   setRangeKey]   = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [activeTab,  setActiveTab]  = useState('overview');
  const [exporting,  setExporting]  = useState(false);
  const toast = useToast();

  const range     = useMemo(() => rangeFor(rangeKey, customFrom, customTo), [rangeKey, customFrom, customTo]);
  const rangeLabel = RANGE_PRESETS.find((p) => p.value === rangeKey)?.label || 'Custom';

  const executive  = useApi(() => reportsService.executive(range), [JSON.stringify(range)]);
  const fleetApi   = useApi(() => reportsService.fleet(range), [JSON.stringify(range)]);
  const driverPerf = useApi(() => reportsService.driverPerformance(range), [JSON.stringify(range)]);
  const trend      = useApi(() => reportsService.businessTrend(range), [JSON.stringify(range)]);
  const bookingsApi = useApi(() => bookingService.list({ limit: 100 }), []);
  const paymentsApi = useApi(() => adminPaymentsService.list({ limit: 100 }), [JSON.stringify(range)]);

  const bookings = bookingsApi.data?.data ?? bookingsApi.data?.items ?? [];
  const payments = paymentsApi.data?.data ?? paymentsApi.data?.items ?? [];

  const handleExport = async () => {
    setExporting(true);
    toast.info('Preparing CSV export…');
    try {
      await reportsService.exportReport(activeTab === 'gst' ? 'gst' : activeTab, range);
      toast.success('Export ready — check your downloads.');
    } catch (e) {
      toast.error(e.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const loading = executive.status === 'loading' || fleetApi.status === 'loading';
  if (loading) return <LoadingState label="Loading reports…" />;
  if (executive.status === 'error') return <ErrorState message={executive.error?.message} onRetry={executive.refetch} />;

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Fleet performance, revenue analysis and operational insights."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date range preset */}
            <Select value={rangeKey} onChange={(e) => setRangeKey(e.target.value)}
              options={RANGE_PRESETS} />

            {/* Custom date range */}
            {rangeKey === 'custom' && (
              <>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  style={{ fontSize: 13, padding: '5px 8px' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>to</span>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  style={{ fontSize: 13, padding: '5px 8px' }} />
              </>
            )}

            <Button variant="secondary" icon={Download} loading={exporting} onClick={handleExport}>
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b overflow-x-auto" style={{ borderColor: '#E5E7EB' }}>
        {REPORT_TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px focus-ring whitespace-nowrap"
            style={{ borderColor: activeTab === t.key ? '#3B65DB' : 'transparent', color: activeTab === t.key ? '#3B65DB' : '#6B7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview'  && <OverviewTab  executive={executive} fleet={fleetApi} trend={trend} bookings={bookings} rangeLabel={rangeLabel} />}
      {activeTab === 'financial' && <FinancialTab executive={executive} bookings={bookings} payments={payments} />}
      {activeTab === 'fleet'     && <FleetTab     fleetApi={fleetApi} bookings={bookings} />}
      {activeTab === 'drivers'   && <DriversTab   driverPerf={driverPerf} />}
      {activeTab === 'customers' && <CustomersTab bookings={bookings} />}
      {activeTab === 'locations' && <LocationsTab bookings={bookings} />}
      {activeTab === 'cancellations' && <CancellationsTab bookings={bookings} onRefresh={bookingsApi.refetch} refreshing={bookingsApi.status === 'loading'} />}
      {activeTab === 'abandoned' && <AbandonedBookingsTab />}
      {activeTab === 'gst'       && <GstTab       range={range} />}
    </div>
  );
}
