import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import { useResourceList } from '../../hooks/useResourceList';
import { bookingService } from '../../services';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';

/**
 * There is no dedicated /trips or /admin/trips endpoint on this backend
 * (confirmed — traced every mounted route). A "trip" isn't a separate
 * entity here though: it's simply a booking that's progressed past
 * PENDING/CONFIRMED into ALLOCATED or later, once a real vehicle and driver
 * are actually assigned. So this page reuses the same real bookingService
 * (-> GET /bookings) as the Bookings page, just scoped to trip-relevant
 * statuses instead of showing every booking regardless of stage.
 *
 * Fields confirmed against the real Booking record shape (same as
 * Bookings.jsx / BookingDetail.jsx): customer.user.name (not clientName),
 * pickupAddress/dropAddress (not pickup/drop), finalFare/estimatedFare (not
 * fare, and both are strings — wrapped in Number() before any arithmetic),
 * pickupAt (not scheduledAt).
 */
const TRIP_STATUSES = ['ALLOCATED', 'EN_ROUTE', 'ONGOING', 'ARRIVED', 'COMPLETED'];

export default function Trips() {
  const [statusFilter, setStatusFilter] = useState('');
  const list = useResourceList(bookingService, {
    filterDefaults: { status: '' },
    sortBy: 'pickupAt',
    sortDir: 'desc',
    limit: 10,
  });

  // Client-side narrowing to trip-relevant statuses only, on top of
  // whatever the real /bookings endpoint already returned — the backend's
  // list filter accepts a single status value, not a set, so "all trip
  // stages, not just one" is applied here rather than as a server param.
  const tripRows = (list.rows || []).filter((b) => TRIP_STATUSES.includes(b.status));

  const columns = [
    { key: 'bookingNumber', header: 'Booking #', render: (r) => <span className="font-mono text-xs" style={{ color: '#6B7280' }}>{r.bookingNumber}</span> },
    {
      key: 'customer', header: 'Customer',
      render: (r) => <span style={{ color: '#1F2937' }}>{r.customer?.user?.name || r.corporate?.companyName || '—'}</span>,
    },
    {
      key: 'route', header: 'Route',
      render: (r) => <span style={{ color: '#6B7280' }}>{r.pickupAddress} → {r.dropAddress}</span>,
    },
    { key: 'vehicleClass', header: 'Vehicle', render: (r) => titleCase(r.vehicleClass) },
    {
      key: 'fare', header: 'Fare',
      render: (r) => formatCurrency(Number(r.finalFare ?? r.estimatedFare) || 0),
    },
    { key: 'pickupAt', header: 'Pickup Time', render: (r) => formatDateTime(r.pickupAt) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Trips" description="All active and historical trip records — bookings that have an assigned vehicle." />

      <FilterBar
        search={list.search}
        onSearchChange={list.onSearchChange}
        searchPlaceholder="Search customer or route…"
        filters={[{
          name: 'status',
          value: statusFilter,
          onChange: setStatusFilter,
          placeholder: 'All trip statuses',
          options: TRIP_STATUSES.map((s) => ({ value: s, label: titleCase(s) })),
        }]}
      />

      <DataTable
        columns={columns}
        rows={statusFilter ? tripRows.filter((r) => r.status === statusFilter) : tripRows}
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        page={list.page}
        limit={list.meta?.limit}
        total={list.meta?.total}
        totalPages={list.meta?.totalPages}
        onPageChange={list.setPage}
        emptyTitle="No trips yet"
        emptyDescription="Trips appear here once a booking has a vehicle assigned."
      />
    </div>
  );
}