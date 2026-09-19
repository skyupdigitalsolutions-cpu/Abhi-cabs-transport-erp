import { Banknote, CreditCard, Landmark, Wallet, Smartphone } from 'lucide-react';
import PageHeader  from '../../components/ui/PageHeader';
import FilterBar   from '../../components/ui/FilterBar';
import DataTable   from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import { useResourceList }    from '../../hooks/useResourceList';
import { adminPaymentsService } from '../../services';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';

// Backend listPaymentsQuerySchema accepts:
//   status, method, from, to, bookingId, sortBy, order, page, limit
// ALL SERVER-SIDE — no client-side filtering needed.

const PAYMENT_STATUSES = ['CREATED','AUTHORISED','CAPTURED','PARTIALLY_PAID','FAILED','REFUNDED'];
const PAYMENT_METHODS  = ['UPI','CARD','NETBANKING','WALLET','CASH'];
const SORT_OPTIONS     = ['createdAt','paidAt','amount'];

const METHOD_ICON = {
  UPI: Smartphone, CARD: CreditCard, NETBANKING: Landmark, WALLET: Wallet, CASH: Banknote,
};

export default function Payments() {
  const list = useResourceList(adminPaymentsService, {
    filterDefaults: { status: '', method: '', from: '', to: '' },
    sortBy: 'createdAt',
    sortDir: 'desc',
    limit: 10,
  });

  const columns = [
    {
      key: 'booking', header: 'Booking',
      render: (r) => (
        <div>
          <p className="font-mono text-xs" style={{ color: '#6B7280' }}>{r.booking?.bookingNumber || r.bookingId}</p>
          <p style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>{r.booking?.customer?.user?.name || '—'}</p>
          <p style={{ fontSize: 12.5, color: '#9CA3AF' }}>{r.booking?.customer?.user?.phone || ''}</p>
        </div>
      ),
    },
    {
      key: 'amount', header: 'Amount', sortable: true,
      render: (r) => <span style={{ fontWeight: 700, color: '#1F2937' }}>{formatCurrency(r.amount)}</span>,
    },
    {
      key: 'method', header: 'Method',
      render: (r) => {
        const Icon = METHOD_ICON[r.method] || CreditCard;
        return (
          <span className="flex items-center gap-1.5" style={{ fontSize: 13 }}>
            <Icon size={13} style={{ color: '#6B7280' }} />{titleCase(r.method || '—')}
          </span>
        );
      },
    },
    {
      key: 'purpose', header: 'Purpose',
      render: (r) => <span style={{ color: '#6B7280', fontSize: 13 }}>{titleCase(r.purpose || '—')}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'paidAt', header: 'Paid At', sortable: true,
      render: (r) => r.paidAt ? formatDateTime(r.paidAt) : <span style={{ color: '#9CA3AF' }}>—</span>,
    },
    {
      key: 'failureReason', header: 'Notes',
      render: (r) => r.failureReason
        ? <span style={{ color: '#EF4444', fontSize: 13.5 }}>{r.failureReason}</span>
        : <span style={{ color: '#9CA3AF' }}>—</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="All payment records. All filters applied server-side."
      />

      <FilterBar
        searchPlaceholder="Search not supported on this endpoint"
        filters={[
          {
            name: 'status',
            value: list.filters.status,
            onChange: (v) => list.setFilter('status', v),
            placeholder: 'All statuses',
            options: PAYMENT_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
          },
          {
            name: 'method',
            value: list.filters.method,
            onChange: (v) => list.setFilter('method', v),
            placeholder: 'All methods',
            options: PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
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
            <input type="date" value={list.filters.from || ''}
              onChange={(e) => list.setFilter('from', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="text-xs border rounded-lg px-2 py-1.5"
              style={{ borderColor: '#E5E7EB', color: '#1F2937' }} />
            <label className="text-xs font-semibold" style={{ color: '#6B7280' }}>To</label>
            <input type="date" value={list.filters.to || ''}
              onChange={(e) => list.setFilter('to', e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : '')}
              className="text-xs border rounded-lg px-2 py-1.5"
              style={{ borderColor: '#E5E7EB', color: '#1F2937' }} />
          </div>
        }
      />

      <DataTable
        columns={columns}
        rows={list.rows}
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
        emptyTitle="No payments found"
        emptyDescription="Try adjusting your filters or date range."
      />
    </div>
  );
}
