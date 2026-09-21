import { useEffect, useState } from 'react';
import Drawer from '../ui/Drawer';
import FormField from '../ui/FormField';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { useForm } from '../../hooks/useForm';
import { required, isEmail } from '../../utils/validators';
import { vehicleService } from '../../services';

/**
 * Two lean modes, both far short of the full DriverFormDrawer:
 *
 *  - Create (no `driver` prop): the ONLY required field is email. No phone,
 *    licence, documents, KYC — and no vehicle either, so creating one really
 *    is a single field. Vehicle can be assigned right away if you already
 *    know it, or skipped and added later.
 *  - Assign vehicle (`driver` prop passed): for a temp driver created
 *    without one — just the vehicle picker, nothing else to fill in.
 */
const EMPTY = { email: '', assignedVehicleId: '' };

export default function TemporaryDriverModal({ open, onClose, onSubmit, driver }) {
  const isAssignOnly = !!driver;
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVehiclesLoading(true);
    // Only vehicles that are actually free right now. Nested under `filters`
    // so it works against both the mock store (mockUtils.paginate reads
    // filters.status) and the real backend (apiClient flattens `filters`
    // into a plain ?status=AVAILABLE query param).
    vehicleService.list({ filters: { status: 'AVAILABLE' }, limit: 100 })
      .then((r) => setVehicles(r.data || []))
      .catch(() => setVehicles([]))
      .finally(() => setVehiclesLoading(false));
  }, [open]);

  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit, setValues } = useForm({
    initialValues: EMPTY,
    schema: isAssignOnly
      ? { assignedVehicleId: [required('Vehicle')] }
      : { email: [required('Email'), isEmail] }, // vehicle intentionally NOT required here
    onSubmit: async (vals) => {
      if (isAssignOnly) {
        await onSubmit({ assignedVehicleId: vals.assignedVehicleId });
      } else {
        await onSubmit({
          email: vals.email.trim().toLowerCase(),
          assignedVehicleId: vals.assignedVehicleId || undefined,
        });
      }
      onClose();
    },
  });

  useEffect(() => { if (open) setValues(EMPTY); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isAssignOnly ? 'Assign a Vehicle' : 'Add Temporary Driver'}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} loading={submitting}>{isAssignOnly ? 'Assign' : 'Create'}</Button>
        </>
      }
    >
      {submitError && <Alert type="error" className="mb-4">{submitError}</Alert>}

      {isAssignOnly ? (
        <>
          <Alert type="info" className="mb-4">Assigning a vehicle to <strong>{driver.user?.email}</strong>.</Alert>
          <FormField label="Vehicle" required error={touched.assignedVehicleId && errors.assignedVehicleId}
            hint={vehiclesLoading ? 'Loading available vehicles…' : 'Only vehicles marked Available are listed.'}>
            <Select value={values.assignedVehicleId} onChange={(e) => setValue('assignedVehicleId', e.target.value)}
              onBlur={() => setFieldTouched('assignedVehicleId')} placeholder="Select a vehicle" autoFocus
              options={vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber} · ${v.vehicleClass}` }))} />
          </FormField>
        </>
      ) : (
        <>
          <Alert type="info" className="mb-4">
            For one-off or substitute drivers. No phone, licence, documents or KYC —
            they sign in with just this email (an OTP is emailed to them).
          </Alert>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField label="Driver's email" required error={touched.email && errors.email} hint="The only thing they're identified by. The OTP to sign in is sent here.">
              <Input type="email" value={values.email} onChange={(e) => setValue('email', e.target.value)}
                onBlur={() => setFieldTouched('email')} placeholder="driver@example.com" autoFocus />
            </FormField>
            <FormField label="Vehicle (optional)" hint="Skip this and assign it later from the roster if you don't know it yet.">
              <Select value={values.assignedVehicleId} onChange={(e) => setValue('assignedVehicleId', e.target.value)}
                placeholder={vehiclesLoading ? 'Loading…' : 'Assign later'}
                options={vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber} · ${v.vehicleClass}` }))} />
            </FormField>
          </form>
        </>
      )}
    </Drawer>
  );
}
