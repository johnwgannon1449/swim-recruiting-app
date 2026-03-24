import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught error:', error, info.componentStack);
    // Generate a simple error ID for support reference
    this.setState({ errorId: Date.now().toString(36).toUpperCase() });
  }

  handleStartOver() {
    // Clear wizard state from localStorage so the user gets a clean slate
    try {
      localStorage.removeItem('wizardState_v1');
    } catch {}
    window.location.href = '/dashboard';
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">🙈</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            An unexpected error occurred. Your lesson content has been saved and
            you can pick up where you left off from the dashboard.
          </p>

          {this.state.errorId && (
            <p className="text-xs text-gray-400 mb-6">
              Error reference: <span className="font-mono">{this.state.errorId}</span>
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Try Again
            </button>
            <button
              onClick={this.handleStartOver}
              className="btn-secondary w-full"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }
}
