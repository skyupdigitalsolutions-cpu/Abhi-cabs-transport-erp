import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Truck, Phone, ChevronRight, CalendarX } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import LoadingState from '../../components/ui/LoadingState';
import { useToast } from '../../hooks/useToast';
import { bookingService, bookingOpsService } from '../../services';
import { BOOKING_STATUS } from '../../constants';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';

const STATUS_TABS = ['all', BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ALLOCATED, BOOKING_STATUS.EN_ROUTE, BOOKING_STATUS.ONGOING, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED];

export default function CustomerBookings() {
  const { user } = useAuth();
  const toast    = useToast();
  const [activeTab,   setActiveTab]   = useState('all');
  const [cancelItem,  setCancelItem]  = useState(null);
  const [cancelling,  setCancelling]  = useState(false);
  const [myBookings, setMyBookings]  = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = () => {
    setLoading(true);
    // Real backend scopes /bookings to the authenticated customer already;
    // the mock fallback filters by customerId/clientName client-side.
    bookingService.list({ limit: 100, sortBy: 'createdAt' })
      .then((r) => {
        const rows = (r.data || []).filter(b => !user || b.customerId === user.id || b.clientName === user.name);
        setMyBookings(rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBookings(); }, [user]);

  const displayed = activeTab === 'all'
    ? myBookings
    : myBookings.filter(b => b.status === activeTab);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await bookingOpsService.cancel(cancelItem.id, { reason: 'Cancelled by customer', cancelledBy: 'CUSTOMER' });
      toast.success('Booking cancelled');
      loadBookings();
    } catch (e) {
      toast.error(e.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
      setCancelItem(null);
    }
  };

  const canCancel = (b) => [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(b.status);

  if (loading) return <LoadingState label="Loading your bookings…" />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-5" style={{ color: '#1F2937' }}>My Bookings</h2>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {STATUS_TABS.map(tab => {
          const count = tab === 'all' ? myBookings.length : myBookings.filter(b => b.status === tab).length;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap focus-ring flex items-center gap-1"
              style={{ backgroundColor: activeTab===tab ? '#3B65DB':'#F7F8FC', color: activeTab===tab ? '#fff':'#6B7280', border: `1px solid ${activeTab===tab?'#3B65DB':'#E5E7EB'}` }}>
              <span>{tab === 'all' ? 'All' : tab.replace('_',' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
              {count > 0 && <span className="rounded-full px-1.5 text-[10px] font-bold"
                style={{ backgroundColor: activeTab===tab?'rgba(255,255,255,0.25)':'#E5E7EB', color: activeTab===tab?'#fff':'#6B7280' }}>
                {count}
              </span>}
            </button>
          );
        })}
      </div>

      {displayed.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarX} title="No bookings"
            description={activeTab === 'all' ? "You haven't made any bookings yet." : `No ${activeTab} bookings.`}
            action={activeTab === 'all' && (
              <Button size="sm" onClick={() => window.location.href = '/customer/book'}>Book a Cab</Button>
            )}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {displayed.map(b => (
            <div key={b.id} className="rounded-2xl border shadow-sm overflow-hidden"
              style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB' }}>
              {/* Header */}
              <div className="flex items-start justify-between px-4 pt-4 pb-3"
                style={{ borderBottom: '1px solid #F7F8FC' }}>
                <div>
                  <p className="text-xs font-mono" style={{ color: '#6B7280' }}>{b.id}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{formatDateTime(b.createdAt)}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>

              {/* Route */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="h-4 w-4 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: '#38B763' }} />
                  <p className="text-sm" style={{ color: '#1F2937' }}>{b.pickup}</p>
                </div>
                <div className="ml-2 border-l-2 h-3" style={{ borderColor: '#E5E7EB' }} />
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: '#EF4444' }} />
                  <p className="text-sm" style={{ color: '#1F2937' }}>{b.drop}</p>
                </div>
              </div>

              {/* Meta */}
              <div className="px-4 py-2 flex items-center gap-4 flex-wrap"
                style={{ borderTop: '1px solid #F7F8FC' }}>
                {b.vehicleType && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
                    <Truck size={12} /> {b.vehicleType}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
                  <Clock size={12} /> {formatDate(b.scheduledAt)}
                </span>
                <span className="text-xs font-bold ml-auto" style={{ color: '#3B65DB' }}>
                  {formatCurrency(b.fare)}
                </span>
              </div>

              {/* Assigned driver */}
              {b.assignedDriverName && (
                <div className="mx-4 mb-3 rounded-xl p-3 flex items-center gap-2"
                  style={{ backgroundColor: '#f0fdf4' }}>
                  <Truck size={14} style={{ color: '#38B763' }} />
                  <div className="flex-1">
                    <p className="text-xs font-bold" style={{ color: '#38B763' }}>Driver Assigned</p>
                    <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>{b.assignedDriverName}</p>
                  </div>
                  <span className="text-xs font-mono" style={{ color: '#6B7280' }}>{b.assignedVehicleReg}</span>
                </div>
              )}

              {/* Actions */}
              {canCancel(b) && (
                <div className="px-4 pb-4">
                  <button onClick={() => setCancelItem(b)}
                    className="w-full text-sm font-semibold py-2 rounded-xl border focus-ring"
                    style={{ borderColor: '#fecaca', color: '#EF4444', backgroundColor: '#fef2f2' }}>
                    Cancel Booking
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel confirm */}
      <Modal open={!!cancelItem} onClose={() => setCancelItem(null)} title="Cancel Booking?" size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setCancelItem(null)}>Keep Booking</Button>
          <Button variant="danger" size="sm" loading={cancelling} onClick={handleCancel}>Yes, Cancel</Button>
        </>}>
        <Alert type="warning">
          Cancelling this booking may incur charges if done close to the pickup time.
        </Alert>
        <div className="mt-3 text-sm" style={{ color: '#1F2937' }}>
          <p><strong>Booking:</strong> {cancelItem?.id}</p>
          <p className="mt-1"><strong>Route:</strong> {cancelItem?.pickup} → {cancelItem?.drop}</p>
        </div>
      </Modal>
    </div>
  );
}
