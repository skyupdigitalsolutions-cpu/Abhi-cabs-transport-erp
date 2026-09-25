import { useEffect, useState } from 'react';
import Drawer from '../ui/Drawer';
import FormField from '../ui/FormField';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { useForm } from '../../hooks/useForm';
import { required, isEmail } from '../../utils/validators';
import { vehicleCatalogService } from '../../services';

/**
 * Two modes:
 *  - Create (no `driver` prop): name, mobile, email, vehicleNumber, vehicleClass
 *  - Assign vehicle (`driver` prop): just vehicle number + class
 */
const EMPTY = {
  name: '', mobile: '', email: '',
  vehicleNumber: '', vehicleClass: 'sedan',
};

export default function TemporaryDriverModal({ open, onClose, onSubmit, driver }) {
  const isAssignOnly = !!driver;
  const [classOptions, setClassOptions] = useState([{ value: 'sedan', label: 'Sedan' }]);

  useEffect(() => {
    if (!open) return;
    vehicleCatalogService.list({ includeInactive: false })
      .then((res) => {
        const classes = (res?.data || res?.classes || []);
        if (classes.length > 0) {
          setClassOptions(classes.map((c) => ({
            value: typeof c === 'string' ? c : c.vehicleClass,
            label: typeof c === 'string' ? c.charAt(0).toUpperCase() + c.slice(1) : (c.label || c.vehicleClass),
          })));
        }
      })
      .catch(() => {});
  }, [open]);

  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit, setValues } = useForm({
    initialValues: EMPTY,
    schema: isAssignOnly ? {} : {
      name: [required('Name')],
      mobile: [required('Mobile number')],
    },
    onSubmit: async (vals) => {
      if (isAssignOnly) {
        const vn = vals.vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
        if (!vn) return;
        await onSubmit({ vehicleNumber: vn, vehicleClass: vals.vehicleClass });
      } else {
        const payload = {
          name: vals.name.trim(),
          mobile: vals.mobile.trim(),
          ...(vals.email.trim() && { email: vals.email.trim().toLowerCase() }),
          vehicleNumber: vals.vehicleNumber.trim().toUpperCase().replace(/\s+/g, '') || undefined,
          vehicleClass: vals.vehicleClass,
        };
        await onSubmit(payload);
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
        <div className="space-y-4">
          <Alert type="info" className="mb-4">
            Assigning a vehicle to <strong>{driver.user?.name || driver.user?.email}</strong>.
          </Alert>
          <FormField label="Vehicle number" required>
            <Input value={values.vehicleNumber}
              onChange={(e) => setValue('vehicleNumber', e.target.value.toUpperCase())}
              placeholder="e.g. KA 01 AB 1234" autoFocus />
          </FormField>
          <FormField label="Vehicle class" required>
            <Select value={values.vehicleClass} onChange={(e) => setValue('vehicleClass', e.target.value)}
              options={classOptions} />
          </FormField>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Driver name" required error={touched.name && errors.name}>
              <Input value={values.name} onChange={(e) => setValue('name', e.target.value)}
                onBlur={() => setFieldTouched('name')} placeholder="e.g. Ramesh K" autoFocus />
            </FormField>
            <FormField label="Mobile number" required error={touched.mobile && errors.mobile}>
              <Input type="tel" value={values.mobile} onChange={(e) => setValue('mobile', e.target.value)}
                onBlur={() => setFieldTouched('mobile')} placeholder="e.g. 9876543210" />
            </FormField>
          </div>
          <FormField label="Email (optional)" error={touched.email && errors.email}
            hint="If provided, they can sign in with email OTP.">
            <Input type="email" value={values.email} onChange={(e) => setValue('email', e.target.value)}
              onBlur={() => setFieldTouched('email')} placeholder="driver@example.com" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Vehicle number (optional)" hint="Can assign later from the roster.">
              <Input value={values.vehicleNumber}
                onChange={(e) => setValue('vehicleNumber', e.target.value.toUpperCase())}
                placeholder="KA 01 AB 1234" />
            </FormField>
            <FormField label="Vehicle class">
              <Select value={values.vehicleClass} onChange={(e) => setValue('vehicleClass', e.target.value)}
                options={classOptions} />
            </FormField>
          </div>
        </form>
      )}
    </Drawer>
  );
}
