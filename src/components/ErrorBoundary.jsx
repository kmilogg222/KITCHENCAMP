import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, margin: 20 }}>
          <h2 style={{ color: '#ef4444', marginBottom: 12 }}>Something went wrong.</h2>
          <p style={{ color: '#b91c1c', fontSize: 14 }}>{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
