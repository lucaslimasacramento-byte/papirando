import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200/90 bg-white p-8 text-center shadow-sm">
            <p className="text-3xl" aria-hidden>
              —
            </p>
            <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">Algo saiu do esperado</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Recarregue a página para continuar. Se o problema persistir, tente novamente em instantes.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary mt-6 w-full justify-center py-2.5"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
