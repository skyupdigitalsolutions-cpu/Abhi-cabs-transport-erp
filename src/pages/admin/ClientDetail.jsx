import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useState, useEffect } from 'react';
import { ArrowLeft, Phone, Mail, Building2, CalendarCheck, Gift, FileText } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { adminCustomersService, bookingService } from '../../services';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import Drawer from '../../components/ui/Drawer';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../hooks/useToast';
import { useForm } from '../../hooks/useForm';
import { formatCurrency, formatDate, titleCase } from '../../utils/formatters';

function StatCard({ icon: Icon, label, value, tone = 'primary' }) {
  const TONES = {
    primary: { bg: '#eef2fb', color: '#3B65DB' },
    green:   { bg: '#f0fdf4', color: '#38B763' },
    amber:   { bg: '#fffbeb', color: '#F59E0B' },
    purple:  { bg: '#f5f3ff', color: '#7c3aed' },
  };
  const t = TONES[tone] || TONES.primary;
  return (
    <Card className="flex items-center gap-4">
      <div className="h-11 w-11 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: t.bg }}>
        <Icon size={20} style={{ color: t.color }} />
      </div>
      <div>
        <p className="text-xs font-medium" style={{ color: '#6B7280' }}>{label}</p>
        <p className="text-lg font-bold mt-0.5" style={{ color: '#1F2937' }}>{value}</p>
      </div>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid #F7F8FC' }}>
      <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ backgroundColor: '#F7F8FC' }}>
        <Icon size={14} style={{ color: '#6B7280' }} />
      </div>
      <div>
        <p className="text-xs" style={{ color: '#6B7280' }}>{label}</p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: '#1F2937' }}>{value}</p>
      </div>
    </div>
  );
}

// ── Edit drawer — only the fields the real backend actually lets staff
// change (src/models/customer.model.js ADMIN_EDITABLE_CUSTOMER_FIELDS):
// accountType, corporateAccountId, alternatePhone, gstin, loyaltyPoints, notes.
function EditCustomerDrawer({ open, onClose, customer, onSubmit }) {
  const { values, submitting, submitError, setValue, handleSubmit } = useForm({
    initialValues: {
      accountType: customer?.accountType || 'RETAIL',
      alternatePhone: customer?.alternatePhone || '',
      gstin: customer?.gstin || '',
      loyaltyPoints: customer?.loyaltyPoints ?? 0,
      notes: customer?.notes || '',
    },
    schema: {},
    onSubmit: async (vals) => { await onSubmit(vals); onClose(); },
  });

  return (
    <Drawer open={open} onClose={onClose} title="Edit customer"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} loading={submitting}>Save changes</Button>
      </>}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {submitError && <p className="text-sm" style={{ color: '#DC2626' }}>{submitError}</p>}
        <FormField label="Account type">
          <Select
            value={values.accountType}
            onChange={(e) => setValue('accountType', e.target.value)}
            options={[{ value: 'RETAIL', label: 'Retail' }, { value: 'CORPORATE', label: 'Corporate' }]}
          />
        </FormField>
        <FormField label="Alternate phone">
          <Input type="tel" placeholder="9876543210" maxLength={10}
            value={values.alternatePhone} onChange={(e) => setValue('alternatePhone', e.target.value)} />
        </FormField>
        <FormField label="GSTIN" hint="For corporate billing.">
          <Input placeholder="e.g. 29ABCDE1234F1Z5" maxLength={15}
            value={values.gstin} onChange={(e) => setValue('gstin', e.target.value.toUpperCase())} />
        </FormField>
        <FormField label="Loyalty points">
          <Input type="number" min={0}
            value={values.loyaltyPoints} onChange={(e) => setValue('loyaltyPoints', e.target.value)} />
        </FormField>
        <FormField label="Internal notes">
          <Textarea rows={3} value={values.notes} onChange={(e) => setValue('notes', e.target.value)} />
        </FormField>
      </form>
    </Drawer>
  );
}

