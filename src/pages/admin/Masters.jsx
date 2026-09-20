import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Search, Car, MapPin, ChevronDown, ChevronUp,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Alert from '../../components/ui/Alert';
import { useToast } from '../../hooks/useToast';
import { fareConfigService } from '../../services';
import LoadingState from '../../components/ui/LoadingState';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// The 4 vehicle classes and 4 trip types the real backend actually prices —
// kept identical to BookingFormDrawer.jsx so this form can't drift from what
// a real booking can be created with.
const VEHICLE_CLASSES = ['hatchback', 'sedan', 'suv', 'tempo'];
const TRIP_TYPES = [
  { value: 'ONE_WAY',    label: 'One Way' },
  { value: 'ROUND_TRIP', label: 'Round Trip' },
  { value: 'AIRPORT',    label: 'Airport' },
  { value: 'HOURLY',     label: 'Hourly Rental' },
];

const EMPTY_RATE_CARD = {
  cityId: '', vehicleClass: 'sedan', tripType: 'ONE_WAY',
  baseFare: '', perKm: '', minimumFare: '',
  // Advanced (all optional — left unset means "not using this feature" for this rate card)
  perMinute: '', cancellationFee: '',
  returnEmptyPct: '',
  minKmPerDay: '', waitingPerHour: '', freeWaitingMin: '',
  driverAllowance: '',
  nightAllowance: '', nightChargePct: '', nightStartHour: 21, nightStartMinute: 55, nightEndHour: 6, nightEndMinute: 0,
  airportSurcharge: '',
  hourlyRate: '', hourlyKmPerHour: 10,
};

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Rate Card Form — Simple / Advanced, matching the REAL FareConfig
// fields (city + vehicleClass + tripType + baseFare/perKm/minimumFare, plus
// optional outstation/round-trip/night/airport/hourly/surge fields).
// ─────────────────────────────────────────────────────────────────────────────
function VehicleRateForm({ initial, cities, onSubmit, onClose }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(() => {
    if (!initial) return { ...EMPTY_RATE_CARD, cityId: cities[0]?.id || '' };
    // Backend returns Decimal fields as strings — coerce to plain numbers/strings for inputs.
    const flat = { ...initial };
    return { ...EMPTY_RATE_CARD, ...flat, cityId: initial.cityId };
  });
  const [mode, setMode] = useState('simple'); // 'simple' | 'advanced'
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (form.cityId === '' || form.baseFare === '' || form.perKm === '' || form.minimumFare === '') return;
    setLoading(true);
    try {
      // Identity fields only sent on create — the backend rejects them on update anyway.
      const base = {
        baseFare: Number(form.baseFare),
        perKm: Number(form.perKm),
        minimumFare: Number(form.minimumFare),
      };
      const advanced = mode === 'advanced' ? {
        ...(form.perMinute !== ''        && { perMinute: Number(form.perMinute) }),
        ...(form.cancellationFee !== ''  && { cancellationFee: Number(form.cancellationFee) }),
        ...(form.returnEmptyPct !== ''   && { returnEmptyPct: Number(form.returnEmptyPct) }),
        ...(form.minKmPerDay !== ''      && { minKmPerDay: Number(form.minKmPerDay) }),
        ...(form.waitingPerHour !== ''   && { waitingPerHour: Number(form.waitingPerHour) }),
        ...(form.freeWaitingMin !== ''   && { freeWaitingMin: Number(form.freeWaitingMin) }),
        ...(form.driverAllowance !== ''  && { driverAllowance: Number(form.driverAllowance) }),
        ...(form.nightAllowance !== ''   && { nightAllowance: Number(form.nightAllowance) }),
        ...(form.nightChargePct !== ''   && { nightChargePct: Number(form.nightChargePct) }),
        nightStartHour: Number(form.nightStartHour), nightStartMinute: Number(form.nightStartMinute),
        nightEndHour: Number(form.nightEndHour), nightEndMinute: Number(form.nightEndMinute),
        ...(form.airportSurcharge !== '' && { airportSurcharge: Number(form.airportSurcharge) }),
        ...(form.hourlyRate !== ''       && { hourlyRate: Number(form.hourlyRate) }),
        hourlyKmPerHour: Number(form.hourlyKmPerHour || 10),
      } : {};

      if (isEdit) {
        await onSubmit({ ...base, ...advanced });
      } else {
        await onSubmit({
          cityId: Number(form.cityId),
          vehicleClass: form.vehicleClass,
          tripType: form.tripType,
          ...base,
          ...advanced,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-5 overflow-y-auto max-h-[65vh] pr-1">
        {/* Identity — fixed once created */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>
            What this rate card prices
          </p>
          {isEdit && (
            <Alert type="info" className="mb-3">
              City, vehicle class and trip type can't be changed on an existing rate card — create a new
              one instead. This keeps it clear which rate card actually priced a past booking.
            </Alert>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="City" required>
              {isEdit ? (
                <Input disabled value={cities.find((c) => c.id === form.cityId)?.name || form.cityId} />
              ) : (
                <Select value={form.cityId} onChange={(e) => set('cityId', e.target.value)}
                  options={cities.map((c) => ({ value: c.id, label: `${c.name}, ${c.state}` }))} />
              )}
            </FormField>
            <FormField label="Vehicle class" required>
              {isEdit ? <Input disabled value={form.vehicleClass} /> : (
                <Select value={form.vehicleClass} onChange={(e) => set('vehicleClass', e.target.value)}
                  options={VEHICLE_CLASSES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
              )}
            </FormField>
            <FormField label="Trip type" required>
              {isEdit ? <Input disabled value={TRIP_TYPES.find((t) => t.value === form.tripType)?.label || form.tripType} /> : (
                <Select value={form.tripType} onChange={(e) => set('tripType', e.target.value)} options={TRIP_TYPES} />
              )}
            </FormField>
          </div>
        </div>

        {/* Core fare — required, always visible */}
        <div className="rounded-xl p-4" style={{ backgroundColor: '#eef2fb' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#2F55C7' }}>
            💰 Fare (required)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Base fare (₹)" required>
              <Input type="number" min="0" value={form.baseFare} onChange={(e) => set('baseFare', e.target.value)} placeholder="e.g. 100" />
            </FormField>
            <FormField label="Per KM (₹)" required>
              <Input type="number" min="0" value={form.perKm} onChange={(e) => set('perKm', e.target.value)} placeholder="e.g. 14" />
            </FormField>
            <FormField label="Minimum fare (₹)" required>
              <Input type="number" min="0" value={form.minimumFare} onChange={(e) => set('minimumFare', e.target.value)} placeholder="e.g. 250" />
            </FormField>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2 rounded-xl border p-1 w-fit" style={{ borderColor: '#E5E7EB' }}>
          {[['simple', 'Simple'], ['advanced', 'Advanced pricing']].map(([v, label]) => (
            <button key={v} type="button" onClick={() => setMode(v)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              style={{ backgroundColor: mode === v ? '#111111' : 'transparent', color: mode === v ? '#fff' : '#6B7280' }}>
              {label}
            </button>
          ))}
        </div>
        {mode === 'simple' && (
          <p className="text-xs -mt-3" style={{ color: '#9A9A9A' }}>
            Simple mode: this rate card will just charge base fare + (distance × per-KM rate), with no
            outstation, night, driver-allowance, airport or hourly-rental rules. Switch to Advanced to
            configure any of those.
          </p>
        )}

        {mode === 'advanced' && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ backgroundColor: '#fff8ec' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#d97706' }}>
                🛣️ Outstation &amp; round trip
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField label="Return-empty % (one way)" hint="Outstation one-way only">
                  <Input type="number" min="0" max="100" value={form.returnEmptyPct} onChange={(e) => set('returnEmptyPct', e.target.value)} />
                </FormField>
                <FormField label="Min KM / day" hint="Round trip only">
                  <Input type="number" min="0" value={form.minKmPerDay} onChange={(e) => set('minKmPerDay', e.target.value)} />
                </FormField>
                <FormField label="Driver allowance / day (₹)" hint="All trip types except Airport">
                  <Input type="number" min="0" value={form.driverAllowance} onChange={(e) => set('driverAllowance', e.target.value)} />
                </FormField>
                <FormField label="Waiting ₹/hour" hint="Round trip only">
                  <Input type="number" min="0" value={form.waitingPerHour} onChange={(e) => set('waitingPerHour', e.target.value)} />
                </FormField>
                <FormField label="Free waiting (min)" hint="Round trip only">
                  <Input type="number" min="0" value={form.freeWaitingMin} onChange={(e) => set('freeWaitingMin', e.target.value)} />
                </FormField>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ backgroundColor: '#f5f3ff' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#7c3aed' }}>
                🌙 Night charge
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Flat night allowance (₹)">
                  <Input type="number" min="0" value={form.nightAllowance} onChange={(e) => set('nightAllowance', e.target.value)} />
                </FormField>
                <FormField label="Night surcharge (%)">
                  <Input type="number" min="0" max="100" value={form.nightChargePct} onChange={(e) => set('nightChargePct', e.target.value)} />
                </FormField>
                <FormField label="Night window starts">
                  <div className="flex gap-1.5 items-center">
                    <Input type="number" min="0" max="23" value={form.nightStartHour} onChange={(e) => set('nightStartHour', e.target.value)} />
                    <span style={{ color: '#9A9A9A' }}>:</span>
                    <Input type="number" min="0" max="59" value={form.nightStartMinute} onChange={(e) => set('nightStartMinute', e.target.value)} />
                  </div>
                </FormField>
                <FormField label="Night window ends">
                  <div className="flex gap-1.5 items-center">
                    <Input type="number" min="0" max="23" value={form.nightEndHour} onChange={(e) => set('nightEndHour', e.target.value)} />
                    <span style={{ color: '#9A9A9A' }}>:</span>
                    <Input type="number" min="0" max="59" value={form.nightEndMinute} onChange={(e) => set('nightEndMinute', e.target.value)} />
                  </div>
                </FormField>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ backgroundColor: '#f0f9ff' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#0369a1' }}>
                ✈️ Airport &amp; ⏱ Hourly rental
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Airport surcharge (₹)" hint="Airport trip type only">
                  <Input type="number" min="0" value={form.airportSurcharge} onChange={(e) => set('airportSurcharge', e.target.value)} />
                </FormField>
                <FormField label="Cancellation fee (₹)">
                  <Input type="number" min="0" value={form.cancellationFee} onChange={(e) => set('cancellationFee', e.target.value)} />
                </FormField>
                <FormField label="Hourly rate (₹/hr)" hint="Hourly rental only, if no fixed package chosen">
                  <Input type="number" min="0" value={form.hourlyRate} onChange={(e) => set('hourlyRate', e.target.value)} />
                </FormField>
                <FormField label="KM included per hour" hint="Hourly rental only">
                  <Input type="number" min="1" value={form.hourlyKmPerHour} onChange={(e) => set('hourlyKmPerHour', e.target.value)} />
                </FormField>
                <FormField label="Per extra minute (₹)" className="col-span-2">
                  <Input type="number" min="0" value={form.perMinute} onChange={(e) => set('perMinute', e.target.value)} />
                </FormField>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #E5E7EB' }}>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" loading={loading} onClick={submit}>
          {isEdit ? 'Save Changes' : 'Create Rate Card'}
        </Button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Rate Card Display — real FareConfig shape
// ─────────────────────────────────────────────────────────────────────────────
const CLASS_COLORS = {
  hatchback: ['#eef2fb', '#3B65DB'],
  sedan:     ['#f0fdf4', '#38B763'],
  suv:       ['#fff8ec', '#F59E0B'],
  tempo:     ['#f5f3ff', '#7c3aed'],
};

function money(v) {
  const n = Number(v);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
}

function VehicleRateCard({ rate, cityName, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [catBg, catColor] = CLASS_COLORS[rate.vehicleClass] || ['#F7F8FC', '#6B7280'];
  const tripLabel = TRIP_TYPES.find((t) => t.value === rate.tripType)?.label || rate.tripType;

  const advancedTags = [
    Number(rate.driverAllowance) > 0 && 'Driver allowance',
    (Number(rate.nightAllowance) > 0 || Number(rate.nightChargePct) > 0) && 'Night charge',
    Number(rate.returnEmptyPct) > 0 && 'Return-empty %',
    Number(rate.minKmPerDay) > 0 && 'Min km/day',
    Number(rate.airportSurcharge) > 0 && 'Airport surcharge',
    Number(rate.hourlyRate) > 0 && 'Hourly rate',
  ].filter(Boolean);

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB', opacity: rate.isActive ? 1 : 0.6 }}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="h-12 w-12 rounded-xl grid place-items-center shrink-0 text-center" style={{ backgroundColor: catBg }}>
          <Car size={16} style={{ color: catColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-snug capitalize" style={{ color: '#1F2937' }}>
            {rate.vehicleClass} · {tripLabel}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[12.5px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: catBg, color: catColor }}>
              <MapPin size={10} className="inline -mt-0.5 mr-0.5" />{cityName || `City #${rate.cityId}`}
            </span>
            {!rate.isActive && <Badge tone="slate">Inactive</Badge>}
            {advancedTags.map((tag) => (
              <span key={tag} className="text-[11.5px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#F7F8FC', color: '#6B7280' }}>{tag}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onToggle(rate)} className="p-1.5 rounded-lg focus-ring" title={rate.isActive ? 'Deactivate' : 'Activate'}
            style={{ color: rate.isActive ? '#38B763' : '#6B7280' }}>
            {rate.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
          <IconButton icon={Pencil} label="Edit" onClick={() => onEdit(rate)} />
          <IconButton icon={Trash2} label="Delete" variant="danger" onClick={() => onDelete(rate)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-0" style={{ borderTop: '1px solid #F7F8FC' }}>
        <div className="p-3" style={{ borderRight: '1px solid #F7F8FC' }}>
          <p className="text-[11.5px] font-bold uppercase tracking-wider mb-1" style={{ color: '#3B65DB' }}>Base fare</p>
          <p className="text-base font-black" style={{ color: '#1F2937' }}>{money(rate.baseFare)}</p>
        </div>
        <div className="p-3" style={{ borderRight: '1px solid #F7F8FC' }}>
          <p className="text-[11.5px] font-bold uppercase tracking-wider mb-1" style={{ color: '#F59E0B' }}>Per KM</p>
          <p className="text-base font-black" style={{ color: '#1F2937' }}>{money(rate.perKm)}</p>
        </div>
        <div className="p-3">
          <p className="text-[11.5px] font-bold uppercase tracking-wider mb-1" style={{ color: '#7c3aed' }}>Minimum</p>
          <p className="text-base font-black" style={{ color: '#1F2937' }}>{money(rate.minimumFare)}</p>
        </div>
      </div>

      {advancedTags.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium focus-ring"
            style={{ borderTop: '1px solid #F7F8FC', color: '#6B7280', backgroundColor: '#FAFAFA' }}
          >
            {expanded ? <><ChevronUp size={13} /> Hide advanced details</> : <><ChevronDown size={13} /> Show advanced details</>}
          </button>
          {expanded && (
            <div className="p-3 space-y-1.5" style={{ borderTop: '1px solid #F7F8FC', backgroundColor: '#fffcf5' }}>
              {Number(rate.driverAllowance) > 0 && <RateRow icon="👤" label="Driver allowance/day" value={money(rate.driverAllowance)} />}
              {(Number(rate.nightAllowance) > 0 || Number(rate.nightChargePct) > 0) && (
                <RateRow icon="🌙" label={`Night (${String(rate.nightStartHour).padStart(2, '0')}:${String(rate.nightStartMinute).padStart(2, '0')}–${String(rate.nightEndHour).padStart(2, '0')}:${String(rate.nightEndMinute).padStart(2, '0')})`}
                  value={`${money(rate.nightAllowance)}${Number(rate.nightChargePct) > 0 ? ` + ${rate.nightChargePct}%` : ''}`} />
              )}
              {Number(rate.returnEmptyPct) > 0 && <RateRow icon="↩" label="Return-empty %" value={`${rate.returnEmptyPct}%`} />}
              {Number(rate.minKmPerDay) > 0 && <RateRow icon="🗓" label="Min km/day" value={`${rate.minKmPerDay} km`} />}
              {Number(rate.airportSurcharge) > 0 && <RateRow icon="✈️" label="Airport surcharge" value={money(rate.airportSurcharge)} />}
              {Number(rate.hourlyRate) > 0 && <RateRow icon="⏱" label="Hourly rate" value={`${money(rate.hourlyRate)}/hr · ${rate.hourlyKmPerHour} km/hr included`} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RateRow({ icon, label, value, highlight }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12.5px]" style={{ color: '#6B7280' }}>{icon} {label}</span>
      <span className="text-[12.5px] font-bold" style={{ color: highlight ? '#1F2937':'#6B7280' }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// Vehicle Rates Tab — main panel, wired to the real fareConfigService
// ─────────────────────────────────────────────────────────────────────────────
function VehicleRatesTab() {
  const [rates, setRates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [delLoad, setDelLoad] = useState(false);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [tripFilter, setTripFilter] = useState('');
  const toast = useToast();

  const reload = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([fareConfigService.list(), fareConfigService.cities()])
      .then(([{ rows }, cityRows]) => { setRates(rows || []); setCities(cityRows || []); })
      .catch((e) => setLoadError(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const cityName = (id) => cities.find((c) => c.id === id)?.name;

  const filtered = useMemo(() => rates.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.vehicleClass.toLowerCase().includes(q) || (cityName(r.cityId) || '').toLowerCase().includes(q);
    const matchClass  = !classFilter || r.vehicleClass === classFilter;
    const matchTrip   = !tripFilter  || r.tripType === tripFilter;
    return matchSearch && matchClass && matchTrip;
  }), [rates, cities, search, classFilter, tripFilter]);

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await fareConfigService.update(editing.id, values);
        toast.success('Rate card updated — new quotes use this immediately');
      } else {
        await fareConfigService.create(values);
        toast.success('Rate card created — new quotes use this immediately');
      }
      setEditing(null); setFormOpen(false); reload();
    } catch (e) {
      toast.error(e.message || 'Save failed');
    }
  };

  const handleToggle = async (rate) => {
    try {
      await fareConfigService.setActive(rate.id, !rate.isActive);
      toast.success(rate.isActive ? 'Rate card deactivated' : 'Rate card activated');
      reload();
    } catch (e) {
      toast.error(e.message || 'Update failed');
    }
  };

  const handleDelete = async () => {
    setDelLoad(true);
    try {
      await fareConfigService.remove(deleting.id);
      toast.success('Rate card deleted');
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeleting(null); setDelLoad(false); reload();
    }
  };

  const totalActive = rates.filter((r) => r.isActive).length;
  const classes = [...new Set(rates.map((r) => r.vehicleClass))];

  if (loading) return <LoadingState label="Loading vehicle rate cards…" />;

  if (loadError) {
    // Distinguish WHY it failed rather than showing one generic message —
    // "the route doesn't exist" (backend not updated yet) and "you lack
    // FARE_EDIT" (backend is fine, this account isn't) need different fixes,
    // and neither should look like a raw app crash.
    const isMissingRoute = loadError.code === 'ENDPOINT_NOT_IMPLEMENTED' || loadError.status === 404;
    const isForbidden = loadError.status === 403;

    if (isMissingRoute) {
      return (
        <Alert type="warning">
          <strong>Vehicle Rate Cards isn't available on this backend yet.</strong> The pricing endpoints
          this tab needs haven't been deployed here. Deploy the updated backend, then reload this page —
          nothing else in the app is affected.
        </Alert>
      );
    }
    if (isForbidden) {
      return (
        <Alert type="error">
          <strong>You don't have permission to manage rate cards.</strong> This needs the FARE_EDIT
          permission — ask an Admin to grant it, or sign in as a user who already has it.
        </Alert>
      );
    }
    return (
      <Alert type="error">
        Could not load rate cards: {loadError.message || 'Unknown error'}.
      </Alert>
    );
  }

  return (
    <>
      <Alert type="success" className="mb-4">
        <strong>Connected to live pricing.</strong> This tab reads and writes the real fare configuration
        — changes here take effect on the next quote a customer requests.
      </Alert>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Rate Cards', value: rates.length,  color: '#3B65DB', bg: '#eef2fb' },
          { label: 'Active',           value: totalActive,   color: '#38B763', bg: '#f0fdf4' },
          { label: 'Vehicle Classes',  value: classes.length, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Inactive',         value: rates.length - totalActive, color: '#F59E0B', bg: '#fffbeb' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border px-4 py-3" style={{ backgroundColor: s.bg, borderColor: s.bg }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-medium" style={{ color: s.color, opacity: 0.8 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search vehicle class or city…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus-ring"
            style={{ borderColor: '#E5E7EB', color: '#1F2937', outline: 'none', backgroundColor: '#fff' }}
          />
        </div>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border focus-ring"
          style={{ borderColor: '#E5E7EB', color: classFilter ? '#1F2937':'#6B7280', backgroundColor: '#fff' }}>
          <option value="">All vehicle classes</option>
          {VEHICLE_CLASSES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={tripFilter} onChange={e => setTripFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border focus-ring"
          style={{ borderColor: '#E5E7EB', color: tripFilter ? '#1F2937':'#6B7280', backgroundColor: '#fff' }}>
          <option value="">All trip types</option>
          {TRIP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <Button icon={Plus} disabled={cities.length === 0} onClick={() => { setEditing(null); setFormOpen(true); }}>
          Add Rate Card
        </Button>
      </div>

      {cities.length === 0 && (
        <Alert type="warning" className="mb-4">
          No cities are configured on the backend yet, so a rate card can't be created (every rate card
          needs a city). Add a city first.
        </Alert>
      )}

      {/* Rate cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: '#6B7280' }}>
          <Car size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">{rates.length === 0 ? 'No rate cards configured yet.' : 'No rate cards match your filters.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {filtered.map(rate => (
            <VehicleRateCard
              key={rate.id} rate={rate} cityName={cityName(rate.cityId)}
              onEdit={r => { setEditing(r); setFormOpen(true); }}
              onDelete={r => setDeleting(r)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? 'Edit Rate Card' : 'Add Rate Card'}
        size="lg"
      >
        <VehicleRateForm
          initial={editing}
          cities={cities}
          onSubmit={handleSubmit}
          onClose={() => { setFormOpen(false); setEditing(null); }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        loading={delLoad} danger title="Delete rate card?"
        confirmLabel="Delete"
        description={`This ${deleting?.vehicleClass} / ${TRIP_TYPES.find(t => t.value === deleting?.tripType)?.label} rate card will be permanently removed. Past bookings already priced against it keep their frozen fare and are unaffected.`}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page root
//
// FIX: the Masters page used to have four tabs — Vehicle Rate Cards, Cargo
// Types, Zones, and a standalone "Rate Cards" tab. Only Vehicle Rate Cards
// was ever real. The other three had no backend table or endpoint at all —
// Cargo Types was leftover from an unrelated freight-transport concept this
// business doesn't have, Zones has no geographic-grouping concept anywhere
// in the schema, and the standalone Rate Cards tab was a second, redundant,
// disconnected pricing model that duplicated (and conflicted with) the real
// one. All three, and the tab bar and generic mock-CRUD list that rendered
// them, are removed rather than kept as permanent fake UI. If a real need
// for cargo classification, service zones, or a separate rate-card concept
// shows up later, it should be designed against an actual backend model,
// not resurrected from this mock scaffolding.
// ─────────────────────────────────────────────────────────────────────────────
export default function Masters() {
  return (
    <div>
      <PageHeader
        title="Vehicle Rate Cards"
        description="Set the fare — base fare, per-KM rate, and any outstation, night, driver-allowance or hourly-rental rules — for each vehicle class and trip type."
      />
      <VehicleRatesTab />
    </div>
  );
}
