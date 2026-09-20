import { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import FormField from '../ui/FormField';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { useForm } from '../../hooks/useForm';
import { required } from '../../utils/validators';
import { adminCustomersService } from '../../services';

/**
 * Matches the real, confirmed createBookingSchema (customer-facing /bookings
 * POST, which also accepts an explicit customerId — a staff member holding
 * BOOKING_MANAGE can book on behalf of any customer this way; see
 * booking.controller.js's exports.create). Fields:
 *   customerId, cityId, vehicleClass, tripType, pickup:{address},
 *   drop:{address}, pickupAt, scheduled, paymentMode.
 * There is no "cargo type" or "weight" on this backend — that was invented
 * in an earlier build for a freight-transport concept this business
 * doesn't have. The server always recalculates the fare itself; whatever
 * a client sends for price is ignored, so there's no fare field to fill in.
 */
const DEFAULT_CITY_ID = 1; // only Bengaluru is seeded on this backend today
const VEHICLE_CLASSES = ['hatchback', 'sedan', 'suv', 'tempo']; // the 4 classes this backend actually prices
const TRIP_TYPES = [
  { value: 'ONE_WAY', label: 'One Way' },
  { value: 'ROUND_TRIP', label: 'Round Trip' },
  { value: 'AIRPORT', label: 'Airport' },
  { value: 'HOURLY', label: 'Hourly Rental' },
];
const PAYMENT_MODES = [
  { value: 'FULL', label: 'Full payment now' },
  { value: 'PARTIAL', label: 'Partial advance' },
  { value: 'ZERO', label: 'Pay on trip (cash)' },
];

export default function BookingFormDrawer({ open, onClose, onSubmit }) {
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    adminCustomersService.list({ limit: 50, search: customerSearch || undefined })
      .then((r) => setCustomers(r.data || []))
      .catch(() => setCustomers([]));
  }, [open, customerSearch]);

  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit, setValues } = useForm({
    initialValues: {
      customerId: '', vehicleClass: 'sedan', tripType: 'ONE_WAY',
      pickup: '', drop: '', date: '', time: '', paymentMode: 'ZERO',
    },
    schema: {
      customerId: [required('Customer')],
      pickup: [required('Pickup location')],
      drop: [required('Drop location')],
      date: [required('Pickup date')],
      time: [required('Pickup time')],
    },
    onSubmit: async (vals) => {
      const pickupAt = new Date(`${vals.date}T${vals.time}:00`);
      await onSubmit({
        customerId: vals.customerId,
        cityId: DEFAULT_CITY_ID,
        vehicleClass: vals.vehicleClass,
        tripType: vals.tripType,
        pickup: { address: vals.pickup },
        drop: { address: vals.drop },
        pickupAt: pickupAt.toISOString(),
        scheduled: true,
        paymentMode: vals.paymentMode,
      });
      onClose();
    },
  });

  useEffect(() => {
    if (!open) {
      setValues({ customerId: '', vehicleClass: 'sedan', tripType: 'ONE_WAY', pickup: '', drop: '', date: '', time: '', paymentMode: 'ZERO' });
      setCustomerSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const field = (name) => ({
    value: values[name],
    onChange: (e) => setValue(name, e.target.value),
    onBlur: () => setFieldTouched(name),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New booking"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} loading={submitting}>Create booking</Button>
      </>}
    >
      {submitError && <Alert type="error" className="mb-4">{submitError}</Alert>}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField label="Customer" required error={touched.customerId && errors.customerId} hint="Search by name, email or phone.">
          <Input placeholder="Type to search customers…" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="mb-2" />
          <Select
            value={values.customerId}
            onChange={(e) => setValue('customerId', e.target.value)}
            onBlur={() => setFieldTouched('customerId')}
            placeholder="Select customer"
            options={customers.map((c) => ({ value: c.userId, label: `${c.user?.name} · ${c.user?.phone}` }))}
          />
        </FormField>
        <FormField label="Trip type">
          <Select options={TRIP_TYPES} {...field('tripType')} />
        </FormField>
        <FormField label="Vehicle class">
          <Select options={VEHICLE_CLASSES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} {...field('vehicleClass')} />
        </FormField>
        <FormField label="Pickup location" required error={touched.pickup && errors.pickup}>
          <Input placeholder="e.g. Koramangala, Bengaluru" {...field('pickup')} />
        </FormField>
        <FormField label="Drop location" required error={touched.drop && errors.drop}>
          <Input placeholder="e.g. Kempegowda Airport" {...field('drop')} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Pickup date" required error={touched.date && errors.date}>
            <Input type="date" {...field('date')} />
          </FormField>
          <FormField label="Pickup time" required error={touched.time && errors.time}>
            <Input type="time" {...field('time')} />
          </FormField>
        </div>
        <FormField label="Payment mode" hint="The fare itself is always calculated by the server, never entered here.">
          <Select options={PAYMENT_MODES} {...field('paymentMode')} />
        </FormField>
      </form>
    </Drawer>
  );
}
