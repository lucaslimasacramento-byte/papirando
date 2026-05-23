import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

const STORAGE_KEY = 'papirando_beta_welcome_dismissed';

const FEATURES = [
  'Cronômetro e sessões de estudo',
  'Edital verticalizado por disciplina',
  'Banco de questões com gabarito',
  'Ciclos de estudo e revisões',
  'Estatísticas e histórico de progresso',
  'Flashcards, redações e mapas mentais',
];

export default function BetaWelcomeBanner({ onSendFeedback, onStart }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
    setDismissed(true);
  };

  return (
    <div className="mb-4 overflow-hidden rounded-xl"
      style={{
        background: 'var(--pl-bg-soft, #ebe6d8)',
        border: '1px solid var(--pl-rule-2, rgba(20,17,13,0.18))',
      }}
    >
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          {/* Mark tile — página dobrada */}
          <div className="pl-mark shrink-0" style={{ '--m-size': '44px', '--m-fold': '11px' }}>
            <div className="pl-mark-tile" />
            <div className="pl-mark-fold" />
            <div className="pl-mark-p">P</div>
          </div>

          {/* Texto */}
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              <h3 className="pl-display text-base" style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 16, letterSpacing: '-0.03em', color: 'var(--pl-ink)' }}>
                Bem-vindo ao beta fechado do Papirando!
              </h3>
              <span className="pl-tag pl-tag-accent" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                Beta
              </span>
            </div>
            <p className="mb-3 text-sm" style={{ color: 'var(--pl-ink-2)', fontWeight: 500 }}>
              Você é um dos primeiros a usar a plataforma. Explore à vontade e nos diga o que achou!
            </p>

            {/* Checklist de features */}
            <ul className="mb-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--pl-ink-2)' }}>
                  <CheckCircle2 size={13} className="shrink-0" style={{ color: 'var(--pl-success)' }} />
                  {f}
                </li>
              ))}
            </ul>

            {/* Ações */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { onSendFeedback?.(); handleDismiss(); }}
                className="pl-btn pl-btn-primary pl-btn-sm"
              >
                Enviar feedback
              </button>
              <button
                type="button"
                onClick={() => { onStart?.(); handleDismiss(); }}
                className="pl-btn pl-btn-sm"
              >
                Começar a explorar →
              </button>
            </div>
          </div>
        </div>

        {/* Fechar */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar banner de boas-vindas"
          className="mt-0.5 shrink-0 rounded-lg p-1.5 transition-colors"
          style={{ color: 'var(--pl-ink-3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--pl-rule)'; e.currentTarget.style.color = 'var(--pl-ink)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--pl-ink-3)'; }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
