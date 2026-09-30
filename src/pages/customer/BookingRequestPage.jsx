/**
 * Customer-facing booking request page.
 *
 * This is the public form customers see when their trip is outside the
 * service area (out-of-state). The flow is intentionally two-step:
 *
 *   Step 1 — Trip details: pickup, drop, trip type, date/time, contact info
 *            (NO submit button — customer must proceed to step 2)
 *
 *   Step 2 — Vehicle selection → then "Send Booking Request" appears
 *
 * Round-trip has NO return time field.
 *
 * Submits to POST /booking-requests (public, no auth required).
 */
import { useState } from 'react';
import {
  MapPin, Calendar, Clock, Phone, Mail, User, Car, ChevronRight,
  ChevronLeft, Send, CheckCircle, ArrowRight, Users, StickyNote,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

// ── Vehicle catalog (same as constants/index.js) ───────────────────────
const VEHICLE_OPTIONS = [
  { value: 'swift-dzire',      label: 'Swift Dzire',      seats: '4',  tag: 'Popular' },
  { value: 'ertiga',           label: 'Ertiga',           seats: '6',  tag: '' },
  { value: 'innova',           label: 'Innova',           seats: '7',  tag: '' },
  { value: 'innova-crysta',    label: 'Innova Crysta',    seats: '7',  tag: 'Premium' },
  { value: 'innova-hycross',   label: 'Innova Hycross',   seats: '7',  tag: '' },
  { value: 'fortuner',         label: 'Fortuner',         seats: '7',  tag: 'SUV' },
  { value: 'mercedes-e',       label: 'Mercedes E-Class', seats: '4',  tag: 'Luxury' },
  { value: 'tempo-12',         label: 'Tempo (12-seat)',  seats: '12', tag: '' },
  { value: 'tempo-17',         label: 'Tempo (17-seat)',  seats: '17', tag: '' },
  { value: 'urbania-13',       label: 'Urbania 13',       seats: '13', tag: '' },
  { value: 'urbania-16',       label: 'Urbania 16',       seats: '16', tag: '' },
  { value: 'urbania-maharaja',  label: 'Urbania Maharaja', seats: '16', tag: 'Premium' },
  { value: 'bus',              label: 'Bus',              seats: '20+', tag: '' },
];

const TRIP_TYPES = [
  { value: 'ONE_WAY',    label: 'One Way',      icon: ArrowRight },
  { value: 'ROUND_TRIP', label: 'Round Trip',    icon: ArrowRight },
  { value: 'AIRPORT',    label: 'Airport',       icon: ArrowRight },
  { value: 'HOURLY',     label: 'Hourly Rental', icon: Clock },
];

// ── Helpers ────────────────────────────────────────────────────────────
const isEmpty = (v) => !v || !v.trim();

function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
      {[1, 2].map((s) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center',
            fontSize: 13, fontWeight: 800,
            backgroundColor: s <= current ? '#FFC107' : '#F3F4F6',
            color: s <= current ? '#111' : '#9CA3AF',
            transition: 'all 0.3s ease',
          }}>
            {s < current ? <CheckCircle size={16} /> : s}
          </div>
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: s <= current ? '#111' : '#9CA3AF',
          }}>
            {s === 1 ? 'Trip details' : 'Select vehicle'}
          </span>
          {s < 2 && (
            <div style={{
              width: 40, height: 2, borderRadius: 1,
              backgroundColor: current > 1 ? '#FFC107' : '#E5E7EB',
              transition: 'background-color 0.3s ease',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function FieldGroup({ icon: Icon, label, required, error, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6,
      }}>
        {Icon && <Icon size={14} style={{ color: '#9CA3AF' }} />}
        {label}
        {required && <span style={{ color: '#DC2626' }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4, fontWeight: 500 }}>{error}</p>
      )}
    </div>
  );
}

