import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import BookingFormDrawer from '../../components/booking/BookingFormDrawer';
import { useResourceList } from '../../hooks/useResourceList';
import { bookingService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { BOOKING_STATUS, PERMISSIONS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

// Real field names confirmed against BOOKING_SELECT in
// src/models/booking.model.js — customer.user.name (not clientName),
// pickupAddress/dropAddress (not pickup/drop), finalFare/estimatedFare
// (not fare), pickupAt (not scheduledAt).
export default function Bookings() {
  const list = useResourceList(bookingService, { filterDefaults: { status: '' }, sortBy: 'createdAt', limit: 8 });
  const [formOpen, setFormOpen] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.BOOKINGS_MANAGE);

  const columns = [
    { key: 'bookingNumber', header: 'Booking #', render: (r) => <span className="font-mono text-xs" style={{ color: '#6B7280' }}>{r.bookingNumber}</span> },
    {
      key: 'customer', header: 'Client', sortable: false,
      render: (r) => <span style={{ color: '#1F2937' }}>{r.customer?.user?.name || r.corporate?.companyName || '—'}</span>,
    },
    {
      key: 'route', header: 'Route',
      render: (r) => <span style={{ color: '#6B7280' }}>{r.pickupAddress} → {r.dropAddress}</span>,
    },
    {
      key: 'fare', header: 'Fare', sortable: true,
      render: (r) => formatCurrency(r.finalFare ?? r.estimatedFare),
    },
    { key: 'pickupAt', header: 'Pickup Time', sortable: true, render: (r) => formatDateTime(r.pickupAt) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const handleCreate = async (values) => {
    await bookingService.create(values);
    toast.success('Booking created');
    list.reload();
  };

  return (
    <div>
      <PageHeader title="Bookings" description="All booking requests across your fleet operations."
        actions={canManage && <Button icon={Plus} onClick={() => setFormOpen(true)}>New booking</Button>} />
      <FilterBar search={list.search} onSearchChange={list.onSearchChange} searchPlaceholder="Search client or route…"
        filters={[{ name: 'status', value: list.filters.status, onChange: (v) => list.setFilter('status', v), placeholder: 'All statuses', options: Object.values(BOOKING_STATUS).map((s) => ({ value: s, label: s.replace('_', ' ') })) }]} />
      <DataTable columns={columns} rows={list.rows} status={list.status} error={list.error} onRetry={list.refetch}
        sortBy={list.sortBy} sortDir={list.sortDir} onSort={list.onSort}
        page={list.page} limit={list.meta?.limit} total={list.meta?.total} totalPages={list.meta?.totalPages} onPageChange={list.setPage}
        onRowClick={(r) => navigate(`/admin/bookings/${r.id}`)}
        emptyTitle="No bookings yet" emptyDescription="New bookings will appear here once created." />
      <BookingFormDrawer open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleCreate} />
    </div>
  );
}
