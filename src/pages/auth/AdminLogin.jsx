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

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
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
        await loginAdmin(vals);
        navigate(location.state?.from?.pathname || '/admin/dashboard', { replace: true });
      },
    });

  return (
    <div className="min-h-screen grid lg:grid-cols-2" style={{ backgroundColor: '#F9F9F7' }}>
      {/* Brand panel — pure black with yellow accents */}
      <div
        className="hidden lg:flex flex-col justify-between p-12"
        style={{ backgroundColor: '#111111' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl grid place-items-center font-extrabold text-base"
            style={{ backgroundColor: '#FFC107', color: '#111111' }}
          >
            AC
          </div>
          <div>
            <p className="font-extrabold text-white text-base leading-none tracking-widest uppercase">{APP_NAME}</p>
            <p className="text-[10px] mt-0.5 font-bold tracking-widest uppercase" style={{ color: '#FFC107' }}>Transport ERP</p>
          </div>
        </div>

        {/* Tagline block */}
        <div>
          <div className="w-12 h-1 rounded-full mb-6" style={{ backgroundColor: '#FFC107' }} />
          <h2 className="text-4xl font-extrabold leading-tight text-white mb-4 tracking-tight" style={{ letterSpacing: '-1px' }}>
            Run your entire fleet<br />from one dashboard.
          </h2>
          <p className="text-sm leading-relaxed max-w-xs font-medium" style={{ color: '#777' }}>
            Dispatch, live tracking, driver management,
            payments and reporting — all in one console
            built for ABHI CABS.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-10">
            {[['Fleet', '300+'], ['Cities', '8'], ['Uptime', '99.9%']].map(([k, v]) => (
              <div key={k}>
                <p className="text-2xl font-extrabold" style={{ color: '#FFC107' }}>{v}</p>
                <p className="text-xs mt-0.5 font-bold text-white tracking-widest uppercase">{k}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#444' }}>
          © 2026 {APP_NAME} · Ride With Trust
        </p>
      </div>

      {/* Login form */}
      <div className="flex items-center justify-center p-6" style={{ backgroundColor: '#F9F9F7' }}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="h-9 w-9 rounded-xl grid place-items-center font-extrabold"
              style={{ backgroundColor: '#FFC107', color: '#111111' }}
            >
              AC
            </div>
            <span className="font-extrabold text-base tracking-wide" style={{ color: '#111111' }}>{APP_NAME}</span>
          </div>

          <h1 className="text-2xl font-extrabold mb-1 tracking-tight" style={{ color: '#111111', letterSpacing: '-0.5px' }}>
            Admin sign in
          </h1>
          <p className="text-xs mb-7 font-medium" style={{ color: '#9A9A9A' }}>
            Enter your credentials to access the ERP console.
          </p>

          {submitError && <Alert type="error" className="mb-4">{submitError}</Alert>}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField label="Email address" htmlFor="email" required error={touched.email && errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="admin@abhicabs.in"
                value={values.email}
                onChange={(e) => setValue('email', e.target.value)}
                onBlur={() => setFieldTouched('email')}
              />
            </FormField>
            <FormField label="Password" htmlFor="password" required error={touched.password && errors.password}>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                value={values.password}
                onChange={(e) => setValue('password', e.target.value)}
                onBlur={() => setFieldTouched('password')}
              />
            </FormField>
            <div className="flex justify-end">
              <Link
                to="/admin/forgot-password"
                className="text-[11px] font-bold hover:underline focus-ring rounded"
                style={{ color: '#b45309' }}
              >
                Forgot password?
              </Link>
            </div>
            <Button
              type="submit"
              className="w-full"
              loading={submitting}
              style={{ backgroundColor: '#FFC107', color: '#111111', fontWeight: 800 }}
            >
              Sign in
            </Button>
          </form>

          <p className="text-[10px] mt-6 text-center font-medium" style={{ color: '#9A9A9A' }}>
            Demo: any valid email · password with 6+ characters
          </p>

          <div className="mt-4 pt-4 border-t text-center" style={{ borderColor: '#E8E8E4' }}>
            <Link
              to="/driver/login"
              className="text-[11px] font-bold hover:underline focus-ring rounded"
              style={{ color: '#5A5A5A' }}
            >
              Driver? Sign in to the Driver App →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
