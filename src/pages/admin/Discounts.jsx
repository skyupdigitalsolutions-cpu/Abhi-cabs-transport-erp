import { useState, useMemo } from 'react';
import { Tag, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Copy, Percent, IndianRupee, CalendarClock, Users } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../hooks/useToast';
import { formatDate, formatCurrency } from '../../utils/formatters';

// ── Seed data ───────────────────────────────────────────────────────────────
let nextId = 1;
function mkId() { return `OFF-${String(nextId++).padStart(4, '0')}`; }

const INITIAL_OFFERS = [
  {
    id: mkId(), code: 'WELCOME20', name: 'Welcome Offer',
    description: 'Flat 20% off on your first ride with ABHI CABS.',
    type: 'percentage', value: 20, maxDiscount: 100,
    minOrderValue: 150, usageLimit: 1, usedCount: 342,
    applicableTo: 'all', vehicleClass: '',
    validFrom: '2026-01-01', validTo: '2026-12-31',
    active: true,
  },
  {
    id: mkId(), code: 'FLAT50', name: 'Flat ₹50 Off',
    description: 'Get ₹50 off on rides above ₹300.',
    type: 'flat', value: 50, maxDiscount: 50,
    minOrderValue: 300, usageLimit: 0, usedCount: 891,
    applicableTo: 'all', vehicleClass: '',
    validFrom: '2026-06-01', validTo: '2026-08-31',
    active: true,
  },
  {
    id: mkId(), code: 'CORP15', name: 'Corporate Discount',
    description: '15% off for all corporate account bookings.',
    type: 'percentage', value: 15, maxDiscount: 200,
    minOrderValue: 0, usageLimit: 0, usedCount: 1204,
    applicableTo: 'corporate', vehicleClass: '',
    validFrom: '2026-01-01', validTo: '2026-12-31',
    active: true,
  },
  {
    id: mkId(), code: 'SUV10', name: 'SUV Weekend Deal',
    description: '10% off on SUV bookings every weekend.',
    type: 'percentage', value: 10, maxDiscount: 150,
    minOrderValue: 500, usageLimit: 0, usedCount: 67,
    applicableTo: 'vehicle_class', vehicleClass: 'SUV',
    validFrom: '2026-07-01', validTo: '2026-09-30',
    active: false,
  },
  {
    id: mkId(), code: 'MONSOON30', name: 'Monsoon Special',
    description: '₹30 off on all rides during monsoon season.',
    type: 'flat', value: 30, maxDiscount: 30,
    minOrderValue: 200, usageLimit: 500, usedCount: 489,
    applicableTo: 'all', vehicleClass: '',
    validFrom: '2026-06-15', validTo: '2026-09-15',
    active: true,
  },
];

const EMPTY_FORM = {
  code: '', name: '', description: '',
  type: 'percentage', value: '', maxDiscount: '',
  minOrderValue: '', usageLimit: '',
  applicableTo: 'all', vehicleClass: '',
  validFrom: '', validTo: '', active: true,
};

const TYPE_OPTIONS      = [{ value: 'percentage', label: 'Percentage (%)' }, { value: 'flat', label: 'Flat Amount (₹)' }];
const APPLIES_OPTIONS   = [
  { value: 'all',           label: 'All customers' },
  { value: 'new',           label: 'New customers only' },
  { value: 'corporate',     label: 'Corporate accounts' },
  { value: 'vehicle_class', label: 'Specific vehicle class' },
];
const VEHICLE_OPTIONS   = ['Sedan','SUV','Tempo Traveller','Mini Bus','Luxury'].map(v => ({ value: v, label: v }));

function statusTone(offer) {
  if (!offer.active) return 'slate';
  const now = new Date();
  const to  = offer.validTo ? new Date(offer.validTo) : null;
  if (to && to < now) return 'red';
  const from = offer.validFrom ? new Date(offer.validFrom) : null;
  if (from && from > now) return 'primary';
  return 'green';
}
function statusLabel(offer) {
  if (!offer.active) return 'Inactive';
  const now = new Date();
  if (offer.validTo && new Date(offer.validTo) < now) return 'Expired';
  if (offer.validFrom && new Date(offer.validFrom) > now) return 'Scheduled';
  return 'Active';
}

