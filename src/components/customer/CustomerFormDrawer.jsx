/**
 * src/components/customer/CustomerFormDrawer.jsx
 *
 * NEW FILE — was missing entirely. Customers.jsx imports this component:
 *   import CustomerFormDrawer from '../../components/customer/CustomerFormDrawer';
 * Without this file, the Customers page crashes on import.
 *
 * Backend PATCH /admin/customers/:id accepts only these fields (confirmed
 * against adminCustomer.routes.js and updateCustomerSchema):
 *   accountType, corporateAccountId, alternatePhone, gstin, loyaltyPoints, notes
 *
 * Customer's name, email, and phone are on the User record and cannot
 * be edited by staff via this endpoint — they are shown read-only.
 *
 * The customer's ID field (used as the :id URL param) is `userId` on the
 * customer record — that is the PK used by /admin/customers/:id routes.
 */
import { useEffect } from 'react';
import Drawer    from '../ui/Drawer';
import Button    from '../ui/Button';
import FormField from '../ui/FormField';
import Input     from '../ui/Input';
import Select    from '../ui/Select';
import Alert     from '../ui/Alert';
import { useForm } from '../../hooks/useForm';

const ACCOUNT_TYPE_OPTS = [
  { value: 'RETAIL',    label: 'Personal — individual customer' },
  { value: 'CORPORATE', label: 'Corporate — business account' },
];

export default function CustomerFormDrawer({ open, customer, onClose, onSubmit }) {
  const { values, setValue, submitting, handleSubmit, reset } = useForm({
    initialValues: {
      accountType:        customer?.accountType        || 'RETAIL',
      alternatePhone:     customer?.alternatePhone     || '',
      gstin:              customer?.gstin              || '',
      loyaltyPoints:      customer?.loyaltyPoints      ?? 0,
      notes:              customer?.notes              || '',
    },
    onSubmit: async (vals) => {
      // Strip empty strings so we don't overwrite existing values with ''
      const payload = {};
      if (vals.accountType)    payload.accountType    = vals.accountType;
      if (vals.alternatePhone) payload.alternatePhone = vals.alternatePhone.trim();
      if (vals.gstin)          payload.gstin          = vals.gstin.trim().toUpperCase();
      if (vals.loyaltyPoints !== '' && vals.loyaltyPoints !== null)
        payload.loyaltyPoints = Number(vals.loyaltyPoints);
      if (vals.notes)          payload.notes          = vals.notes.trim();

      await onSubmit(payload);
    },
  });

  // Re-populate form when a different customer is opened
  useEffect(() => {
    if (customer) {
      setValue('accountType',    customer.accountType    || 'RETAIL');
      setValue('alternatePhone', customer.alternatePhone || '');
      setValue('gstin',          customer.gstin          || '');
      setValue('loyaltyPoints',  customer.loyaltyPoints  ?? 0);
      setValue('notes',          customer.notes          || '');
    }
  }, [customer?.userId]);

  const displayName = customer?.user?.name || customer?.user?.email || 'Customer';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Edit — ${displayName}`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={submitting} onClick={handleSubmit}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Read-only identity fields */}
        <Alert type="info">
          Name, email, and phone are managed by the customer. Only account
          settings can be edited here.
        </Alert>

        <div className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: '#F9F9F7', border: '1px solid #E8E8E4' }}>
          <p className="text-xs font-bold" style={{ color: '#9A9A9A' }}>Customer identity (read-only)</p>
          <p className="text-sm font-semibold" style={{ color: '#111111' }}>
            {customer?.user?.name || '—'}
          </p>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            {customer?.user?.email || '—'} · {customer?.user?.phone || '—'}
          </p>
        </div>

        {/* Editable fields */}
        <FormField label="Account type">
          <Select
            value={values.accountType}
            onChange={(e) => setValue('accountType', e.target.value)}
            options={ACCOUNT_TYPE_OPTS}
          />
        </FormField>

        <FormField label="Alternate phone">
          <Input
            value={values.alternatePhone}
            onChange={(e) => setValue('alternatePhone', e.target.value)}
            placeholder="e.g. 9876543210"
            keyboardType="tel"
          />
        </FormField>

        <FormField label="GSTIN (for corporate invoicing)">
          <Input
            value={values.gstin}
            onChange={(e) => setValue('gstin', e.target.value.toUpperCase())}
            placeholder="e.g. 29ABCDE1234F1Z5"
            maxLength={15}
          />
        </FormField>

        <FormField label="Loyalty points">
          <Input
            type="number"
            min="0"
            value={values.loyaltyPoints}
            onChange={(e) => setValue('loyaltyPoints', e.target.value)}
            placeholder="0"
          />
        </FormField>

        <FormField label="Internal notes">
          <textarea
            value={values.notes}
            onChange={(e) => setValue('notes', e.target.value)}
            placeholder="Visible to staff only, not the customer…"
            rows={3}
            className="w-full text-sm border rounded-xl px-3 py-2 resize-none"
            style={{ borderColor: '#E5E7EB', color: '#1F2937', outline: 'none' }}
          />
        </FormField>
      </div>
    </Drawer>
  );
}
