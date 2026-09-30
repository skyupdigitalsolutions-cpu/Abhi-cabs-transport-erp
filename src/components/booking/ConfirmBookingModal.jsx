import { useState } from 'react';
import { Phone, CheckCircle, Clock, XCircle, User, MapPin, Car, CalendarClock } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import FormField from '../ui/FormField';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';

/**
 * ConfirmBookingModal — Four actions for a PENDING booking:
 *   1. Confirm — moves to CONFIRMED
 *   2. Keep Pending + optional follow-up — saves note + follow-up date/time, stays PENDING
 *   3. Cancel Booking — moves to CANCELLED with reason
 */
export default function ConfirmBookingModal({ open, onClose, booking, onConfirm, onAddNote, onCancel, loading }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);

  const requireNote = (action) => {
    if (!note.trim()) {
      setError(action === 'cancel'
        ? 'Please add a reason for cancellation'
        : 'Please add a remark before proceeding');
      return false;
    }
    setError('');
    return true;
  };

  const handleConfirm = () => {
    if (!requireNote('confirm')) return;
    onConfirm(booking.id, note.trim());
  };

  const handleKeepPending = () => {
    if (!requireNote('note')) return;
    // Build a follow-up ISO string if both date and time are set
    let followUp = null;
    if (followUpDate && followUpTime) {
      followUp = new Date(`${followUpDate}T${followUpTime}:00`).toISOString();
    } else if (followUpDate) {
      followUp = new Date(`${followUpDate}T09:00:00`).toISOString();
    }
    onAddNote?.(booking.id, note.trim(), followUp);
  };

  const handleCancel = () => {
    if (!requireNote('cancel')) return;
    onCancel?.(booking.id, note.trim());
  };

  const handleClose = () => {
    setNote(''); setError('');
    setFollowUpDate(''); setFollowUpTime('');
    setShowFollowUp(false);
    onClose();
  };

  if (!booking) return null;

  const customerName = booking.customer?.user?.name || booking.guestName || '—';
  const customerPhone = booking.customer?.user?.phone || booking.guestPhone || '—';
  const today = new Date().toISOString().split('T')[0];

  // Check if there's an existing follow-up stored
  let existingFollowUp = null;
  try {
    const stored = JSON.parse(sessionStorage.getItem('abhi_booking_notes') || '{}');
    const entry = stored[booking.id];
    if (entry?.followUp) {
      const d = new Date(entry.followUp);
      if (d > new Date()) existingFollowUp = d;
    }
  } catch { /* ignore */ }

  return (
    <Modal open={open} onClose={handleClose} title="Confirm Booking" maxWidth={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Call banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', borderRadius: 14,
          background: 'linear-gradient(135deg, #FFFBEA 0%, #FFF8E1 100%)',
          border: '1.5px solid #FFE082',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: '#FFC107', display: 'grid', placeItems: 'center',
            boxShadow: '0 4px 12px rgba(255,193,7,0.3)',
          }}>
            <Phone size={17} color="#111" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 14, color: '#111', margin: 0 }}>
              Call & verify before taking action
            </p>
            <p style={{ fontSize: 12, color: '#92400E', margin: '2px 0 0', fontWeight: 500 }}>
              Confirm details with the customer, then choose an action below.
            </p>
          </div>
        </div>

        {/* Existing follow-up reminder */}
        {existingFollowUp && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 12,
            backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE',
          }}>
            <CalendarClock size={16} style={{ color: '#2563EB', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1D4ED8', margin: 0 }}>
                Follow-up scheduled
              </p>
              <p style={{ fontSize: 12, color: '#3B82F6', margin: '1px 0 0', fontWeight: 500 }}>
                {existingFollowUp.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' at '}
                {existingFollowUp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
          </div>
        )}

        {/* Booking summary */}
        <div style={{ borderRadius: 14, border: '1.5px solid #E8E8E4', overflow: 'hidden', background: '#fff' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #F0F0EC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#6B7280' }}>
              {booking.bookingNumber || '—'}
            </span>
            <span style={{ padding: '3px 10px', borderRadius: 20, backgroundColor: '#FEF3C7', color: '#92400E', fontSize: 11.5, fontWeight: 800 }}>
              PENDING
            </span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <User size={14} style={{ color: '#9A9A9A', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 13.5, color: '#111', margin: 0 }}>{customerName}</p>
                <p style={{ fontSize: 12.5, color: '#3B65DB', fontWeight: 600, margin: '1px 0 0' }}>{customerPhone}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <MapPin size={14} style={{ color: '#9A9A9A', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
                  {typeof booking.pickupAddress === 'string' ? booking.pickupAddress : booking.pickupAddress?.address || '—'}
                </p>
                <p style={{ fontSize: 12, color: '#9A9A9A', margin: '2px 0' }}>↓</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
                  {typeof booking.dropAddress === 'string' ? booking.dropAddress : booking.dropAddress?.address || '—'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: '#374151' }}>
                <Car size={13} style={{ color: '#9A9A9A' }} />
                {titleCase(booking.vehicleClass || '—')} · {booking.tripType?.replace(/_/g, ' ') || '—'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: '#374151' }}>
                <Clock size={13} style={{ color: '#9A9A9A' }} />
                {formatDateTime(booking.pickupAt)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, backgroundColor: '#F7F8FC' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280' }}>Estimated fare</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>{formatCurrency(Number(booking.estimatedFare) || 0)}</span>
            </div>
          </div>
        </div>

        {/* Remark */}
        <FormField label="Remark" required error={error}
          hint="Add what was discussed on the call, or the reason for cancellation.">
          <Textarea
            value={note}
            onChange={(e) => { setNote(e.target.value); if (error) setError(''); }}
            placeholder="e.g. Called customer — confirmed pickup at 9 AM, sedan, fare ₹1,200 agreed"
            rows={3} maxLength={500}
          />
        </FormField>

        {/* Follow-up date/time */}
        {!showFollowUp ? (
          <button
            type="button"
            onClick={() => setShowFollowUp(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 10,
              border: '1.5px dashed #D1D5DB', backgroundColor: '#FAFAFA',
              color: '#6B7280', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'border-color 0.15s',
              width: '100%',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3B65DB'; e.currentTarget.style.color = '#3B65DB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.color = '#6B7280'; }}
          >
            <CalendarClock size={15} />
            Add follow-up date & time
          </button>
        ) : (
          <div style={{
            padding: 14, borderRadius: 12,
            backgroundColor: '#F0F4FF', border: '1.5px solid #BFDBFE',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
            }}>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1D4ED8', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                <CalendarClock size={14} /> Follow-up reminder
              </p>
              <button type="button" onClick={() => { setShowFollowUp(false); setFollowUpDate(''); setFollowUpTime(''); }}
                style={{ fontSize: 12, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Remove
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <FormField label="Date" style={{ margin: 0 }}>
                <Input
                  type="date"
                  min={today}
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </FormField>
              <FormField label="Time" style={{ margin: 0 }}>
                <Input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                />
              </FormField>
            </div>
            <p style={{ fontSize: 11.5, color: '#6B7280', margin: '8px 0 0' }}>
              Saved with "Keep Pending" so you remember to call back.
            </p>
          </div>
        )}

        {/* Three action buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', paddingTop: 4 }}>
          <Button
            variant="dangerOutline"
            icon={XCircle}
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel Booking
          </Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              icon={Clock}
              onClick={handleKeepPending}
              disabled={loading}
            >
              Keep Pending
            </Button>
            <Button
              icon={CheckCircle}
              onClick={handleConfirm}
              loading={loading}
              style={{ backgroundColor: '#22A65A', boxShadow: '0 4px 12px rgba(34,166,90,0.3)' }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
