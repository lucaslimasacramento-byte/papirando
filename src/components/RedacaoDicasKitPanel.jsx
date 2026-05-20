import React from 'react';
import { Eye, LayoutTemplate, Lightbulb, Link2, Quote } from 'lucide-react';
import { getDefaultRedacaoKitBundle } from '../lib/redacaoKitMerge';

function KitDetails({ title, badge, children, defaultOpen = false }) {
  return (
    <details
      className="group w-full rounded-2xl border border-ink-200/80 bg-white shadow-sm transition open:border-indigo-200/70 open:shadow-md"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:content-none [&::-webkit-details-marker]:hidden sm:px-5">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-snug text-ink-900">{title}</p>
          {badge ? (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{badge}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[10px] font-bold text-ink-500 group-open:border-indigo-100 group-open:bg-indigo-50 group-open:text-indigo-800">
          <span className="group-open:hidden">Abrir</span>
          <span className="hidden group-open:inline">Recolher</span>
        </span>
      </summary>
      <div className="border-t border-ink-100 px-4 pb-5 pt-2 sm:px-5">{children}</div>
    </details>
  );
}

function SectionHeading({ step, icon: Icon, title, description, headingId }) {
  return (
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
        <span className="font-mono text-[11px] font-bold tabular-nums text-indigo-500">{step}</span>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-ink-200/90 bg-gradient-to-br from-ink-50 to-white text-ink-700 shadow-sm">
          <Icon size={22} strokeWidth={2} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 id={headingId} className="text-lg font-semibold tracking-tight text-ink-900 sm:text-xl">
          {title}
        </h3>
        {description ? <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-ink-500">{description}</p> : null}
      </div>
    </header>
  );
}

/**
 * @param {object} props
 * @param {object} [props.bundle]
 * @param {Array<{ id: string, title: string, body?: string }>} [props.expertTips]
 * @param {(tip: object) => void} [props.onOpenExpert]
 */
export function RedacaoDicasKitPanel({ bundle: bundleProp, expertTips = [], onOpenExpert }) {
  const bundle = bundleProp && typeof bundleProp === 'object' ? bundleProp : getDefaultRedacaoKitBundle();
  const conectivos = bundle.conectivos;
  const frases = bundle.frasesProntas;
  const modelos = bundle.modelos;
  const tips = Array.isArray(expertTips) ? expertTips.filter((t) => t?.title) : [];

  return (
    <article className="mx-auto w-full max-w-3xl space-y-16 pb-2">
      <section className="scroll-mt-6" aria-labelledby="dicas-conectivos">
        <SectionHeading
          step="01"
          icon={Link2}
          title="Conectivos"
          headingId="dicas-conectivos"
          description="Organizados por função na prova. Abra só o grupo que for usar naquele parágrafo — o conteúdo desce inteiro na página, sem caixa rolante."
        />
        <div className="flex flex-col gap-3">
          {conectivos.map((bloco, i) => (
            <KitDetails key={bloco.id} title={`${bloco.emoji} ${bloco.titulo}`} defaultOpen={i === 0}>
              <ol className="mt-1 space-y-2 pl-0.5 text-[14px] font-medium leading-relaxed text-ink-700">
                {bloco.itens.map((linha, idx) => (
                  <li key={linha} className="flex gap-3">
                    <span className="w-6 shrink-0 text-right font-bold tabular-nums text-ink-400">{idx + 1}.</span>
                    <span>{linha}</span>
                  </li>
                ))}
              </ol>
            </KitDetails>
          ))}
        </div>
      </section>

      <section className="scroll-mt-6 border-t border-ink-200/80 pt-16" aria-labelledby="dicas-frases">
        <SectionHeading
          step="02"
          icon={Quote}
          title="Frases prontas"
          headingId="dicas-frases"
          description="Substitua [TEMA] e complete os colchetes com segurança. Treine encaixando no seu tempo — tudo visível ao expandir o cartão."
        />
        <div className="flex flex-col gap-3">
          {frases.map((bloco, i) => (
            <KitDetails key={bloco.id} title={`${bloco.emoji} ${bloco.titulo}`} defaultOpen={i === 0}>
              <ol className="mt-1 space-y-2.5 pl-0.5 text-[14px] font-medium leading-relaxed text-ink-700">
                {bloco.itens.map((linha, idx) => (
                  <li key={linha} className="flex gap-3">
                    <span className="w-6 shrink-0 text-right font-bold tabular-nums text-ink-400">{idx + 1}.</span>
                    <span>{linha}</span>
                  </li>
                ))}
              </ol>
            </KitDetails>
          ))}
        </div>
      </section>

      <section className="scroll-mt-6 border-t border-ink-200/80 pt-16" aria-labelledby="dicas-modelos">
        <SectionHeading
          step="03"
          icon={LayoutTemplate}
          title="Modelos decoráveis"
          headingId="dicas-modelos"
          description="Troque os colchetes, leia em voz alta e adapte ao tema. O texto do modelo aparece completo abaixo — role a página do app, não um bloco interno."
        />
        <div className="flex flex-col gap-3">
          {modelos.map((m, i) => (
            <KitDetails key={m.id} title={m.titulo} badge={m.badge} defaultOpen={i === 0}>
              <pre className="mt-1 whitespace-pre-wrap break-words rounded-2xl border border-ink-100 bg-ink-50/95 p-4 font-sans text-[13px] font-medium leading-[1.65] text-ink-700 sm:p-5 sm:text-[14px]">
                {m.corpo}
              </pre>
            </KitDetails>
          ))}
        </div>
      </section>

      <section className="scroll-mt-6 border-t border-ink-200/80 pt-16" aria-labelledby="dicas-extras">
        <SectionHeading
          step="04"
          icon={Lightbulb}
          title="Dicas extras"
          headingId="dicas-extras"
          description={
            tips.length
              ? 'Publicadas em Admin → Configurações → Redações · dicas. Toque para ler o texto completo.'
              : 'Cadastre em Admin → Configurações → Redações · dicas. O kit (conectivos, frases e modelos) edita-se em Redações · dados, em formulário estruturado.'
          }
        />
        {tips.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/60 px-5 py-8 text-center text-sm font-medium text-ink-500">
            Nenhuma dica extra no servidor ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {tips.map((tip) => (
              <button
                key={tip.id}
                type="button"
                onClick={() => onOpenExpert?.(tip)}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-ink-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                  <Lightbulb size={12} strokeWidth={2.2} />
                  Especialista
                </span>
                <span className="text-[15px] font-semibold leading-snug text-ink-900 group-hover:text-indigo-950">{tip.title}</span>
                <span className="line-clamp-3 text-sm font-medium leading-relaxed text-ink-500">{tip.body || 'Ver conteúdo'}</span>
                <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700">
                  <Eye size={16} strokeWidth={2.2} />
                  Abrir
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
