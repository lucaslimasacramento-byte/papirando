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
    <div className="mb-4 overflow-hidden rounded-lg border border-[#14110d]/18 bg-[#ebe6d8] shadow-none">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Ícone — em tinta (CTA primário Papirando) */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#14110d] text-[#f3efe5] shadow-none">
            <Sparkles size={22} strokeWidth={1.75} />
          </div>

          {/* Texto */}
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              <h3
                className="text-[1.625rem] font-light leading-tight tracking-[-0.025em] text-[#14110d]"
                style={{ fontFamily: 'Fraunces, "Plus Jakarta Sans", serif', fontStyle: 'italic' }}
              >
                Bem-vindo ao beta fechado do Papirando<span className="text-[#1d4ed8]">.</span>
              </h3>
              <span className="rounded-sm border border-[#1d4ed8]/28 bg-[#eaf0fd] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#1d4ed8]">
                Beta
              </span>
            </div>
            <p className="mb-3 text-sm font-medium leading-relaxed text-[#3a342c]">
              Você é um dos primeiros a papirar por aqui. Explore à vontade e nos conta o que achou.
            </p>

            {/* Checklist de features */}
            <ul className="mb-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs font-semibold text-[#3a342c]">
                  <CheckCircle2 size={13} strokeWidth={1.75} className="shrink-0 text-[#4d7c3f]" />
                  {f}
                </li>
              ))}
            </ul>

            {/* Ações — CTA primário em tinta (brandbook); secundário em papel */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { onSendFeedback?.(); handleDismiss(); }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#14110d] px-4 text-[13px] font-semibold tracking-tight text-[#f3efe5] transition-colors hover:bg-[#3a342c]"
              >
                Enviar feedback
              </button>
              <button
                type="button"
                onClick={() => { onStart?.(); handleDismiss(); }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#14110d]/28 bg-white px-4 text-[13px] font-semibold tracking-tight text-[#14110d] transition-colors hover:bg-[#ebe6d8]"
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
          className="mt-0.5 shrink-0 rounded-md p-1.5 text-[#847b6c] transition-colors hover:bg-[#f3efe5] hover:text-[#14110d]"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
