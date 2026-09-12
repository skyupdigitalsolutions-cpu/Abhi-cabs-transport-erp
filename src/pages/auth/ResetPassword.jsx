import { Link } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import { APP_NAME } from '../../constants';

// NOTE: POST /auth/password/reset does not exist in the backend yet.
export default function ResetPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F7F8FC' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl grid place-items-center font-bold text-white text-sm"
            style={{ backgroundColor: '#111111' }}>AC</div>
          <span className="font-bold" style={{ color: '#1F2937' }}>{APP_NAME}</span>
        </div>

        <h1 className="text-xl font-bold mb-1" style={{ color: '#1F2937' }}>Set new password</h1>

        <Alert type="info">
          Password reset is not available yet. Please contact your system administrator.
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
