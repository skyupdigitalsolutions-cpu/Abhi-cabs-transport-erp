import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from '../../hooks/useForm';
import { required } from '../../utils/validators';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { APP_NAME } from '../../constants';

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className="flex-1 py-2.5 text-sm font-semibold rounded-lg focus-ring transition-all"
      style={{ backgroundColor: active ? '#3B65DB':'transparent', color: active ? '#fff':'#6B7280' }}>
      {children}
    </button>
  );
}

// ── Login form ─────────────────────────────────────────────────────────────
function LoginForm({ onSuccess }) {
  const { loginCustomer } = useAuth();
  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit } = useForm({
    initialValues: { phone: '', password: '' },
    schema: { phone: [required('Phone')], password: [required('Password')] },
    onSubmit: async (v) => { await loginCustomer(v); onSuccess(); },
  });
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {submitError && <Alert type="error">{submitError}</Alert>}
      <FormField label="Mobile number" required error={touched.phone && errors.phone}>
        <Input type="tel" inputMode="numeric" placeholder="9876543210" maxLength={10}
          value={values.phone} onChange={e => setValue('phone', e.target.value)} onBlur={() => setFieldTouched('phone')} />
      </FormField>
      <FormField label="Password" required error={touched.password && errors.password}>
        <PasswordInput value={values.password} onChange={e => setValue('password', e.target.value)}
          onBlur={() => setFieldTouched('password')} />
      </FormField>
      <Button type="submit" className="w-full" loading={submitting}>Sign in</Button>
      <p className="text-xs text-center" style={{ color: '#6B7280' }}>
        Demo: phone <strong>9876543210</strong> · password <strong>1234</strong>
      </p>
    </form>
  );
}

// ── Register form ──────────────────────────────────────────────────────────
function RegisterForm({ onSuccess }) {
  const { registerCustomer } = useAuth();
  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit } = useForm({
    initialValues: { name: '', phone: '', email: '', password: '', confirm: '' },
    schema: {
      name:     [required('Full name')],
      phone:    [required('Mobile number'), v => v.length !== 10 ? 'Enter a valid 10-digit number' : null],
      password: [required('Password'), v => v.length < 4 ? 'Minimum 4 characters' : null],
      confirm:  [required('Confirm password'), (v, all) => v !== all.password ? 'Passwords do not match' : null],
    },
    onSubmit: async (v) => { await registerCustomer(v); onSuccess(); },
  });
  const f = k => ({ value: values[k], onChange: e => setValue(k, e.target.value), onBlur: () => setFieldTouched(k) });
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {submitError && <Alert type="error">{submitError}</Alert>}
      <FormField label="Full name" required error={touched.name && errors.name}>
        <Input placeholder="e.g. Rahul Sharma" {...f('name')} />
      </FormField>
      <FormField label="Mobile number" required error={touched.phone && errors.phone}>
        <Input type="tel" inputMode="numeric" placeholder="9876543210" maxLength={10} {...f('phone')} />
      </FormField>
      <FormField label="Email (optional)" error={touched.email && errors.email}>
        <Input type="email" placeholder="you@example.com" {...f('email')} />
      </FormField>
      <FormField label="Password" required error={touched.password && errors.password}>
        <PasswordInput {...f('password')} />
      </FormField>
      <FormField label="Confirm password" required error={touched.confirm && errors.confirm}>
        <PasswordInput {...f('confirm')} />
      </FormField>
      <Button type="submit" className="w-full" loading={submitting}>Create account</Button>
    </form>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function CustomerLogin() {
  const [tab, setTab] = useState('login');
  const navigate = useNavigate();
  const location = useLocation();
  const dest = location.state?.from?.pathname || '/customer/book';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: '#F7F8FC' }}>
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl grid place-items-center font-black text-white text-xl mx-auto mb-3"
            style={{ backgroundColor: '#3B65DB' }}>AC</div>
          <p className="text-xl font-black" style={{ color: '#1F2937' }}>{APP_NAME}</p>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Book your ride in minutes</p>
        </div>

        <div className="rounded-2xl border shadow-sm p-6" style={{ backgroundColor: '#fff', borderColor: '#E5E7EB' }}>
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ backgroundColor: '#F7F8FC' }}>
            <TabBtn active={tab==='login'}    onClick={() => setTab('login')}>Sign In</TabBtn>
            <TabBtn active={tab==='register'} onClick={() => setTab('register')}>Register</TabBtn>
          </div>

          {tab === 'login'
            ? <LoginForm    onSuccess={() => navigate(dest, { replace: true })} />
            : <RegisterForm onSuccess={() => navigate('/customer/book', { replace: true })} />
          }
        </div>

        <div className="mt-4 text-center">
          <Link to="/admin/login" className="text-xs focus-ring rounded" style={{ color: '#6B7280' }}>
            Admin / Driver? Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}
