import { useEffect } from 'react';
import Drawer from '../ui/Drawer';
import FormField from '../ui/FormField';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { useForm } from '../../hooks/useForm';
import { required, isEmail, isPhone } from '../../utils/validators';

const EMPTY = { name: '', email: '', phone: '', city: '', status: 'active' };

export default function CustomerFormDrawer({ open, onClose, initial, onSubmit }) {
  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit, setValues } = useForm({
    initialValues: initial || EMPTY,
    schema: { name: [required('Name')], email: [required('Email'), isEmail], phone: [required('Phone'), isPhone], city: [required('City')] },
    onSubmit: async (vals) => { await onSubmit(vals); onClose(); },
  });

  useEffect(() => { setValues(initial || EMPTY); }, [initial, setValues, open]);

  return (
    <Drawer open={open} onClose={onClose} title={initial ? 'Edit customer' : 'Add customer'} footer={
      <>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} loading={submitting}>{initial ? 'Save changes' : 'Add customer'}</Button>
      </>
    }>
      {submitError && <Alert type="error" className="mb-4">{submitError}</Alert>}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField label="Full name" required error={touched.name && errors.name}>
          <Input value={values.name} onChange={(e) => setValue('name', e.target.value)} onBlur={() => setFieldTouched('name')} maxLength={80} />
        </FormField>
        <FormField label="Email address" required error={touched.email && errors.email}>
          <Input type="email" value={values.email} onChange={(e) => setValue('email', e.target.value)} onBlur={() => setFieldTouched('email')} />
        </FormField>
        <FormField label="Phone number" required error={touched.phone && errors.phone}>
          <Input value={values.phone} onChange={(e) => setValue('phone', e.target.value.replace(/\D/g, ''))} onBlur={() => setFieldTouched('phone')} maxLength={10} />
        </FormField>
        <FormField label="City" required error={touched.city && errors.city}>
          <Input value={values.city} onChange={(e) => setValue('city', e.target.value)} onBlur={() => setFieldTouched('city')} maxLength={40} />
        </FormField>
        <FormField label="Status" required>
          <Select value={values.status} onChange={(e) => setValue('status', e.target.value)}
            options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </FormField>
      </form>
    </Drawer>
  );
}
