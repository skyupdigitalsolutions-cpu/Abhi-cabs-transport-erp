import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from '../../hooks/useForm';
import { required, isEmail } from '../../utils/validators';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { APP_NAME } from '../../constants';

export default function DriverLogin() {
  const { loginDriver } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit } =
    useForm({
      initialValues: { email: '', password: '' },
      schema: {
        email:    [required('Email'), isEmail],
        password: [required('Password')],
      },
      onSubmit: async (vals) => {
        await loginDriver(vals);
        navigate(location.state?.from?.pathname || '/driver/trips', { replace: true });
      },
    });

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F7F8FC' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="h-16 w-16 rounded-2xl grid place-items-center font-bold text-white text-2xl mb-3"
            style={{ backgroundColor: '#3B65DB' }}
          >
            AC
          </div>
          <p className="font-bold text-xl" style={{ color: '#1F2937' }}>{APP_NAME}</p>
          <span
            className="text-xs px-2.5 py-0.5 rounded-full font-medium mt-1"
            style={{ backgroundColor: '#eef2fb', color: '#3B65DB' }}
          >
            Driver App
          </span>
        </div>

        <div
          className="rounded-2xl border p-6 shadow-sm"
          style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB' }}
        >
          <h1 className="text-lg font-bold mb-1" style={{ color: '#1F2937' }}>Driver sign in</h1>
          <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
            Enter your email and password to access your trips.
          </p>

          {submitError && <Alert type="error" className="mb-4">{submitError}</Alert>}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField label="Email address" htmlFor="email" required error={touched.email && errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="driver1@example.com"
                value={values.email}
                onChange={(e) => setValue('email', e.target.value)}
                onBlur={() => setFieldTouched('email')}
              />
            </FormField>
            <FormField label="Password" htmlFor="password" required error={touched.password && errors.password}>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={values.password}
                onChange={(e) => setValue('password', e.target.value)}
                onBlur={() => setFieldTouched('password')}
              />
            </FormField>
            <Button type="submit" className="w-full" loading={submitting}>Sign in</Button>
          </form>

          <p className="text-xs mt-4 text-center" style={{ color: '#6B7280' }}>
            Demo: any valid email · password with 4+ characters
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/admin/login"
            className="text-xs hover:underline focus-ring rounded"
            style={{ color: '#6B7280' }}
          >
            ← Admin? Sign in to ERP Console
          </Link>
        </div>
      </div>
    </div>
  );
}
