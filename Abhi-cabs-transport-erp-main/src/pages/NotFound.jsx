import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-6" style={{ backgroundColor: '#F7F8FC' }}>
      <div className="text-center max-w-sm">
        <div
          className="h-16 w-16 rounded-2xl grid place-items-center mx-auto mb-6"
          style={{ backgroundColor: '#3B65DB' }}
        >
          <img src="/brand/abhicabs-mark.svg" alt="ABHI CABS" style={{ height: 38, width: 38 }} />
        </div>
        <p className="text-6xl font-bold mb-2" style={{ color: '#3B65DB' }}>404</p>
        <h1 className="text-xl font-bold mb-2" style={{ color: '#1F2937' }}>Page not found</h1>
        <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
          The page you're looking for doesn't exist or has been moved.
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
