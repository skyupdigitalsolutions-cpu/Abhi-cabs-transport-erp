import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

function isChunkError(error) {
  const msg = error?.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    error?.name === 'ChunkLoadError'
  );
}

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);

    // If lazyRetry already attempted a reload and it still failed,
    // this is the last-resort catch. Force a hard reload to get fresh assets.
    if (isChunkError(error)) {
      window.location.reload();
    }
  }

  handleRetry = () => {
    if (isChunkError(this.state.error)) {
      // A simple state reset won't help — the browser still has the stale
      // chunk URL cached in the module graph. A full reload is the only fix.
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, padding: '64px 24px', textAlign: 'center',
        }}>
          <div style={{
            height: 48, width: 48, display: 'grid', placeItems: 'center',
            borderRadius: '50%', backgroundColor: '#fef2f2',
          }}>
            <AlertTriangle size={22} style={{ color: '#DC2626' }} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#111111' }}>
            This section couldn't load
          </p>
          <p style={{ fontSize: 13, color: '#9A9A9A', maxWidth: 360 }}>
            {isChunkError(this.state.error)
              ? 'A new version is available. Click below to refresh.'
              : (this.state.error?.message || 'An unexpected error occurred.')}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 700,
              cursor: 'pointer', border: '1.5px solid #E8E8E4',
              backgroundColor: '#fff', color: '#111111',
            }}
          >
            <RefreshCw size={13} /> {isChunkError(this.state.error) ? 'Refresh page' : 'Try again'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
