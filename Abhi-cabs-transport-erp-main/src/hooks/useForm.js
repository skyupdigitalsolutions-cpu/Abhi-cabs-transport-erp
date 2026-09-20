import { useCallback, useState } from 'react';
import { validateForm } from '../utils/validators';

/** Lightweight controlled-form hook shared by every form in the app. */
export function useForm({ initialValues, schema, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const setValue = useCallback((field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
  }, []);

  const setFieldTouched = useCallback((field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    if (schema) {
      setErrors((e) => ({ ...e, ...validateForm(values, { [field]: schema[field] || [] }) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, schema]);

  const validate = useCallback(() => {
    if (!schema) return {};
    const errs = validateForm(values, schema);
    setErrors(errs);
    return errs;
  }, [values, schema]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    setSubmitError('');
    const errs = validate();
    setTouched(Object.fromEntries(Object.keys(schema || {}).map((k) => [k, true])));
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
      if (err.fieldErrors) setErrors((e) => ({ ...e, ...err.fieldErrors }));
    } finally {
      setSubmitting(false);
    }
  }, [validate, onSubmit, values, schema]);

  return { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit, setValues };
}
