import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Car, MapPin, ChevronDown, ChevronUp, Zap, Database, Save, Clock, Search, Globe,
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
import Checkbox from '../../components/ui/Checkbox';
import SearchInput from '../../components/ui/SearchInput';
import Switch from '../../components/ui/Switch';
import PageTabs from '../../components/ui/PageTabs';
import { useToast } from '../../hooks/useToast';
import { fareConfigService } from '../../services';
import { cityService } from '../../services/cityService';
import LoadingState from '../../components/ui/LoadingState';
import { TRIP_TYPES } from '../../constants';
import { STATE_CITIES, cityKey } from '../../constants/stateCities';
import { vehicleCatalogService } from '../../services';
import { surgeService } from '../../services/surgeService';
import ServiceStatesTab from './ServiceStatesTab';

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
  _state: '', cityId: '', vehicleClass: '', tripType: 'ONE_WAY',
  perKm: '', minimumKm: '',
  perMinute: '', cancellationFee: '',
  maxSurge: '',
  // "Also price the other trip type" -- create only. A vehicle carries TWO
  // per-km rates: one-way (all-in, the empty return is priced into the rate)
  // and round trip (lower, both legs carry the passenger).
  pairEnabled: false, pairPerKm: '', pairMinKmPerDay: '',
  minKmPerDay: '', waitingPerHour: '', freeWaitingMin: '',
  driverAllowance: '',
  nightAllowance: '', nightChargePct: '', nightStartHour: 21, nightStartMinute: 55, nightEndHour: 6, nightEndMinute: 0,
  airportSurcharge: '',
  hourlyRate: '', hourlyKmPerHour: 10,
};

