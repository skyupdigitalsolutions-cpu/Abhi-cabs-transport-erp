import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useForm } from '../../hooks/useForm';
import { required, isEmail } from '../../utils/validators';
import { authService } from '../../services/authService';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { APP_NAME } from '../../constants';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);

  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit } = useForm({
    initialValues: { email: '' },
    schema: { email: [required('Email'), isEmail] },
    onSubmit: async ({ email }) => {
      await authService.requestPasswordReset(email);
      setSent(true);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F7F8FC' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div
            className="h-9 w-9 rounded-xl grid place-items-center font-bold text-white text-sm"
            style={{ backgroundColor: '#3B65DB' }}
          >
            AC
          </div>
          <span className="font-bold" style={{ color: '#1F2937' }}>{APP_NAME}</span>
        </div>

        <h1 className="text-xl font-bold mb-1" style={{ color: '#1F2937' }}>Reset password</h1>
        <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
          Enter your email and we'll send a reset link.
        </p>

        {sent ? (
          <Alert type="success">
            If that email is registered, a reset link has been sent. Check your inbox.
          </Alert>
        ) : (
          <>
            {submitError && <Alert type="error" className="mb-4">{submitError}</Alert>}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <FormField label="Email address" htmlFor="email" required error={touched.email && errors.email}>
                <Input id="email" type="email" autoComplete="email" value={values.email}
                  onChange={(e) => setValue('email', e.target.value)} onBlur={() => setFieldTouched('email')} />
              </FormField>
              <Button type="submit" className="w-full" loading={submitting}>Send reset link</Button>
            </form>
          </>
        )}

        <Link to="/admin/login" className="block text-center text-sm mt-6 hover:underline focus-ring rounded"
          style={{ color: '#3B65DB' }}>
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
