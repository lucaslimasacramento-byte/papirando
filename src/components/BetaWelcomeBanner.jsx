import React, { useState } from 'react';
import { CheckCircle2, MessageSquarePlus, Rocket, X } from 'lucide-react';

const STORAGE_KEY = 'papirando_beta_welcome_dismissed';

/**
 * Banner de boas-vindas para usuários beta.
 * Aparece uma única vez (até ser descartado).
 * Props:
 *  - onOpenFeedback: () => void — abre o modal de feedback
 */
export default function BetaWelcomeBanner({ onOpenFeedback }) {
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem(STORAGE_KEY); }
    catch { return true; }
  });

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ok */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg md:mx-6">
      {/* Close */}
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-lg text-blue-200 transition hover:bg-white/10 hover:text-white"
        aria-label="Fechar"
      >
        <X size={16} />
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        {/* Ícone */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Rocket size={24} className="text-white" />
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <span className="inline-block rounded-md bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-100">
              Beta fechado
            </span>
            <h2 className="mt-1.5 text-lg font-bold leading-snug">
              Bem-vindo ao Papirando!
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-blue-100">
              Você é um dos primeiros usuários a testar a plataforma. Sua opinião molda cada nova funcionalidade — não hesite em nos contar o que achou.
            </p>
          </div>

          {/* Checklist */}
          <ul className="space-y-1.5">
            {[
              'Explore seus cursos e concursos',
              'Configure seus lembretes de provas',
              'Use o cronômetro para simular sessões de estudo',
              'Envie feedback sempre que quiser',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-blue-100">
                <CheckCircle2 size={14} className="shrink-0 text-blue-300" />
                {item}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2 pt-1">
            {typeof onOpenFeedback === 'function' ? (
              <button
                type="button"
                onClick={() => { onOpenFeedback(); dismiss(); }}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow transition hover:bg-blue-50"
              >
                <MessageSquarePlus size={15} />
                Enviar feedback
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Começar a explorar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
