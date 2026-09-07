import { AlertTriangle, Construction } from 'lucide-react';
import Button from './Button';

// A genuinely unmounted backend route always phrases its 404 exactly this
// way (Express's catch-all handler — see the backend's src/middlewares/
// error.js:notFound()). Detecting it here means every ErrorState call site
// in the app gets this friendlier treatment for free, with no changes
// needed anywhere else.
const ENDPOINT_NOT_BUILT = /^Route\s+\w+\s+.+\s+not found$/i;

export default function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }) {
  const notBuiltYet = ENDPOINT_NOT_BUILT.test(message || '');

  if (notBuiltYet) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className="h-12 w-12 grid place-items-center rounded-full" style={{ backgroundColor: '#FFFBEB' }}>
          <Construction size={22} style={{ color: '#D97706' }} />
        </div>
        <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>This feature isn't connected yet</p>
        <p className="text-sm max-w-sm" style={{ color: '#6B7280' }}>
          The backend doesn't have this endpoint built yet, so there's nothing to show here. This isn't a bug — it just needs backend work first.
        </p>
        {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Check again</Button>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div
        className="h-12 w-12 grid place-items-center rounded-full"
        style={{ backgroundColor: '#fef2f2' }}
      >
        <AlertTriangle size={22} style={{ color: '#EF4444' }} />
      </div>
      <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>Something went wrong</p>
      <p className="text-sm max-w-sm" style={{ color: '#6B7280' }}>{message}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
