// ============================================================
// Error Boundary Component
// Catches JavaScript errors anywhere in child component tree
// ============================================================
import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        Object.defineProperty(this, "handleRefresh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                window.location.reload();
            }
        });
        Object.defineProperty(this, "handleGoHome", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                window.location.href = '/';
            }
        });
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({ errorInfo });
        // In production, log to error reporting service
        // logErrorToService(error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-500"/>
            </div>
            
            <h1 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-gray-500 text-sm mb-6">
              An unexpected error occurred. Our team has been notified.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (<div className="bg-red-50 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs font-mono text-red-600 mb-2">{this.state.error.toString()}</p>
                {this.state.errorInfo && (<pre className="text-[10px] text-red-500 overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>)}
              </div>)}

            <div className="flex gap-3">
              <button onClick={this.handleRefresh} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
                <RefreshCw size={16}/>
                Refresh Page
              </button>
              <button onClick={this.handleGoHome} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0f4c81] text-white rounded-xl font-medium hover:bg-[#0a3d6a]">
                <Home size={16}/>
                Go Home
              </button>
            </div>
          </div>
        </div>);
        }
        return this.props.children;
    }
}
// Hook version for functional components (must be used within ErrorBoundary)
export function useErrorHandler() {
    return (error) => {
        throw error;
    };
}
export function ErrorDisplay({ title = 'Error', message = 'Something went wrong. Please try again.', onRetry, }) {
    return (<div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <AlertTriangle size={24} className="text-red-500 mx-auto mb-2"/>
      <h3 className="font-semibold text-red-700 mb-1">{title}</h3>
      <p className="text-sm text-red-600 mb-4">{message}</p>
      {onRetry && (<button onClick={onRetry} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
          Try Again
        </button>)}
    </div>);
}
