import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useCallback } from 'react';
import { customerService, bookingService } from '../../services';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import Button from '../../components/ui/Button';
import { formatDate, formatCurrency } from '../../utils/formatters';

export default function CustomerDetail() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const fetchCustomer = useCallback(() => customerService.get(customerId), [customerId]);
  const { data: customer, status, error, refetch } = useApi(fetchCustomer, [customerId]);
  const { data: bookings } = useApi(() => bookingService.list({ page: 1, limit: 5, filters: { customerId } }), [customerId]);

  if (status === 'loading') return <LoadingState label="Loading customer…" />;
  if (status === 'error') return <ErrorState message={error?.status === 404 ? 'Customer not found.' : error?.message} onRetry={refetch} />;

  return (
    <div>
      <Breadcrumb items={[{ label: 'Customers', to: '/admin/customers' }, { label: customer.name }]} />
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)} className="mb-3 -ml-2">Back</Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-700 grid place-items-center font-semibold">{customer.name[0]}</div>
            <div>
              <h2 className="font-semibold text-slate-900">{customer.name}</h2>
              <StatusBadge status={customer.status} />
            </div>
          </div>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {customer.email}</li>
            <li className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {customer.phone}</li>
            <li className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {customer.city}</li>
          </ul>
          <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-slate-100">
            <div><p className="text-xs text-slate-400">Total bookings</p><p className="font-semibold text-slate-800">{customer.totalBookings}</p></div>
            <div><p className="text-xs text-slate-400">Customer since</p><p className="font-semibold text-slate-800">{formatDate(customer.createdAt)}</p></div>
          </div>
        </Card>

        <Card className="lg:col-span-2" padded={false}>
          <div className="px-5 pt-5 pb-3"><h3 className="text-sm font-semibold text-slate-700">Recent bookings</h3></div>
          <div className="divide-y divide-slate-50">
            {bookings?.data.length ? bookings.data.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-700">{b.pickup} → {b.drop}</p>
                  <p className="text-xs text-slate-400">{formatDate(b.scheduledAt)} · {formatCurrency(b.fare)}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            )) : <p className="px-5 py-8 text-center text-sm text-slate-400">No bookings for this customer yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
