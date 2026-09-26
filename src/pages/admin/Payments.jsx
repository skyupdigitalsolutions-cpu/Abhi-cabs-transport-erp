import { useState } from 'react';
import { Banknote, CreditCard, Landmark, Wallet, Smartphone, Search, RotateCcw } from 'lucide-react';
import PageHeader  from '../../components/ui/PageHeader';
import FilterBar   from '../../components/ui/FilterBar';
import DataTable   from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Badge        from '../../components/ui/Badge';
import Button        from '../../components/ui/Button';
import Input          from '../../components/ui/Input';
import Select        from '../../components/ui/Select';
import FormField    from '../../components/ui/FormField';
import Textarea      from '../../components/ui/Textarea';
import Alert          from '../../components/ui/Alert';
import Modal          from '../../components/ui/Modal';
import { useResourceList }    from '../../hooks/useResourceList';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { adminPaymentsService } from '../../services';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';
import { PERMISSIONS } from '../../constants';

// Backend listPaymentsQuerySchema accepts:
//   status, method, purpose, from, to, bookingId, sortBy, order, page, limit
// ALL SERVER-SIDE — no client-side filtering needed.

const PAYMENT_STATUSES = ['CREATED','AUTHORISED','CAPTURED','PARTIALLY_PAID','FAILED','REFUNDED'];
const PAYMENT_METHODS  = ['UPI','CARD','NETBANKING','WALLET','CASH'];
const SORT_OPTIONS     = ['createdAt','paidAt','amount'];

const METHOD_ICON = {
  UPI: Smartphone, CARD: CreditCard, NETBANKING: Landmark, WALLET: Wallet, CASH: Banknote,
};

