import React, { Component, ReactNode } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo) {
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <Card className="max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Algo salió mal
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
            </p>
            <Button onClick={this.handleReset} variant="primary">
              Volver al inicio
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}