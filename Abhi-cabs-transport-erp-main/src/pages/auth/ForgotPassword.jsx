import { Link } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import { APP_NAME } from '../../constants';

// NOTE: POST /auth/password/forgot does not exist in the backend yet.
// This page shows an honest message until the endpoint is built.
export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F7F8FC' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl grid place-items-center"
            style={{ backgroundColor: '#111111' }}>
            <img src="/brand/abhicabs-mark-dark.svg" alt={APP_NAME} style={{ height: 20, width: 20 }} />
          </div>
          <span className="font-bold" style={{ color: '#1F2937' }}>{APP_NAME}</span>
        </div>

        <h1 className="text-xl font-bold mb-1" style={{ color: '#1F2937' }}>Reset password</h1>
        <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Forgot your ERP password?</p>

        <Alert type="info">
          Password reset by email is not available yet. Please contact your system administrator to reset your password manually.
        </Alert>

        <Link to="/admin/login"
          className="block text-center text-sm mt-6 hover:underline focus-ring rounded"
          style={{ color: '#3B65DB' }}>
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
