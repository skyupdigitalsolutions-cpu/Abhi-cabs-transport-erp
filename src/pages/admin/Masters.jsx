import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Search, Car, MapPin, IndianRupee, Clock, Gauge,
  Users, Tag, ChevronDown, ChevronUp, Filter,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
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
import { useToast } from '../../hooks/useToast';
import { mastersService } from '../../services';
import LoadingState from '../../components/ui/LoadingState';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MASTER_TABS = [
  { key: 'vehicleRates', label: 'Vehicle Rate Cards' },
  { key: 'cargoTypes',   label: 'Cargo Types'        },
  { key: 'zones',        label: 'Zones'              },
  { key: 'ratecards',    label: 'Rate Cards'         },
];

const CATEGORIES = [
  'Sedan', 'MUV', 'MUV Premium', 'Tempo Traveler',
  'Mini Coach', 'Luxury Coach', 'Executive Coach',
];

const AC_OPTIONS = [
  { value: 'A/C',     label: 'A/C'     },
  { value: 'Non A/C', label: 'Non A/C' },
];

const EMPTY_VEHICLE_RATE = {
  name: '', bsCategory: '', seater: '', acType: 'A/C', category: 'Sedan', active: true,
  local:      { hours: 8,  km: 80, packageRate: '', extraHourRate: '', extraKmRate: '' },
  outstation: { perKmRate: '', minKmPerDay: 300, driverBhata: '' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Rate Card Form
// ─────────────────────────────────────────────────────────────────────────────
function VehicleRateForm({ initial, onSubmit, onClose }) {
  const [form, setForm] = useState(
    initial
      ? JSON.parse(JSON.stringify(initial))   // deep copy so edits don't mutate
      : JSON.parse(JSON.stringify(EMPTY_VEHICLE_RATE))
  );
  const [loading, setLoading] = useState(false);

  const set     = (k, v)    => setForm(f => ({ ...f, [k]: v }));
  const setLocal= (k, v)    => setForm(f => ({ ...f, local:      { ...f.local,      [k]: v } }));
  const setOut  = (k, v)    => setForm(f => ({ ...f, outstation: { ...f.outstation, [k]: v } }));

  const submit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    await onSubmit({
      ...form,
      seater: Number(form.seater),
      local: {
        hours:         Number(form.local.hours),
        km:            Number(form.local.km),
        packageRate:   Number(form.local.packageRate),
        extraHourRate: Number(form.local.extraHourRate),
        extraKmRate:   Number(form.local.extraKmRate),
      },
      outstation: {
        perKmRate:   Number(form.outstation.perKmRate),
        minKmPerDay: Number(form.outstation.minKmPerDay),
        driverBhata: Number(form.outstation.driverBhata),
      },
    });
    setLoading(false);
  };

  return (
    <>
      <div className="space-y-5 overflow-y-auto max-h-[65vh] pr-1">
        {/* Basic info */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Vehicle Details</p>
          <div className="space-y-3">
            <FormField label="Vehicle name" required>
              <Input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. 22 Seater Bharat Benz Luxury A/C Coach" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Seater capacity" required>
                <Input type="number" min="1" value={form.seater} onChange={e => set('seater', e.target.value)} placeholder="e.g. 22" />
              </FormField>
              <FormField label="AC Type">
                <Select value={form.acType} onChange={e => set('acType', e.target.value)} options={AC_OPTIONS} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category">
                <Select value={form.category} onChange={e => set('category', e.target.value)}
                  options={CATEGORIES.map(c => ({ value: c, label: c }))} />
              </FormField>
              <FormField label="BS Category" hint="e.g. BSVI 2024">
                <Input value={form.bsCategory} onChange={e => set('bsCategory', e.target.value)} placeholder="BSVI 2024" />
              </FormField>
            </div>
          </div>
        </div>

        {/* Local rates */}
        <div className="rounded-xl p-4" style={{ backgroundColor: '#eef2fb' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#2F55C7' }}>
            🏙️ Local City Tour Rates
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Package Hours">
              <Input type="number" value={form.local.hours} onChange={e => setLocal('hours', e.target.value)} />
            </FormField>
            <FormField label="Package KM">
              <Input type="number" value={form.local.km} onChange={e => setLocal('km', e.target.value)} />
            </FormField>
            <FormField label="Package Rate (₹)" required>
              <Input type="number" value={form.local.packageRate} onChange={e => setLocal('packageRate', e.target.value)} placeholder="e.g. 3000" />
            </FormField>
            <FormField label="Extra Hour Rate (₹)">
              <Input type="number" value={form.local.extraHourRate} onChange={e => setLocal('extraHourRate', e.target.value)} placeholder="e.g. 250" />
            </FormField>
            <FormField label="Extra KM Rate (₹)" className="col-span-2">
              <Input type="number" value={form.local.extraKmRate} onChange={e => setLocal('extraKmRate', e.target.value)} placeholder="e.g. 20" />
            </FormField>
          </div>
        </div>

        {/* Out of station rates */}
        <div className="rounded-xl p-4" style={{ backgroundColor: '#fff8ec' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#d97706' }}>
            🛣️ Out of Station Rates
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Per KM Rate (₹)" required>
              <Input type="number" value={form.outstation.perKmRate} onChange={e => setOut('perKmRate', e.target.value)} placeholder="e.g. 20" />
            </FormField>
            <FormField label="Min KM / Day">
              <Input type="number" value={form.outstation.minKmPerDay} onChange={e => setOut('minKmPerDay', e.target.value)} />
            </FormField>
            <FormField label="Driver Bhata / Day (₹)" className="col-span-2">
              <Input type="number" value={form.outstation.driverBhata} onChange={e => setOut('driverBhata', e.target.value)} placeholder="e.g. 500" />
            </FormField>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #E5E7EB' }}>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" loading={loading} onClick={submit}>
          {initial ? 'Save Changes' : 'Add Vehicle Rate'}
        </Button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Rate Card Display
// ─────────────────────────────────────────────────────────────────────────────
function VehicleRateCard({ rate, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  const categoryColors = {
    'Sedan':          ['#eef2fb', '#3B65DB'],
    'MUV':            ['#f0fdf4', '#38B763'],
    'MUV Premium':    ['#f5f3ff', '#7c3aed'],
    'Tempo Traveler': ['#fff8ec', '#F59E0B'],
    'Mini Coach':     ['#fef2f2', '#EF4444'],
    'Luxury Coach':   ['#fdf4ff', '#a855f7'],
    'Executive Coach':['#f0f9ff', '#0369a1'],
  };
  const [catBg, catColor] = categoryColors[rate.category] || ['#F7F8FC', '#6B7280'];

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB', opacity: rate.active ? 1 : 0.6 }}
    >
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        {/* Seater badge */}
        <div
          className="h-12 w-12 rounded-xl grid place-items-center shrink-0 text-center"
          style={{ backgroundColor: catBg }}
        >
          <Users size={14} style={{ color: catColor }} />
          <p className="text-[10px] font-bold leading-none mt-0.5" style={{ color: catColor }}>
            {rate.seater}
          </p>
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-sm font-bold leading-snug" style={{ color: '#1F2937' }}>{rate.name}</p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: catBg, color: catColor }}>{rate.category}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: '#F7F8FC', color: '#6B7280' }}>{rate.acType}</span>
            {rate.bsCategory && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: '#F7F8FC', color: '#6B7280' }}>{rate.bsCategory}</span>
            )}
            {!rate.active && <Badge tone="slate">Inactive</Badge>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onToggle(rate)} className="p-1.5 rounded-lg focus-ring" title={rate.active ? 'Deactivate':'Activate'}
            style={{ color: rate.active ? '#38B763':'#6B7280' }}>
            {rate.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
          <IconButton icon={Pencil} label="Edit" onClick={() => onEdit(rate)} />
          <IconButton icon={Trash2} label="Delete" variant="danger" onClick={() => onDelete(rate)} />
        </div>
      </div>

      {/* Rate summary — always visible */}
      <div className="grid grid-cols-2 gap-0" style={{ borderTop: '1px solid #F7F8FC' }}>
        {/* Local */}
        <div className="p-3" style={{ borderRight: '1px solid #F7F8FC' }}>
          <div className="flex items-center gap-1 mb-2">
            <div className="h-4 w-4 rounded grid place-items-center" style={{ backgroundColor: '#eef2fb' }}>
              <Clock size={9} style={{ color: '#3B65DB' }} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#3B65DB' }}>Local City Tour</p>
          </div>
          <p className="text-base font-black" style={{ color: '#1F2937' }}>
            ₹{rate.local.packageRate?.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px]" style={{ color: '#6B7280' }}>
            {rate.local.hours} hrs / {rate.local.km} km
          </p>
        </div>

        {/* Outstation */}
        <div className="p-3">
          <div className="flex items-center gap-1 mb-2">
            <div className="h-4 w-4 rounded grid place-items-center" style={{ backgroundColor: '#fff8ec' }}>
              <Gauge size={9} style={{ color: '#F59E0B' }} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#F59E0B' }}>Out of Station</p>
          </div>
          <p className="text-base font-black" style={{ color: '#1F2937' }}>
            ₹{rate.outstation.perKmRate}/km
          </p>
          <p className="text-[11px]" style={{ color: '#6B7280' }}>
            Min {rate.outstation.minKmPerDay} km/day
          </p>
        </div>
      </div>

      {/* Expand button */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium focus-ring"
        style={{ borderTop: '1px solid #F7F8FC', color: '#6B7280', backgroundColor: '#FAFAFA' }}
      >
        {expanded ? <><ChevronUp size={13}/> Hide details</> : <><ChevronDown size={13}/> Show full rates</>}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="grid grid-cols-2 gap-0" style={{ borderTop: '1px solid #F7F8FC' }}>
          {/* Local detail */}
          <div className="p-3 space-y-1.5" style={{ borderRight: '1px solid #F7F8FC', backgroundColor: '#f8faff' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#3B65DB' }}>Local Rates</p>
            <RateRow icon="⏱" label="Package" value={`${rate.local.hours} hrs / ${rate.local.km} km`} />
            <RateRow icon="₹" label="Package rate" value={`₹${rate.local.packageRate?.toLocaleString('en-IN')}`} highlight />
            <RateRow icon="+" label="Extra hour" value={`₹${rate.local.extraHourRate}/-`} />
            <RateRow icon="+" label="Extra km"   value={`₹${rate.local.extraKmRate}/-`} />
          </div>
          {/* Outstation detail */}
          <div className="p-3 space-y-1.5" style={{ backgroundColor: '#fffcf5' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#F59E0B' }}>Outstation Rates</p>
            <RateRow icon="📍" label="Per km"       value={`₹${rate.outstation.perKmRate}/-`} highlight />
            <RateRow icon="🗓" label="Min km/day"   value={`${rate.outstation.minKmPerDay} km`} />
            <RateRow icon="👤" label="Driver bhata" value={`₹${rate.outstation.driverBhata}/day`} />
          </div>
        </div>
      )}
    </div>
  );
}

function RateRow({ icon, label, value, highlight }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px]" style={{ color: '#6B7280' }}>{icon} {label}</span>
      <span className="text-[11px] font-bold" style={{ color: highlight ? '#1F2937':'#6B7280' }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Rates Tab — main panel
// ─────────────────────────────────────────────────────────────────────────────
function VehicleRatesTab() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [delLoad, setDelLoad] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [acFilter, setAcFilter] = useState('');
  const toast = useToast();

  const reload = () => {
    setLoading(true);
    mastersService.vehicleRates.list().then((r) => setRates(r || [])).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => rates.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.bsCategory?.toLowerCase().includes(q);
    const matchCat    = !catFilter || r.category === catFilter;
    const matchAc     = !acFilter  || r.acType   === acFilter;
    return matchSearch && matchCat && matchAc;
  }), [rates, search, catFilter, acFilter]);

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await mastersService.vehicleRates.update(editing.id, values);
        toast.success('Vehicle rate updated');
      } else {
        await mastersService.vehicleRates.create(values);
        toast.success('Vehicle rate added');
      }
      setEditing(null); setFormOpen(false); reload();
    } catch (e) {
      toast.error(e.message || 'Save failed');
    }
  };

  const handleToggle = async (rate) => {
    try {
      await mastersService.vehicleRates.toggle(rate.id);
      toast.success(`${rate.name} ${rate.active ? 'deactivated' : 'activated'}`);
      reload();
    } catch (e) {
      toast.error(e.message || 'Update failed');
    }
  };

  const handleDelete = async () => {
    setDelLoad(true);
    try {
      await mastersService.vehicleRates.remove(deleting.id);
      toast.success('Vehicle rate deleted');
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeleting(null); setDelLoad(false); reload();
    }
  };

  // Stats
  const totalActive   = rates.filter(r => r.active).length;
  const categories    = [...new Set(rates.map(r => r.category))];

  if (loading) return <LoadingState label="Loading vehicle rates…" />;

  return (
    <>
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Vehicles',  value: rates.length,   color: '#3B65DB', bg: '#eef2fb' },
          { label: 'Active',          value: totalActive,    color: '#38B763', bg: '#f0fdf4' },
          { label: 'Categories',      value: categories.length, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Inactive',        value: rates.length - totalActive, color: '#F59E0B', bg: '#fffbeb' },
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
            placeholder="Search vehicle name, category, BS standard…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus-ring"
            style={{ borderColor: '#E5E7EB', color: '#1F2937', outline: 'none', backgroundColor: '#fff' }}
          />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border focus-ring"
          style={{ borderColor: '#E5E7EB', color: catFilter ? '#1F2937':'#6B7280', backgroundColor: '#fff' }}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={acFilter} onChange={e => setAcFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border focus-ring"
          style={{ borderColor: '#E5E7EB', color: acFilter ? '#1F2937':'#6B7280', backgroundColor: '#fff' }}>
          <option value="">A/C & Non A/C</option>
          <option value="A/C">A/C only</option>
          <option value="Non A/C">Non A/C only</option>
        </select>
        <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Add Vehicle</Button>
      </div>

      {/* Rate cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: '#6B7280' }}>
          <Car size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No vehicles match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {filtered.map(rate => (
            <VehicleRateCard
              key={rate.id} rate={rate}
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
        title={editing ? 'Edit Vehicle Rate Card' : 'Add Vehicle Rate Card'}
        size="lg"
      >
        <VehicleRateForm
          initial={editing}
          onSubmit={handleSubmit}
          onClose={() => { setFormOpen(false); setEditing(null); }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        loading={delLoad} danger title="Delete vehicle rate?"
        confirmLabel="Delete"
        description={`"${deleting?.name}" will be permanently removed from the rate sheet.`}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple master list (Cargo, Zones, Rate Cards)
// ─────────────────────────────────────────────────────────────────────────────
function SimpleMasterList({ masterKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [delLoad, setDelLoad] = useState(false);
  const [form, setForm] = useState({});
  const toast = useToast();

  const reload = () => {
    setLoading(true);
    mastersService[masterKey].list().then((r) => setRows(r || [])).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [masterKey]);

  const FIELD_DEFS = {
    cargoTypes: [
      { key: 'name',        label: 'Name',        required: true  },
      { key: 'description', label: 'Description', multiline: true },
    ],
    zones: [
      { key: 'name',   label: 'Zone name', required: true },
      { key: 'cities', label: 'Cities (comma-separated)', hint: 'e.g. Bengaluru, Chennai' },
    ],
    ratecards: [
      { key: 'name',       label: 'Rate card name', required: true },
      { key: 'baseRate',   label: 'Base rate (₹/day)', type: 'number' },
      { key: 'perKmRate',  label: 'Per km rate (₹)',   type: 'number' },
    ],
  };

  const TITLES = { cargoTypes: 'Cargo Type', zones: 'Zone', ratecards: 'Rate Card' };

  const fields = FIELD_DEFS[masterKey] || [];
  const title  = TITLES[masterKey] || 'Item';

  const openForm = (row) => {
    setEditing(row);
    setForm(row ? { ...row } : {});
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    const processed = { ...form };
    if (masterKey === 'zones' && typeof processed.cities === 'string')
      processed.cities = processed.cities.split(',').map(c => c.trim()).filter(Boolean);
    if (masterKey === 'ratecards') {
      processed.baseRate  = Number(processed.baseRate);
      processed.perKmRate = Number(processed.perKmRate);
    }

    try {
      if (editing) {
        await mastersService[masterKey].update(editing.id, processed);
        toast.success(`${title} updated`);
      } else {
        await mastersService[masterKey].create(processed);
        toast.success(`${title} added`);
      }
      setFormOpen(false); setEditing(null); reload();
    } catch (e) {
      toast.error(e.message || 'Save failed');
    }
  };

  const handleToggle = async (row) => {
    try {
      await mastersService[masterKey].toggle(row.id);
      reload();
    } catch (e) {
      toast.error(e.message || 'Update failed');
    }
  };

  const handleDelete = async () => {
    setDelLoad(true);
    try {
      await mastersService[masterKey].remove(deleting.id);
      toast.success(`${title} deleted`);
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeleting(null); setDelLoad(false); reload();
    }
  };

  const renderExtra = (row) => {
    if (masterKey === 'zones')     return (row.cities||[]).join(', ');
    if (masterKey === 'ratecards') return `₹${row.baseRate}/day · ₹${row.perKmRate}/km`;
    return row.description || '';
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm" style={{ color: '#6B7280' }}>{rows.length} {title.toLowerCase()}s configured</p>
        <Button size="sm" icon={Plus} onClick={() => openForm(null)}>Add {title}</Button>
      </div>

      <div className="space-y-2">
        {rows.map(row => (
          <div key={row.id} className="flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB', opacity: row.active ? 1 : 0.6 }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>{row.name}</p>
                <Badge tone={row.active ? 'green' : 'slate'}>{row.active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: '#6B7280' }}>{renderExtra(row)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handleToggle(row)} className="p-1.5 rounded-lg focus-ring"
                style={{ color: row.active ? '#38B763':'#6B7280' }}>
                {row.active ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
              </button>
              <IconButton icon={Pencil} label="Edit"   onClick={() => openForm(row)} />
              <IconButton icon={Trash2} label="Delete" variant="danger" onClick={() => setDeleting(row)} />
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-center py-10 text-sm" style={{ color: '#6B7280' }}>No {title.toLowerCase()}s yet.</p>
        )}
      </div>

      {/* Generic form modal */}
      <Modal open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? `Edit ${title}` : `Add ${title}`} size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit}>{editing ? 'Save' : 'Add'}</Button>
        </>}
      >
        <div className="space-y-4">
          {fields.map(f => (
            <FormField key={f.key} label={f.label} hint={f.hint} required={f.required}>
              {f.multiline
                ? <Textarea rows={2} value={form[f.key]||''} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))} />
                : <Input type={f.type||'text'} value={
                    f.key==='cities' && Array.isArray(form.cities) ? form.cities.join(', ') : (form[f.key]||'')
                  } onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))} />
              }
            </FormField>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        loading={delLoad} danger title={`Delete ${title}?`}
        confirmLabel="Delete"
        description={`"${deleting?.name}" will be permanently removed.`}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────────────────────────────────
export default function Masters() {
  const [tab, setTab] = useState('vehicleRates');

  return (
    <div>
      <PageHeader
        title="Masters"
        description="Configure vehicle rate cards, cargo types, zones and pricing — all in one place."
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b overflow-x-auto" style={{ borderColor: '#E5E7EB' }}>
        {MASTER_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px focus-ring whitespace-nowrap"
            style={{ borderColor: tab===t.key ? '#3B65DB':'transparent', color: tab===t.key ? '#3B65DB':'#6B7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'vehicleRates' ? (
        <VehicleRatesTab />
      ) : (
        <Card>
          <SimpleMasterList key={tab} masterKey={tab} />
        </Card>
      )}
    </div>
  );
}