// City dropdown value meaning "every city in the chosen state" -- the backend keeps
// one rate card per city, so this expands to one identical card per city.
const ALL_CITIES = '__ALL_CITIES__';
// City dropdown value prefix for a city from the built-in list that is not saved
// on the server yet. It is created when the rate card is saved.
const NEW_CITY = '__NEW__:';

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Rate Card Form — Simple / Advanced, matching the REAL FareConfig
// fields (city + vehicleClass + tripType + baseFare/perKm/minimumKm, plus
// optional outstation/round-trip/night/airport/hourly/surge fields).
// ─────────────────────────────────────────────────────────────────────────────
function VehicleRateForm({ initial, cities, stateSiblings = [], findCard, onSubmit, onClose, onCityAdded }) {
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
  // Existing city whose rate cards + rental packages seed the new one. Without
  // it a new city is created with NO pricing and cannot quote anything.
  const [copyFromCityId, setCopyFromCityId] = useState('');
  const [applyToState, setApplyToState] = useState(false);
  // Real cities (saved on the server) in the chosen state: what "All cities in
  // <State>" expands to. Cities that only exist on this screen are left out.
  const stateCityList = form._state
    ? cities.filter((c) => c.state === form._state && Number(c.id) < 1000000)
    : [];

  // A city picked from the built-in list that is not saved yet.
  const isNewPick = typeof form.cityId === 'string' && form.cityId.startsWith(NEW_CITY);
  const newPickName = isNewPick ? form.cityId.slice(NEW_CITY.length) : '';

  // Everything selectable once a state is chosen: the cities already saved on
  // the server, plus every other city we know for that state. The latter are
  // created on save, so no separate "add city" step is needed.
  const cityOptions = (() => {
    const saved = cities
      .filter((c) => !form._state || c.state === form._state)
      .map((c) => ({ value: c.id, label: `${c.name}, ${c.state}`, sort: c.name }));
    if (!form._state) return saved.sort((a, b) => a.sort.localeCompare(b.sort));
    const have = new Set(cities.filter((c) => c.state === form._state).map((c) => cityKey(c.name)));
    const fromList = (STATE_CITIES[form._state] || [])
      .filter((name) => !have.has(cityKey(name)))
      .map((name) => ({ value: `${NEW_CITY}${name}`, label: `${name}, ${form._state} — new`, sort: name }));
    return [...saved, ...fromList].sort((a, b) => a.sort.localeCompare(b.sort));
  })();

  /**
   * Add a city.
   *
   * This used to POST to /admin/fare-configs/cities, which is a GET-only
   * lookup. Express answers 404 for a path that exists but not for that
   * method, so it was indistinguishable from an unimplemented route — hence
   * the old "this server can't add new cities yet" toast. The real endpoint is
   * POST /admin/cities.
   *
   * Only the name and state are sent. The backend geocodes the name and
   * derives a service radius wide enough to cover any airport outside the
   * city's administrative boundary, so the admin never has to find a centroid.
   */
  // Creates the city on the server and returns the saved row, or null on
  // failure (after telling the admin why). Shared by the "pick from the list"
  // path, which runs it when the rate card is saved, and the manual fallback.
  const createCity = async (rawName) => {
    const name = String(rawName || '').trim();
    const stateName = form._state;
    if (!name || !stateName) return null;
    try {
      const { city, resolved, warning, copied } = await cityService.create({
        name,
        state: stateName,
        ...(copyFromCityId ? { copyFromCityId: Number(copyFromCityId) } : {}),
      });

      // Hand the real, server-saved city back to the parent so it refreshes
      // the list from the server (and picks up the row's _count).
      onCityAdded?.(city);
      set('cityId', String(city.id));

      toast.success(
        resolved
          ? `${city.name}, ${city.state} added — ${resolved.explanation}`
          : `${city.name}, ${city.state} added`,
      );

      // A city in a state that is not on the service-state allowlist is fully
      // configured and still refuses every pickup with OUTSIDE_SERVICE_STATES.
      if (warning) {
        toast.error(`${warning} Open the "Service States" tab to allow ${stateName}.`, { duration: 12000 });
      }
      if (!copyFromCityId && !copied) {
        toast.error(`${city.name} has no rental packages yet — local rentals there need them. Copy from an existing city, or add them separately.`, { duration: 8000 });
      }
      return city;
    } catch (e) {
      // No pretend city: a rate card can never be saved against an id the
      // server has never seen.
      toast.error(
        e.status === 403
          ? 'Adding a city needs the SETTINGS_MANAGE permission. Ask an admin to add it, or pick an existing city.'
          : `Couldn't add ${name}: ${e.message || 'unknown error'}`,
      );
      return null;
    }
  };

  // Manual fallback for a place that is not in the list.
  const handleAddCity = async () => {
    if (!newCityName.trim() || !form._state) return;
    const city = await createCity(newCityName);
    if (!city) return; // keep the box open
    setAddingCity(false); setNewCityName(''); setCopyFromCityId('');
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
      // No hardcoded default class (the old 'sedan' is retired): pick the
      // first live class so a new card never posts an empty vehicleClass.
      if (classes.length) setForm((f) => (f.vehicleClass ? f : { ...f, vehicleClass: classes[0].value }));
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

  // One-way and round trip are separate rate cards with independent per-km
  // rates. When creating one, offer to create its counterpart in the same go.
  const pairType = form.tripType === 'ONE_WAY' ? 'ROUND_TRIP' : form.tripType === 'ROUND_TRIP' ? 'ONE_WAY' : null;
  const pairLabel = pairType === 'ROUND_TRIP' ? 'Round trip' : 'One way';
  const existingPair = !isEdit && pairType && form.cityId && form.cityId !== ALL_CITIES && !isNewPick && findCard
    ? findCard(Number(form.cityId), form.vehicleClass, pairType)
    : null;
  const perKmHint = {
    ONE_WAY: 'All-in one-way rate. The empty return is priced into this rate — a one-way is billed for the distance driven, once.',
    ROUND_TRIP: 'Round-trip rate. The route is billed both ways (there + back) at this rate, so it is usually lower than the one-way rate.',
    AIRPORT: 'Airport transfer rate per KM.',
    HOURLY: 'Used only for distance beyond the hourly allowance.',
  }[form.tripType];

  const submit = async () => {
    // City and per-KM are required; minimumKm is optional.
    const nextErrors = {};
    // The backend needs a real city on every rate card (there is no "all
    // cities" card). Without this the request was sent with no cityId and came
    // back as a bare "Invalid request data".
    if (!isEdit) {
      if (!form.cityId) nextErrors.cityId = 'Please select a city, or "All cities" for the state.';
      else if (form.cityId === ALL_CITIES) {
        if (stateCityList.length === 0) nextErrors.cityId = `There are no cities saved in ${form._state || 'that state'} yet.`;
      } else if (Number(form.cityId) >= 1000000) {
        nextErrors.cityId = "That city was only added on this screen and isn't saved on the server. Pick an existing city.";
      }
    }
    if (form.perKm === '') nextErrors.perKm = 'Per-KM rate is required.';
    if (!isEdit && !form.vehicleClass) nextErrors.vehicleClass = 'Pick a vehicle class.';
    if (!isEdit && pairType && form.pairEnabled && form.pairPerKm === '') {
      nextErrors.pairPerKm = `Enter the ${pairLabel.toLowerCase()} per-KM rate, or untick the box.`;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      // A toast as well: the City field sits at the top of a scrolling form and
      // may be out of view when Create is pressed.
      toast.error(Object.values(nextErrors)[0]);
      return;
    }

    setLoading(true);
    try {
      // A city picked from the list that isn't saved yet: create it now, so the
      // rate card below is written against a real id.
      let resolvedCityId = form.cityId;
      if (!isEdit && isNewPick) {
        const created = await createCity(newPickName);
        if (!created) return;
        resolvedCityId = String(created.id);
      }

      // minimumKm: OPTIONAL. Left blank, it's simply not sent — the
      // database defaults it to 0, meaning no minimum distance is enforced.
      // baseFare, minimumFare and returnEmptyPct are retired on the backend
      // (Zod strips them), so they are no longer sent at all.
      const base = {
        perKm: Number(form.perKm),
        ...(form.minimumKm !== '' && { minimumKm: Number(form.minimumKm) }),
        // Driver allowance is optional and available in BOTH Simple and Advanced
        // modes — left blank it is simply not sent (DB defaults to 0 = none).
        ...(form.driverAllowance !== '' && { driverAllowance: Number(form.driverAllowance) }),
      };
      const advanced = mode === 'advanced' ? {
        ...(form.perMinute !== ''        && { perMinute: Number(form.perMinute) }),
        ...(form.cancellationFee !== ''  && { cancellationFee: Number(form.cancellationFee) }),
        ...(form.maxSurge !== ''         && { maxSurge: Number(form.maxSurge) }),
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
        await onSubmit({
          ...base, ...advanced,
          // Also change the same class + trip type in the state's other cities.
          ...(applyToState && stateSiblings.length > 0 && { _alsoUpdateIds: stateSiblings.map((r) => r.id) }),
        });
      } else {
        await onSubmit({
          // "All cities in <State>": the parent creates one identical card per city.
          ...(form.cityId === ALL_CITIES && { _cityIds: stateCityList.map((c) => c.id), _stateName: form._state }),
          // Only send cityId if it's a real DB id (small int), not a temp local timestamp
          ...(resolvedCityId && resolvedCityId !== ALL_CITIES && Number(resolvedCityId) < 1000000 && { cityId: Number(resolvedCityId) }),
          vehicleClass: form.vehicleClass,
          tripType: form.tripType,
          ...base,
          ...advanced,
          // The sibling card for the other trip type, created right after this
          // one by the parent. Shares minimum KM and driver allowance.
          ...(pairType && form.pairEnabled && form.pairPerKm !== '' && {
            _pair: {
              tripType: pairType,
              perKm: Number(form.pairPerKm),
              ...(pairType === 'ROUND_TRIP' && form.pairMinKmPerDay !== '' && { minKmPerDay: Number(form.pairMinKmPerDay) }),
            },
          }),
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
            <FormField label="City" required={!isEdit} error={errors.cityId} hint={addingCity ? 'Type new city name' : isNewPick ? `${newPickName} isn't set up yet — it will be created when you save this rate card.` : form.cityId === ALL_CITIES ? `Creates one identical rate card for each of the ${stateCityList.length} cities already set up in ${form._state}.` : form._state ? `Every city in ${form._state} is listed. Cities marked "new" are created automatically when you save.` : 'Pick a state first to price a whole state at once.'}>
              {isEdit ? (
                <Input disabled value={cities.find((c) => c.id === form.cityId)?.name || 'All cities'} />
              ) : addingCity ? (
                <div className="space-y-2">
                  <Input value={newCityName} onChange={(e) => setNewCityName(e.target.value)}
                    placeholder="e.g. Mysuru" autoFocus />
                  <Select
                    value={copyFromCityId}
                    onChange={(e) => setCopyFromCityId(e.target.value)}
                    placeholder="Copy rate cards & rental packages from…"
                    options={[
                      { value: '', label: 'Start with no pricing' },
                      ...cities
                        .filter((c) => Number(c.id) < 1000000)
                        .map((c) => ({ value: c.id, label: `Copy from ${c.name}, ${c.state}` })),
                    ]}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddCity}
                      disabled={!newCityName.trim() || !(form._state)}>
                      Add City
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => { setAddingCity(false); setCopyFromCityId(''); }}>Cancel</Button>
                  </div>
                  {!form._state && <p style={{ fontSize: 11, color: '#EF4444' }}>Select a state first</p>}
                </div>
              ) : (
                <div>
                  <Select
                    value={form.cityId}
                    onChange={(e) => { set('cityId', e.target.value); setErrors((er) => ({ ...er, cityId: undefined })); }}
                    placeholder="Select a city"
                    searchable
                    options={[
                      ...(stateCityList.length > 0
                        ? [{ value: ALL_CITIES, label: `All cities set up in ${form._state} (${stateCityList.length})` }]
                        : []),
                      ...cityOptions.map(({ value, label }) => ({ value, label })),
                    ]}
                  />
                  {isNewPick && (
                    <div style={{ marginTop: 8 }}>
                      <Select
                        value={copyFromCityId}
                        onChange={(e) => setCopyFromCityId(e.target.value)}
                        placeholder="Also copy rental packages & other rate cards from…"
                        options={[
                          { value: '', label: 'Start with no other pricing' },
                          ...cities
                            .filter((c) => Number(c.id) < 1000000)
                            .map((c) => ({ value: c.id, label: `Copy from ${c.name}, ${c.state}` })),
                        ]}
                      />
                      <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                        Optional. Local rentals need rental packages in the city. The rate card you are saving
                        now takes priority over any copied card for the same vehicle and trip type.
                      </p>
                    </div>
                  )}
                  {form._state && (
                    <button onClick={() => setAddingCity(true)}
                      style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                      City not listed? Add it manually
                    </button>
                  )}
                </div>
              )}
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Vehicle class" required error={errors.vehicleClass}>
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

        {isEdit && stateSiblings.length > 0 && (
          <div className="rounded-xl p-3" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <Checkbox
              checked={applyToState}
              onChange={(e) => setApplyToState(e.target.checked)}
              label={`Also apply this change to the ${stateSiblings.length} other ${stateSiblings.length === 1 ? 'city' : 'cities'} in ${initial?.city?.state}`}
            />
            <p className="text-xs mt-1.5" style={{ color: '#92400E', marginLeft: 30 }}>
              {stateSiblings.map((r) => r.city?.name).filter(Boolean).join(', ')} &mdash; their current{' '}
              {initial?.vehicleClass} / {TRIP_TYPES.find((t) => t.value === initial?.tripType)?.label} rate card
              gets the same prices.
            </p>
          </div>
        )}

        {/* Core fare — required, always visible */}
        <div className="rounded-xl p-4" style={{ backgroundColor: '#eef2fb' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#2F55C7' }}>
            💰 Fare (required)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={`${TRIP_TYPES.find((t) => t.value === form.tripType)?.label || ''} per KM (₹)`.trim()} required error={errors.perKm} hint={perKmHint}>
              <Input type="number" min="0" value={form.perKm} onChange={(e) => { set('perKm', e.target.value); setErrors((er) => ({ ...er, perKm: undefined })); }} placeholder="e.g. 14" />
            </FormField>
            <FormField label="Minimum KM" hint={isEdit ? 'Optional. Left blank on an edit, the existing minimum KM is kept unchanged.' : 'Optional. The minimum chargeable distance for this rate card. Left blank, no minimum is enforced.'}>
              <Input type="number" min="0" value={form.minimumKm} onChange={(e) => set('minimumKm', e.target.value)} placeholder="e.g. 100 (optional)" />
            </FormField>
            <FormField label="Driver allowance / day (₹)" hint="Optional. Paid to the driver per day; applies to all trip types except Airport. Leave blank for none.">
              <Input type="number" min="0" value={form.driverAllowance} onChange={(e) => set('driverAllowance', e.target.value)} placeholder="e.g. 300 (optional)" />
            </FormField>
          </div>
        </div>

        {/* The other trip type's per-km rate — create only */}
        {!isEdit && pairType && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <Checkbox
              checked={form.pairEnabled}
              onChange={(e) => set('pairEnabled', e.target.checked)}
              label={`Also set the ${pairLabel.toLowerCase()} rate for this vehicle`}
            />
            <p className="text-xs mt-1.5" style={{ color: '#166534', marginLeft: 30 }}>
              A vehicle has two per-KM prices: one way (e.g. ₹19/km, billed once) and round trip
              (e.g. ₹12/km, billed both ways). This creates the {pairLabel.toLowerCase()} rate card
              alongside this one, with the same minimum KM and driver allowance.
            </p>
            {existingPair && (
              <p className="text-xs mt-1.5 font-semibold" style={{ color: '#92400E', marginLeft: 30 }}>
                This city already has a {pairLabel.toLowerCase()} card for this vehicle at ₹{existingPair.perKm}/km.
                Ticking this creates a newer one that replaces it for new quotes.
              </p>
            )}
            {form.pairEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <FormField label={`${pairLabel} per KM (₹)`} required error={errors.pairPerKm}>
                  <Input type="number" min="0" value={form.pairPerKm}
                    onChange={(e) => { set('pairPerKm', e.target.value); setErrors((er) => ({ ...er, pairPerKm: undefined })); }}
                    placeholder={pairType === 'ROUND_TRIP' ? 'e.g. 12' : 'e.g. 19'} />
                </FormField>
                {pairType === 'ROUND_TRIP' && (
                  <FormField label="Round trip min KM / day" hint="Optional. Guaranteed daily distance on multi-day round trips.">
                    <Input type="number" min="0" value={form.pairMinKmPerDay} onChange={(e) => set('pairMinKmPerDay', e.target.value)} placeholder="e.g. 300 (optional)" />
                  </FormField>
                )}
              </div>
            )}
          </div>
        )}

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
            Simple mode: this rate card charges distance × per-KM rate, with an optional minimum KM
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
                <FormField label="Surge cap (×)" hint="Max metro surge on this card. 1 = never surge, 2 = legal max (default).">
                  <Input type="number" min="1" max="2" step="0.05" value={form.maxSurge} onChange={(e) => set('maxSurge', e.target.value)} placeholder="2" />
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

function VehicleRateCard({ rate, cityName, pairRate, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [catBg, catColor] = CLASS_COLORS[rate.vehicleClass] || ['#F7F8FC', '#6B7280'];
  const tripLabel = TRIP_TYPES.find((t) => t.value === rate.tripType)?.label || rate.tripType;
  // One-way and round trip are the two per-km prices of the same vehicle;
  // show the counterpart side by side so both can be checked at a glance.
  const pairable = rate.tripType === 'ONE_WAY' || rate.tripType === 'ROUND_TRIP';
  const pairTripLabel = rate.tripType === 'ONE_WAY' ? 'Round Trip' : 'One Way';

  // When the card was created — the same field the list is ordered by, so the
  // date on screen explains why the newest card sits on top. Shown only when
  // the backend actually returns it (never "Invalid Date").
  const createdAt = rate.createdAt ? new Date(rate.createdAt) : null;
  const createdLabel = createdAt && !Number.isNaN(createdAt.getTime())
    ? createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const advancedTags = [
    Number(rate.driverAllowance) > 0 && 'Driver allowance',
    (Number(rate.nightAllowance) > 0 || Number(rate.nightChargePct) > 0) && 'Night charge',
    rate.maxSurge != null && Number(rate.maxSurge) < 2 && (Number(rate.maxSurge) <= 1 ? 'No surge' : `Surge cap ${Number(rate.maxSurge)}×`),
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
            {createdLabel && (
              <span className="text-[11.5px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#F7F8FC', color: '#6B7280' }}>
                <Clock size={10} className="inline -mt-0.5 mr-0.5" />Added {createdLabel}
              </span>
            )}
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

      <div className={`grid ${pairable ? 'grid-cols-3' : 'grid-cols-2'} gap-0`} style={{ borderTop: '1px solid #F7F8FC' }}>
        <div className="p-3" style={{ borderRight: '1px solid #F7F8FC' }}>
          <p className="text-[11.5px] font-bold uppercase tracking-wider mb-1" style={{ color: '#F59E0B' }}>{tripLabel} / KM</p>
          <p className="text-base font-black" style={{ color: '#1F2937' }}>{money(rate.perKm)}</p>
          {rate.tripType === 'ONE_WAY' && <p className="text-[11px]" style={{ color: '#6B7280' }}>Billed once, no return charge</p>}
          {rate.tripType === 'ROUND_TRIP' && <p className="text-[11px]" style={{ color: '#6B7280' }}>Billed both ways</p>}
        </div>
        {pairable && (
          <div className="p-3" style={{ borderRight: '1px solid #F7F8FC' }}>
            <p className="text-[11.5px] font-bold uppercase tracking-wider mb-1" style={{ color: '#0f766e' }}>{pairTripLabel} / KM</p>
            <p className="text-base font-black" style={{ color: pairRate ? '#1F2937' : '#9CA3AF' }}>{pairRate ? money(pairRate.perKm) : 'Not set'}</p>
            <p className="text-[11px]" style={{ color: '#6B7280' }}>{pairRate ? 'Same vehicle & city' : `Add a ${pairTripLabel.toLowerCase()} card`}</p>
          </div>
        )}
        <div className="p-3">
          <p className="text-[11.5px] font-bold uppercase tracking-wider mb-1" style={{ color: '#7c3aed' }}>Min KM</p>
          <p className="text-base font-black" style={{ color: '#1F2937' }}>{Number(rate.minimumKm) > 0 ? `${rate.minimumKm} km` : '—'}</p>
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
              {rate.maxSurge != null && Number(rate.maxSurge) < 2 && <RateRow icon="⚡" label="Surge cap" value={Number(rate.maxSurge) <= 1 ? 'Surge off for this card' : `${Number(rate.maxSurge)}× max`} />}
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
  // Deactivated cards are kept (never deleted) and can be reactivated, so they must be reachable.
  const [activeFilter, setActiveFilter] = useState('active'); // active | inactive | all
  const toast = useToast();

  const reload = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([fareConfigService.list({ includeInactive: true }), fareConfigService.cities()])
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
    const matchActive = activeFilter === 'all' || (activeFilter === 'active' ? r.isActive : !r.isActive);
    return matchSearch && matchClass && matchTrip && matchState && matchActive;
  }).sort((a, b) => {
    // Latest added always first — newest createdAt on top, falling back to the
    // auto-increment id when a timestamp is missing or two match exactly.
    // (.filter returns a new array, so this doesn't mutate `rates`.)
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (bt !== at) return bt - at;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  }), [rates, cities, search, classFilter, tripFilter, stateFilter, activeFilter]);

  // Other cities in the same state whose CURRENT card for this class + trip type
  // can be changed together with the one being edited ("state-wise" pricing).
  // Only offered when the edited card is itself live; staged future prices and
  // retired cards are never touched.
  const stateSiblings = useMemo(() => {
    if (!editing || !editing.isActive || !editing.city?.state) return [];
    const now = Date.now();
    if (new Date(editing.effectiveFrom).getTime() > now) return [];
    const newestPerCity = new Map();
    for (const r of rates) {
      if (r.id === editing.id || !r.isActive) continue;
      if (r.vehicleClass !== editing.vehicleClass || r.tripType !== editing.tripType) continue;
      if (r.city?.state !== editing.city.state || r.cityId === editing.cityId) continue;
      const t = new Date(r.effectiveFrom).getTime();
      if (t > now) continue;
      const cur = newestPerCity.get(r.cityId);
      if (!cur || t > new Date(cur.effectiveFrom).getTime()) newestPerCity.set(r.cityId, r);
    }
    return [...newestPerCity.values()];
  }, [editing, rates]);

  const cityLabel = (id) => cityName(id) || `city #${id}`;

  // The live card for a city + class + trip type: the newest active one whose
  // effectiveFrom has passed — the same rule the quote engine uses.
  const findCard = useCallback((cityId, vehicleClass, tripType) => {
    const now = Date.now();
    let best = null;
    for (const r of rates) {
      if (!r.isActive || r.cityId !== cityId || r.vehicleClass !== vehicleClass || r.tripType !== tripType) continue;
      const t = new Date(r.effectiveFrom).getTime();
      if (t > now) continue;
      if (!best || t > new Date(best.effectiveFrom).getTime()) best = r;
    }
    return best;
  }, [rates]);

  const pairOf = (rate) => {
    if (rate.tripType !== 'ONE_WAY' && rate.tripType !== 'ROUND_TRIP') return null;
    return findCard(rate.cityId, rate.vehicleClass, rate.tripType === 'ONE_WAY' ? 'ROUND_TRIP' : 'ONE_WAY');
  };

  // Creates the counterpart trip-type card after the main one succeeded.
  // Returns a short summary for the toast; never throws.
  const createPair = async (body, pair, cityIds) => {
    const pairBody = { ...body, ...pair };
    const pairName = pair.tripType === 'ROUND_TRIP' ? 'round-trip' : 'one-way';
    try {
      if (cityIds) {
        const res = await fareConfigService.createForCities(pairBody, cityIds);
        if (res.failed.length) toast.error(`The ${pairName} rate failed for ${res.failed.map((f) => cityLabel(f.cityId)).join(', ')}. Add it from "Add Rate Card".`);
        return res.created.length ? ` + ${pairName} rate ₹${pair.perKm}/km` : '';
      }
      await fareConfigService.create(pairBody);
      return ` + ${pairName} rate ₹${pair.perKm}/km`;
    } catch (e) {
      toast.error(`Main rate saved, but the ${pairName} rate was not: ${e.message || 'unknown error'}. Add it from "Add Rate Card".`);
      return '';
    }
  };

  const handleSubmit = async (values) => {
    // _cityIds / _stateName / _alsoUpdateIds are instructions from the form, not fields the API accepts.
    const { _cityIds, _stateName, _alsoUpdateIds, _pair, ...body } = values;
    try {
      if (editing) {
        await fareConfigService.update(editing.id, body);
        if (Array.isArray(_alsoUpdateIds) && _alsoUpdateIds.length > 0) {
          const res = await fareConfigService.updateMany(_alsoUpdateIds, body);
          const state = editing.city?.state || 'the state';
          if (res.failed.length > 0) {
            const names = res.failed.map((f) => rates.find((r) => r.id === f.id)?.city?.name || `card #${f.id}`).join(', ');
            toast.error(`Updated ${editing.city?.name || 'this card'} and ${res.updated.length} other ${state} cit${res.updated.length === 1 ? 'y' : 'ies'}, but NOT: ${names}. Edit those separately.`);
            reload();
            setEditing(null); setFormOpen(false);
            return;
          }
          toast.success(`Rate card updated in ${res.updated.length + 1} cities in ${state} \u2014 new quotes use it immediately`);
        } else {
          toast.success('Rate card updated \u2014 new quotes use this immediately');
        }
      } else if (Array.isArray(_cityIds)) {
        // "All cities in <State>": one identical card per city.
        const res = await fareConfigService.createForCities(body, _cityIds);
        const noun = (n) => `${n} cit${n === 1 ? 'y' : 'ies'}`;
        const pairNote = _pair && res.created.length > 0 ? await createPair(body, _pair, res.created) : '';
        if (res.created.length > 0 || res.skipped.length > 0) {
          const parts = [];
          if (res.created.length > 0) parts.push(`created for ${noun(res.created.length)} in ${_stateName}${pairNote}`);
          if (res.skipped.length > 0) parts.push(`${noun(res.skipped.length)} already had this rate card (${res.skipped.map(cityLabel).join(', ')}) \u2014 left unchanged`);
          toast.success(`Rate card ${parts.join('; ')}`);
        }
        if (res.failed.length > 0) {
          toast.error(`Failed for ${res.failed.map((f) => `${cityLabel(f.cityId)} (${f.message})`).join(', ')}. Press Create again to retry just those.`);
          reload();
          return; // keep the form open so the failed ones can be retried
        }
      } else {
        await fareConfigService.create(body);
        const pairNote = _pair ? await createPair(body, _pair) : '';
        toast.success(`Rate card created${pairNote} \u2014 new quotes use this immediately`);
      }
      setEditing(null); setFormOpen(false); reload();
    } catch (e) {
      const detail = Array.isArray(e.fieldErrors) && e.fieldErrors.length
        ? e.fieldErrors.map((f) => `${f.field}: ${f.message}`).join(', ')
        : '';
      toast.error(detail ? `${e.message || 'Save failed'} \u2014 ${detail}` : (e.message || 'Save failed'));
    }
  };

  const handleToggle = async (rate) => {
    if (rate.isActive) {
      // Deactivating retires the card (nothing is deleted).
      try {
        await fareConfigService.setActive(rate.id, false);
        toast.success('Rate card deactivated — find it under "Inactive cards" to reactivate');
        reload();
      } catch (e) {
        // Only THIS refusal is the "last live card" case. Anything else (no
        // permission, network, server error) used to be dressed up as it too,
        // so the real reason was never shown.
        if (e?.code !== 'LAST_ACTIVE_FARE_CONFIG') {
          toast.error(e?.message || 'Could not deactivate this rate card');
          return;
        }
        const force = confirm(
          `${e.message}\n\n` +
          `Deactivating it will make ${rate.vehicleClass.toUpperCase()} / ${rate.tripType.replace(/_/g, ' ')} unbookable until you add a new rate card.\n\n` +
          `Deactivate anyway?`
        );
        if (!force) return;
        try {
          await fareConfigService.update(rate.id, { isActive: false });
          toast.success('Rate card deactivated — find it under "Inactive cards" to reactivate');
          reload();
        } catch (e2) { toast.error(e2?.message || 'Could not deactivate this rate card'); }
      }
    } else {
      try {
        await fareConfigService.setActive(rate.id, true);
        toast.success('Rate card activated');
        reload();
      } catch (e) { toast.error(e?.message || 'Could not activate this rate card'); }
    }
  };

  const handleDelete = async () => {
    setDelLoad(true);
    try {
      await fareConfigService.destroy(deleting.id);
      toast.success('Rate card deleted');
      reload();
    } catch (e) {
      if (e.code === 'LAST_ACTIVE_FARE_CONFIG') {
        // The backend won't delete the ONLY live card for a class + trip type
        // without an explicit go-ahead: quotes for it would stop working.
        const force = confirm(
          `${e.message}\n\n` +
          `Deleting it permanently means this vehicle can't be booked for this trip type until you add a new rate card.\n\n` +
          `Delete it anyway?`
        );
        if (force) {
          try {
            await fareConfigService.destroy(deleting.id, { force: true });
            toast.success('Rate card deleted');
            reload();
          } catch (e2) { toast.error(e2.message || 'Delete failed'); }
        }
      } else if (e.code === 'FARE_CONFIG_NOT_FOUND') {
        toast.error('This rate card no longer exists');
        reload();
      } else if (e.status === 404 || e.code === 'ENDPOINT_NOT_IMPLEMENTED') {
        toast.error('Permanent delete is not on this backend yet \u2014 deploy the updated backend first.');
      } else {
        toast.error(e.message || 'Delete failed');
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
        <Select value={activeFilter} onChange={e => setActiveFilter(e.target.value || 'active')}
          options={[
            { value: 'active', label: 'Active cards' },
            { value: 'inactive', label: 'Inactive cards' },
            { value: 'all', label: 'Active + inactive' },
          ]}
          style={{ minWidth: 160 }}
        />
        <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>
          Add Rate Card
        </Button>
      </div>

      {/* Rate cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: '#6B7280' }}>
          <Car size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">{rates.length === 0 ? 'No rate cards configured yet.' : activeFilter === 'inactive' ? 'No inactive rate cards.' : 'No rate cards match your filters.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {filtered.map(rate => (
            <VehicleRateCard
              key={rate.id} rate={rate} cityName={cityName(rate.cityId)}
              pairRate={pairOf(rate)}
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
          key={editing ? `edit-${editing.id}` : 'new'}
          initial={editing}
          cities={cities}
          stateSiblings={stateSiblings}
          findCard={findCard}
          onSubmit={handleSubmit}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onCityAdded={(city) => {
            // Show it immediately, then refetch so the canonical row (with
            // _count) replaces the optimistic one. No prop-array mutation.
            if (city) setCities((prev) => (prev.some((c) => String(c.id) === String(city.id)) ? prev : [...prev, city]));
            reload();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        loading={delLoad} danger title="Delete rate card?"
        confirmLabel="Delete"
        description={`This ${deleting?.vehicleClass} / ${TRIP_TYPES.find(t => t.value === deleting?.tripType)?.label} rate card will be permanently deleted and can't be restored. Past bookings already priced against it keep their frozen fare and are unaffected.`}
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
  METRO:   { icon: '🏙️', label: 'Metro', desc: 'City / urban (surge applies)', bg: '#EFF6FF', color: '#1D4ED8', tone: 'blue' },
  TALUKA:  { icon: '🏘️', label: 'District / Taluka', desc: 'District / semi-urban (no surge)', bg: '#FFF7ED', color: '#C2410C', tone: 'amber' },
  VILLAGE: { icon: '🌾', label: 'Village', desc: 'Rural area (no surge)', bg: '#F0FDF4', color: '#15803D', tone: 'green' },
};
const TIER_OPTIONS = TIERS.map((t) => ({ value: t, label: `${TIER_META[t].icon} ${TIER_META[t].label} — ${TIER_META[t].desc}` }));

/*
 * Surge is charged INSIDE METRO AREAS ONLY (backend surge.service
 * SURGEABLE_TIERS). Taluka and village pickups are never surged, whatever their
 * rule rows say, so they are shown read-only here rather than as inputs that
 * would look like they do something. Writes go to PATCH /admin/surge/rules/METRO,
 * which needs FARE_EDIT — an admin-only permission.
 *
 * Effective premium = rule % (from here), then clamped per rate card by its
 * "Surge cap" (maxSurge, 2× by default). Changes apply to NEW quotes only.
 */
function SurgeFeeSetup({ rules, onSave }) {
  const metro = rules.find((r) => r.tier === 'METRO');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!metro) return;
    setForm({
      immediatePct: String(metro.immediatePct ?? 0),
      standardPct: String(metro.standardPct ?? 0),
      immediateWithinMinutes: String(metro.immediateWithinMinutes ?? 60),
      isActive: metro.isActive !== false,
    });
    setDirty(false);
  }, [metro?.immediatePct, metro?.standardPct, metro?.immediateWithinMinutes, metro?.isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };
  const pctErr = (v) => (v === '' || Number(v) < 0 || Number(v) > 100 ? '0–100' : null);
  const winErr = (v) => (v === '' || Number(v) < 1 || Number(v) > 1440 ? '1–1440' : null);
  const invalid = form && (pctErr(form.immediatePct) || pctErr(form.standardPct) || winErr(form.immediateWithinMinutes));

  const save = async (patch) => {
    setSaving(true);
    try {
      await onSave('METRO', patch ?? {
        immediatePct: Number(form.immediatePct),
        standardPct: Number(form.standardPct),
        immediateWithinMinutes: Number(form.immediateWithinMinutes),
        isActive: form.isActive,
      });
      setDirty(false);
    } finally { setSaving(false); }
  };

  if (!metro) {
    return <Alert type="warning">No METRO surge rule found. Run the backend migration 20261006090000_min_km_oneway_rates_metro_surge — it creates the METRO rule at 0%.</Alert>;
  }
  if (!form) return null;

  const on = form.isActive;
  const liveNow = metro.isActive !== false && (Number(metro.standardPct) > 0 || Number(metro.immediatePct) > 0);
  const m = TIER_META.METRO;
  const pctInput = (key, label, icon) => (
    <div style={{ flex: 1, minWidth: 110 }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 3 }}>{icon}{label}</label>
      <Input type="number" min="0" max="100" value={form[key]} disabled={!on} onChange={(e) => set(key, e.target.value)} style={{ textAlign: 'center' }} />
      {pctErr(form[key]) && <p style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>Enter {pctErr(form[key])}%</p>}
    </div>
  );

  return (
    <div style={{ borderRadius: 16, border: '1.5px solid #E8E8E4', backgroundColor: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #F0F0EC', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'linear-gradient(135deg, #FFFBEA 0%, #FFF8E1 100%)' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#FFC107', display: 'grid', placeItems: 'center', boxShadow: '0 3px 10px rgba(255,193,7,0.3)' }}><Zap size={16} color="#111" /></div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontWeight: 800, fontSize: 14.5, color: '#111' }}>Metro surge fee</p>
          <p style={{ fontSize: 12, color: '#92400E', fontWeight: 500 }}>Charged only when the pickup is inside a Metro area. Admin only. Applies to new quotes, not bookings already made.</p>
        </div>
        <Badge tone={liveNow ? 'amber' : 'slate'}>{liveNow ? `Live: ${Number(metro.standardPct)}% scheduled / ${Number(metro.immediatePct)}% urgent` : 'Not charging'}</Badge>
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20 }}>{m.icon}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 13.5, color: m.color }}>{m.label}</p>
            <p style={{ fontSize: 11.5, color: '#6B7280' }}>Pickups inside any active Metro area below. A pickup outside every area is also treated as Metro.</p>
          </div>
          <Switch id="metro-surge-active" checked={on} disabled={saving} onChange={(v) => set('isActive', v)} label={on ? 'Surge on' : 'Surge off'} />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap', opacity: on ? 1 : 0.5 }}>
          {pctInput('standardPct', 'Scheduled %', <Zap size={10} className="inline -mt-0.5 mr-0.5" />)}
          {pctInput('immediatePct', 'Urgent %', <Clock size={10} className="inline -mt-0.5 mr-0.5" />)}
          <div style={{ flex: 1, minWidth: 110 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 3 }}>Urgent window (min)</label>
            <Input type="number" min="1" max="1440" value={form.immediateWithinMinutes} disabled={!on} onChange={(e) => set('immediateWithinMinutes', e.target.value)} style={{ textAlign: 'center' }} />
            {winErr(form.immediateWithinMinutes) && <p style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>Enter {winErr(form.immediateWithinMinutes)}</p>}
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <Button size="sm" icon={Save} onClick={() => save()} loading={saving} disabled={!dirty || !!invalid}
              style={!dirty || invalid ? {} : { backgroundColor: '#22A65A', boxShadow: '0 3px 8px rgba(34,166,90,0.25)' }}>Save</Button>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#374151', backgroundColor: '#F9FAFB', borderRadius: 10, padding: '8px 12px' }}>
          Example: at {Number(form.standardPct) || 0}% scheduled, a ₹1,900 metro fare becomes ₹{Math.round(1900 * (1 + (Number(form.standardPct) || 0) / 100)).toLocaleString('en-IN')}.
          {' '}<strong>Urgent %</strong> is used instead when pickup is within {form.immediateWithinMinutes || 60} minutes of booking. Each rate card's <strong>Surge cap</strong> (Advanced pricing, default 2×) limits the final premium.
        </p>
      </div>

      <div style={{ padding: '10px 18px', backgroundColor: '#FAFAFA', borderTop: '1px solid #F0F0EC', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {['TALUKA', 'VILLAGE'].map((t) => (
          <span key={t} style={{ fontSize: 11.5, color: '#6B7280' }}>
            {TIER_META[t].icon} <strong>{TIER_META[t].label}</strong>: no surge (not charged outside metros)
          </span>
        ))}
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
  const handleSaveRule = async (tier, body) => {
    try {
      await surgeService.updateRule(tier, body);
      toast.success(body.isActive === false ? 'Metro surge switched off — new quotes carry no surge' : 'Metro surge saved — applies to new quotes only');
      load();
    } catch (e) {
      toast.error(e.status === 403 ? 'Only an admin can change the surge fee.' : (e.message || 'Could not save surge'));
      throw e;
    }
  };
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
    { key: 'states', label: 'Service States', icon: Globe },
  ];
  return (
    <div>
      <PageHeader title="Rate Cards" />
      <PageTabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'rates' && <VehicleRatesTab />}
      {tab === 'surge' && <SurgePricingTab />}
      {tab === 'states' && <ServiceStatesTab />}
    </div>
  );
}