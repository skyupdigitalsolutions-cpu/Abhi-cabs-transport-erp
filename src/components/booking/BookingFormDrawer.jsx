import { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import FormField from '../ui/FormField';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { useForm } from '../../hooks/useForm';
import { required } from '../../utils/validators';
import { adminCustomersService, vehicleCatalogService } from '../../services';
import { VEHICLE_CLASSES, TRIP_TYPES } from '../../constants';

/**
 * Matches the real, confirmed createBookingSchema (customer-facing /bookings
 * POST, which also accepts an explicit customerId — a staff member holding
 * BOOKING_MANAGE can book on behalf of any customer this way; see
 * booking.controller.js's exports.create). Fields:
 *   customerId, cityId, vehicleClass, tripType, pickup:{address},
 *   drop:{address}, pickupAt, returnAt (ROUND_TRIP only), scheduled, paymentMode.
 *
 * ROUND TRIP HAS A RETURN DATE, NOT A RETURN TIME. The backend
 * (lib/returnDate.js) accepts a bare YYYY-MM-DD and stores it as the end of
 * that day; the fare counts calendar days, so a clock time never changed the
 * price. It is REQUIRED for a round trip — without it the booking is refused.
 * There is no "cargo type" or "weight" on this backend — that was invented
 * in an earlier build for a freight-transport concept this business
 * doesn't have. The server always recalculates the fare itself; whatever
 * a client sends for price is ignored, so there's no fare field to fill in.
 */
const DEFAULT_CITY_ID = 1; // only Bengaluru is seeded on this backend today
// Shared with Masters.jsx and Vehicles.jsx via constants/index.js — these
// were three separate hardcoded copies that could silently drift apart.
const EMPTY = {
  customerId: '', vehicleClass: '', tripType: 'ONE_WAY',
  pickup: '', drop: '', date: '', time: '', returnDate: '', paymentMode: 'PARTIAL',
};

// Return date: required for a round trip, same day as pickup or later.
const returnDateRule = (value, values) => {
  if (values.tripType !== 'ROUND_TRIP') return null;
  if (!value) return 'Return date is required for a round trip';
  if (values.date && value < values.date) return 'Return date cannot be before the pickup date';
  return null;
};

const PAYMENT_MODES = [
  { value: 'FULL',    label: 'Full payment now' },
  { value: 'PARTIAL', label: 'Partial advance' },
  { value: 'ZERO',    label: 'Pay on trip (cash)' },
];

export default function BookingFormDrawer({ open, onClose, onSubmit }) {
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  // Live vehicle classes from the catalogue (retired ones like `sedan` are
  // excluded); the constants list is only the offline fallback.
  const [classOptions, setClassOptions] = useState(
    VEHICLE_CLASSES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
  );
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    vehicleCatalogService.classOptions().then((opts) => {
      if (cancelled || !opts?.length) return;
      setClassOptions(opts.filter((o) => o.isActive !== false).map((o) => ({ value: o.value, label: o.label })));
    });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    adminCustomersService.list({ limit: 50, search: customerSearch || undefined })
      .then((r) => setCustomers(r.data || []))
      .catch(() => setCustomers([]));
  }, [open, customerSearch]);

  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit, setValues } = useForm({
    initialValues: EMPTY,
    schema: {
      customerId: [required('Customer')],
      pickup: [required('Pickup location')],
      drop: [required('Drop location')],
      date: [required('Pickup date')],
      time: [required('Pickup time')],
      vehicleClass: [required('Vehicle class')],
      returnDate: [returnDateRule],
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
        // Date only — see the note at the top of this file.
        ...(vals.tripType === 'ROUND_TRIP' && vals.returnDate && { returnAt: vals.returnDate }),
        scheduled: true,
        paymentMode: vals.paymentMode,
      });
      onClose();
    },
  });

  useEffect(() => {
    if (!open) {
      setValues(EMPTY);
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
      <Alert type="info" className="mb-4">
        This booking will be created as <strong>PENDING</strong>. You'll need to call the customer
        and confirm it from the bookings list before it goes live.
      </Alert>
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
        <FormField label="Vehicle class" required error={touched.vehicleClass && errors.vehicleClass}>
          <Select options={classOptions} placeholder="Select vehicle" {...field('vehicleClass')} />
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
        {values.tripType === 'ROUND_TRIP' && (
          <FormField label="Return date" required error={touched.returnDate && errors.returnDate}
            hint="Date only. The fare counts calendar days, so no return time is needed.">
            <Input type="date" min={values.date || undefined} {...field('returnDate')} />
          </FormField>
        )}
        <FormField label="Payment mode" hint="The fare itself is always calculated by the server, never entered here.">
          <Select options={PAYMENT_MODES} {...field('paymentMode')} />
        </FormField>
      </form>
    </Drawer>
  );
}
