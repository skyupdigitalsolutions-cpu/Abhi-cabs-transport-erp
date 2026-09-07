import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import { useResourceList } from '../../hooks/useResourceList';
import { paymentService } from '../../services';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function CustomerPayments() {
  const list = useResourceList(paymentService, { sortBy: 'createdAt', limit: 8 });

  const columns = [
    { key: 'bookingId', header: 'Booking' },
    { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'method', header: 'Method' },
    { key: 'createdAt', header: 'Date', render: (r) => formatDate(r.createdAt) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Payments" description="Your payment history across all bookings." />
      <DataTable columns={columns} rows={list.rows} status={list.status} error={list.error} onRetry={list.refetch}
        page={list.page} limit={list.meta?.limit} total={list.meta?.total} totalPages={list.meta?.totalPages} onPageChange={list.setPage}
        emptyTitle="No payments yet" />
    </div>
  );
}
