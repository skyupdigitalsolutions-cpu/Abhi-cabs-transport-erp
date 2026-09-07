import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import { useResourceList } from '../../hooks/useResourceList';
import { bookingService } from '../../services';
import { BOOKING_STATUS } from '../../constants';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function MyBookings() {
  const list = useResourceList(bookingService, { filterDefaults: { status: '' }, sortBy: 'createdAt', limit: 8 });
  const navigate = useNavigate();

  const columns = [
    { key: 'route', header: 'Route', render: (r) => <span className="text-slate-700 font-medium">{r.pickup} → {r.drop}</span> },
    { key: 'cargoType', header: 'Cargo' },
    { key: 'fare', header: 'Fare', render: (r) => formatCurrency(r.fare) },
    { key: 'scheduledAt', header: 'Date', sortable: true, render: (r) => formatDate(r.scheduledAt) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="My bookings" description="Track and manage all your shipments in one place." />
      <FilterBar search={list.search} onSearchChange={list.onSearchChange} searchPlaceholder="Search by route…"
        filters={[{ name: 'status', value: list.filters.status, onChange: (v) => list.setFilter('status', v), placeholder: 'All statuses', options: Object.values(BOOKING_STATUS).map((s) => ({ value: s, label: s.replace('_', ' ') })) }]} />
      <DataTable columns={columns} rows={list.rows} status={list.status} error={list.error} onRetry={list.refetch}
        page={list.page} limit={list.meta?.limit} total={list.meta?.total} totalPages={list.meta?.totalPages} onPageChange={list.setPage}
        onRowClick={(r) => navigate(`/app/bookings/${r.id}`)}
        emptyTitle="No bookings yet" emptyDescription="Book your first trip to see it here." />
    </div>
  );
}
