import { Link } from 'react-router-dom';
import { PlusCircle, Package, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { bookingService } from '../../services';
import { formatDate, formatCurrency } from '../../utils/formatters';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';

export default function CustomerHome() {
  const { user } = useAuth();
  const { data, status, error, refetch } = useApi(() => bookingService.list({ page: 1, limit: 3, sortBy: 'createdAt' }), []);

  if (status === 'error') return <ErrorState message={error?.message} onRetry={refetch} />;

  const bookings = data?.data || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500">What would you like to ship today?</p>
        </div>
        <Link to="/app/book"><Button icon={PlusCircle}>Book a new trip</Button></Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-primary-600 to-primary-800 text-white border-0">
          <Package size={22} className="mb-3 opacity-80" />
          <p className="text-sm opacity-80">Active bookings</p>
          <p className="text-2xl font-semibold">{data?.meta?.total ?? '—'}</p>
        </Card>
        <Card>
          <Clock size={22} className="mb-3 text-accent-500" />
          <p className="text-sm text-slate-400">Need help fast?</p>
          <Link to="/app/support" className="text-primary-600 text-sm font-medium hover:underline focus-ring rounded">Contact support →</Link>
        </Card>
      </div>

      <Card padded={false}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Recent bookings</h3>
          <Link to="/app/bookings" className="text-xs text-primary-600 hover:underline focus-ring rounded">View all</Link>
        </div>
        {status === 'loading' ? <LoadingState /> : (
          <div className="divide-y divide-slate-50">
            {bookings.map((b) => (
              <Link to={`/app/bookings/${b.id}`} key={b.id} className="flex items-center justify-between px-5 py-3.5 text-sm hover:bg-slate-50">
                <div>
                  <p className="font-medium text-slate-700">{b.pickup} → {b.drop}</p>
                  <p className="text-xs text-slate-400">{formatDate(b.scheduledAt)} · {formatCurrency(b.fare)}</p>
                </div>
                <StatusBadge status={b.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}