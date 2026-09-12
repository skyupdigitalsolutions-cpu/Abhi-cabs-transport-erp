import { AlertTriangle, Construction, RefreshCw } from 'lucide-react';

const ENDPOINT_NOT_BUILT = /^Route\s+\w+\s+.+\s+not found$/i;

export default function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }) {
  const notBuiltYet = ENDPOINT_NOT_BUILT.test(message || '');

  const wrapper = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 10, padding: '56px 24px', textAlign: 'center',
  };

  if (notBuiltYet) {
    return (
      <div style={wrapper}>
        <div style={{ height: 48, width: 48, display: 'grid', placeItems: 'center', borderRadius: '50%', backgroundColor: '#FFFBEB' }}>
          <Construction size={22} style={{ color: '#D97706' }} />
        </div>
        <p style={{ fontWeight: 700, fontSize: 14, color: '#111111', margin: 0 }}>Coming soon</p>
        <p style={{ fontSize: 12, color: '#9A9A9A', maxWidth: 360, margin: 0, lineHeight: 1.5 }}>
          This feature's backend endpoint hasn't been built yet.
        </p>
        {onRetry && (
          <button onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1.5px solid #E8E8E4', backgroundColor: '#fff', color: '#111', marginTop: 4 }}>
            <RefreshCw size={12} /> Check again
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={wrapper}>
      <div style={{ height: 48, width: 48, display: 'grid', placeItems: 'center', borderRadius: '50%', backgroundColor: '#fef2f2' }}>
        <AlertTriangle size={22} style={{ color: '#DC2626' }} />
      </div>
      <p style={{ fontWeight: 700, fontSize: 14, color: '#111111', margin: 0 }}>Something went wrong</p>
      <p style={{ fontSize: 12, color: '#9A9A9A', maxWidth: 360, margin: 0, lineHeight: 1.5 }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1.5px solid #E8E8E4', backgroundColor: '#fff', color: '#111', marginTop: 4 }}>
          <RefreshCw size={12} /> Try again
        </button>
      )}
    </div>
  );
}
