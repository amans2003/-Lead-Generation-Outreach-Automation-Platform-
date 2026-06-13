import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to an error reporting service here if needed
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback({ error, reset: this.handleReset })
          : fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 mb-4">
            <AlertTriangle size={26} className="text-red-500" />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>

          <p className="text-sm text-gray-500 max-w-sm mb-1">
            An unexpected error occurred. Please try refreshing the page.
          </p>

          {error && (
            <p className="text-xs text-gray-400 font-mono mt-1 mb-5 max-w-sm break-all">
              {error.message}
            </p>
          )}

          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

ErrorBoundary.defaultProps = {
  fallback: null,
};

export default ErrorBoundary;
