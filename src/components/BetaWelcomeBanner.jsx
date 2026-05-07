import React, { useState } from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';

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
    <div className="mb-4 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Ícone */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-300/40">
            <Sparkles size={22} />
          </div>

          {/* Texto */}
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Bem-vindo ao beta fechado do Papirando!</h3>
              <span className="rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                Beta
              </span>
            </div>
            <p className="mb-3 text-sm font-medium text-slate-600">
              Você é um dos primeiros a usar a plataforma. Explore à vontade e nos diga o que achou!
            </p>

            {/* Checklist de features */}
            <ul className="mb-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>

            {/* Ações */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { onSendFeedback?.(); handleDismiss(); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
              >
                <Sparkles size={13} />
                Enviar feedback
              </button>
              <button
                type="button"
                onClick={() => { onStart?.(); handleDismiss(); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
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
          className="mt-0.5 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
