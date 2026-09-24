import { useState } from 'react';
import { Phone, CheckCircle, MessageSquare, User, MapPin, Car, Clock } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import FormField from '../ui/FormField';
import { formatCurrency, formatDateTime, titleCase } from '../../utils/formatters';

/**
 * ConfirmBookingModal — Admin confirms a PENDING booking after calling the
 * customer. Shows booking summary + requires a confirmation note before
 * the booking can move to CONFIRMED.
 */
export default function ConfirmBookingModal({ open, onClose, booking, onConfirm, loading }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!note.trim()) {
      setError('Please add a note about the call — e.g. "Spoke to customer, confirmed pickup time and vehicle"');
      return;
    }
    setError('');
    onConfirm(booking.id, note.trim());
  };

  const handleClose = () => {
    setNote('');
    setError('');
    onClose();
  };

  if (!booking) return null;

  const customerName = booking.customer?.user?.name || '—';
  const customerPhone = booking.customer?.user?.phone || '—';

  return (
    <Modal open={open} onClose={handleClose} title="Confirm Booking" maxWidth={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Call-to-action banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderRadius: 14,
          background: 'linear-gradient(135deg, #FFFBEA 0%, #FFF8E1 100%)',
          border: '1.5px solid #FFE082',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: '#FFC107', display: 'grid', placeItems: 'center',
            boxShadow: '0 4px 12px rgba(255,193,7,0.3)',
          }}>
            <Phone size={18} color="#111" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 14, color: '#111', margin: 0 }}>
              Call & verify before confirming
            </p>
            <p style={{ fontSize: 12.5, color: '#92400E', margin: '2px 0 0', fontWeight: 500 }}>
              Confirm pickup time, location, vehicle type, and fare with the customer.
            </p>
          </div>
        </div>

        {/* Booking summary card */}
        <div style={{
          borderRadius: 14, border: '1.5px solid #E8E8E4',
          overflow: 'hidden', background: '#fff',
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #F0F0EC',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
              color: '#6B7280',
            }}>
              {booking.bookingNumber || '—'}
            </span>
            <span style={{
              padding: '3px 10px', borderRadius: 20,
              backgroundColor: '#FEF3C7', color: '#92400E',
              fontSize: 11.5, fontWeight: 800,
            }}>
              PENDING
            </span>
          </div>

          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Customer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <User size={15} style={{ color: '#9A9A9A', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 13.5, color: '#111', margin: 0 }}>{customerName}</p>
                <p style={{
                  fontSize: 12.5, color: '#3B65DB', fontWeight: 600, margin: '1px 0 0',
                  cursor: 'pointer',
                }}>
                  {customerPhone}
                </p>
              </div>
            </div>

            {/* Route */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <MapPin size={15} style={{ color: '#9A9A9A', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
                  {typeof booking.pickupAddress === 'string'
                    ? booking.pickupAddress
                    : booking.pickupAddress?.address || '—'}
                </p>
                <p style={{ fontSize: 12, color: '#9A9A9A', margin: '2px 0' }}>↓</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
                  {typeof booking.dropAddress === 'string'
                    ? booking.dropAddress
                    : booking.dropAddress?.address || '—'}
                </p>
              </div>
            </div>

            {/* Details row */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Car size={14} style={{ color: '#9A9A9A' }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>
                  {titleCase(booking.vehicleClass || '—')} · {booking.tripType?.replace(/_/g, ' ') || '—'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} style={{ color: '#9A9A9A' }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>
                  {formatDateTime(booking.pickupAt)}
                </span>
              </div>
            </div>

            {/* Fare */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 10,
              backgroundColor: '#F7F8FC',
            }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280' }}>Estimated fare</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>
                {formatCurrency(Number(booking.estimatedFare) || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Confirmation note */}
        <FormField
          label="Confirmation note"
          required
          error={error}
          hint="What was discussed on the call? e.g. confirmed pickup point, customer verified fare, etc."
        >
          <Textarea
            value={note}
            onChange={(e) => { setNote(e.target.value); if (error) setError(''); }}
            placeholder="e.g. Called customer — confirmed pickup at 9 AM from Koramangala, sedan, fare ₹1,200 agreed"
            rows={3}
            maxLength={500}
          />
        </FormField>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button
            icon={CheckCircle}
            onClick={handleConfirm}
            loading={loading}
            style={{ backgroundColor: '#22A65A', boxShadow: '0 4px 12px rgba(34,166,90,0.3)' }}
          >
            Confirm Booking
          </Button>
        </div>
      </div>
    </Modal>
  );
}
