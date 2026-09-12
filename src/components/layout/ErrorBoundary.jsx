import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

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
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', border: '1.5px solid #E8E8E4',
              backgroundColor: '#fff', color: '#111111',
            }}
          >
            <RefreshCw size={13} /> Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
