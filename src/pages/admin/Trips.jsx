import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader  from '../../components/ui/PageHeader';
import FilterBar   from '../../components/ui/FilterBar';
import DataTable   from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import { useResourceList } from '../../hooks/useResourceList';
import { bookingService }  from '../../services';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';

/**
 * No dedicated /trips endpoint exists. A "trip" is a booking past PENDING/CONFIRMED
 * with a vehicle assigned. We reuse admin/bookings filtered to trip-relevant statuses.
 * Fields confirmed against real backend: pickupAddress/dropAddress are objects.
 */
const TRIP_STATUSES = ['ALLOCATED', 'EN_ROUTE', 'ONGOING', 'ARRIVED', 'COMPLETED'];

function addr(val) {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.address || val.formattedAddress || '—';
}

export default function Trips() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const list = useResourceList(bookingService, {
    filterDefaults: { status: '' },
    sortBy: 'pickupAt',
    sortDir: 'desc',
    limit: 10,
  });

  // Client-side filter to trip-relevant statuses (backend accepts single status, not a set)
  const tripRows = (list.rows || []).filter((b) => TRIP_STATUSES.includes(b.status));
  const displayRows = statusFilter ? tripRows.filter((r) => r.status === statusFilter) : tripRows;

  const columns = [
    {
      key: 'bookingNumber', header: 'Booking #',
      render: (r) => <span className="font-mono text-xs" style={{ color: '#6B7280' }}>{r.bookingNumber || '—'}</span>,
    },
    {
      key: 'customer', header: 'Customer',
      render: (r) => <span style={{ color: '#1F2937' }}>{r.customer?.user?.name || r.corporate?.companyName || '—'}</span>,
    },
    {
      key: 'route', header: 'Route',
      // FIXED: extract .address from pickupAddress/dropAddress objects
      render: (r) => (
        <span style={{ color: '#6B7280', fontSize: 12 }}>
          {addr(r.pickupAddress)} → {addr(r.dropAddress)}
        </span>
      ),
    },
    {
      key: 'vehicleClass', header: 'Vehicle',
      render: (r) => titleCase(r.vehicleClass || '—'),
    },
    {
      key: 'fare', header: 'Fare',
      render: (r) => formatCurrency(Number(r.finalFare ?? r.estimatedFare) || 0),
    },
    {
      key: 'pickupAt', header: 'Pickup Time',
      render: (r) => formatDateTime(r.pickupAt),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Trips"
        description="Active and historical trips — bookings with an assigned vehicle."
      />
      <FilterBar
        search={list.search}
        onSearchChange={list.onSearchChange}
        searchPlaceholder="Search customer or booking #…"
        filters={[{
          name: 'status',
          value: statusFilter,
          onChange: setStatusFilter,
          placeholder: 'All trip statuses',
          options: TRIP_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
        }]}
      />
      <DataTable
        columns={columns}
        rows={displayRows}
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        page={list.page}
        limit={list.meta?.limit}
        total={list.meta?.total}
        totalPages={list.meta?.totalPages}
        onPageChange={list.setPage}
        onRowClick={(r) => navigate(`/admin/bookings/${r.id}`)}
        emptyTitle="No trips yet"
        emptyDescription="Trips appear here once a booking has a vehicle assigned."
      />
    </div>
  );
}