export default function Discounts() {
  const [offers, setOffers]         = useState(INITIAL_OFFERS);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilter]   = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);   // null = create
  const [form, setForm]             = useState(EMPTY_FORM);
  const [deleting, setDeleting]     = useState(null);
  const [errors, setErrors]         = useState({});
  const toast = useToast();

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return offers.filter(o => {
      const matchSearch = !q ||
        o.code.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q);
      const status = statusLabel(o).toLowerCase();
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active'   && status === 'active') ||
        (filterStatus === 'inactive' && (status === 'inactive' || status === 'expired')) ||
        (filterStatus === 'scheduled' && status === 'scheduled');
      return matchSearch && matchStatus;
    });
  }, [offers, search, filterStatus]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    offers.length,
    active:   offers.filter(o => statusLabel(o) === 'Active').length,
    redeemed: offers.reduce((s, o) => s + o.usedCount, 0),
    saved:    offers.reduce((s, o) => s + (o.usedCount * (o.type === 'flat' ? o.value : 50)), 0),
  }), [offers]);

  // ── Form helpers ─────────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setErrors({}); setModalOpen(true); };
  const openEdit   = (o) => { setEditing(o); setForm({ ...o }); setErrors({}); setModalOpen(true); };
  const set        = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.code.trim())      e.code = 'Coupon code is required';
    if (!form.name.trim())      e.name = 'Offer name is required';
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0)
      e.value = form.type === 'percentage' ? 'Enter a discount % (1-100)' : 'Enter discount amount';
    if (form.type === 'percentage' && Number(form.value) > 100)
      e.value = 'Percentage cannot exceed 100';
    if (!form.validFrom)        e.validFrom = 'Start date is required';
    if (!form.validTo)          e.validTo   = 'End date is required';
    if (form.validFrom && form.validTo && form.validTo < form.validFrom)
      e.validTo = 'End date must be after start date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editing) {
      setOffers(os => os.map(o => o.id === editing.id ? { ...o, ...form } : o));
      toast.success('Offer updated');
    } else {
      const code = form.code.toUpperCase().replace(/\s+/g, '');
      if (offers.some(o => o.code === code)) {
        setErrors(e => ({ ...e, code: 'Coupon code already exists' }));
        return;
      }
      setOffers(os => [{ ...form, code, id: mkId(), usedCount: 0, active: true }, ...os]);
      toast.success('Offer created');
    }
    setModalOpen(false);
  };

  const handleToggle = (offer) => {
    setOffers(os => os.map(o => o.id === offer.id ? { ...o, active: !o.active } : o));
    toast.success(offer.active ? 'Offer deactivated' : 'Offer activated');
  };

  const handleDelete = () => {
    setOffers(os => os.filter(o => o.id !== deleting.id));
    toast.success('Offer deleted');
    setDeleting(null);
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    toast.success(`Copied "${code}"`);
  };

  return (
    <div>
      <PageHeader
        title="Discounts & Offers"
        description="Create and manage coupon codes, promo offers and seasonal discounts."
        actions={
          <Button icon={Plus} onClick={openCreate}>New offer</Button>
        }
      />

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total offers',   value: stats.total,                  icon: Tag,          tone: { bg: '#fff8e1', color: '#b45309' } },
          { label: 'Active now',     value: stats.active,                 icon: ToggleRight,  tone: { bg: '#f0fdf4', color: '#22A65A' } },
          { label: 'Times redeemed', value: stats.redeemed.toLocaleString(), icon: Users,     tone: { bg: '#eff6ff', color: '#2563EB' } },
          { label: 'Est. savings',   value: formatCurrency(stats.saved),  icon: IndianRupee,  tone: { bg: '#f5f3ff', color: '#7c3aed' } },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: s.tone.bg }}>
              <s.icon size={16} style={{ color: s.tone.color }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9A9A9A' }}>{s.label}</p>
              <p className="text-lg font-extrabold tracking-tight" style={{ color: '#111111' }}>{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <input
            className="w-full rounded-lg border px-3 py-2 text-xs font-medium pl-8"
            style={{ borderColor: '#E8E8E4', backgroundColor: '#fff', color: '#111111' }}
            placeholder="Search code or name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Tag size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#D0D0CA' }} />
        </div>
        <div
          className="flex rounded-lg p-0.5 gap-0.5"
          style={{ backgroundColor: '#F5F5F3', border: '1px solid #E8E8E4' }}
        >
          {[['all','All'],['active','Active'],['scheduled','Scheduled'],['inactive','Inactive']].map(([v,l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className="px-3 py-1.5 rounded-md text-[11px] font-bold transition-all"
              style={filterStatus === v
                ? { backgroundColor: '#FFC107', color: '#111111' }
                : { backgroundColor: 'transparent', color: '#9A9A9A' }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Offer cards ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card className="py-16 text-center">
          <Tag size={28} className="mx-auto mb-3" style={{ color: '#E8E8E4' }} />
          <p className="text-sm font-bold" style={{ color: '#9A9A9A' }}>No offers found</p>
          <p className="text-xs mt-1 font-medium" style={{ color: '#D0D0CA' }}>Try a different search or create a new offer.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((offer) => {
            const tone  = statusTone(offer);
            const label = statusLabel(offer);
            return (
              <Card key={offer.id} padded={false} className="flex flex-col">
                {/* Header */}
                <div
                  className="flex items-start justify-between px-5 pt-5 pb-4"
                  style={{ borderBottom: '1px solid #F5F5F3' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {/* Coupon code pill */}
                      <button
                        onClick={() => copyCode(offer.code)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-extrabold text-xs tracking-wider hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: '#111111', color: '#FFC107', fontFamily: 'monospace', letterSpacing: '0.1em' }}
                        title="Click to copy"
                      >
                        {offer.code}
                        <Copy size={10} />
                      </button>
                      <Badge tone={tone}>{label}</Badge>
                    </div>
                    <p className="text-sm font-bold truncate" style={{ color: '#111111' }}>{offer.name}</p>
                    <p className="text-[11px] mt-0.5 font-medium leading-relaxed line-clamp-2" style={{ color: '#9A9A9A' }}>
                      {offer.description}
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-2.5 flex-1">
                  {/* Discount value */}
                  <div className="flex items-center gap-2">
                    {offer.type === 'percentage'
                      ? <Percent size={13} style={{ color: '#FFC107' }} />
                      : <IndianRupee size={13} style={{ color: '#FFC107' }} />
                    }
                    <span className="text-xs font-semibold" style={{ color: '#111111' }}>
                      {offer.type === 'percentage'
                        ? `${offer.value}% off${offer.maxDiscount ? ` (max ₹${offer.maxDiscount})` : ''}`
                        : `₹${offer.value} flat off`
                      }
                    </span>
                  </div>

                  {/* Min order */}
                  {offer.minOrderValue > 0 && (
                    <div className="flex items-center gap-2">
                      <IndianRupee size={13} style={{ color: '#D0D0CA' }} />
                      <span className="text-[11px] font-medium" style={{ color: '#9A9A9A' }}>
                        Min order ₹{offer.minOrderValue}
                      </span>
                    </div>
                  )}

                  {/* Validity */}
                  <div className="flex items-center gap-2">
                    <CalendarClock size={13} style={{ color: '#D0D0CA' }} />
                    <span className="text-[11px] font-medium" style={{ color: '#9A9A9A' }}>
                      {formatDate(offer.validFrom)} – {formatDate(offer.validTo)}
                    </span>
                  </div>

                  {/* Applies to */}
                  <div className="flex items-center gap-2">
                    <Users size={13} style={{ color: '#D0D0CA' }} />
                    <span className="text-[11px] font-medium" style={{ color: '#9A9A9A' }}>
                      {APPLIES_OPTIONS.find(a => a.value === offer.applicableTo)?.label || offer.applicableTo}
                      {offer.vehicleClass ? ` · ${offer.vehicleClass}` : ''}
                    </span>
                  </div>

                  {/* Usage */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-bold" style={{ color: '#9A9A9A' }}>
                      {offer.usedCount.toLocaleString()} redeemed
                      {offer.usageLimit > 0 ? ` / ${offer.usageLimit}` : ''}
                    </span>
                    {offer.usageLimit > 0 && (
                      <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ backgroundColor: '#F5F5F3' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (offer.usedCount / offer.usageLimit) * 100)}%`,
                            backgroundColor: offer.usedCount >= offer.usageLimit ? '#DC2626' : '#FFC107',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderTop: '1px solid #F5F5F3' }}
                >
                  <button
                    onClick={() => handleToggle(offer)}
                    className="flex items-center gap-1.5 text-[11px] font-bold transition-opacity hover:opacity-70"
                    style={{ color: offer.active ? '#22A65A' : '#9A9A9A' }}
                  >
                    {offer.active
                      ? <ToggleRight size={16} />
                      : <ToggleLeft  size={16} />
                    }
                    {offer.active ? 'Active' : 'Inactive'}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(offer)}
                      className="h-7 w-7 grid place-items-center rounded-lg hover:bg-gray-100 transition-colors"
                      style={{ color: '#5A5A5A' }}
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleting(offer)}
                      className="h-7 w-7 grid place-items-center rounded-lg hover:bg-red-50 transition-colors"
                      style={{ color: '#DC2626' }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit modal ───────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit offer' : 'Create new offer'}
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>{editing ? 'Save changes' : 'Create offer'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Coupon code" required error={errors.code}>
              <Input
                placeholder="e.g. SUMMER25"
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
                style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
              />
            </FormField>
            <FormField label="Offer name" required error={errors.name}>
              <Input placeholder="e.g. Summer Special" value={form.name} onChange={e => set('name', e.target.value)} />
            </FormField>
          </div>

          <FormField label="Description">
            <Textarea placeholder="Brief description shown to customers…" value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Discount type" required>
              <Select value={form.type} onChange={e => set('type', e.target.value)} options={TYPE_OPTIONS} />
            </FormField>
            <FormField label={form.type === 'percentage' ? 'Discount %' : 'Flat amount (₹)'} required error={errors.value}>
              <Input
                type="number" min="1" max={form.type === 'percentage' ? 100 : undefined}
                placeholder={form.type === 'percentage' ? '20' : '50'}
                value={form.value}
                onChange={e => set('value', e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {form.type === 'percentage' && (
              <FormField label="Max discount (₹)" hint="Cap for % discounts">
                <Input type="number" min="0" placeholder="e.g. 100" value={form.maxDiscount} onChange={e => set('maxDiscount', e.target.value)} />
              </FormField>
            )}
            <FormField label="Min order value (₹)" hint="0 = no minimum">
              <Input type="number" min="0" placeholder="e.g. 200" value={form.minOrderValue} onChange={e => set('minOrderValue', e.target.value)} />
            </FormField>
            <FormField label="Usage limit" hint="0 = unlimited">
              <Input type="number" min="0" placeholder="e.g. 500" value={form.usageLimit} onChange={e => set('usageLimit', e.target.value)} />
            </FormField>
          </div>

          <FormField label="Applies to">
            <Select value={form.applicableTo} onChange={e => set('applicableTo', e.target.value)} options={APPLIES_OPTIONS} />
          </FormField>

          {form.applicableTo === 'vehicle_class' && (
            <FormField label="Vehicle class">
              <Select value={form.vehicleClass} onChange={e => set('vehicleClass', e.target.value)}
                options={[{ value: '', label: 'Select class…' }, ...VEHICLE_OPTIONS]} />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Valid from" required error={errors.validFrom}>
              <Input type="date" value={form.validFrom} onChange={e => set('validFrom', e.target.value)} />
            </FormField>
            <FormField label="Valid to" required error={errors.validTo}>
              <Input type="date" value={form.validTo} onChange={e => set('validTo', e.target.value)} />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirm ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleting}
        title="Delete offer"
        message={`Delete "${deleting?.name}" (${deleting?.code})? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