function TextInput({ placeholder, type = 'text', value, onChange, ...rest }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: '100%', height: 42, padding: '0 14px', borderRadius: 10,
        border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111',
        outline: 'none', backgroundColor: '#fff',
        transition: 'border-color 0.2s',
      }}
      onFocus={(e) => { e.target.style.borderColor = '#FFC107'; }}
      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
      {...rest}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function BookingRequestPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});

  // Step 1 fields
  const [tripType, setTripType] = useState('ONE_WAY');
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [passengers, setPassengers] = useState('');
  const [note, setNote] = useState('');

  // Step 2 field
  const [vehicleClass, setVehicleClass] = useState('');

  // ── Validation ──────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e = {};
    if (isEmpty(pickup))  e.pickup = 'Pickup location is required';
    if (isEmpty(drop))    e.drop   = 'Drop location is required';
    if (isEmpty(date))    e.date   = 'Pickup date is required';
    if (isEmpty(time))    e.time   = 'Pickup time is required';
    if (isEmpty(name))    e.name   = 'Your name is required';
    if (isEmpty(phone))   e.phone  = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goToStep2 = () => {
    if (validateStep1()) {
      setErrors({});
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => {
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!vehicleClass) {
      setErrors({ vehicleClass: 'Please select a vehicle' });
      return;
    }
    setErrors({});
    setSubmitError('');
    setSubmitting(true);
    try {
      const pickupAt = new Date(`${date}T${time}:00`).toISOString();
      await apiClient.post('/booking-requests', {
        tripType,
        pickupAddress: pickup.trim(),
        dropAddress: drop.trim(),
        pickupAt,
        vehicleClass,
        passengers: passengers ? Number(passengers) : undefined,
        contactName: name.trim(),
        contactPhone: phone.trim(),
        contactEmail: email.trim() || undefined,
        note: note.trim() || undefined,
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────
  if (submitted) {
    return (
      <PageShell>
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
            display: 'grid', placeItems: 'center',
          }}>
            <CheckCircle size={32} style={{ color: '#059669' }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: 0 }}>
            Request sent
          </h2>
          <p style={{ fontSize: 15, color: '#6B7280', maxWidth: 380, lineHeight: 1.6 }}>
            Our team will review your trip details and call you back shortly with a quote.
            You don't need to do anything else.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setStep(1);
              setTripType('ONE_WAY');
              setPickup(''); setDrop(''); setDate(''); setTime('');
              setName(''); setPhone(''); setEmail('');
              setPassengers(''); setNote(''); setVehicleClass('');
            }}
            style={{
              marginTop: 12, padding: '10px 24px', borderRadius: 10,
              border: '1.5px solid #E5E7EB', backgroundColor: '#fff',
              fontSize: 14, fontWeight: 700, color: '#111', cursor: 'pointer',
            }}
          >
            Submit another request
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Today's date for min constraint ─────────────────────────────────
  const today = new Date().toISOString().split('T')[0];

  return (
    <PageShell>
      <StepIndicator current={step} />

      {/* ── STEP 1: Trip details ───────────────────────────────────── */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 4px' }}>
            Where do you want to go?
          </h2>
          <p style={{ fontSize: 13.5, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.5 }}>
            Enter your trip details. You'll choose a vehicle on the next step.
          </p>

          {/* Trip type selector */}
          <FieldGroup label="Trip type" icon={Car}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {TRIP_TYPES.map((t) => {
                const active = tripType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTripType(t.value)}
                    style={{
                      padding: '10px 14px', borderRadius: 10, textAlign: 'left',
                      border: active ? '2px solid #FFC107' : '1.5px solid #E5E7EB',
                      backgroundColor: active ? '#FFFBEB' : '#fff',
                      cursor: 'pointer', transition: 'all 0.15s',
                      fontSize: 13.5, fontWeight: active ? 700 : 500,
                      color: active ? '#111' : '#374151',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          <FieldGroup label="Pickup location" icon={MapPin} required error={errors.pickup}>
            <TextInput
              placeholder="e.g. Koramangala, Bengaluru"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup label="Drop location" icon={MapPin} required error={errors.drop}>
            <TextInput
              placeholder="e.g. Hyderabad, Telangana"
              value={drop}
              onChange={(e) => setDrop(e.target.value)}
            />
          </FieldGroup>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldGroup label="Pickup date" icon={Calendar} required error={errors.date}>
              <TextInput type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Pickup time" icon={Clock} required error={errors.time}>
              <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </FieldGroup>
          </div>

          {/* Contact info */}
          <div style={{
            marginTop: 8, padding: 16, borderRadius: 14,
            backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6',
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>
              Contact details
            </p>
            <FieldGroup label="Your name" icon={User} required error={errors.name}>
              <TextInput placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Phone number" icon={Phone} required error={errors.phone}>
              <TextInput type="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Email" icon={Mail}>
              <TextInput type="email" placeholder="Optional" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FieldGroup>
          </div>

          {/* Optional fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 }}>
            <FieldGroup label="Passengers" icon={Users}>
              <TextInput type="number" placeholder="e.g. 4" min="1" max="50" value={passengers} onChange={(e) => setPassengers(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Note" icon={StickyNote}>
              <TextInput placeholder="Any special requests" value={note} onChange={(e) => setNote(e.target.value)} />
            </FieldGroup>
          </div>

          {/* Next button */}
          <button
            onClick={goToStep2}
            style={{
              marginTop: 24, width: '100%', height: 48, borderRadius: 12,
              border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #FFC107 0%, #FFB300 100%)',
              color: '#111', fontSize: 15, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(255,193,7,0.35)',
              transition: 'transform 0.15s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,193,7,0.45)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,193,7,0.35)'; }}
          >
            Next — Select vehicle <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ── STEP 2: Vehicle selection ──────────────────────────────── */}
      {step === 2 && (
        <div>
          {/* Trip summary */}
          <div style={{
            padding: 16, borderRadius: 14, marginBottom: 24,
            backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <p style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', margin: 0 }}>
                Your trip
              </p>
              <button
                onClick={goBack}
                style={{
                  fontSize: 12, fontWeight: 700, color: '#3B65DB', cursor: 'pointer',
                  background: 'none', border: 'none', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <ChevronLeft size={14} /> Edit details
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0 }}>{name}</p>
              <p style={{ fontSize: 13, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                {pickup} → {drop}
              </p>
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                {date} at {time}
                <span style={{
                  marginLeft: 8, padding: '2px 8px', borderRadius: 6,
                  backgroundColor: '#EFF6FF', color: '#1D4ED8',
                  fontSize: 11.5, fontWeight: 700,
                }}>
                  {TRIP_TYPES.find((t) => t.value === tripType)?.label}
                </span>
              </p>
            </div>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 4px' }}>
            Choose your vehicle
          </h2>
          <p style={{ fontSize: 13.5, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>
            Select a vehicle class to complete your request.
          </p>

          {errors.vehicleClass && (
            <p style={{
              fontSize: 13, color: '#DC2626', fontWeight: 600,
              margin: '0 0 12px', padding: '8px 12px', borderRadius: 8,
              backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            }}>
              {errors.vehicleClass}
            </p>
          )}

          {/* Vehicle grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {VEHICLE_OPTIONS.map((v) => {
              const active = vehicleClass === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => { setVehicleClass(v.value); setErrors({}); }}
                  style={{
                    position: 'relative',
                    padding: '14px 16px', borderRadius: 14, textAlign: 'left',
                    border: active ? '2px solid #FFC107' : '1.5px solid #E5E7EB',
                    backgroundColor: active ? '#FFFBEB' : '#fff',
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = '#D1D5DB'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = '#E5E7EB'; }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    backgroundColor: active ? '#FFC107' : '#F3F4F6',
                    display: 'grid', placeItems: 'center',
                    transition: 'background-color 0.15s',
                  }}>
                    <Car size={18} style={{ color: active ? '#111' : '#6B7280' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13.5, fontWeight: 700, margin: 0,
                      color: active ? '#111' : '#374151',
                    }}>
                      {v.label}
                    </p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0', fontWeight: 500 }}>
                      {v.seats} seats
                    </p>
                  </div>
                  {v.tag && (
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                      backgroundColor: active ? '#FFC107' : '#F3F4F6',
                      color: active ? '#111' : '#6B7280',
                    }}>
                      {v.tag}
                    </span>
                  )}
                  {active && (
                    <CheckCircle size={18} style={{ color: '#FFC107', flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>

          {submitError && (
            <p style={{
              marginTop: 16, fontSize: 13, color: '#DC2626', fontWeight: 600,
              padding: '10px 14px', borderRadius: 10,
              backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            }}>
              {submitError}
            </p>
          )}

          {/* Submit — only visible once vehicle is chosen */}
          <div style={{
            opacity: vehicleClass ? 1 : 0.4,
            pointerEvents: vehicleClass ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
          }}>
            <button
              onClick={handleSubmit}
              disabled={submitting || !vehicleClass}
              style={{
                marginTop: 24, width: '100%', height: 50, borderRadius: 12,
                border: 'none', cursor: vehicleClass ? 'pointer' : 'not-allowed',
                background: 'linear-gradient(135deg, #FFC107 0%, #FFB300 100%)',
                color: '#111', fontSize: 15, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(255,193,7,0.35)',
                opacity: submitting ? 0.6 : 1,
                transition: 'transform 0.15s, box-shadow 0.2s, opacity 0.2s',
              }}
              onMouseEnter={(e) => { if (vehicleClass) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,193,7,0.45)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,193,7,0.35)'; }}
            >
              {submitting ? (
                <>Sending…</>
              ) : (
                <><Send size={16} /> Send booking request</>
              )}
            </button>
          </div>

          {/* Back button */}
          <button
            onClick={goBack}
            style={{
              marginTop: 12, width: '100%', height: 42, borderRadius: 10,
              border: '1.5px solid #E5E7EB', backgroundColor: '#fff',
              color: '#374151', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <ChevronLeft size={16} /> Back to trip details
          </button>
        </div>
      )}
    </PageShell>
  );
}

// ── Page shell — branded wrapper ──────────────────────────────────────
function PageShell({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #111 0%, #1a1a1a 280px, #F9F9F7 280px)',
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 20px 40px', maxWidth: 540, margin: '0 auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            backgroundColor: '#FFC107', display: 'grid', placeItems: 'center',
          }}>
            <Car size={20} style={{ color: '#111' }} />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.02em' }}>
              ABHI CABS
            </p>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#FFC107', margin: 0, letterSpacing: '0.08em' }}>
              RIDE WITH TRUST
            </p>
          </div>
        </div>
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: '#fff', margin: '12px 0 0',
          textAlign: 'center',
        }}>
          Book a trip
        </h1>
        <p style={{
          fontSize: 13.5, color: 'rgba(255,255,255,0.6)', margin: '6px 0 0',
          textAlign: 'center', maxWidth: 320,
        }}>
          Out-of-service-area trip? No problem. Send us a request and we'll get back to you with a quote.
        </p>
      </div>

      {/* Card */}
      <div style={{
        maxWidth: 540, margin: '-8px auto 40px', padding: '28px 24px 32px',
        backgroundColor: '#fff', borderRadius: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        marginLeft: 'auto', marginRight: 'auto',
        marginInline: 'max(16px, calc(50% - 270px))',
      }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '0 20px 32px' }}>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>
          © {new Date().getFullYear()} ABHI CABS · Ride With Trust
        </p>
      </div>
    </div>
  );
}
