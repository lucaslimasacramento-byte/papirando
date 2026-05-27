import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';

/**
 * Detecta ?checkout=success ou ?checkout=cancel na URL,
 * mostra um banner e limpa o parâmetro da URL.
 *
 * Props:
 *   onSuccess — callback chamado quando checkout=success (ex: refresh da assinatura)
 */
export default function CheckoutResultBanner({ onSuccess }) {
  const [state, setState] = useState(null); // null | 'success' | 'cancel' | 'loading'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('checkout');
    if (!result) return;

    params.delete('checkout');
    params.delete('plan');
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
    window.history.replaceState({}, '', newUrl);

    if (result === 'success') {
      setState('loading');
      const timer = setTimeout(() => {
        onSuccess?.();
        setState('success');
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (result === 'cancel') {
      setState('cancel');
    }
  }, [onSuccess]);

  useEffect(() => {
    if (state !== 'success' && state !== 'cancel') return;
    const timer = setTimeout(() => setState(null), 6000);
    return () => clearTimeout(timer);
  }, [state]);

  if (!state) return null;

  const configs = {
    loading: {
      icon: <Loader2 size={18} className="animate-spin" style={{ color: 'var(--pl-accent)' }} />,
      bg: 'var(--pl-accent-soft)',
      border: 'var(--pl-accent)',
      textColor: 'var(--pl-accent)',
      title: 'Processando seu pagamento…',
      body: 'Isso leva só alguns segundos. Sua assinatura será ativada em instantes!',
    },
    success: {
      icon: <CheckCircle2 size={18} style={{ color: 'var(--pl-success)' }} />,
      bg: 'var(--pl-success-soft)',
      border: 'var(--pl-success)',
      textColor: 'var(--pl-success)',
      title: 'Assinatura ativada com sucesso!',
      body: 'Bem-vindo ao plano premium. Todos os recursos estão liberados. 🎉',
    },
    cancel: {
      icon: <AlertTriangle size={18} style={{ color: 'var(--pl-warn)' }} />,
      bg: 'var(--pl-warn-soft)',
      border: 'var(--pl-warn)',
      textColor: 'var(--pl-warn)',
      title: 'Pagamento cancelado',
      body: 'Nenhuma cobrança foi feita. Você pode tentar novamente quando quiser.',
    },
  };

  const c = configs[state];
  if (!c) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12, borderRadius: 14, border: `1px solid ${c.border}`, background: c.bg, padding: '14px 20px', boxShadow: 'var(--pl-sh-low)' }}
    >
      <div style={{ marginTop: 1, flexShrink: 0 }}>{c.icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: c.textColor }}>{c.title}</p>
        <p style={{ marginTop: 2, fontSize: 12, fontWeight: 500, color: c.textColor, opacity: 0.8 }}>{c.body}</p>
      </div>
      {state !== 'loading' && (
        <button
          type="button"
          onClick={() => setState(null)}
          aria-label="Fechar"
          style={{ marginTop: 2, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: c.textColor, opacity: 0.6, borderRadius: 6, padding: 3 }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
