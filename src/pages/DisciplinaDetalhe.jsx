import React, { useEffect } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Plus,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';

export default function DisciplinaDetalhe({
  viewingDiscipline,
  setViewingDiscipline,
  setEditingDiscipline,
  setLinkModalOpen,
  toggleEditalTopico,
  highlightedTopicId = '',
}) {
  useEffect(() => {
    if (!highlightedTopicId) return;

    const element = document.getElementById(`disciplina-topico-${highlightedTopicId}`);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedTopicId, viewingDiscipline]);

  if (!viewingDiscipline) return null;

  const topicos = Array.isArray(viewingDiscipline.topicos) ? viewingDiscipline.topicos : [];
  const tempo = viewingDiscipline.tempo ? String(viewingDiscipline.tempo) : '0h 00m';
  const tempoFormatado = tempo === '0h 00m' || tempo === '-' ? '0h00min' : tempo.replace(' ', '');
  const topicosConcluidos = topicos.filter((topic) => topic?.concluido).length;
  const totalDeTopicos = topicos.length > 0 ? topicos.length : Number(viewingDiscipline.topicosTot || 0);
  const topicosPendentes = Math.max(0, totalDeTopicos - topicosConcluidos);
  const progressoPercentual =
    totalDeTopicos > 0 ? Math.round((topicosConcluidos / totalDeTopicos) * 100) : 0;
  const desempenhoPercentual = Number(viewingDiscipline.percentual || 0);
  const potencial = Math.max(0, 100 - progressoPercentual);
  const proximoTopico = topicos.find((topic) => !topic?.concluido) || null;

  const insightForte =
    desempenhoPercentual >= 75
      ? 'Seu desempenho está saudável e a disciplina já mostra boa retenção de conteúdo.'
      : topicosConcluidos > 0
        ? 'Você já começou a consolidar a disciplina e tem uma base real para acelerar.'
        : 'A estrutura já está pronta para ganhar tração assim que os primeiros tópicos forem fechados.';

  const insightPressao =
    topicosPendentes > 0
      ? `${topicosPendentes} tópico(s) ainda estão em aberto e concentram o maior ganho imediato.`
      : 'Todos os tópicos cadastrados já foram concluídos. Agora vale reforçar revisão e questões.';

  const insightNext = proximoTopico
    ? `Ataque primeiro "${proximoTopico.nome}" para continuar a fila sem perder ritmo.`
    : 'Hora de transformar essa base em consistência com revisão e treino direcionado.';

  return (
    <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-6 p-6 pb-24 animate-in slide-in-from-right-8 duration-500 lg:p-8">
      <PageHeadPremium
        icon={BookOpen}
        badge={
          <PageHeadPremiumBadge icon={Sparkles}>Visão estratégica</PageHeadPremiumBadge>
        }
        title={viewingDiscipline.nome}
        subtitle={`Plano: ${viewingDiscipline.plano || 'Geral'}`}
        titleAs="h2"
        leadingClassName="min-w-0 flex-1"
        leadingExtra={(
          <div className="mt-2 max-w-xl">
            <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              <span>Progresso</span>
              <span className="text-emerald-300">{progressoPercentual}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progressoPercentual}%` }} />
            </div>
          </div>
        )}
        statGridClassName="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2 [&>*]:min-w-0"
        stats={[
          { key: 'tmp', label: 'Tempo', value: String(tempoFormatado), icon: Clock3, accent: 'blue' },
          { key: 'd', label: 'Desempenho', value: `${desempenhoPercentual}%`, icon: TrendingUp, accent: 'emerald' },
          { key: 'c', label: 'Concluídos', value: String(topicosConcluidos), icon: CheckCircle2, accent: 'indigo' },
          { key: 'p', label: 'Pendentes', value: String(topicosPendentes), icon: CircleDashed, accent: 'orange' },
        ]}
        trailingClassName="w-full min-w-0 sm:max-w-[11rem] xl:shrink-0"
        trailing={(
          <div className="flex w-full min-w-0 flex-col gap-2">
            <button
              type="button"
              onClick={() => setEditingDiscipline?.(viewingDiscipline)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-400"
            >
              <Plus size={16} />
              Adicionar tópico
            </button>
            <button
              type="button"
              onClick={() => setLinkModalOpen?.(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-ink-100 transition hover:bg-white/10"
            >
              <Calculator size={16} />
              Relacionar
            </button>
            <button
              type="button"
              onClick={() => setViewingDiscipline(null)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-ink-100 transition hover:bg-white/10"
            >
              <X size={16} />
              Fechar
            </button>
          </div>
        )}
      />

      <div className="rounded-[2.5rem] bg-gradient-to-br from-[#1E3A5F] to-[#1A2F4D] p-6 text-white shadow-lg">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest">
          <Sparkles size={12} />
          Leitura da IA
        </div>

        <h3 className="mb-2 text-2xl font-semibold">Diagnóstico da disciplina</h3>

        <p className="mb-5 max-w-xl text-sm text-white/80">
          Você já tem uma visão clara da disciplina. Agora a ideia é usar esse painel para decidir
          onde acelerar, onde revisar e qual tópico puxar em seguida.
        </p>

        <div className="space-y-3">
          <Insight title="O que está forte" text={insightForte} />
          <Insight title="O que pede pressão" text={insightPressao} />
          <Insight title="Próxima jogada" text={insightNext} />
        </div>

        <div className="mt-5 flex justify-between rounded-xl bg-white/10 px-4 py-3">
          <span className="text-xs font-semibold uppercase text-white/70">Potencial</span>
          <span className="flex items-center gap-1 text-lg font-semibold">
            +{potencial}%
            <ArrowUpRight size={14} />
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-ink-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50/60 px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">Mapa da disciplina</p>
            <h4 className="mt-1 text-lg font-semibold text-ink-900">Tópicos cadastrados</h4>
          </div>
          <div className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
            {totalDeTopicos} tópicos
          </div>
        </div>

        {topicos.length > 0 ? (
          topicos.map((topico, index) => (
            <div
              key={topico?.id || index}
              id={topico?.id ? `disciplina-topico-${topico.id}` : undefined}
              className={`border-b border-ink-100 px-6 py-4 transition-all duration-300 hover:bg-ink-50/80 ${
                String(topico?.id || '') === String(highlightedTopicId || '')
                  ? 'bg-brand-50/80 ring-1 ring-inset ring-brand-200'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleEditalTopico?.(viewingDiscipline.id, topico.id)}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${
                      topico?.concluido
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-ink-300 bg-white text-transparent hover:border-emerald-400'
                    }`}
                    aria-label={topico?.concluido ? 'Desmarcar tópico como concluído' : 'Marcar tópico como concluído'}
                  >
                    <Check size={14} strokeWidth={4} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-ink-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                        #{index + 1}
                      </span>
                      {topico?.concluido ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
                          <CheckCircle2 size={11} />
                          Concluído
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600">
                          <CircleDashed size={11} />
                          Pendente
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-sm font-bold leading-relaxed ${
                        topico?.concluido ? 'text-ink-400 line-through' : 'text-ink-800'
                      }`}
                    >
                      {topico?.nome || 'Tópico sem nome'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
              <Plus size={18} />
            </div>
            <h4 className="mt-4 text-base font-semibold text-ink-900">Nenhum tópico cadastrado ainda</h4>
            <p className="mt-2 text-sm font-medium text-ink-500">
              Use o botão acima para começar a estruturar essa disciplina.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Insight({ title, text }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-1 text-[10px] font-semibold uppercase text-brand-200">{title}</div>
      <p className="text-sm text-white/90">{text}</p>
    </div>
  );
}
