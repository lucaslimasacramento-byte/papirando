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

    // Remove o parâmetro da URL sem recarregar a página
    params.delete('checkout');
    params.delete('plan');
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
    window.history.replaceState({}, '', newUrl);

    if (result === 'success') {
      setState('loading');
      // Aguarda 2s para o webhook processar antes de recarregar
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
    // Auto-dismiss após 6s
    const timer = setTimeout(() => setState(null), 6000);
    return () => clearTimeout(timer);
  }, [state]);

  if (!state) return null;

  const configs = {
    loading: {
      icon: <Loader2 size={18} className="animate-spin text-brand-600" />,
      bg: 'border-brand-200 bg-brand-50',
      text: 'text-brand-700',
      title: 'Processando seu pagamento…',
      body: 'Isso leva só alguns segundos. Sua assinatura será ativada em instantes!',
    },
    success: {
      icon: <CheckCircle2 size={18} className="text-emerald-600" />,
      bg: 'border-emerald-200 bg-emerald-50',
      text: 'text-emerald-700',
      title: 'Assinatura ativada com sucesso!',
      body: 'Bem-vindo ao plano premium. Todos os recursos estão liberados. 🎉',
    },
    cancel: {
      icon: <AlertTriangle size={18} className="text-amber-500" />,
      bg: 'border-amber-200 bg-amber-50',
      text: 'text-amber-700',
      title: 'Pagamento cancelado',
      body: 'Nenhuma cobrança foi feita. Você pode tentar novamente quando quiser.',
    },
  };

  const c = configs[state];
  if (!c) return null;

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-2xl border px-5 py-4 shadow-sm ${c.bg}`}
      role="status"
      aria-live="polite"
    >
      <div className="mt-0.5 shrink-0">{c.icon}</div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${c.text}`}>{c.title}</p>
        <p className={`mt-0.5 text-xs font-medium ${c.text} opacity-80`}>{c.body}</p>
      </div>
      {state !== 'loading' && (
        <button
          type="button"
          onClick={() => setState(null)}
          className={`mt-0.5 shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100 ${c.text}`}
          aria-label="Fechar"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
