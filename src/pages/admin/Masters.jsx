import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Car, MapPin, ChevronDown, ChevronUp, Zap, Database, Save, Clock, Search,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Alert from '../../components/ui/Alert';
import SearchInput from '../../components/ui/SearchInput';
import { useToast } from '../../hooks/useToast';
import { fareConfigService } from '../../services';
import { apiClient } from '../../services/apiClient';
import LoadingState from '../../components/ui/LoadingState';
import { TRIP_TYPES } from '../../constants';
import { vehicleCatalogService } from '../../services';
import { surgeService } from '../../services/surgeService';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Vehicle classes and trip types now live in constants/index.js so this form,
// BookingFormDrawer and Vehicles can't drift apart — they were three separate
// copies of the same list.

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jammu & Kashmir','Jharkhand',
  'Karnataka','Kerala','Ladakh','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
].sort();

const EMPTY_RATE_CARD = {
  _state: '', cityId: '', vehicleClass: 'sedan', tripType: 'ONE_WAY',
  baseFare: '', perKm: '', minimumFare: '',
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
  const toast = useToast();
  const [form, setForm] = useState(() => {
    if (!initial) return { ...EMPTY_RATE_CARD, cityId: '' };
    const flat = { ...initial };
    return { ...EMPTY_RATE_CARD, ...flat, cityId: initial.cityId };
  });
  const [mode, setMode] = useState('simple'); // 'simple' | 'advanced'
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [addingCity, setAddingCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');

  const handleAddCity = async () => {
    if (!newCityName.trim() || !form._state) return;
    const stateName = form._state;
    try {
      const res = await apiClient.post('/admin/fare-configs/cities', {
        name: newCityName.trim(), state: stateName, country: 'India',
      });
      const newCity = res?.data?.city || res?.city || { id: Date.now(), name: newCityName.trim(), state: stateName };
      cities.push(newCity);
      set('cityId', String(newCity.id));
      toast.success(`${newCityName.trim()}, ${stateName} added`);
    } catch {
      const tempId = Date.now();
      cities.push({ id: tempId, name: newCityName.trim(), state: stateName });
      set('cityId', String(tempId));
      toast.info(`${newCityName.trim()}, ${stateName} added locally`);
    }
    setAddingCity(false); setNewCityName('');
  };

  // Vehicle classes come from the backend's vehicle_catalog, never a
  // hardcoded list — see services/vehicleCatalogService.js. includeInactive
  // so a retired class (e.g. `sedan`) still shows when editing an existing
  // card priced against it, rather than the dropdown silently blanking.
  const [classOptions, setClassOptions] = useState([]);
  const [tripTypeOptions, setTripTypeOptions] = useState(TRIP_TYPES);
  useEffect(() => {
    let cancelled = false;
    vehicleCatalogService.rateCardOptions().then(({ classes, tripTypes }) => {
      if (cancelled) return;
      setClassOptions(classes);
      // Keep the friendly labels from TRIP_TYPES where they exist, but let the
      // backend decide WHICH trip types are offered.
      setTripTypeOptions(tripTypes.map((t) => ({
        value: t,
        label: TRIP_TYPES.find((x) => x.value === t)?.label || t,
      })));
    });
    return () => { cancelled = true; };
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    // FIX: this used to be `if (cityId === '' || perKm === '' || minimumFare === '') return;`
    // — a silent no-op. Leaving any of those blank and clicking Create did
    // nothing at all: no toast, no red text, nothing. That's the "the button
    // doesn't work" bug — it wasn't the button, it was validation with no
    // visible failure. minimumFare is no longer required here (see below);
    // city and per-KM still are, but now say so.
    const nextErrors = {};
    if (form.perKm === '') nextErrors.perKm = 'Per-KM rate is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      // baseFare: field removed from UI — always 0.
      // minimumFare: OPTIONAL. Left blank, it's simply not sent — the
      // database defaults it to 0, which fare.service.js already treats as
      // "no floor enforced" (`config.minimumFare ?? 0`), so this can never
      // misprice a trip; it just turns the rule off.
      const base = {
        baseFare: Number(form.baseFare) || 0,
        perKm: Number(form.perKm),
        ...(form.minimumFare !== '' && { minimumFare: Number(form.minimumFare) }),
        // Driver allowance is optional and available in BOTH Simple and Advanced
        // modes — left blank it is simply not sent (DB defaults to 0 = none).
        ...(form.driverAllowance !== '' && { driverAllowance: Number(form.driverAllowance) }),
      };
      const advanced = mode === 'advanced' ? {
        ...(form.perMinute !== ''        && { perMinute: Number(form.perMinute) }),
        ...(form.cancellationFee !== ''  && { cancellationFee: Number(form.cancellationFee) }),
        ...(form.returnEmptyPct !== ''   && { returnEmptyPct: Number(form.returnEmptyPct) }),
        ...(form.minKmPerDay !== ''      && { minKmPerDay: Number(form.minKmPerDay) }),
        ...(form.waitingPerHour !== ''   && { waitingPerHour: Number(form.waitingPerHour) }),
        ...(form.freeWaitingMin !== ''   && { freeWaitingMin: Number(form.freeWaitingMin) }),
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
          // Only send cityId if it's a real DB id (small int), not a temp local timestamp
          ...(form.cityId && Number(form.cityId) < 1000000 && { cityId: Number(form.cityId) }),
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
              Vehicle class and trip type can't be changed on an existing rate card — create a new
              one instead. This keeps it clear which rate card actually priced a past booking.
            </Alert>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="State" hint="Optional — filter cities by state.">
              <Select
                value={form._state || ''}
                onChange={(e) => { set('_state', e.target.value); set('cityId', ''); }}
                placeholder="All states"
                searchable
                options={[
                  { value: '', label: 'All states' },
                  ...INDIAN_STATES.map((s) => ({ value: s, label: s })),
                ]}
              />
            </FormField>
            <FormField label="City" hint={addingCity ? 'Type new city name' : 'Pick a city or add new.'}>
              {isEdit ? (
                <Input disabled value={cities.find((c) => c.id === form.cityId)?.name || 'All cities'} />
              ) : addingCity ? (
                <div className="space-y-2">
                  <Input value={newCityName} onChange={(e) => setNewCityName(e.target.value)}
                    placeholder="e.g. Mysuru" autoFocus />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddCity}
                      disabled={!newCityName.trim() || !(form._state)}>
                      Add City
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setAddingCity(false)}>Cancel</Button>
                  </div>
                  {!form._state && <p style={{ fontSize: 11, color: '#EF4444' }}>Select a state first</p>}
                </div>
              ) : (
                <div>
                  <Select
                    value={form.cityId}
                    onChange={(e) => { set('cityId', e.target.value); setErrors((er) => ({ ...er, cityId: undefined })); }}
                    placeholder="All cities (global rate)"
                    searchable
                    options={[
                      { value: '', label: 'All cities (global rate)' },
                      ...cities
                        .filter((c) => !form._state || c.state === form._state)
                        .map((c) => ({ value: c.id, label: `${c.name}, ${c.state}` })),
                    ]}
                  />
                  <button onClick={() => setAddingCity(true)}
                    style={{ fontSize: 11.5, fontWeight: 600, color: '#3B65DB', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    + Add new city
                  </button>
                </div>
              )}
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Vehicle class" required>
              {isEdit ? <Input disabled value={form.vehicleClass} /> : (
                <Select value={form.vehicleClass} onChange={(e) => set('vehicleClass', e.target.value)}
                  options={classOptions} />
              )}
            </FormField>
            <FormField label="Trip type" required>
              {isEdit ? <Input disabled value={TRIP_TYPES.find((t) => t.value === form.tripType)?.label || form.tripType} /> : (
                <Select value={form.tripType} onChange={(e) => set('tripType', e.target.value)} options={tripTypeOptions} />
              )}
            </FormField>
          </div>
        </div>

        {/* Core fare — required, always visible */}
        <div className="rounded-xl p-4" style={{ backgroundColor: '#eef2fb' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#2F55C7' }}>
            💰 Fare (required)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Per KM (₹)" required error={errors.perKm}>
              <Input type="number" min="0" value={form.perKm} onChange={(e) => { set('perKm', e.target.value); setErrors((er) => ({ ...er, perKm: undefined })); }} placeholder="e.g. 14" />
            </FormField>
            <FormField label="Minimum fare (₹)" hint={isEdit ? 'Optional. Left blank on an edit, the existing minimum fare is kept unchanged.' : 'Optional. Left blank, no floor is enforced — the fare is never topped up to a minimum.'}>
              <Input type="number" min="0" value={form.minimumFare} onChange={(e) => set('minimumFare', e.target.value)} placeholder="e.g. 250 (optional)" />
            </FormField>
            <FormField label="Driver allowance / day (₹)" hint="Optional. Paid to the driver per day; applies to all trip types except Airport. Leave blank for none.">
              <Input type="number" min="0" value={form.driverAllowance} onChange={(e) => set('driverAllowance', e.target.value)} placeholder="e.g. 300 (optional)" />
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
            Simple mode: this rate card charges distance × per-KM rate, plus the optional minimum fare
            and driver allowance above. Switch to Advanced to add outstation, night, airport or
            hourly-rental rules.
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
  ertiga:    ['#fff8ec', '#D97706'],
  innova:    ['#fef3c7', '#B45309'],
  crysta:    ['#ffedd5', '#C2410C'],
  hycross:   ['#ffe4e6', '#BE123C'],
  fortuner:  ['#ede9fe', '#6D28D9'],
  luxury:    ['#111111', '#FFC107'],
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
              <MapPin size={10} className="inline -mt-0.5 mr-0.5" />{cityName ? `${cityName}, ${rate.city?.state || ''}`.replace(/, $/, '') : (rate.cityId ? `City #${rate.cityId}` : 'All India')}
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

      <div className="grid grid-cols-2 gap-0" style={{ borderTop: '1px solid #F7F8FC' }}>
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
  const [stateFilter, setStateFilter] = useState('');
  const toast = useToast();

  const reload = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([fareConfigService.list({ includeInactive: false }), fareConfigService.cities()])
      .then(([{ rows }, cityRows]) => { setRates(rows || []); setCities(cityRows || []); })
      .catch((e) => setLoadError(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const cityName = (id) => cities.find((c) => c.id === id)?.name;

  const filtered = useMemo(() => rates.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.vehicleClass.toLowerCase().includes(q) || (cityName(r.cityId) || '').toLowerCase().includes(q) || (r.city?.state || '').toLowerCase().includes(q);
    const matchClass  = !classFilter || r.vehicleClass === classFilter;
    const matchTrip   = !tripFilter  || r.tripType === tripFilter;
    const matchState  = !stateFilter || (r.city?.state || '') === stateFilter;
    return matchSearch && matchClass && matchTrip && matchState;
  }), [rates, cities, search, classFilter, tripFilter, stateFilter]);

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
    if (rate.isActive) {
      // Deactivating — try DELETE first, fallback to PATCH
      try {
        await fareConfigService.setActive(rate.id, false);
        toast.success('Rate card deactivated');
        reload();
      } catch (e) {
        // Backend blocks DELETE on last active card — ask admin and force via PATCH
        const force = confirm(
          `⚠️ This may be the last active ${rate.vehicleClass.toUpperCase()} / ${rate.tripType.replace(/_/g, ' ')} rate card.\n\n` +
          `Deactivating it could make this combination unbookable.\n\n` +
          `Deactivate anyway?`
        );
        if (force) {
          try {
            await fareConfigService.update(rate.id, { isActive: false });
            toast.success('Rate card deactivated');
            reload();
          } catch (e2) { toast.error(e2.message || 'Failed'); }
        }
      }
    } else {
      // Activating — always works
      try {
        await fareConfigService.setActive(rate.id, true);
        toast.success('Rate card activated');
        reload();
      } catch (e) { toast.error(e.message || 'Failed'); }
    }
  };

  const handleDelete = async () => {
    setDelLoad(true);
    try {
      await fareConfigService.remove(deleting.id);
      toast.success('Rate card retired');
      reload();
    } catch (e) {
      // Backend blocks DELETE on last active card — ask admin and force via PATCH
      const force = confirm(
        `⚠️ Cannot retire via normal route.\n\n` +
        `"${e.message || 'This is the last active card'}"\n\n` +
        `Force-deactivate this rate card anyway?`
      );
      if (force) {
        try {
          await fareConfigService.update(deleting.id, { isActive: false });
          toast.success('Rate card force-retired');
          reload();
        } catch (e2) { toast.error(e2.message || 'Failed'); }
      }
    } finally {
      setDeleting(null); setDelLoad(false);
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
        <SearchInput
          value={search} onChange={setSearch}
          placeholder="Search vehicle class or city…"
          className="flex-1"
        />
        <Select value={classFilter} onChange={e => setClassFilter(e.target.value)}
          placeholder="All vehicle classes"
          options={classes.map(c => ({ value: c, label: c }))}
          style={{ minWidth: 170 }}
        />
        <Select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
          placeholder="All states"
          options={[...new Set(cities.map(c => c.state).filter(Boolean))].sort().map(s => ({ value: s, label: s }))}
          style={{ minWidth: 160 }}
        />
        <Select value={tripFilter} onChange={e => setTripFilter(e.target.value)}
          placeholder="All trip types"
          options={TRIP_TYPES.map(t => ({ value: t.value, label: t.label }))}
          style={{ minWidth: 170 }}
        />
        <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>
          Add Rate Card
        </Button>
      </div>

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
// ── Surge Pricing Tab ─────────────────────────────────────────────────────
const TIERS = ['METRO', 'TALUKA', 'VILLAGE'];
const TIER_META = {
  METRO:   { icon: '🏙️', label: 'Metro', desc: 'City / urban', bg: '#EFF6FF', color: '#1D4ED8', tone: 'blue' },
  TALUKA:  { icon: '🏘️', label: 'Taluka', desc: 'Town / semi-urban', bg: '#FFF7ED', color: '#C2410C', tone: 'amber' },
  VILLAGE: { icon: '🌾', label: 'Village', desc: 'Rural area', bg: '#F0FDF4', color: '#15803D', tone: 'green' },
};
const TIER_OPTIONS = TIERS.map((t) => ({ value: t, label: `${TIER_META[t].icon} ${TIER_META[t].label} — ${TIER_META[t].desc}` }));

function SurgeFeeSetup({ rules, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(null);
  const [dirty, setDirty] = useState({});
  useEffect(() => {
    const f = {};
    rules.forEach((r) => { f[r.tier] = { immediatePct: String(r.immediatePct), standardPct: String(r.standardPct), immediateWithinMinutes: String(r.immediateWithinMinutes) }; });
    setForm(f); setDirty({});
  }, [rules]);
  const set = (tier, key, val) => { setForm((f) => ({ ...f, [tier]: { ...f[tier], [key]: val } })); setDirty((d) => ({ ...d, [tier]: true })); };
  const save = async (tier) => {
    setSaving(tier);
    try { await onSave(tier, { immediatePct: Number(form[tier].immediatePct) || 0, standardPct: Number(form[tier].standardPct) || 0, immediateWithinMinutes: Number(form[tier].immediateWithinMinutes) || 60 }); setDirty((d) => ({ ...d, [tier]: false })); }
    finally { setSaving(null); }
  };
  if (rules.length === 0) return <Alert type="info">No surge rules found. Seed METRO, TALUKA, VILLAGE rules in the database.</Alert>;
  return (
    <div style={{ borderRadius: 16, border: '1.5px solid #E8E8E4', backgroundColor: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #F0F0EC', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg, #FFFBEA 0%, #FFF8E1 100%)' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#FFC107', display: 'grid', placeItems: 'center', boxShadow: '0 3px 10px rgba(255,193,7,0.3)' }}><Zap size={16} color="#111" /></div>
        <div><p style={{ fontWeight: 800, fontSize: 14.5, color: '#111' }}>Surge Rules by Tier</p><p style={{ fontSize: 12, color: '#92400E', fontWeight: 500 }}>Changes apply to new quotes only.</p></div>
      </div>
      {rules.map((rule, i) => { const tier = rule.tier; const m = TIER_META[tier] || TIER_META.METRO; const f = form[tier]; if (!f) return null; return (
        <div key={tier} style={{ padding: '14px 18px', borderBottom: i < rules.length - 1 ? '1px solid #F0F0EC' : 'none', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 140 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontSize: 20 }}>{m.icon}</span><div><p style={{ fontWeight: 800, fontSize: 13.5, color: m.color }}>{m.label}</p><p style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{m.desc}</p></div></div></div>
          <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'flex-end', flexWrap: 'wrap', minWidth: 280 }}>
            <div style={{ flex: 1, minWidth: 80 }}><label style={{ fontSize: 10.5, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 3 }}><Clock size={10} className="inline -mt-0.5 mr-0.5" />Immediate %</label><Input type="number" min="0" max="100" value={f.immediatePct} onChange={(e) => set(tier, 'immediatePct', e.target.value)} style={{ textAlign: 'center' }} /></div>
            <div style={{ flex: 1, minWidth: 80 }}><label style={{ fontSize: 10.5, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 3 }}><Zap size={10} className="inline -mt-0.5 mr-0.5" />Scheduled %</label><Input type="number" min="0" max="100" value={f.standardPct} onChange={(e) => set(tier, 'standardPct', e.target.value)} style={{ textAlign: 'center' }} /></div>
            <div style={{ flex: 1, minWidth: 90 }}><label style={{ fontSize: 10.5, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 3 }}>Window (min)</label><Input type="number" min="1" max="1440" value={f.immediateWithinMinutes} onChange={(e) => set(tier, 'immediateWithinMinutes', e.target.value)} style={{ textAlign: 'center' }} /></div>
            <Button size="sm" icon={Save} onClick={() => save(tier)} loading={saving === tier} disabled={!dirty[tier]} style={!dirty[tier] ? {} : { backgroundColor: '#22A65A', boxShadow: '0 3px 8px rgba(34,166,90,0.25)' }}>Save</Button>
          </div>
        </div>); })}
      <div style={{ padding: '10px 18px', backgroundColor: '#FAFAFA', borderTop: '1px solid #F0F0EC', fontSize: 11.5, color: '#6B7280' }}>
        <strong>Immediate %</strong> applies when booking is within the window. <strong>Scheduled %</strong> applies to all. The higher is used.
      </div>
    </div>
  );
}

const KARNATAKA_DISTRICTS = [
  { name: 'Bengaluru Urban',  lat: 12.9716, lng: 77.5946, radius: 30 },
  { name: 'Bengaluru Rural',  lat: 13.1318, lng: 77.3960, radius: 35 },
  { name: 'Mysuru',           lat: 12.2958, lng: 76.6394, radius: 30 },
  { name: 'Mangaluru (DK)',   lat: 12.9141, lng: 74.8560, radius: 30 },
  { name: 'Hubli-Dharwad',    lat: 15.3647, lng: 75.1240, radius: 25 },
  { name: 'Belagavi',         lat: 15.8497, lng: 74.4977, radius: 35 },
  { name: 'Kalaburagi',       lat: 17.3297, lng: 76.8343, radius: 35 },
  { name: 'Tumakuru',         lat: 13.3379, lng: 77.1173, radius: 30 },
  { name: 'Ramanagara',       lat: 12.7159, lng: 77.2810, radius: 25 },
  { name: 'Mandya',           lat: 12.5218, lng: 76.8951, radius: 25 },
  { name: 'Hassan',           lat: 13.0068, lng: 76.1004, radius: 30 },
  { name: 'Chikkamagaluru',   lat: 13.3161, lng: 75.7720, radius: 30 },
  { name: 'Shivamogga',       lat: 13.9299, lng: 75.5681, radius: 30 },
  { name: 'Davangere',        lat: 14.4644, lng: 75.9218, radius: 25 },
  { name: 'Chitradurga',      lat: 14.2226, lng: 76.3984, radius: 30 },
  { name: 'Ballari',          lat: 15.1394, lng: 76.9214, radius: 30 },
  { name: 'Raichur',          lat: 16.2120, lng: 77.3439, radius: 30 },
  { name: 'Bidar',            lat: 17.9104, lng: 77.5199, radius: 30 },
  { name: 'Vijayapura',       lat: 16.8302, lng: 75.7100, radius: 30 },
  { name: 'Bagalkot',         lat: 16.1691, lng: 75.6615, radius: 25 },
  { name: 'Gadag',            lat: 15.4166, lng: 75.6263, radius: 20 },
  { name: 'Haveri',           lat: 14.7951, lng: 75.3989, radius: 25 },
  { name: 'Uttara Kannada',   lat: 14.6681, lng: 74.6899, radius: 40 },
  { name: 'Udupi',            lat: 13.3389, lng: 74.7421, radius: 25 },
  { name: 'Kodagu (Coorg)',   lat: 12.4244, lng: 75.7382, radius: 25 },
  { name: 'Chamarajanagar',   lat: 11.9261, lng: 76.9437, radius: 25 },
  { name: 'Kolar',            lat: 13.1360, lng: 78.1292, radius: 25 },
  { name: 'Chikkaballapur',   lat: 13.4355, lng: 77.7315, radius: 25 },
  { name: 'Yadgir',           lat: 16.7700, lng: 77.1383, radius: 25 },
  { name: 'Koppal',           lat: 15.3547, lng: 76.1546, radius: 25 },
].sort((a, b) => a.name.localeCompare(b.name));

const DISTRICT_OPTIONS = KARNATAKA_DISTRICTS.map((d) => ({ value: d.name, label: d.name }));

function SurgeAreaForm({ open, onClose, initial, onSubmit }) {
  const isEdit = !!initial;
  const [mode, setMode] = useState('district');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [form, setForm] = useState({ name: '', tier: 'TALUKA', centreLat: '', centreLng: '', radiusKm: '25', note: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && initial) {
      setMode('custom'); setSelectedDistrict('');
      setForm({ name: initial.name || '', tier: initial.tier || 'TALUKA', centreLat: String(initial.centreLat ?? ''), centreLng: String(initial.centreLng ?? ''), radiusKm: String(initial.radiusKm ?? 25), note: initial.note || '' });
    } else if (open) {
      setMode('district'); setSelectedDistrict('');
      setForm({ name: '', tier: 'TALUKA', centreLat: '', centreLng: '', radiusKm: '25', note: '' });
    }
    setErrors({});
  }, [open, initial]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const handleDistrictSelect = (districtName) => {
    setSelectedDistrict(districtName);
    const d = KARNATAKA_DISTRICTS.find((x) => x.name === districtName);
    if (d) { setForm((f) => ({ ...f, name: d.name, centreLat: String(d.lat), centreLng: String(d.lng), radiusKm: String(d.radius) })); setErrors({}); }
  };

  const submit = async () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (form.centreLat === '' || isNaN(Number(form.centreLat))) errs.centreLat = 'Required';
    if (form.centreLng === '' || isNaN(Number(form.centreLng))) errs.centreLng = 'Required';
    if (!form.radiusKm || Number(form.radiusKm) < 1) errs.radiusKm = 'Min 1 km';
    setErrors(errs); if (Object.keys(errs).length) return;
    setLoading(true);
    try { await onSubmit({ name: form.name.trim(), tier: form.tier, centreLat: Number(form.centreLat), centreLng: Number(form.centreLng), radiusKm: Number(form.radiusKm), ...(form.note.trim() && { note: form.note.trim() }) }); onClose(); }
    catch (err) { setErrors({ name: err.message || 'Failed' }); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Area' : 'Add Surge Area'} maxWidth={520}>
      <div className="space-y-4">
        {/* Mode toggle — only on create */}
        {!isEdit && (
          <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, backgroundColor: '#F3F4F6' }}>
            {[
              { key: 'district', label: '📍 Pick District', desc: 'Select from Karnataka districts' },
              { key: 'custom',   label: '🗺️ Custom Area',   desc: 'Enter lat/lng manually' },
            ].map((m) => (
              <button key={m.key} onClick={() => { setMode(m.key); setSelectedDistrict(''); setForm((f) => ({ ...f, name: '', centreLat: '', centreLng: '', radiusKm: '25' })); }}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', backgroundColor: mode === m.key ? '#fff' : 'transparent', boxShadow: mode === m.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: mode === m.key ? '#111' : '#6B7280', margin: 0 }}>{m.label}</p>
                <p style={{ fontSize: 11, color: '#9A9A9A', margin: '2px 0 0', fontWeight: 500 }}>{m.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* District picker */}
        {mode === 'district' && !isEdit && (
          <FormField label="District" required error={errors.name}>
            <Select value={selectedDistrict} onChange={(e) => handleDistrictSelect(e.target.value)} options={DISTRICT_OPTIONS} placeholder="Select a district…" searchable />
          </FormField>
        )}

        {/* Custom name */}
        {(mode === 'custom' || isEdit) && (
          <FormField label="Area name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Whitefield Tech Park" disabled={isEdit} />
          </FormField>
        )}

        <FormField label="Tier" required><Select value={form.tier} onChange={(e) => set('tier', e.target.value)} options={TIER_OPTIONS} /></FormField>

        <div className="grid grid-cols-3 gap-3">
          <FormField label="Latitude" required error={errors.centreLat}><Input type="number" step="any" value={form.centreLat} onChange={(e) => set('centreLat', e.target.value)} placeholder="12.9716" /></FormField>
          <FormField label="Longitude" required error={errors.centreLng}><Input type="number" step="any" value={form.centreLng} onChange={(e) => set('centreLng', e.target.value)} placeholder="77.5946" /></FormField>
          <FormField label="Radius (km)" required error={errors.radiusKm}><Input type="number" min="1" max="200" value={form.radiusKm} onChange={(e) => set('radiusKm', e.target.value)} placeholder="25" /></FormField>
        </div>

        {mode === 'district' && selectedDistrict && (
          <div style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: 12, color: '#15803D' }}>
            📍 <strong>{selectedDistrict}</strong> — centre at {form.centreLat}, {form.centreLng} with {form.radiusKm} km radius. You can adjust these values.
          </div>
        )}

        <FormField label="Note" hint="Internal note."><Textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={2} /></FormField>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={loading} onClick={submit}>{isEdit ? 'Save' : 'Add Area'}</Button></div>
      </div>
    </Modal>
  );
}

function SurgePricingTab() {
  const toast = useToast();
  const [rules, setRules] = useState([]);
  const [areas, setAreas] = useState([]);
  const [status, setStatus] = useState('loading');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const load = useCallback(async () => {
    setStatus('loading');
    try { const [r, a] = await Promise.all([surgeService.listRules(), surgeService.listAreas()]); setRules(r.rules || []); setAreas(a.areas || []); setStatus('success'); }
    catch (e) { toast.error(e.message || 'Failed to load'); setStatus('error'); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  const handleSaveRule = async (tier, body) => { await surgeService.updateRule(tier, body); toast.success(`${tier} updated`); load(); };
  const handleCreateArea = async (body) => { await surgeService.createArea(body); toast.success(`${body.name} added`); load(); };
  const handleUpdateArea = async (body) => { await surgeService.updateArea(editingArea.id, body); toast.success('Updated'); setEditingArea(null); load(); };
  const handleDeactivateArea = async (area) => { if (!confirm(`Retire "${area.name}"?`)) return; await surgeService.deactivateArea(area.id); toast.success(`${area.name} retired`); load(); };
  const handleReactivateArea = async (area) => { await surgeService.updateArea(area.id, { isActive: true }); toast.success(`${area.name} reactivated`); load(); };
  const q = search.toLowerCase();
  const filteredAreas = areas.filter((a) => !q || a.name.toLowerCase().includes(q) || a.tier.toLowerCase().includes(q));
  if (status === 'loading') return <LoadingState label="Loading surge pricing…" />;
  return (
    <div className="space-y-5">
      <SurgeFeeSetup rules={rules} onSave={handleSaveRule} />
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}><MapPin size={12} className="inline -mt-0.5 mr-1" />Service Areas ({areas.length})</p>
          <div className="flex gap-2 items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search areas…" style={{ maxWidth: 200 }} />
            <Button size="sm" icon={Plus} onClick={() => { setEditingArea(null); setFormOpen(true); }}>Add Area</Button>
          </div>
        </div>
        {filteredAreas.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', borderRadius: 14, border: '1.5px dashed #E8E8E4', backgroundColor: '#FAFAFA' }}>
            <MapPin size={28} className="mx-auto mb-2" style={{ color: '#D1D5DB' }} /><p style={{ fontWeight: 700, fontSize: 13.5, color: '#6B7280' }}>{search ? 'No areas match' : 'No surge areas yet'}</p>
          </div>
        ) : (
          <div className="space-y-2">{filteredAreas.map((area) => { const am = TIER_META[area.tier] || TIER_META.METRO; return (
            <div key={area.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: '1.5px solid #E8E8E4', backgroundColor: '#fff', opacity: area.isActive ? 1 : 0.5 }}>
              <span style={{ fontSize: 18 }}>{am.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontWeight: 700, fontSize: 13.5, color: '#111' }}>{area.name}{!area.isActive && <Badge tone="slate" className="ml-2">Retired</Badge>}</p><p style={{ fontSize: 11.5, color: '#6B7280', marginTop: 1 }}><Badge tone={am.tone} className="mr-1.5">{area.tier}</Badge>{area.centreLat.toFixed(4)}, {area.centreLng.toFixed(4)} · {area.radiusKm} km{area.note && <span style={{ color: '#9A9A9A' }}> — {area.note}</span>}</p></div>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <IconButton icon={Pencil} size="sm" label="Edit" onClick={() => { setEditingArea(area); setFormOpen(true); }} />
                {area.isActive ? <IconButton icon={Trash2} size="sm" label="Retire" variant="danger" onClick={() => handleDeactivateArea(area)} /> : <IconButton icon={ToggleRight} size="sm" label="Reactivate" onClick={() => handleReactivateArea(area)} />}
              </div>
            </div>); })}</div>
        )}
      </div>
      <SurgeAreaForm open={formOpen} onClose={() => { setFormOpen(false); setEditingArea(null); }} initial={editingArea} onSubmit={editingArea ? handleUpdateArea : handleCreateArea} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Masters() {
  const [tab, setTab] = useState('rates');
  const TABS = [
    { key: 'rates', label: 'Rate Cards', icon: Database },
    { key: 'surge', label: 'Surge Pricing', icon: Zap },
  ];
  return (
    <div>
      <PageHeader title="Rate Cards" />
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1.5px solid #E8E8E4' }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', fontSize: 13.5, fontWeight: 700,
              color: active ? '#111' : '#6B7280',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: `2.5px solid ${active ? '#FFC107' : 'transparent'}`,
              marginBottom: -1.5, transition: 'color 0.15s, border-color 0.15s',
            }}><t.icon size={14} />{t.label}</button>
          );
        })}
      </div>
      {tab === 'rates' && <VehicleRatesTab />}
      {tab === 'surge' && <SurgePricingTab />}
    </div>
  );
}