import { useState, useEffect } from 'react';
import { IndianRupee, FileText } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { paymentService, invoiceService } from '../../services';
import { PAYMENT_STATUS } from '../../constants';

export default function CustomerPayments() {
  const { user } = useAuth();
  const [myPayments, setMyPayments] = useState([]);
  const [myInvoices, setMyInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      paymentService.list({ limit: 100 }),
      invoiceService.list({ limit: 100 }),
    ]).then(([pRes, iRes]) => {
      setMyPayments((pRes.data || []).filter(p => p.clientName === user.name).slice(0, 20));
      setMyInvoices((iRes.data || []).filter(i => i.clientName === user.name).slice(0, 10));
    }).finally(() => setLoading(false));
  }, [user]);

  const totalPaid    = myPayments.filter(p => p.status === PAYMENT_STATUS.CAPTURED).reduce((s, p) => s + p.amount, 0);
  const totalPending = myPayments.filter(p => p.status === PAYMENT_STATUS.CREATED).reduce((s, p) => s + p.amount, 0);

  if (loading) return <LoadingState label="Loading payments…" />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-5" style={{ color: '#1F2937' }}>Payments</h2>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #3B65DB, #2F55C7)', color: '#fff' }}>
          <p className="text-xs opacity-80">Total Paid</p>
          <p className="text-xl font-black mt-1">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <p className="text-xs" style={{ color: '#F59E0B' }}>Pending</p>
          <p className="text-xl font-black mt-1" style={{ color: '#F59E0B' }}>{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Payments */}
      <p className="text-sm font-bold mb-3" style={{ color: '#1F2937' }}>Payment History</p>
      {myPayments.length === 0 ? (
        <Card className="mb-4"><EmptyState icon={IndianRupee} title="No payments yet" /></Card>
      ) : (
        <div className="rounded-2xl border overflow-hidden mb-5" style={{ backgroundColor: '#fff', borderColor: '#E5E7EB' }}>
          {myPayments.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i>0 ? '1px solid #F7F8FC' : 'none' }}>
              <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                style={{ backgroundColor: p.status==='paid' ? '#f0fdf4':'#fffbeb' }}>
                <IndianRupee size={15} style={{ color: p.status==='paid' ? '#38B763':'#F59E0B' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>{p.method}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>{p.bookingId} · {formatDate(p.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{formatCurrency(p.amount)}</p>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoices */}
      <p className="text-sm font-bold mb-3" style={{ color: '#1F2937' }}>Invoices</p>
      {myInvoices.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No invoices yet" /></Card>
      ) : (
        <div className="space-y-2">
          {myInvoices.map(inv => (
            <div key={inv.id} className="flex items-center gap-3 rounded-2xl border p-4"
              style={{ backgroundColor: '#fff', borderColor: '#E5E7EB' }}>
              <div className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                style={{ backgroundColor: '#eef2fb' }}>
                <FileText size={15} style={{ color: '#3B65DB' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{inv.invoiceNo}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>Due {formatDate(inv.dueAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{formatCurrency(inv.total || inv.amount)}</p>
                <StatusBadge status={inv.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
