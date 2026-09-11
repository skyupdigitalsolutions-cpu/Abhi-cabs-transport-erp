import { useState } from 'react';
import { Banknote, CreditCard, Landmark, Wallet, Smartphone } from 'lucide-react';
import PageHeader  from '../../components/ui/PageHeader';
import FilterBar   from '../../components/ui/FilterBar';
import DataTable   from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import { useResourceList } from '../../hooks/useResourceList';
import { adminPaymentsService } from '../../services';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';

/**
 * Real /admin/payments — read-only. No create/update.
 * Payments are created by the gateway (Razorpay) and updated via webhooks.
 *
 * Real field shape: id, bookingId, provider, amount, currency, method
 * (UPI/CARD/NETBANKING/WALLET/CASH), status (CREATED/AUTHORISED/CAPTURED/
 * PARTIALLY_PAID/FAILED/REFUNDED), purpose (ADVANCE/BALANCE/FULL),
 * failureReason, paidAt, createdAt,
 * booking: { bookingNumber, status, customer: { user: { name, phone } } }
 */
const METHOD_ICON = {
  UPI:        Smartphone,
  CARD:       CreditCard,
  NETBANKING: Landmark,
  WALLET:     Wallet,
  CASH:       Banknote,
};
const PAYMENT_STATUSES = ['CREATED', 'AUTHORISED', 'CAPTURED', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED'];
const PAYMENT_METHODS  = ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'CASH'];

// adminPaymentsService.list() returns the raw paginated response.
// Wrap it so useResourceList gets the { data: [...], meta: {} } shape it expects.
const paymentsListService = {
  async list(params) {
    const result = await adminPaymentsService.list(params);
    // apiClient already unwraps { success, data: { items, pagination } }
    // → { data: [...], meta: { ... } } via the unwrap() in apiClient.js
    return result;
  },
};

export default function Payments() {
  const list = useResourceList(paymentsListService, {
    filterDefaults: { status: '', method: '' },
    sortBy: 'createdAt',
    limit: 10,
  });

  const columns = [
    {
      key: 'booking', header: 'Booking',
      render: (r) => (
        <div>
          <p className="font-mono text-xs" style={{ color: '#6B7280' }}>{r.booking?.bookingNumber || r.bookingId}</p>
          <p style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>{r.booking?.customer?.user?.name || '—'}</p>
          <p style={{ fontSize: 11, color: '#9CA3AF' }}>{r.booking?.customer?.user?.phone || ''}</p>
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
        ? <span style={{ color: '#EF4444', fontSize: 12 }}>{r.failureReason}</span>
        : <span style={{ color: '#9CA3AF' }}>—</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="All payment records across bookings. Read-only — updated automatically by the payment gateway."
      />
      <FilterBar
        search={list.search}
        onSearchChange={list.onSearchChange}
        searchPlaceholder="Search booking # or customer…"
        filters={[
          {
            name: 'status', value: list.filters.status,
            onChange: (v) => list.setFilter('status', v),
            placeholder: 'All statuses',
            options: PAYMENT_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
          },
          {
            name: 'method', value: list.filters.method,
            onChange: (v) => list.setFilter('method', v),
            placeholder: 'All methods',
            options: PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
          },
        ]}
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
        emptyTitle="No payments yet"
        emptyDescription="Payments appear here once customers complete checkout."
      />
    </div>
  );
}
