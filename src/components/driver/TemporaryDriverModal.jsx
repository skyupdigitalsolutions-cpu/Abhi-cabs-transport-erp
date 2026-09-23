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
 *
 * The vehicle itself can be given two ways, toggled with vehicleMode:
 *  - "fleet": pick an existing, available Vehicle record → assignedVehicleId.
 *  - "manual": just type a registration number → vehicleNumber (a plain
 *    string, not tied to any Vehicle record). For a borrowed/one-off vehicle
 *    that was never added to the fleet — the whole point of a temporary
 *    driver is not having to set up records ahead of time.
 */
const EMPTY = { email: '', assignedVehicleId: '', manualVehicleNumber: '' };

export default function TemporaryDriverModal({ open, onClose, onSubmit, driver }) {
  const isAssignOnly = !!driver;
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehicleMode, setVehicleMode] = useState('fleet'); // 'fleet' | 'manual'
  const [vehicleError, setVehicleError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setVehicleMode('fleet');
    setVehicleError(null);
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
    // Vehicle presence/validity is checked below, in onSubmit, since which
    // field is required depends on vehicleMode (fleet vs manual) rather
    // than being a fixed schema.
    schema: isAssignOnly ? {} : { email: [required('Email'), isEmail] },
    onSubmit: async (vals) => {
      const manualNumber = vals.manualVehicleNumber.trim().toUpperCase().replace(/\s+/g, '');

      if (isAssignOnly) {
        if (vehicleMode === 'manual') {
          if (!manualNumber) { setVehicleError('Enter a vehicle number'); return; }
          await onSubmit({ vehicleNumber: manualNumber });
        } else {
          if (!vals.assignedVehicleId) { setVehicleError('Select a vehicle'); return; }
          await onSubmit({ assignedVehicleId: vals.assignedVehicleId });
        }
      } else {
        const payload = { email: vals.email.trim().toLowerCase() };
        if (vehicleMode === 'manual' && manualNumber) {
          payload.vehicleNumber = manualNumber;
        } else if (vehicleMode === 'fleet' && vals.assignedVehicleId) {
          payload.assignedVehicleId = vals.assignedVehicleId;
        }
        await onSubmit(payload);
      }
      onClose();
    },
  });

  useEffect(() => { if (open) setValues(EMPTY); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const ModeToggle = (
    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 mb-3">
      {[
        { key: 'fleet', label: 'From fleet' },
        { key: 'manual', label: 'Enter manually' },
      ].map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => { setVehicleMode(opt.key); setVehicleError(null); }}
          className={
            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors ' +
            (vehicleMode === opt.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700')
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const VehicleField = (
    <>
      {ModeToggle}
      {vehicleMode === 'fleet' ? (
        <Select value={values.assignedVehicleId} onChange={(e) => { setValue('assignedVehicleId', e.target.value); setVehicleError(null); }}
          onBlur={() => setFieldTouched('assignedVehicleId')} autoFocus={isAssignOnly}
          placeholder={vehiclesLoading ? 'Loading…' : (isAssignOnly ? 'Select a vehicle' : 'Assign later')}
          options={vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber} · ${v.vehicleClass}` }))} />
      ) : (
        <Input value={values.manualVehicleNumber}
          onChange={(e) => { setValue('manualVehicleNumber', e.target.value.toUpperCase()); setVehicleError(null); }}
          placeholder="e.g. KA01AB1234" autoFocus={isAssignOnly} />
      )}
      {vehicleError && <p className="text-xs text-red-600 mt-1">{vehicleError}</p>}
    </>
  );

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
          <Alert type="info" className="mb-4">
            Assigning a vehicle to <strong>{driver.user?.name || driver.user?.email}</strong>.
            {' '}They can go online and receive trips once this is set.
          </Alert>
          <FormField label="Vehicle" required
            hint={vehicleMode === 'fleet' && !vehicleError ? (vehiclesLoading ? 'Loading available vehicles…' : 'Only vehicles marked Available are listed.') : undefined}>
            {VehicleField}
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
            <FormField label="Vehicle (optional)"
              hint={vehicleMode === 'fleet' && !vehicleError ? "Skip this and assign it later from the roster if you don't know it yet." : undefined}>
              {VehicleField}
            </FormField>
          </form>
        </>
      )}
    </Drawer>
  );
}
