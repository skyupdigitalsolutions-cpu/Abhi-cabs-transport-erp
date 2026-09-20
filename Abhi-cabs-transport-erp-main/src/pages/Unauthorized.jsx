import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="min-h-screen grid place-items-center p-6" style={{ backgroundColor: '#F7F8FC' }}>
      <div className="text-center max-w-sm">
        <div
          className="h-16 w-16 rounded-2xl grid place-items-center font-bold text-white text-2xl mx-auto mb-6"
          style={{ backgroundColor: '#EF4444' }}
        >
          !
        </div>
        <p className="text-6xl font-bold mb-2" style={{ color: '#EF4444' }}>403</p>
        <h1 className="text-xl font-bold mb-2" style={{ color: '#1F2937' }}>Access denied</h1>
        <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
          You don't have permission to view this page.
        </p>
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white focus-ring"
          style={{ backgroundColor: '#3B65DB' }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
