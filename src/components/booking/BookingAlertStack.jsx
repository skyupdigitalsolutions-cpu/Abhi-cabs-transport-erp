import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Car } from 'lucide-react';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import { useToast } from '../../hooks/useToast';

/**
 * BookingAlertStack — the corner notification cards (iOS-style) that hold every
 * new booking the admin DISMISSED from the popup. They keep showing until each
 * booking is confirmed. Each card offers Confirm (one tap) and View (open the
 * booking detail for the full call-and-confirm flow).
 */
function AlertCard({ alert, onConfirm, onView }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(alert.id);
    } catch {
      setLoading(false); // keep the card on failure so it can be retried
    }
  };

  const route = [alert.pickupAddress, alert.dropAddress]
    .map((a) => (a ? String(a).split(',')[0] : ''))
    .filter(Boolean)
    .join(' → ');

  const subtitle = [alert.customerName, route].filter(Boolean).join(' · ');

  return (
    <div style={C.card}>
      <div style={C.left}>
        <div style={C.icon}><Car size={18} color="#111" strokeWidth={2.2} /></div>
        <div style={C.text}>
          <p style={C.title}>
            New booking{alert.bookingNumber ? ` · ${alert.bookingNumber}` : ''}
          </p>
          <p style={C.subtitle}>{subtitle || 'Awaiting confirmation'}</p>
        </div>
      </div>
      <div style={C.actions}>
        <button type="button" style={{ ...C.actionBtn, ...C.confirm, opacity: loading ? 0.6 : 1 }} onClick={handleConfirm} disabled={loading}>
          {loading ? '…' : 'Confirm'}
        </button>
        <div style={C.divider} />
        <button type="button" style={{ ...C.actionBtn, ...C.view }} onClick={() => onView(alert)} disabled={loading}>
          View
        </button>
      </div>
    </div>
  );
}

export default function BookingAlertStack() {
  const { bookingAlerts, confirmBookingAlert } = useAdminRealtimeContext();
  const toast = useToast();
  const navigate = useNavigate();

  const dismissed = bookingAlerts.filter((a) => a.dismissed);
  if (!dismissed.length) return null;

  const handleConfirm = async (id) => {
    try {
      await confirmBookingAlert(id);
      toast.success('Booking confirmed');
    } catch (err) {
      toast.error(err?.message || 'Failed to confirm booking');
      throw err;
    }
  };

  return createPortal(
    <div style={C.container}>
      <p style={C.header}>
        {dismissed.length} booking{dismissed.length > 1 ? 's' : ''} awaiting confirmation
      </p>
      <div style={C.list}>
        {dismissed.map((a) => (
          <AlertCard
            key={a.id}
            alert={a}
            onConfirm={handleConfirm}
            onView={(al) => navigate(`/admin/bookings/${al.id}`)}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}

const C = {
  container: {
    position: 'fixed', right: 16, bottom: 16, zIndex: 1200,
    width: 'min(380px, calc(100vw - 32px))',
    display: 'flex', flexDirection: 'column', gap: 8,
    pointerEvents: 'none',
  },
  header: {
    alignSelf: 'flex-end', margin: 0, padding: '4px 10px', borderRadius: 20,
    background: '#111', color: '#FFC107', fontSize: 11.5, fontWeight: 800,
    boxShadow: '0 6px 16px rgba(17,17,17,0.25)', pointerEvents: 'auto',
  },
  list: {
    display: 'flex', flexDirection: 'column', gap: 8,
    maxHeight: 'calc(100vh - 140px)', overflowY: 'auto',
    pointerEvents: 'auto',
  },
  card: {
    display: 'flex', alignItems: 'stretch', justifyContent: 'space-between',
    background: '#fff', borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 12px 30px rgba(17,17,17,0.18)', border: '1px solid #EDEDE8',
    animation: 'abhiSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  left: { display: 'flex', alignItems: 'center', gap: 11, padding: '13px 12px 13px 14px', minWidth: 0, flex: 1 },
  icon: {
    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
    background: '#FFF3C4', display: 'grid', placeItems: 'center',
  },
  text: { minWidth: 0 },
  title: { margin: 0, fontSize: 13.5, fontWeight: 800, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  subtitle: { margin: '2px 0 0', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  actions: {
    display: 'flex', flexDirection: 'column', flexShrink: 0,
    borderLeft: '1px solid #F0F0EC', width: 92,
  },
  actionBtn: {
    flex: 1, border: 'none', background: 'transparent', cursor: 'pointer',
    fontSize: 13, fontWeight: 700, padding: '0 10px',
  },
  confirm: { color: '#15803D' },
  view: { color: '#6B7280' },
  divider: { height: 1, background: '#F0F0EC' },
};
