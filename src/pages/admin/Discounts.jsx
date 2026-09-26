import { useState, useEffect, useCallback } from 'react';
import { Plus, Tag, Percent, Calendar, ToggleLeft, ToggleRight, Pencil, Trash2 } from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import Card          from '../../components/ui/Card';
import Button        from '../../components/ui/Button';
import Badge         from '../../components/ui/Badge';
import DataTable     from '../../components/ui/DataTable';
import FilterBar     from '../../components/ui/FilterBar';
import IconButton    from '../../components/ui/IconButton';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Drawer        from '../../components/ui/Drawer';
import FormField     from '../../components/ui/FormField';
import Input         from '../../components/ui/Input';
import Select        from '../../components/ui/Select';
import { useToast }  from '../../hooks/useToast';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { discountService } from '../../services/discountService';

/**
 * Discounts & Offers page — WIRED to the real backend.
 *   GET/POST/PATCH/DELETE /admin/discounts   (permission: FARE_EDIT)
 *
 * Backend enums (exact casing):
 *   type      : 'PERCENT' | 'FLAT'
 *   appliesTo : 'ALL_BOOKINGS' | 'FIRST_RIDE' | 'CORPORATE' | 'AIRPORT'
 *   isActive  : boolean;  id : number
 * The list controller also returns a computed `status`:
 *   'LIVE' | 'DISABLED' | 'SCHEDULED' | 'EXPIRED' | 'EXHAUSTED'
 *
 * A code can never be renamed (redemptions reference it), so `code` is
 * read-only when editing. DELETE disables rather than removing.
 */

const DISCOUNT_TYPES = [
  { value: 'PERCENT', label: 'Percentage (%)' },
  { value: 'FLAT',    label: 'Flat amount (₹)' },
];

const APPLIES_TO = [
  { value: 'ALL_BOOKINGS', label: 'All bookings'       },
  { value: 'FIRST_RIDE',   label: 'First ride only'    },
  { value: 'CORPORATE',    label: 'Corporate accounts' },
  { value: 'AIRPORT',      label: 'Airport trips'      },
];

const STATUS_TONE = {
  LIVE:      'green',
  DISABLED:  'slate',
  SCHEDULED: 'blue',
  EXPIRED:   'red',
  EXHAUSTED: 'amber',
};

// <input type="date"> wants 'YYYY-MM-DD'; backend sends full ISO.
function toDateInput(iso) {
  if (!iso) return '';
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return ''; }
}