// ─────────────────────────────────────────────────────────────────────────────
// Payments tab — the original page, unchanged
// ─────────────────────────────────────────────────────────────────────────────
function PaymentsTab() {
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
    <>
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
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' }}>From</label>
            <Input type="date" value={list.filters.from || ''}
              onChange={(e) => list.setFilter('from', e.target.value ? new Date(e.target.value).toISOString() : '')}
              style={{ fontSize: 12, padding: '5px 8px' }} />
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>To</label>
            <Input type="date" value={list.filters.to || ''}
              onChange={(e) => list.setFilter('to', e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : '')}
              style={{ fontSize: 12, padding: '5px 8px' }} />
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
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cash Handovers tab — reconciling cash a driver collected on the road
// against cash that's actually reached the office. Every CASH payment a
// driver collects (payment.service.js collectCash) gets a PENDING row here;
// an admin with PAYMENT_RECONCILE confirms it once the money is physically in.
// ─────────────────────────────────────────────────────────────────────────────

// Adapts adminPaymentsService's cash-handover methods to the { list() }
// shape useResourceList expects.
const cashHandoverListAdapter = { list: (params) => adminPaymentsService.cashHandovers(params) };

function CashHandoversTab() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canConfirm = hasPermission(PERMISSIONS.CASH_HANDOVER_CONFIRM);

  const summary = useApi(() => adminPaymentsService.cashHandoverSummary(), []);
  const list = useResourceList(cashHandoverListAdapter, {
    filterDefaults: { status: 'PENDING', driverId: '' },
    sortBy: undefined,
    limit: 10,
  });

  const [confirming, setConfirming] = useState(null); // the row being confirmed
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const openConfirm = (row) => { setConfirming(row); setNote(''); };
  const closeConfirm = () => { setConfirming(null); setNote(''); };

  const doConfirm = async () => {
    setSaving(true);
    try {
      await adminPaymentsService.confirmCashHandover(confirming.id, note.trim() || undefined);
      toast.success('Cash handover confirmed');
      closeConfirm();
      list.refetch();
      summary.refetch();
    } catch (e) {
      toast.error(e.message || 'Could not confirm handover');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'driver', header: 'Driver',
      render: (r) => (
        <div>
          <p style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>{r.driver?.user?.name || '—'}</p>
          <p style={{ fontSize: 12.5, color: '#9CA3AF' }}>{r.driver?.user?.phone || ''}</p>
        </div>
      ),
    },
    {
      key: 'trip', header: 'Trip',
      render: (r) => <span className="font-mono text-xs" style={{ color: '#6B7280' }}>{r.payment?.booking?.bookingNumber || '—'}</span>,
    },
    {
      key: 'amount', header: 'Amount',
      render: (r) => <span style={{ fontWeight: 700, color: '#1F2937' }}>{formatCurrency(r.amount)}</span>,
    },
    {
      key: 'collectedAt', header: 'Collected',
      render: (r) => formatDateTime(r.payment?.paidAt || r.createdAt),
    },
    {
      key: 'status', header: 'Status',
      render: (r) => (
        <Badge tone={r.status === 'CONFIRMED' ? 'green' : 'amber'}>{r.status}</Badge>
      ),
    },
    {
      key: 'confirmedBy', header: 'Confirmed by',
      render: (r) => r.confirmedBy
        ? <span style={{ fontSize: 12.5, color: '#6B7280' }}>{r.confirmedBy.name}<br/>{formatDateTime(r.confirmedAt)}</span>
        : <span style={{ color: '#9CA3AF' }}>—</span>,
    },
    {
      key: 'actions', header: '',
      render: (r) => r.status === 'PENDING' && canConfirm ? (
        <Button size="sm" onClick={() => openConfirm(r)}>Confirm receipt</Button>
      ) : null,
    },
  ];

  return (
    <>
      <Alert type="info" className="mb-4">
        Every cash payment a driver collects on the road shows here as <strong>Pending</strong> until
        someone at the office confirms the physical cash has actually been handed in. Confirming does
        not move any money or change what the customer owes — that was already settled — it only
        records who received the cash and when.
        <br />
        <span style={{ fontSize: 12.5, opacity: 0.85 }}>
          Note: confirmations are saved in <strong>this browser only</strong> — other admins or another
          computer won't see them as confirmed.
        </span>
      </Alert>

      {/* Per-driver cash-in-hand summary */}
      {summary.status === 'success' && summary.data && (
        summary.data.drivers.length === 0 ? (
          <div className="rounded-xl border px-4 py-3 mb-4" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <p className="text-sm font-semibold" style={{ color: '#15803d' }}>No cash currently outstanding with any driver.</p>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6B7280' }}>
              Cash in hand — {formatCurrency(summary.data.totalPending)} total pending
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.data.drivers.map((d) => (
                <div key={d.driverId} className="rounded-xl border px-4 py-3" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                  <p className="text-sm font-bold" style={{ color: '#92400e' }}>{d.driverName}</p>
                  <p className="text-xs" style={{ color: '#92400e', opacity: 0.8 }}>{d.driverPhone || ''}</p>
                  <p className="text-xl font-black mt-1" style={{ color: '#92400e' }}>{formatCurrency(d.pendingAmount)}</p>
                  <p className="text-xs" style={{ color: '#92400e', opacity: 0.8 }}>{d.pendingCount} trip{d.pendingCount === 1 ? '' : 's'} awaiting handover</p>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      <FilterBar
        searchPlaceholder=""
        filters={[
          {
            name: 'status',
            value: list.filters.status,
            onChange: (v) => list.setFilter('status', v),
            placeholder: 'All statuses',
            options: [{ value: 'PENDING', label: 'Pending' }, { value: 'CONFIRMED', label: 'Confirmed' }],
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={list.rows}
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        page={list.page}
        limit={list.meta?.limit}
        total={list.meta?.total}
        totalPages={list.meta?.totalPages}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        emptyTitle="No cash handovers found"
        emptyDescription="Cash collected by drivers on completed trips will appear here."
      />

      <Modal open={!!confirming} onClose={closeConfirm} title="Confirm cash handover" size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeConfirm} disabled={saving}>Cancel</Button>
            <Button size="sm" loading={saving} onClick={doConfirm}>Confirm receipt</Button>
          </>
        }>
        {confirming && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Confirming that <strong>{formatCurrency(confirming.amount)}</strong> collected by{' '}
              <strong>{confirming.driver?.user?.name}</strong> for trip{' '}
              <span className="font-mono">{confirming.payment?.booking?.bookingNumber}</span> has been
              physically received.
            </p>
            <FormField label="Note (optional)">
              <Textarea
                value={note} onChange={(e) => setNote(e.target.value)}
                rows={3} maxLength={300}
                placeholder="e.g. Handed to accounts on Tuesday collection round"
              />
            </FormField>
          </div>
        )}
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Refunds tab — record a refund against a booking, and see refund history.
// Not a gateway integration: this is the auditable record of a refund that
// was actually issued (bank transfer, UPI, cash handback), validated against
// what the booking can actually still refund.
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_REFUND_FORM = { bookingNumber: '', amount: '', method: 'UPI', reason: '', reference: '', notes: '' };

function RefundsTab() {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_REFUND_FORM);
  const [errors, setErrors] = useState({});
  const [lookingUp, setLookingUp] = useState(false);
  const [booking, setBooking] = useState(null);       // { id, bookingNumber, status, customerName, customerPhone }
  const [balance, setBalance] = useState(null);        // { totalCaptured, alreadyRefunded, refundable }
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const history = useResourceList(
    { list: (params) => adminPaymentsService.listRefunds(params) },
    { sortBy: 'createdAt', sortDir: 'desc', limit: 10 },
  );

  const lookupBooking = async () => {
    const num = form.bookingNumber.trim();
    if (!num) { setErrors((e) => ({ ...e, bookingNumber: 'Enter a booking number.' })); return; }
    setErrors((e) => ({ ...e, bookingNumber: undefined }));
    setLookingUp(true);
    setBooking(null);
    setBalance(null);
    try {
      const b = await adminPaymentsService.findBookingByNumber(num);
      const bal = await adminPaymentsService.refundableBalance(b);
      setBooking(bal.booking);
      setBalance(bal);
    } catch (e) {
      toast.error(e.message || 'Booking not found');
    } finally {
      setLookingUp(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_REFUND_FORM);
    setBooking(null);
    setBalance(null);
    setErrors({});
  };

  const submit = async () => {
    const nextErrors = {};
    if (!booking) nextErrors.bookingNumber = 'Look up a booking first.';
    const amountNum = Number(form.amount);
    if (form.amount === '' || !Number.isFinite(amountNum) || amountNum <= 0) {
      nextErrors.amount = 'Enter a refund amount greater than zero.';
    } else if (balance && amountNum > Number(balance.refundable)) {
      nextErrors.amount = `Only ${formatCurrency(balance.refundable)} is refundable on this booking.`;
    }
    if (form.reason.trim().length < 5) nextErrors.reason = 'Give a reason (at least 5 characters) — this is what a finance audit will read later.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const refund = await adminPaymentsService.createRefund({
        bookingId: booking.id,
        amount: amountNum,
        method: form.method,
        reason: form.reason.trim(),
        reference: form.reference.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success(`₹${refund.amount} refund recorded for ${refund.bookingNumber}`);
      resetForm();
      history.refetch();
    } catch (e) {
      toast.error(e.message || 'Could not record refund');
    } finally {
      setSubmitting(false);
    }
  };

  const historyColumns = [
    {
      key: 'booking', header: 'Booking',
      render: (r) => (
        <div>
          <p className="font-mono text-xs" style={{ color: '#6B7280' }}>{r.booking?.bookingNumber || r.bookingId}</p>
          <p style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>{r.booking?.customer?.user?.name || '—'}</p>
        </div>
      ),
    },
    {
      key: 'amount', header: 'Amount',
      render: (r) => <span style={{ fontWeight: 700, color: '#DC2626' }}>-{formatCurrency(r.amount)}</span>,
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
      key: 'reason', header: 'Reason',
      render: (r) => <span style={{ fontSize: 13, color: '#6B7280' }}>{r.refundReason || '—'}</span>,
    },
    {
      key: 'paidAt', header: 'Issued', sortable: true,
      render: (r) => formatDateTime(r.paidAt || r.createdAt),
    },
  ];

  return (
    <>
      <div className="rounded-2xl border p-5 mb-6" style={{ borderColor: '#E5E7EB', backgroundColor: '#fff' }}>
        <p className="text-sm font-bold mb-3" style={{ color: '#1F2937' }}>Issue a refund</p>

        <Alert type="info" className="mb-4">
          Look up a booking to see how much is still refundable. Recording a refund
          is view-only for now — the backend route for saving refunds
          (POST /admin/payments/refunds) hasn&apos;t been built yet, so this screen
          won&apos;t create a finance record until it is.
        </Alert>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
          <div className="sm:col-span-2">
            <FormField label="Booking number" required error={errors.bookingNumber}
              hint="e.g. ABH-2026-000123 — as given to the customer.">
              <Input
                value={form.bookingNumber}
                onChange={(e) => { set('bookingNumber', e.target.value); setErrors((er) => ({ ...er, bookingNumber: undefined })); }}
                placeholder="ABH-2026-000123"
              />
            </FormField>
          </div>
          <div className="flex items-end">
            <Button variant="secondary" icon={Search} loading={lookingUp} onClick={lookupBooking} style={{ marginBottom: 4 }}>
              Look up
            </Button>
          </div>
        </div>

        {booking && balance && (
          <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#eef2fb' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{booking.bookingNumber} — {booking.customerName || 'Customer'}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>{booking.customerPhone} · Status: {titleCase(booking.status)}</p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-[11px] uppercase font-bold" style={{ color: '#6B7280' }}>Collected</p>
                  <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{formatCurrency(balance.totalCaptured)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase font-bold" style={{ color: '#6B7280' }}>Already refunded</p>
                  <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{formatCurrency(balance.alreadyRefunded)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase font-bold" style={{ color: '#3B65DB' }}>Refundable</p>
                  <p className="text-sm font-black" style={{ color: '#3B65DB' }}>{formatCurrency(balance.refundable)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          <FormField label="Refund amount (₹)" required error={errors.amount}>
            <Input type="number" min="0" value={form.amount}
              onChange={(e) => { set('amount', e.target.value); setErrors((er) => ({ ...er, amount: undefined })); }}
              placeholder="e.g. 500" disabled={!booking} />
          </FormField>
          <FormField label="Refund method" required hint="How the money actually went back — not how it was collected.">
            <Select value={form.method} onChange={(e) => set('method', e.target.value)}
              options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} disabled={!booking} />
          </FormField>
        </div>

        <FormField label="Reason" required error={errors.reason} className="mb-2"
          hint="What a finance audit will read later — be specific.">
          <Textarea
            value={form.reason} onChange={(e) => { set('reason', e.target.value); setErrors((er) => ({ ...er, reason: undefined })); }}
            rows={2} maxLength={300} disabled={!booking}
            error={errors.reason}
            placeholder="e.g. Customer cancelled after driver no-show; full advance refunded"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <FormField label="Reference (optional)" hint="Bank UTR, UPI ref, or cheque no.">
            <Input value={form.reference} onChange={(e) => set('reference', e.target.value)} disabled={!booking} placeholder="e.g. UTR1234567890" />
          </FormField>
          <FormField label="Internal notes (optional)">
            <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} disabled={!booking} placeholder="Anything else worth recording" />
          </FormField>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={resetForm}>Reset</Button>
          {/* Disabled until POST /admin/payments/refunds exists on the backend.
              Re-enable by restoring: disabled={!booking} */}
          <Button size="sm" loading={submitting} disabled title="Refund recording needs a backend route that isn't built yet" onClick={submit}>Record Refund</Button>
        </div>
      </div>

      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6B7280' }}>Refund history</p>
      <DataTable
        columns={historyColumns}
        rows={history.rows}
        status={history.status}
        error={history.error}
        onRetry={history.refetch}
        page={history.page}
        limit={history.meta?.limit}
        total={history.meta?.total}
        totalPages={history.meta?.totalPages}
        onPageChange={history.setPage}
        onLimitChange={history.setLimit}
        emptyTitle="No refunds recorded yet"
        emptyDescription="Refunds issued from this screen will show up here."
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page — three tabs, same pattern as Reports.jsx
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'payments', label: 'Payments' },
  { key: 'cash-handovers', label: 'Cash Handovers' },
  { key: 'refunds', label: 'Refunds' },
];

export default function Payments() {
  const [activeTab, setActiveTab] = useState('payments');

  return (
    <div>
      <PageHeader
        title="Payments"
        description="All payment records, driver cash-handover reconciliation, and refunds."
      />

      <div className="flex gap-1 mb-5 border-b overflow-x-auto" style={{ borderColor: '#E5E7EB' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px focus-ring whitespace-nowrap"
            style={{ borderColor: activeTab === t.key ? '#3B65DB' : 'transparent', color: activeTab === t.key ? '#3B65DB' : '#6B7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'payments'       && <PaymentsTab />}
      {activeTab === 'cash-handovers' && <CashHandoversTab />}
      {activeTab === 'refunds'        && <RefundsTab />}
    </div>
  );
}
