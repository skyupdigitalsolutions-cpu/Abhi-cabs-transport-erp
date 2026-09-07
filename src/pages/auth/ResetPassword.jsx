import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from '../../hooks/useForm';
import { required } from '../../utils/validators';
import { authService } from '../../services/authService';
import FormField from '../../components/ui/FormField';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { APP_NAME } from '../../constants';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit } = useForm({
    initialValues: { password: '', confirm: '' },
    schema: {
      password: [required('Password'), (v) => v.length < 8 ? 'Password must be at least 8 characters' : null],
      confirm:  [required('Confirm password'), (v, all) => v !== all.password ? 'Passwords do not match' : null],
    },
    onSubmit: async ({ password }) => {
      await authService.resetPassword({ token, password });
      navigate('/admin/login');
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

        <h1 className="text-xl font-bold mb-1" style={{ color: '#1F2937' }}>Set new password</h1>
        <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Choose a strong password for your account.</p>

        {!token && (
          <Alert type="error" className="mb-4">Invalid or expired reset link. Please request a new one.</Alert>
        )}

        {submitError && <Alert type="error" className="mb-4">{submitError}</Alert>}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FormField label="New password" required error={touched.password && errors.password}>
            <PasswordInput value={values.password} onChange={(e) => setValue('password', e.target.value)} onBlur={() => setFieldTouched('password')} />
          </FormField>
          <FormField label="Confirm password" required error={touched.confirm && errors.confirm}>
            <PasswordInput value={values.confirm} onChange={(e) => setValue('confirm', e.target.value)} onBlur={() => setFieldTouched('confirm')} />
          </FormField>
          <Button type="submit" className="w-full" loading={submitting} disabled={!token}>Update password</Button>
        </form>

        <Link to="/admin/login" className="block text-center text-sm mt-6 hover:underline focus-ring rounded"
          style={{ color: '#3B65DB' }}>
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
