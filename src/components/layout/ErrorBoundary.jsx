import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('UI error boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
          <div className="h-12 w-12 grid place-items-center rounded-full" style={{ backgroundColor: '#fef2f2' }}>
            <AlertTriangle size={22} style={{ color: '#EF4444' }} />
          </div>
          <p className="font-semibold" style={{ color: '#1F2937' }}>This section couldn't load</p>
          <p className="text-sm max-w-sm" style={{ color: '#6B7280' }}>
            An unexpected error occurred. You can try reloading this part of the page.
          </p>
          <Button variant="secondary" size="sm" onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
