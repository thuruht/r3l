import React, { Component, ErrorInfo, ReactNode } from 'react';
import { IconAlertOctagon } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '12px', padding: '40px', color: 'var(--text-secondary)', textAlign: 'center',
          minHeight: '200px', height: '100%',
        }}>
          <IconAlertOctagon size={ICON_SIZES['2xl']} color="var(--accent-alert)" />
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Something crashed</div>
          <div style={{ fontSize: '0.85rem', maxWidth: '400px' }}>{this.state.error?.message || 'An unexpected error occurred.'}</div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '8px', padding: '8px 20px', background: 'var(--accent-sym)',
              color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
