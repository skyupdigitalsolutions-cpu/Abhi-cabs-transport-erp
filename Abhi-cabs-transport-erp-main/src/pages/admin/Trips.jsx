/**
 * src/pages/admin/Trips.jsx
 *
 * FIX: Backend listBookingsQuerySchema uses z.enum() for status — it only
 * accepts a single status value. Sending a comma-joined string like
 * "ALLOCATED,EN_ROUTE,ONGOING" returns 400 VALIDATION_ERROR.
 *
 * Solution: default filter is empty (all statuses returned, sorted by pickupAt).
 * The user can filter to a single status via the dropdown. This is the correct
 * approach until the backend adds array/multi-value support for status.
 *
 * Client-side: filter displayRows to TRIP_STATUSES so PENDING/EXPIRED/CONFIRMED
 * bookings don't appear in the Trips tab (which is for in-progress + completed).
 */
import { useNavigate } from 'react-router-dom';
import PageHeader  from '../../components/ui/PageHeader';
import FilterBar   from '../../components/ui/FilterBar';
import DataTable   from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import { useResourceList } from '../../hooks/useResourceList';
import { bookingService }  from '../../services';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';

const TRIP_STATUSES = ['ALLOCATED', 'EN_ROUTE', 'ONGOING', 'ARRIVED', 'COMPLETED'];
const TRIP_TYPES    = ['ONE_WAY', 'ROUND_TRIP', 'AIRPORT', 'HOURLY'];
const SORT_OPTIONS  = ['createdAt', 'pickupAt', 'estimatedFare'];

function addr(val) {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.address || val.formattedAddress || '—';
}

export default function Trips() {
  const navigate = useNavigate();

  const list = useResourceList(bookingService, {
    // No default status — backend only accepts a single enum value.
    // We client-filter to TRIP_STATUSES below so non-trip bookings don't show.
    filterDefaults: { status: '', tripType: '', from: '', to: '' },
    sortBy:  'pickupAt',
    sortDir: 'desc',
    limit:   20,
  });

  // Client-filter: only show trip-relevant statuses in the Trips tab.
  // When the user picks a specific status from the dropdown, show that only.
  const displayRows = (list.rows || []).filter((b) =>
    list.filters.status
      ? b.status === list.filters.status
      : TRIP_STATUSES.includes(b.status)
  );

  const columns = [
    {
      key: 'bookingNumber', header: 'Booking #',
      render: (r) => <span className="font-mono text-xs" style={{ color: '#6B7280' }}>{r.bookingNumber || '—'}</span>,
    },
    {
      key: 'customer', header: 'Customer',
      render: (r) => (
        <div>
          <p style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>
            {r.customer?.user?.name || r.corporate?.companyName || '—'}
          </p>
          <p style={{ fontSize: 12.5, color: '#9CA3AF' }}>{r.customer?.user?.phone || ''}</p>
        </div>
      ),
    },
    {
      key: 'route', header: 'Route',
      render: (r) => (
        <span style={{ color: '#6B7280', fontSize: 13.5 }}>
          {addr(r.pickupAddress)} → {addr(r.dropAddress)}
        </span>
      ),
    },
    {
      key: 'tripType', header: 'Type',
      render: (r) => <span style={{ fontSize: 13.5 }}>{r.tripType?.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'vehicleClass', header: 'Class',
      render: (r) => <span style={{ fontSize: 13.5, color: '#6B7280' }}>{titleCase(r.vehicleClass || '—')}</span>,
    },
    {
      key: 'fare', header: 'Fare', sortable: true,
      render: (r) => formatCurrency(Number(r.finalFare ?? r.estimatedFare) || 0),
    },
    {
      key: 'pickupAt', header: 'Pickup', sortable: true,
      render: (r) => formatDateTime(r.pickupAt),
    },
    {
      key: 'status', header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Trips"
        description="Active and completed trips."
      />

      <FilterBar
        search={list.search}
        onSearchChange={list.onSearchChange}
        searchPlaceholder="Search customer or booking #…"
        filters={[
          {
            name: 'status',
            value: list.filters.status,
            onChange: (v) => list.setFilter('status', v),
            placeholder: 'All trip statuses',
            // Backend accepts single enum value only — no comma-joined options
            options: TRIP_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
          },
          {
            name: 'tripType',
            value: list.filters.tripType,
            onChange: (v) => list.setFilter('tripType', v),
            placeholder: 'All trip types',
            options: TRIP_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') })),
          },
          {
            name: 'sortBy',
            value: list.sortBy,
            onChange: (v) => list.onSort(v, list.sortDir),
            placeholder: 'Sort by',
            options: SORT_OPTIONS.map((s) => ({ value: s, label: titleCase(s.replace(/([A-Z])/g, ' $1')) })),
          },
        ]}
        extra={
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold" style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>From</label>
            <input
              type="date"
              value={list.filters.from ? list.filters.from.slice(0, 10) : ''}
              onChange={(e) => list.setFilter('from', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="text-xs border rounded-lg px-2 py-1.5"
              style={{ borderColor: '#E5E7EB', color: '#1F2937' }}
            />
            <label className="text-xs font-semibold" style={{ color: '#6B7280' }}>To</label>
            <input
              type="date"
              value={list.filters.to ? list.filters.to.slice(0, 10) : ''}
              onChange={(e) => list.setFilter('to', e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : '')}
              className="text-xs border rounded-lg px-2 py-1.5"
              style={{ borderColor: '#E5E7EB', color: '#1F2937' }}
            />
          </div>
        }
      />

      <DataTable
        columns={columns}
        rows={displayRows}
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        sortBy={list.sortBy}
        sortDir={list.sortDir}
        onSort={list.onSort}
        page={list.page}
        limit={list.meta?.limit}
        total={list.meta?.total}
        totalPages={list.meta?.totalPages}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        onRowClick={(r) => navigate(`/admin/bookings/${r.id}`)}
        emptyTitle="No trips found"
        emptyDescription="Try adjusting your filters or date range."
      />
    </div>
  );
}