export default function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const fetchCustomer = useCallback(() => adminCustomersService.get(clientId), [clientId]);
  const { data: customer, status, error, refetch, setData } = useApi(fetchCustomer, [clientId]);

  const [billing, setBilling] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!customer) return;
    adminCustomersService.getBilling(customer.userId).then(setBilling).catch(() => setBilling(null));
    bookingService.list({ limit: 8, sortBy: 'createdAt', filters: { customerId: customer.userId } })
      .then((r) => setCustomerBookings(r.data || []))
      .catch(() => setCustomerBookings([]));
  }, [customer]);

  if (status === 'loading') return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
      {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
  if (status === 'error') return (
    <ErrorState message={error?.status === 404 ? 'Customer not found.' : error?.message} onRetry={refetch} />
  );

  const handleUpdate = async (values) => {
    try {
      const updated = await adminCustomersService.update(customer.userId, values);
      setData({ ...customer, ...updated });
      toast.success('Customer updated');
    } catch (e) {
      toast.error(e.message || 'Update failed');
    }
  };

  const name = customer.user?.name || 'Unknown';

  return (
    <div>
      <Breadcrumb items={[{ label: 'Customers', to: '/admin/clients' }, { label: name }]} />
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)} className="-ml-2">Back</Button>
        <Button size="sm" onClick={() => setEditOpen(true)}>Edit</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="flex flex-col items-center text-center pb-5 mb-2" style={{ borderBottom: '1px solid #F7F8FC' }}>
              <div className="h-16 w-16 rounded-2xl grid place-items-center font-bold text-2xl text-white mb-3"
                style={{ backgroundColor: '#3B65DB' }}>
                {name.slice(0, 1).toUpperCase()}
              </div>
              <h2 className="font-bold text-lg" style={{ color: '#1F2937' }}>{name}</h2>
              {customer.corporate?.companyName && (
                <p className="text-sm mt-0.5 flex items-center gap-1" style={{ color: '#6B7280' }}>
                  <Building2 size={13} /> {customer.corporate.companyName}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <Badge tone={customer.accountType === 'CORPORATE' ? 'purple' : 'primary'}>
                  {titleCase(customer.accountType)}
                </Badge>
                <Badge tone={customer.user?.isActive ? 'green' : 'slate'}>
                  {customer.user?.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div className="-mx-1">
              <InfoRow icon={Phone} label="Phone" value={customer.user?.phone} />
              <InfoRow icon={Phone} label="Alternate Phone" value={customer.alternatePhone} />
              <InfoRow icon={Mail}  label="Email" value={customer.user?.email} />
              <InfoRow icon={FileText} label="GSTIN" value={customer.gstin} />
            </div>

            {customer.notes && (
              <div className="mt-3 pt-3 text-xs" style={{ borderTop: '1px solid #F7F8FC', color: '#6B7280' }}>
                <p className="font-semibold mb-1" style={{ color: '#1F2937' }}>Notes</p>
                {customer.notes}
              </div>
            )}

            <p className="text-xs mt-3" style={{ color: '#6B7280' }}>
              Customer since {formatDate(customer.createdAt)}
            </p>
          </Card>

          {billing && (
            <Card>
              <h3 className="font-bold text-sm mb-3" style={{ color: '#1F2937' }}>Billing</h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>Billed to: <span style={{ color: '#1F2937', fontWeight: 600 }}>{billing.entityName || billing.name || name}</span></p>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard icon={CalendarCheck} label="Total bookings" value={customer.totalBookings ?? 0} tone="primary" />
            <StatCard icon={Gift} label="Loyalty points" value={customer.loyaltyPoints ?? 0} tone="amber" />
            <StatCard icon={Building2} label="Account type" value={titleCase(customer.accountType)} tone="purple" />
          </div>

          <Card padded={false}>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-sm" style={{ color: '#1F2937' }}>Recent Bookings</h3>
              {customerBookings.length > 0 && <Badge tone="primary">{customerBookings.length}</Badge>}
            </div>
            {customerBookings.length === 0 ? (
              <EmptyState icon={CalendarCheck} title="No bookings yet" description="Bookings for this customer will appear here." />
            ) : (
              <div>
                {customerBookings.map((b, i) => (
                  <div key={b.id}
                    className="flex items-center justify-between px-5 py-3.5 cursor-pointer"
                    style={{ borderTop: i > 0 ? '1px solid #F7F8FC' : 'none' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F7F8FC'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                    onClick={() => navigate(`/admin/bookings/${b.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono" style={{ color: '#6B7280' }}>{b.bookingNumber}</p>
                      <p className="text-sm font-medium mt-0.5 truncate" style={{ color: '#1F2937' }}>
                        {b.pickupAddress} → {b.dropAddress}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                        {b.vehicleClass} · {formatCurrency(b.finalFare ?? b.estimatedFare)}
                      </p>
                    </div>
                    <div className="ml-4 text-right shrink-0">
                      <StatusBadge status={b.status} />
                      <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{formatDate(b.pickupAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <EditCustomerDrawer open={editOpen} onClose={() => setEditOpen(false)} customer={customer} onSubmit={handleUpdate} />
    </div>
  );
}