function DiscountFormDrawer({ open, onClose, initial, onSubmit }) {
  const empty = {
    code: '', type: 'PERCENT', value: '', appliesTo: 'ALL_BOOKINGS',
    minFare: '', maxDiscount: '', maxUses: '', maxUsesPerCustomer: '',
    startsAt: '', expiresAt: '', description: '',
  };

  const [form, setForm]     = useState(empty);
  const [saving, setSaving] = useState(false);

  // Rebuild the form whenever we open / switch between create & edit.
  useEffect(() => {
    if (!open) return;
    setForm(initial ? {
      code:               initial.code || '',
      type:               initial.type || 'PERCENT',
      value:              initial.value ?? '',
      appliesTo:          initial.appliesTo || 'ALL_BOOKINGS',
      minFare:            initial.minFare ?? '',
      maxDiscount:        initial.maxDiscount ?? '',
      maxUses:            initial.maxUses ?? '',
      maxUsesPerCustomer: initial.maxUsesPerCustomer ?? '',
      startsAt:           toDateInput(initial.startsAt),
      expiresAt:          toDateInput(initial.expiresAt),
      description:        initial.description || '',
    } : empty);
  }, [open, initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isPercent = form.type === 'PERCENT';

  return (
    <Drawer open={open} onClose={onClose}
      title={initial ? 'Edit discount' : 'Create discount'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={saving}>
            {initial ? 'Save changes' : 'Create discount'}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <FormField label="Promo code" hint={initial ? 'Codes cannot be renamed once created' : 'Customers enter this at checkout — uppercase, no spaces'}>
          <Input value={form.code} disabled={!!initial}
            onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
            placeholder="e.g. WELCOME20" />
        </FormField>
        <FormField label="Description">
          <Input value={form.description} onChange={(e) => set('description', e.target.value)}
            placeholder="Internal note about this offer" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Discount type">
            <Select value={form.type} onChange={(e) => set('type', e.target.value)} options={DISCOUNT_TYPES} />
          </FormField>
          <FormField label={isPercent ? 'Percentage (%)' : 'Flat amount (₹)'}>
            <Input type="number" value={form.value} onChange={(e) => set('value', e.target.value)}
              placeholder={isPercent ? '20' : '100'} />
          </FormField>
        </div>
        {isPercent && (
          <FormField label="Max discount cap (₹)" hint="Upper limit on a percentage discount — leave blank for none">
            <Input type="number" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} placeholder="No cap" />
          </FormField>
        )}
        <FormField label="Applies to">
          <Select value={form.appliesTo} onChange={(e) => set('appliesTo', e.target.value)} options={APPLIES_TO} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Min. fare (₹)" hint="Minimum booking value to use this code">
            <Input type="number" value={form.minFare} onChange={(e) => set('minFare', e.target.value)} placeholder="200" />
          </FormField>
          <FormField label="Max uses (total)" hint="Leave blank for unlimited">
            <Input type="number" value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} placeholder="Unlimited" />
          </FormField>
        </div>
        <FormField label="Max uses per customer" hint="Leave blank for default">
          <Input type="number" value={form.maxUsesPerCustomer} onChange={(e) => set('maxUsesPerCustomer', e.target.value)} placeholder="e.g. 1" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Starts on" hint="Leave blank to start immediately">
            <Input type="date" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
          </FormField>
          <FormField label="Expires on" hint="Leave blank for no expiry">
            <Input type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
          </FormField>
        </div>
      </div>
    </Drawer>
  );
}

export default function Discounts() {
  const toast = useToast();
  const [discounts, setDiscounts]   = useState([]);
  const [status, setStatus]         = useState('loading'); // loading | error | success
  const [loadError, setLoadError]   = useState(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen]     = useState(false);
  const [editing,  setEditing]      = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [busyId,   setBusyId]       = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setLoadError(null);
    try {
      const { items } = await discountService.list({ search: search.trim() || undefined });
      setDiscounts(items);
      setStatus('success');
    } catch (e) {
      setLoadError(e);
      setStatus('error');
    }
  }, [search]);

  // Reload on mount and whenever the search term settles.
  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const filtered = discounts.filter((d) => {
    if (statusFilter === 'active'   && !d.isActive) return false;
    if (statusFilter === 'inactive' &&  d.isActive) return false;
    return true;
  });

  const handleCreate = async (form) => {
    try {
      await discountService.create(form);
      toast.success('Discount created');
      await load();
    } catch (e) {
      toast.error(e.message || 'Could not create discount');
      throw e; // keep the drawer open on failure
    }
  };

  const handleUpdate = async (form) => {
    try {
      await discountService.update(editing.id, form);
      setEditing(null);
      toast.success('Discount updated');
      await load();
    } catch (e) {
      toast.error(e.message || 'Could not update discount');
      throw e;
    }
  };

  const handleToggle = async (row) => {
    setBusyId(row.id);
    try {
      if (row.isActive) await discountService.disable(row.id);
      else              await discountService.enable(row.id);
      toast.success(row.isActive ? 'Discount disabled' : 'Discount enabled');
      await load();
    } catch (e) {
      toast.error(e.message || 'Could not update status');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    const row = deleting;
    setDeleting(null);
    setBusyId(row.id);
    try {
      await discountService.disable(row.id);
      toast.success(`${row.code} disabled`);
      await load();
    } catch (e) {
      toast.error(e.message || 'Could not disable discount');
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: 'code', header: 'Promo Code',
      render: (r) => (
        <div>
          <p className="font-mono font-bold" style={{ color: '#1F2937', fontSize: 14 }}>{r.code}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{r.description || '—'}</p>
        </div>
      ),
    },
    {
      key: 'value', header: 'Discount',
      render: (r) => (
        <span className="flex items-center gap-1 font-bold" style={{ color: '#3B65DB' }}>
          {r.type === 'PERCENT'
            ? <><Percent size={13} />{r.value}%{r.maxDiscount ? <span style={{ color: '#9CA3AF', fontWeight: 500, fontSize: 12 }}>&nbsp;(max ₹{r.maxDiscount})</span> : null}</>
            : <>₹{r.value}</>
          }
        </span>
      ),
    },
    {
      key: 'appliesTo', header: 'Applies to',
      render: (r) => <Badge tone="slate">{APPLIES_TO.find((a) => a.value === r.appliesTo)?.label || r.appliesTo || 'All bookings'}</Badge>,
    },
    {
      key: 'minFare', header: 'Min. Fare',
      render: (r) => r.minFare ? formatCurrency(r.minFare) : <span style={{ color: '#9CA3AF' }}>None</span>,
    },
    {
      key: 'usage', header: 'Usage',
      render: (r) => (
        <span style={{ color: '#6B7280', fontSize: 13 }}>
          {r.usedCount ?? 0} / {r.maxUses ?? '∞'}
        </span>
      ),
    },
    {
      key: 'expiresAt', header: 'Expires',
      render: (r) => {
        if (!r.expiresAt) return <span style={{ color: '#9CA3AF' }}>Never</span>;
        const expired = new Date(r.expiresAt) < new Date();
        return (
          <span style={{ color: expired ? '#EF4444' : '#6B7280', fontSize: 13 }}>
            {expired ? '⚠️ ' : ''}{formatDate(r.expiresAt)}
          </span>
        );
      },
    },
    {
      key: 'status', header: 'Status',
      render: (r) => <Badge tone={STATUS_TONE[r.status] || (r.isActive ? 'green' : 'slate')}>{r.status || (r.isActive ? 'LIVE' : 'DISABLED')}</Badge>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <button onClick={() => handleToggle(r)} disabled={busyId === r.id}
            title={r.isActive ? 'Disable' : 'Enable'}
            style={{ color: r.isActive ? '#38B763' : '#9CA3AF', padding: 4, opacity: busyId === r.id ? 0.5 : 1 }}>
            {r.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
          <IconButton icon={Pencil} label="Edit" onClick={() => { setEditing(r); setFormOpen(true); }} />
          <IconButton icon={Trash2} label="Disable" variant="danger" onClick={() => setDeleting(r)} />
        </div>
      ),
    },
  ];

  const totalUses = discounts.reduce((s, d) => s + (d.usedCount || 0), 0);
  const activeCount = discounts.filter((d) => d.isActive).length;
  const expiringSoon = discounts.filter((d) => {
    if (!d.expiresAt) return false;
    const days = Math.ceil((new Date(d.expiresAt) - new Date()) / 86400000);
    return days >= 0 && days <= 7;
  }).length;

  return (
    <div>
      <PageHeader
        title="Discounts & Offers"
        description="Manage promotional codes and discount offers for customers."
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Create discount</Button>}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total codes',   value: discounts.length, icon: Tag,     tone: '#3B65DB', bg: '#eef2fb' },
          { label: 'Active codes',  value: activeCount,      icon: Tag,     tone: '#38B763', bg: '#f0fdf4' },
          { label: 'Total uses',    value: totalUses,        icon: Percent, tone: '#F59E0B', bg: '#fffbeb' },
          { label: 'Expiring soon', value: expiringSoon,     icon: Calendar,tone: '#EF4444', bg: '#fef2f2' },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: s.bg }}>
              <s.icon size={18} style={{ color: s.tone }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: '#6B7280' }}>{s.label}</p>
              <p className="text-lg font-bold" style={{ color: '#1F2937' }}>{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <FilterBar
        search={search} onSearchChange={setSearch}
        searchPlaceholder="Search promo code or description…"
        filters={[{
          name: 'status', value: statusFilter,
          onChange: setStatusFilter,
          placeholder: 'All statuses',
          options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }],
        }]}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        status={status}
        error={loadError}
        onRetry={load}
        emptyTitle="No discount codes yet"
        emptyDescription="Create your first promo code to offer discounts to customers."
      />

      <DiscountFormDrawer
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        initial={editing}
        onSubmit={editing ? handleUpdate : handleCreate}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Disable this discount?"
        description={deleting ? `Promo code "${deleting.code}" will be disabled. It is kept for dispute history and can be re-enabled later — codes are never permanently deleted.` : ''}
        confirmLabel="Disable"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
