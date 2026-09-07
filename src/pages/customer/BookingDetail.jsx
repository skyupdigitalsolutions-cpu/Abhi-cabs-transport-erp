import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, IndianRupee, Truck, Gauge } from 'lucide-react';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import ConnectionBadge from '../../components/tracking/ConnectionBadge';
import { useApi } from '../../hooks/useApi';
import { useTrackingSocket } from '../../hooks/useTrackingSocket';
import { bookingService } from '../../services';
import { formatCurrency, formatDateTime, timeAgo } from '../../utils/formatters';
import { BOOKING_STATUS } from '../../constants';

export default function CustomerBookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const fetchBooking = useCallback(() => bookingService.get(bookingId), [bookingId]);
  const { data: booking, status, error, refetch } = useApi(fetchBooking, [bookingId]);

  const isTracking = booking?.status === BOOKING_STATUS.IN_TRANSIT;
  const { connection, positions } = useTrackingSocket(isTracking ? [booking.id] : []);
  const pos = positions[booking?.id];

  if (status === 'loading') return <LoadingState label="Loading booking…" />;
  if (status === 'error') return <ErrorState message={error?.status === 404 ? 'Booking not found.' : error?.message} onRetry={refetch} />;

  return (
    <div>
      <Breadcrumb items={[{ label: 'My bookings', to: '/app/bookings' }, { label: booking.id }]} />
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)} className="mb-3 -ml-2">Back</Button>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">Booking {booking.id}</h2>
            <StatusBadge status={booking.status} />
          </div>
          <dl className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div><dt className="text-xs text-slate-400">Pickup</dt><dd className="text-sm font-medium text-slate-700">{booking.pickup}</dd></div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div><dt className="text-xs text-slate-400">Drop</dt><dd className="text-sm font-medium text-slate-700">{booking.drop}</dd></div>
            </div>
            <div className="flex items-start gap-2.5">
              <Package size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div><dt className="text-xs text-slate-400">Cargo</dt><dd className="text-sm font-medium text-slate-700">{booking.cargoType} · {booking.weightTon} ton</dd></div>
            </div>
            <div className="flex items-start gap-2.5">
              <IndianRupee size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div><dt className="text-xs text-slate-400">Fare</dt><dd className="text-sm font-medium text-slate-700">{formatCurrency(booking.fare)}</dd></div>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Truck size={15} /> Live status</h3>
            {isTracking && <ConnectionBadge status={connection} />}
          </div>
          {!isTracking ? (
            <p className="text-sm text-slate-400">Live tracking becomes available once your shipment is picked up.</p>
          ) : pos ? (
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-1.5 text-slate-600"><Gauge size={14} /> {pos.speedKmph} km/h</p>
              <p className="text-xs text-slate-400">Updated {timeAgo(pos.at)}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Waiting for driver signal…</p>
          )}
        </Card>
      </div>
    </div>
  );
}
