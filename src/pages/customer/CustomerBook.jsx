import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Calendar, Users, Package, ChevronRight,
  CheckCircle, Clock, Truck, IndianRupee, Star,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Alert from '../../components/ui/Alert';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../hooks/useToast';
import { bookingService, dispatchService, mastersService } from '../../services';
import { BOOKING_STATUS } from '../../constants';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const STEPS = ['Choose Vehicle', 'Trip Details', 'Confirm & Book'];

const CARGO_TYPES = ['General','Fragile','Perishable','Bulk','Documents'];
const CITIES = ['Bengaluru','Chennai','Hyderabad','Pune','Mumbai','Delhi','Kolkata','Ahmedabad','Mysuru','Coimbatore'];

const CATEGORY_COLORS = {
  'Sedan':           ['#eef2fb','#3B65DB'],
  'MUV':             ['#f0fdf4','#38B763'],
  'MUV Premium':     ['#f5f3ff','#7c3aed'],
  'Tempo Traveler':  ['#fffbeb','#F59E0B'],
  'Mini Coach':      ['#fff0f0','#EF4444'],
  'Luxury Coach':    ['#fdf4ff','#a855f7'],
  'Executive Coach': ['#f0f9ff','#0369a1'],
};

// ── Step 1: Vehicle selection ──────────────────────────────────────────────
function StepVehicle({ selected, onSelect }) {
  const [filter, setFilter] = useState('');
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    mastersService.vehicleRates.list().then((r) => setVehicles((r || []).filter((v) => v.active)));
  }, []);

  const filtered = filter ? vehicles.filter(v => v.category === filter) : vehicles;
  const categories = [...new Set(vehicles.map(v => v.category))];

  return (
    <div>
      <p className="text-sm font-semibold mb-3" style={{ color: '#1F2937' }}>Select your vehicle type</p>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button onClick={() => setFilter('')}
          className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap focus-ring"
          style={{ backgroundColor: !filter ? '#3B65DB':'#F7F8FC', color: !filter ? '#fff':'#6B7280', border: `1px solid ${!filter?'#3B65DB':'#E5E7EB'}` }}>
          All
        </button>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap focus-ring"
            style={{ backgroundColor: filter===c ? '#3B65DB':'#F7F8FC', color: filter===c ? '#fff':'#6B7280', border: `1px solid ${filter===c?'#3B65DB':'#E5E7EB'}` }}>
            {c}
          </button>
        ))}
      </div>

      {/* Vehicle cards */}
      <div className="space-y-2">
        {filtered.map(v => {
          const [catBg, catColor] = CATEGORY_COLORS[v.category] || ['#F7F8FC','#6B7280'];
          const isSelected = selected?.id === v.id;
          return (
            <div key={v.id}
              onClick={() => onSelect(v)}
              className="rounded-2xl border p-4 cursor-pointer transition-all"
              style={{
                backgroundColor: isSelected ? '#eef2fb':'#ffffff',
                borderColor: isSelected ? '#3B65DB':'#E5E7EB',
                outline: isSelected ? '2px solid #3B65DB':undefined,
              }}>
              <div className="flex items-start gap-3">
                {/* Seater badge */}
                <div className="h-12 w-12 rounded-xl grid place-items-center shrink-0 text-center"
                  style={{ backgroundColor: catBg }}>
                  <Users size={14} style={{ color: catColor }} />
                  <p className="text-[10px] font-black leading-none mt-0.5" style={{ color: catColor }}>{v.seater}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-snug" style={{ color: '#1F2937' }}>{v.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[11px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ backgroundColor: catBg, color: catColor }}>{v.category}</span>
                    <span className="text-[11px]" style={{ color: '#6B7280' }}>{v.acType}</span>
                    <span className="text-[11px]" style={{ color: '#6B7280' }}>{v.bsCategory}</span>
                  </div>
                </div>
                {/* Price */}
                <div className="text-right shrink-0">
                  <p className="text-base font-black" style={{ color: '#1F2937' }}>
                    ₹{v.local.packageRate.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px]" style={{ color: '#6B7280' }}>
                    {v.local.hours}hrs/{v.local.km}km
                  </p>
                  <p className="text-[11px]" style={{ color: '#6B7280' }}>
                    ₹{v.outstation.perKmRate}/km outstation
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Trip details ───────────────────────────────────────────────────
function StepDetails({ form, onChange, vehicle }) {
  const set = (k, v) => onChange({ ...form, [k]: v });
  return (
    <div className="space-y-4">
      {/* Selected vehicle summary */}
      {vehicle && (
        <div className="rounded-xl p-3 flex items-center gap-3"
          style={{ backgroundColor: '#eef2fb' }}>
          <Users size={16} style={{ color: '#3B65DB' }} />
          <div>
            <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{vehicle.name}</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>{vehicle.seater} Seater · {vehicle.acType}</p>
          </div>
          <p className="ml-auto text-base font-black" style={{ color: '#3B65DB' }}>
            ₹{vehicle.local.packageRate.toLocaleString('en-IN')}
          </p>
        </div>
      )}

      <FormField label="Trip type" required>
        <Select value={form.tripType} onChange={e => set('tripType', e.target.value)}
          options={[
            { value: 'local',      label: `Local City Tour (${vehicle?.local.hours}hrs/${vehicle?.local.km}km)` },
            { value: 'outstation', label: `Out of Station (₹${vehicle?.outstation.perKmRate}/km)` },
          ]} />
      </FormField>

      <FormField label="Pickup location" required>
        <Select value={form.pickup} onChange={e => set('pickup', e.target.value)}
          placeholder="Select city" options={CITIES.map(c => ({ value: c, label: c }))} />
      </FormField>

      <FormField label="Drop location" required>
        <Select value={form.drop} onChange={e => set('drop', e.target.value)}
          placeholder="Select city" options={CITIES.map(c => ({ value: c, label: c }))} />
      </FormField>

      <FormField label="Pickup address / landmark">
        <Input placeholder="e.g. Koramangala, near forum mall" value={form.pickupAddr}
          onChange={e => set('pickupAddr', e.target.value)} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Date" required>
          <Input type="date" value={form.date} onChange={e => set('date', e.target.value)}
            min={new Date().toISOString().slice(0,10)} style={{ colorScheme: 'light' }} />
        </FormField>
        <FormField label="Time" required>
          <Input type="time" value={form.time} onChange={e => set('time', e.target.value)}
            style={{ colorScheme: 'light' }} />
        </FormField>
      </div>

      <FormField label="Cargo / goods type">
        <Select value={form.cargoType} onChange={e => set('cargoType', e.target.value)}
          options={CARGO_TYPES.map(c => ({ value: c, label: c }))} />
      </FormField>

      <FormField label="Special instructions">
        <Input placeholder="Any specific requirements…" value={form.notes}
          onChange={e => set('notes', e.target.value)} />
      </FormField>
    </div>
  );
}

// ── Step 3: Confirmation ───────────────────────────────────────────────────
function StepConfirm({ vehicle, form, fare }) {
  const rows = [
    { label: 'Vehicle',   value: vehicle?.name },
    { label: 'Trip type', value: form.tripType === 'local' ? 'Local City Tour' : 'Out of Station' },
    { label: 'Pickup',    value: `${form.pickup}${form.pickupAddr ? ` · ${form.pickupAddr}` : ''}` },
    { label: 'Drop',      value: form.drop },
    { label: 'Date & time', value: form.date && form.time ? `${form.date} at ${form.time}` : '—' },
    { label: 'Cargo',     value: form.cargoType },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
        {rows.map((r, i) => (
          <div key={r.label} className="flex items-start justify-between px-4 py-3 gap-4"
            style={{ borderTop: i>0 ? '1px solid #F7F8FC':'none' }}>
            <p className="text-xs shrink-0" style={{ color: '#6B7280' }}>{r.label}</p>
            <p className="text-sm font-semibold text-right" style={{ color: '#1F2937' }}>{r.value || '—'}</p>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: '2px solid #E5E7EB', backgroundColor: '#F7F8FC' }}>
          <p className="font-bold" style={{ color: '#1F2937' }}>Estimated Fare</p>
          <p className="text-lg font-black" style={{ color: '#3B65DB' }}>{formatCurrency(fare)}</p>
        </div>
      </div>

      <Alert type="info">
        A driver will be automatically assigned based on availability and you'll receive confirmation instantly. Payment is collected after the trip.
      </Alert>
    </div>
  );
}

// ── Success modal ──────────────────────────────────────────────────────────
function SuccessModal({ open, result, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Booking Confirmed!" size="sm"
      footer={<Button className="w-full" onClick={onClose}>View My Bookings</Button>}>
      <div className="text-center py-2">
        <div className="h-16 w-16 rounded-full grid place-items-center mx-auto mb-4"
          style={{ backgroundColor: '#f0fdf4' }}>
          <CheckCircle size={36} style={{ color: '#38B763' }} />
        </div>
        <p className="font-bold text-lg mb-1" style={{ color: '#1F2937' }}>Booking Received!</p>
        <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Booking ID: <strong>{result?.bookingId}</strong></p>

        {result?.assigned ? (
          <div className="rounded-xl p-4 text-left" style={{ backgroundColor: '#f0fdf4' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#38B763' }}>✓ Driver Auto-Assigned</p>
            <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{result.driver?.name}</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>{result.vehicle?.regNo} · {result.vehicle?.type}</p>
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>📞 {result.driver?.phone}</p>
          </div>
        ) : (
          <div className="rounded-xl p-4 text-left" style={{ backgroundColor: '#fffbeb' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#F59E0B' }}>⏳ Pending Assignment</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              All drivers are currently busy. Our team will assign a driver and confirm shortly via SMS.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
const EMPTY_FORM = { tripType: 'local', pickup: '', drop: '', pickupAddr: '', date: '', time: '', cargoType: 'General', notes: '' };

export default function CustomerBook() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();
  const [step,       setStep]       = useState(0);
  const [vehicle,    setVehicle]    = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [booking,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [showSuccess,setShowSuccess]= useState(false);

  const fare = useMemo(() => {
    if (!vehicle) return 0;
    return form.tripType === 'local'
      ? vehicle.local.packageRate
      : vehicle.outstation.perKmRate * (vehicle.outstation.minKmPerDay || 300);
  }, [vehicle, form.tripType]);

  const canNext = () => {
    if (step === 0) return !!vehicle;
    if (step === 1) return !!(form.pickup && form.drop && form.date && form.time && form.pickup !== form.drop);
    return true;
  };

  const handleBook = async () => {
    setLoading(true);
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();

      // POST /bookings — creates a PENDING booking with a frozen fare
      // breakdown on the backend (or the mock store, via bookingService).
      const booking = await bookingService.create({
        customerId:   user.id,
        clientName:   user.name,
        clientPhone:  user.phone,
        clientEmail:  user.email,
        vehicleRateId: vehicle.id,
        vehicleType:  vehicle.name,
        seater:       vehicle.seater,
        pickup:       `${form.pickup}${form.pickupAddr ? ', ' + form.pickupAddr : ''}`,
        drop:         form.drop,
        cargoType:    form.cargoType,
        tripType:     form.tripType,
        fare,
        notes:        form.notes,
        status:       BOOKING_STATUS.PENDING,
        assignedDriverId:   null,
        assignedDriverName: null,
        assignedVehicleId:  null,
        assignedVehicleReg: null,
        statusHistory: [{ from: null, to: BOOKING_STATUS.PENDING, at: new Date().toISOString(), by: user.name }],
        scheduledAt,
        weightTon: 1,
      });

      // Attempt auto-assignment (POST /admin/dispatch/bookings/:id/auto-assign).
      // Not fatal if it fails — the booking still exists as PENDING and ops
      // can assign it manually from the Dispatch board.
      let assignResult = { assigned: false };
      try {
        const assigned = await dispatchService.autoAssign(booking.id);
        assignResult = {
          assigned: true,
          driver: { name: assigned.booking?.assignedDriverName },
          vehicle: { regNo: assigned.booking?.assignedVehicleReg },
        };
      } catch { /* left PENDING for manual dispatch */ }

      setResult({ bookingId: booking.id, assigned: assignResult.assigned, driver: assignResult.driver, vehicle: assignResult.vehicle });
      setShowSuccess(true);
    } catch (e) {
      toast.error(e.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold" style={{ color: '#1F2937' }}>Book a Cab</h2>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Hi {user?.name} — let's get you moving</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className="h-7 w-7 rounded-full grid place-items-center text-xs font-bold"
                style={{
                  backgroundColor: i <= step ? '#3B65DB':'#E5E7EB',
                  color: i <= step ? '#fff':'#6B7280',
                }}>
                {i < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              <p className="text-[10px] font-medium mt-1 text-center" style={{ color: i <= step ? '#3B65DB':'#6B7280' }}>{s}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 -mt-4" style={{ backgroundColor: i < step ? '#3B65DB':'#E5E7EB' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="mb-6">
        {step === 0 && <StepVehicle selected={vehicle} onSelect={v => { setVehicle(v); setStep(1); }} />}
        {step === 1 && <StepDetails form={form} onChange={setForm} vehicle={vehicle} />}
        {step === 2 && <StepConfirm vehicle={vehicle} form={form} fare={fare} />}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="secondary" className="flex-1" onClick={() => setStep(s => s - 1)}>← Back</Button>
        )}
        {step < 2 ? (
          <Button className="flex-1" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
            Continue →
          </Button>
        ) : (
          <Button className="flex-1" loading={booking} onClick={handleBook}>
            Confirm Booking
          </Button>
        )}
      </div>

      <SuccessModal
        open={showSuccess}
        result={result}
        onClose={() => { setShowSuccess(false); navigate('/customer/bookings'); }}
      />
    </div>
  );
}
