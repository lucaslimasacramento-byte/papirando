import React, { useEffect } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  CircleDashed,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';

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
      <div className="relative overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <div className="absolute right-0 top-0 h-72 w-72 bg-blue-50 opacity-60 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 bg-emerald-50 opacity-40 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 xl:flex-row">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-blue-700">
              <Sparkles size={12} />
              Visão estratégica
            </div>

            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: viewingDiscipline.cor || '#2563EB' }}
              >
                <BookOpen size={20} />
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-slate-900 lg:text-3xl">{viewingDiscipline.nome}</h2>
                <p className="text-sm font-medium text-gray-500">Plano: {viewingDiscipline.plano || 'Geral'}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                <span>Progresso</span>
                <span className="text-blue-600">{progressoPercentual}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${progressoPercentual}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Tempo" value={tempoFormatado} color="blue" />
            <Kpi label="Desempenho" value={`${desempenhoPercentual}%`} color="emerald" />
            <Kpi label="Concluídos" value={topicosConcluidos} color="indigo" />
            <Kpi label="Pendentes" value={topicosPendentes} color="orange" />
          </div>
        </div>

        <div className="relative z-10 mt-5 flex flex-wrap gap-3">
          <Btn type="button" onClick={() => setEditingDiscipline?.(viewingDiscipline)} icon={Plus} primary>
            Adicionar tópico
          </Btn>

          <Btn type="button" onClick={() => setLinkModalOpen?.(true)} icon={Calculator}>
            Relacionar
          </Btn>

          <Btn type="button" onClick={() => setViewingDiscipline(null)} icon={X}>
            Fechar
          </Btn>
        </div>
      </div>

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

      <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">Mapa da disciplina</p>
            <h4 className="mt-1 text-lg font-semibold text-slate-900">Tópicos cadastrados</h4>
          </div>
          <div className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
            {totalDeTopicos} tópicos
          </div>
        </div>

        {topicos.length > 0 ? (
          topicos.map((topico, index) => (
            <div
              key={topico?.id || index}
              id={topico?.id ? `disciplina-topico-${topico.id}` : undefined}
              className={`border-b border-gray-100 px-6 py-4 transition-all duration-300 hover:bg-gray-50/80 ${
                String(topico?.id || '') === String(highlightedTopicId || '')
                  ? 'bg-blue-50/80 ring-1 ring-inset ring-blue-200'
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
                        : 'border-gray-300 bg-white text-transparent hover:border-emerald-400'
                    }`}
                    aria-label={topico?.concluido ? 'Desmarcar tópico como concluído' : 'Marcar tópico como concluído'}
                  >
                    <Check size={14} strokeWidth={4} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
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
                        topico?.concluido ? 'text-gray-400 line-through' : 'text-gray-800'
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Plus size={18} />
            </div>
            <h4 className="mt-4 text-base font-semibold text-slate-900">Nenhum tópico cadastrado ainda</h4>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Use o botão acima para começar a estruturar essa disciplina.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, color }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className={`inline-block rounded-full px-2 py-1 text-[10px] font-semibold ${styles[color]}`}>
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Btn({ children, icon, primary, onClick, type = 'button' }) {
  const IconComponent = icon;
  return (
    <button
      type={type}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-5 py-3 font-bold transition ${
        primary ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <IconComponent size={16} />
      {children}
    </button>
  );
}

function Insight({ title, text }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-1 text-[10px] font-semibold uppercase text-blue-200">{title}</div>
      <p className="text-sm text-white/90">{text}</p>
    </div>
  );
}
