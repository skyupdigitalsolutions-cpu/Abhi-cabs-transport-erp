import { useState, useEffect, useCallback } from 'react';
import { FileText, Printer } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useApi } from '../../hooks/useApi';
import { adminInvoicesService } from '../../services/adminInvoicesService';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * There is no GET /admin/invoices (list-all) endpoint on this backend —
 * exhaustively confirmed. This page assembles a real invoice list by
 * fetching completed bookings, then that booking's real invoice — see
 * adminInvoicesService.js for the full explanation. Search/status filtering
 * below is done client-side over the assembled list, since there's no
 * server-side invoice search to call.
 */
const STATUS_TONE = { DRAFT: 'slate', ISSUED: 'blue', PAID: 'green', CANCELLED: 'red' };

function InvoiceDetailModal({ invoice, onClose }) {
  if (!invoice) return null;
  const total = Number(invoice.totalAmount) || 0;

  return (
    <Modal open={!!invoice} onClose={onClose} title={invoice.invoiceNumber} size="md"
      footer={<Button variant="secondary" size="sm" onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span style={{ color: '#6B7280' }}>Type</span>
          <span style={{ fontWeight: 600 }}>{invoice.type === 'TAX' ? 'Tax Invoice' : 'Bill of Supply'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: '#6B7280' }}>Billed to</span>
          <span style={{ fontWeight: 600 }}>{invoice.billToName}</span>
        </div>
        {invoice.billToGstin && (
          <div className="flex justify-between text-sm">
            <span style={{ color: '#6B7280' }}>GSTIN</span>
            <span>{invoice.billToGstin}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span style={{ color: '#6B7280' }}>Booking</span>
          <span className="font-mono">{invoice.booking?.bookingNumber}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: '#6B7280' }}>Issued</span>
          <span>{formatDate(invoice.issuedAt)}</span>
        </div>
        <div className="border-t pt-3" style={{ borderColor: '#F7F8FC' }}>
          {(invoice.lines || []).map((l) => (
            <div key={l.id} className="flex justify-between text-sm py-1">
              <span style={{ color: '#6B7280' }}>{l.description}</span>
              <span>{formatCurrency(Number(l.amount) || 0)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold pt-2 mt-1 border-t" style={{ borderColor: '#F7F8FC' }}>
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Invoices() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchInvoices = useCallback(() => adminInvoicesService.list({ limit: 100 }), []);
  const { data, status, error, refetch } = useApi(fetchInvoices, []);

  const allInvoices = data?.data || [];
  const filtered = allInvoices.filter((inv) => {
    if (statusFilter && inv.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.billToName?.toLowerCase().includes(q) ||
        inv.booking?.bookingNumber?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const columns = [
    { key: 'invoiceNumber', header: 'Invoice #', render: (r) => <span className="font-mono text-xs" style={{ color: '#1F2937' }}>{r.invoiceNumber}</span> },
    { key: 'billToName', header: 'Billed To', render: (r) => r.billToName },
    { key: 'booking', header: 'Booking', render: (r) => <span className="font-mono text-xs" style={{ color: '#6B7280' }}>{r.booking?.bookingNumber || '—'}</span> },
    { key: 'type', header: 'Type', render: (r) => r.type === 'TAX' ? 'Tax Invoice' : 'Bill of Supply' },
    { key: 'totalAmount', header: 'Amount', render: (r) => formatCurrency(Number(r.totalAmount) || 0) },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] || 'slate'}>{r.status}</Badge> },
    { key: 'issuedAt', header: 'Issued', render: (r) => formatDate(r.issuedAt) },
    {
      key: 'actions', header: '', render: (r) => (
        <Button size="sm" variant="ghost" icon={FileText} onClick={() => setSelected(r)}>View</Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Invoices" description="View, issue and track all invoices." />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search invoice no. or client…"
        filters={[{
          name: 'status', value: statusFilter, onChange: setStatusFilter,
          placeholder: 'All statuses',
          options: [
            { value: 'DRAFT', label: 'Draft' },
            { value: 'ISSUED', label: 'Issued' },
            { value: 'PAID', label: 'Paid' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ],
        }]}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        status={status}
        error={error}
        onRetry={refetch}
        emptyTitle="No invoices found"
        emptyDescription="Invoices appear here automatically once a trip completes."
      />

      <InvoiceDetailModal invoice={selected} onClose={() => setSelected(null)} />
    </div>
  );
}