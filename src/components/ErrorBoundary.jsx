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
        <div style={{ display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', background: 'var(--pl-bg-soft)', padding: '0 16px' }}>
          <div className="pl-card" style={{ width: '100%', maxWidth: 420, padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 28 }} aria-hidden>—</p>
            <h2 style={{ marginTop: 16, fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--pl-ink)' }}>
              Algo saiu do esperado
            </h2>
            <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>
              Recarregue a página para continuar. Se o problema persistir, tente novamente em instantes.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="pl-btn pl-btn-primary"
              style={{ marginTop: 24, width: '100%', justifyContent: 'center' }}
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
