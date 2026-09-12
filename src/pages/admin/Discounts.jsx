import { useState } from 'react';
import { Plus, Tag, Percent, Calendar, ToggleLeft, ToggleRight, Pencil, Trash2 } from 'lucide-react';
import PageHeader    from '../../components/ui/PageHeader';
import Card          from '../../components/ui/Card';
import Button        from '../../components/ui/Button';
import Badge         from '../../components/ui/Badge';
import Alert         from '../../components/ui/Alert';
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

/**
 * Discounts & Offers page.
 * No backend endpoint exists yet for discount management.
 * This is a fully-functional UI with local state, ready to be wired
 * to a backend endpoint when built.
 */

const DISCOUNT_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'FLAT',       label: 'Flat amount (₹)' },
];

const APPLIES_TO = [
  { value: 'ALL',        label: 'All bookings'      },
  { value: 'FIRST_RIDE', label: 'First ride only'   },
  { value: 'CORPORATE',  label: 'Corporate accounts' },
  { value: 'AIRPORT',    label: 'Airport trips'      },
];

const MOCK_DISCOUNTS = [
  { id: '1', code: 'WELCOME20', type: 'PERCENTAGE', value: 20, appliesTo: 'FIRST_RIDE', minFare: 200, maxUses: 500, usedCount: 123, active: true, expiresAt: '2026-12-31', description: 'First ride discount for new customers' },
  { id: '2', code: 'FLAT100',   type: 'FLAT',       value: 100, appliesTo: 'ALL',        minFare: 400, maxUses: 1000, usedCount: 456, active: true, expiresAt: '2026-10-31', description: '₹100 off on all bookings' },
  { id: '3', code: 'CORP15',    type: 'PERCENTAGE', value: 15, appliesTo: 'CORPORATE',   minFare: 500, maxUses: null, usedCount: 89,  active: false, expiresAt: '2026-09-30', description: 'Corporate account flat discount' },
];

function DiscountFormDrawer({ open, onClose, initial, onSubmit }) {
  const [form, setForm] = useState(initial || {
    code: '', type: 'PERCENTAGE', value: '', appliesTo: 'ALL',
    minFare: '', maxUses: '', expiresAt: '', description: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Drawer open={open} onClose={onClose}
      title={initial ? 'Edit discount' : 'Create discount'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSubmit(form); onClose(); }}>
            {initial ? 'Save changes' : 'Create discount'}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <FormField label="Promo code" hint="Customers enter this at checkout — uppercase, no spaces">
          <Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g,''))}
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
          <FormField label={form.type === 'PERCENTAGE' ? 'Percentage (%)' : 'Flat amount (₹)'}>
            <Input type="number" value={form.value} onChange={(e) => set('value', e.target.value)}
              placeholder={form.type === 'PERCENTAGE' ? '20' : '100'} />
          </FormField>
        </div>
        <FormField label="Applies to">
          <Select value={form.appliesTo} onChange={(e) => set('appliesTo', e.target.value)} options={APPLIES_TO} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Min. fare (₹)" hint="Minimum booking value to use this code">
            <Input type="number" value={form.minFare} onChange={(e) => set('minFare', e.target.value)} placeholder="200" />
          </FormField>
          <FormField label="Max uses" hint="Leave blank for unlimited">
            <Input type="number" value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} placeholder="Unlimited" />
          </FormField>
        </div>
        <FormField label="Expires on">
          <Input type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
        </FormField>
      </div>
    </Drawer>
  );
}

export default function Discounts() {
  const toast = useToast();
  const [discounts, setDiscounts] = useState(MOCK_DISCOUNTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);

  const filtered = discounts.filter((d) => {
    if (search && !d.code.toLowerCase().includes(search.toLowerCase()) && !d.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'active'   && !d.active) return false;
    if (statusFilter === 'inactive' &&  d.active) return false;
    return true;
  });

  const handleCreate = (form) => {
    setDiscounts((d) => [...d, { ...form, id: Date.now().toString(), usedCount: 0, active: true }]);
    toast.success('Discount created');
  };
  const handleUpdate = (form) => {
    setDiscounts((d) => d.map((x) => x.id === editing.id ? { ...x, ...form } : x));
    setEditing(null);
    toast.success('Discount updated');
  };
  const handleToggle = (id) => {
    setDiscounts((d) => d.map((x) => x.id === id ? { ...x, active: !x.active } : x));
    toast.success('Status updated');
  };
  const handleDelete = () => {
    setDiscounts((d) => d.filter((x) => x.id !== deleting.id));
    setDeleting(null);
    toast.success('Discount deleted');
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
          {r.type === 'PERCENTAGE'
            ? <><Percent size={13} />{r.value}%</>
            : <>₹{r.value}</>
          }
        </span>
      ),
    },
    {
      key: 'appliesTo', header: 'Applies to',
      render: (r) => <Badge tone="slate">{APPLIES_TO.find((a) => a.value === r.appliesTo)?.label || r.appliesTo}</Badge>,
    },
    {
      key: 'minFare', header: 'Min. Fare',
      render: (r) => r.minFare ? formatCurrency(r.minFare) : <span style={{ color: '#9CA3AF' }}>None</span>,
    },
    {
      key: 'usage', header: 'Usage',
      render: (r) => (
        <span style={{ color: '#6B7280', fontSize: 13 }}>
          {r.usedCount} / {r.maxUses ?? '∞'}
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
      key: 'active', header: 'Status',
      render: (r) => <Badge tone={r.active ? 'green' : 'slate'}>{r.active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <button onClick={() => handleToggle(r.id)} title={r.active ? 'Deactivate' : 'Activate'}
            style={{ color: r.active ? '#38B763' : '#9CA3AF', padding: 4 }}>
            {r.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
          <IconButton icon={Pencil} label="Edit"   onClick={() => { setEditing(r); setFormOpen(true); }} />
          <IconButton icon={Trash2} label="Delete" variant="danger" onClick={() => setDeleting(r)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Discounts & Offers"
        description="Manage promotional codes and discount offers for customers."
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Create discount</Button>}
      />

      <Alert type="info" className="mb-4">
        Discount management is not yet connected to the backend. Codes created here are stored locally for now.
        Once the backend endpoint is built, this page will be wired automatically.
      </Alert>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total codes',   value: discounts.length,                     icon: Tag,     tone: '#3B65DB', bg: '#eef2fb' },
          { label: 'Active codes',  value: discounts.filter((d) => d.active).length, icon: Tag, tone: '#38B763', bg: '#f0fdf4' },
          { label: 'Total uses',    value: discounts.reduce((s, d) => s + d.usedCount, 0), icon: Percent, tone: '#F59E0B', bg: '#fffbeb' },
          { label: 'Expiring soon', value: discounts.filter((d) => { const days = Math.ceil((new Date(d.expiresAt) - new Date()) / 86400000); return days >= 0 && days <= 7; }).length, icon: Calendar, tone: '#EF4444', bg: '#fef2f2' },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
              style={{ backgroundColor: s.bg }}>
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
        status="succeeded"
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
        title="Delete this discount?"
        description={deleting ? `Promo code "${deleting.code}" will be permanently deleted.` : ''}
        confirmLabel="Delete"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
