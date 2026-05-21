import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  BookOpen,
  Edit3,
  ChevronDown,
  Check,
  Calendar as CalendarIcon,
  Calculator,
  Sparkles,
  Target,
  Layers,
  CheckCircle2,
  Plus,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import { analyzeEdital } from '../lib/aiClient';
import PageHeadPremium, {
  PageHeadPremiumBadge,
  PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS,
  PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS,
} from '../components/PageHeadPremium';

const DISCIPLINE_ACCENT_FALLBACK = '#1d4ed8';

export default function Edital({
  editalText = '',
  bancoDisciplinas = [],
  cursos = [],
  targetContest = null,
  expandedEditalSubject,
  setExpandedEditalSubject,
  toggleEditalTopico,
  setEditingDiscipline,
  setRegistroEstudoModalOpen,
  setLinkModalOpen,
}) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const concursosDoAluno = useMemo(() => {
    const safeCursos = Array.isArray(cursos) ? cursos : [];
    return safeCursos
      .map((curso, index) => {
        const plano = String(curso?.plano || curso?.nome || curso?.concurso || '').trim();
        if (!plano) return null;
        return {
          id: String(curso?.id || `curso-${index}-${plano}`),
          nome: String(curso?.nome || curso?.concurso || plano).trim(),
          plano,
        };
      })
      .filter(Boolean);
  }, [cursos]);

  const [concursoSelecionadoId, setConcursoSelecionadoId] = useState('');

  useEffect(() => {
    if (concursosDoAluno.length === 0) {
      setConcursoSelecionadoId('');
      return;
    }

    const targetId = String(targetContest?.id || '').trim();
    if (targetId && concursosDoAluno.some((item) => item.id === targetId)) {
      setConcursoSelecionadoId(targetId);
      return;
    }

    if (!concursosDoAluno.some((item) => item.id === concursoSelecionadoId)) {
      setConcursoSelecionadoId(concursosDoAluno[0].id);
    }
  }, [concursosDoAluno, concursoSelecionadoId, targetContest]);

  const concursoSelecionado = useMemo(
    () => concursosDoAluno.find((item) => item.id === concursoSelecionadoId) || null,
    [concursosDoAluno, concursoSelecionadoId]
  );

  const handleAnalyzeEdital = async () => {
    if (!hasEditalText) return;
    setAiLoading(true);
    setAiError('');
    setAiPanelOpen(true);
    try {
      const resultado = await analyzeEdital(editalText);
      setAiAnalysis(resultado);
    } catch (err) {
      setAiError(err?.message || 'Erro ao analisar edital.');
    } finally {
      setAiLoading(false);
    }
  };

  // Filtra por concurso selecionado (e inclui disciplinas gerais compartilhadas).
  const editalAtivo = useMemo(() => {
    const safeDisciplinas = Array.isArray(bancoDisciplinas) ? bancoDisciplinas : [];
    if (concursoSelecionado?.plano) {
      return safeDisciplinas.filter(
        (disciplina) => disciplina?.plano === concursoSelecionado.plano || disciplina?.plano === 'Geral'
      );
    }
    return safeDisciplinas;
  }, [bancoDisciplinas, concursoSelecionado]);

  let totTopicosEdital = 0;
  let concTopicosEdital = 0;

  editalAtivo.forEach((disciplina) => {
    if (Array.isArray(disciplina.topicos)) {
      totTopicosEdital += disciplina.topicos.length;
      concTopicosEdital += disciplina.topicos.filter((t) => t?.concluido).length;
    }
  });

  const progGeralEdital =
    totTopicosEdital > 0 ? Math.round((concTopicosEdital / totTopicosEdital) * 100) : 0;

  const disciplinasConcluidas = editalAtivo.filter((d) =>
    Array.isArray(d.topicos) && d.topicos.length > 0
      ? d.topicos.every((t) => t?.concluido)
      : false
  ).length;

  const topicosPendentes = totTopicosEdital - concTopicosEdital;
  const hasEditalText = String(editalText || '').trim().length > 0;

  const selectChevronDark = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

  return (
    <div className="page-shell !h-auto min-h-0 animate-in fade-in duration-500 !pt-4 sm:!pt-5">
      <PageHeadPremium
        className="lg:!flex-row lg:!items-center lg:!justify-between"
        icon={FileText}
        badge={
          <PageHeadPremiumBadge icon={Sparkles}>
            Painel estratégico
          </PageHeadPremiumBadge>
        }
        title="Edital verticalizado"
        subtitle="Acompanhe o progresso tópico por tópico, sem bagunça e sem sumir matéria no meio do caminho."
        leadingClassName="items-center lg:max-w-[calc(100%-36rem)] xl:max-w-[50rem]"
        trailingWrapClassName="lg:ml-auto lg:w-auto lg:max-w-[35rem] lg:self-center"
        trailing={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {hasEditalText ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleAnalyzeEdital}
                  disabled={aiLoading}
                  className={`${PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS} disabled:opacity-60`}
                >
                  {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {aiLoading ? 'Analisando...' : 'Analisar com IA'}
                </button>
                {aiError ? <p className="text-xs font-semibold text-rose-300">{aiError}</p> : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setRegistroEstudoModalOpen?.(true)}
              className={PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS}
            >
              <Plus size={14} strokeWidth={2} />
              Adicionar estudo
            </button>
            {concursosDoAluno.length > 0 ? (
              <select
                value={concursoSelecionadoId}
                onChange={(e) => setConcursoSelecionadoId(e.target.value)}
                className="min-w-[220px] cursor-pointer appearance-none rounded-lg border border-white/20 bg-white/10 py-2 pl-3 pr-9 text-xs font-semibold text-slate-100 outline-none transition-all hover:border-white/30 hover:bg-white/15 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25 sm:min-w-[260px] sm:px-3.5 sm:py-2 sm:text-[13px]"
                style={{
                  backgroundImage: selectChevronDark,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                }}
              >
                {concursosDoAluno.map((concurso) => (
                  <option key={concurso.id} value={concurso.id} className="bg-slate-900 text-white">
                    {concurso.nome}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        }
      />

      <div className="section-card">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <TopStat
              icon={BookOpen}
              label="Disciplinas"
              value={String(editalAtivo.length)}
              accent="blue"
            />
            <TopStat
              icon={Layers}
              label="Tópicos"
              value={String(totTopicosEdital)}
              accent="indigo"
            />
            <TopStat
              icon={CheckCircle2}
              label="Concluídos"
              value={String(concTopicosEdital)}
              accent="emerald"
            />
            <TopStat
              icon={Target}
              label="Pendentes"
              value={String(topicosPendentes)}
              accent="orange"
            />
          </div>

        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/90 p-4 sm:p-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Progresso geral do edital
                </p>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  {concTopicosEdital} de {totTopicosEdital} tópicos concluídos ·{' '}
                  {disciplinasConcluidas} disciplinas 100%
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold leading-none text-slate-900 sm:text-4xl">
                  {progGeralEdital || 0}
                </span>
                <span className="text-lg font-semibold text-slate-900">%</span>
              </div>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-700 transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, progGeralEdital || 0))}%` }}
              />
            </div>
          </div>

          {(aiPanelOpen || aiAnalysis || aiLoading || aiError) ? (
            <div className="mt-6 rounded-xl border border-violet-200/80 bg-violet-50/70 p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setAiPanelOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-800">
                    Leitura com IA
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {aiAnalysis?.concurso || aiAnalysis?.nome || aiAnalysis?.examName || aiAnalysis?.organization || 'Edital analisado'}
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-violet-600 transition-transform ${aiPanelOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {aiPanelOpen ? (
                <div className="mt-4 grid gap-4">
                  {aiLoading ? (
                    <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white/80 p-4 text-sm font-semibold text-violet-700">
                      <Loader2 size={18} className="animate-spin" />
                      Analisando edital com IA...
                    </div>
                  ) : null}

                  {aiError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      {aiError}
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-3">
                    <AiMiniInfo label="Concurso" value={aiAnalysis?.examName || 'Não identificado'} />
                    <AiMiniInfo label="Banca" value={aiAnalysis?.banca || aiAnalysis?.organization || 'Não identificada'} />
                    <AiMiniInfo
                      label="Datas"
                      value={[
                        aiAnalysis?.dates?.publicationDate,
                        aiAnalysis?.dates?.registrationPeriod,
                        aiAnalysis?.dates?.examDate,
                      ]
                        .filter(Boolean)
                        .join(' • ') || 'Sem datas extraídas'}
                    />
                  </div>

                  <div className="rounded-xl border border-violet-100 bg-white/90 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-800">
                      Disciplinas identificadas
                    </p>
                    <div className="mt-3 space-y-3">
                      {(Array.isArray(aiAnalysis?.contests) && aiAnalysis?.contests[0]?.disciplinas?.length > 0
                        ? aiAnalysis.contests[0].disciplinas
                        : []
                      ).map((disciplina) => (
                        <div key={disciplina.nome} className="rounded-xl border border-slate-100 bg-white px-4 py-3">
                          <p className="text-sm font-semibold text-slate-800">{disciplina.nome}</p>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {Array.isArray(disciplina.topicos) && disciplina.topicos.length > 0
                              ? disciplina.topicos.join(' • ')
                              : 'Sem tópicos detalhados'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
      </div>

      <div className="section-card flex min-h-0 flex-col p-0">
        <div className="flex shrink-0 flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
              Disciplinas do edital
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Expanda cada disciplina para visualizar e marcar os tópicos.
            </p>
          </div>

          <div className="premium-badge w-fit gap-2 py-1.5">
            <Sparkles size={12} className="shrink-0" />
            Progresso por tópico
          </div>
        </div>

        {editalAtivo.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center sm:px-8 sm:py-14">
            <div className="mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <BookOpen size={22} />
            </div>
            <p className="mt-4 max-w-md text-sm font-semibold leading-relaxed text-slate-500">
              Nenhuma disciplina encontrada no edital ativo.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {editalAtivo.map((disciplina) => {
              const topicos = Array.isArray(disciplina.topicos) ? disciplina.topicos : [];
              const concluidos = topicos.filter((t) => t?.concluido).length;
              const total = topicos.length;
              const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0;
              const isExpanded = expandedEditalSubject === disciplina.id;
              const corDisciplina = disciplina.cor || DISCIPLINE_ACCENT_FALLBACK;

              return (
                <div key={disciplina.id} className="group">
                  <div
                    onClick={() =>
                      setExpandedEditalSubject(isExpanded ? null : disciplina.id)
                    }
                    className={`cursor-pointer px-5 py-5 sm:px-6 lg:px-8 transition-all duration-300 ${
                      isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                          style={{ backgroundColor: corDisciplina }}
                        >
                          <BookOpen size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate text-base font-semibold text-slate-900 transition-colors group-hover:text-blue-700 sm:text-lg">
                              {disciplina.nome}
                            </h4>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                              {disciplina.plano || 'Geral'}
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-medium text-slate-500">
                            {concluidos} de {total} tópicos concluídos
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 xl:min-w-[360px]">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            <span>Progresso</span>
                            <span style={{ color: corDisciplina }}>{progresso}%</span>
                          </div>

                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, progresso || 0))}%`, backgroundColor: corDisciplina }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDiscipline?.(disciplina);
                          }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all duration-300 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          title="Editar disciplina"
                        >
                          <Edit3 size={17} />
                        </button>

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
                            isExpanded
                              ? 'border-blue-100 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          }`}
                        >
                          <ChevronDown
                            size={18}
                            className={`transition-transform duration-300 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 sm:px-6 lg:px-8 pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70">
                        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            <Layers size={14} className="text-blue-700" />
                            Tópicos da disciplina
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDiscipline?.(disciplina);
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700 transition-all duration-300 hover:bg-slate-50 hover:shadow-sm"
                          >
                            <Edit3 size={14} />
                            Editar disciplina
                          </button>
                        </div>

                        <div className="hidden items-center gap-3 border-b border-slate-100 bg-white/80 px-5 py-3 md:flex">
                          <div className="flex-1 pl-10 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Tópicos
                          </div>
                          <div className="w-16 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            Acertos
                          </div>
                          <div className="w-16 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            Erros
                          </div>
                          <div className="w-20 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            %
                          </div>
                          <div className="w-24 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            Link
                          </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {topicos.map((topico) => {
                            const percentual = Number(topico?.percentual || 0);

                            return (
                              <div
                                key={topico?.id || Math.random()}
                                className="px-4 sm:px-5 py-4 transition-all duration-300 hover:bg-white"
                              >
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <button
                                      onClick={() =>
                                        toggleEditalTopico?.(disciplina.id, topico.id)
                                      }
                                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-300 ${
                                        topico?.concluido
                                          ? 'border-emerald-500 bg-emerald-500 text-white'
                                          : 'border-slate-300 bg-white text-transparent hover:border-emerald-400'
                                      }`}
                                    >
                                      <Check size={14} strokeWidth={4} />
                                    </button>

                                    <div className="min-w-0 flex-1">
                                      <p
                                        className={`text-sm font-semibold leading-relaxed ${
                                          topico?.concluido
                                            ? 'text-slate-400 line-through'
                                            : 'text-slate-700'
                                        }`}
                                      >
                                        {topico?.nome || 'Tópico sem nome'}
                                      </p>

                                      {topico?.data && (
                                        <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                                          <CalendarIcon size={12} />
                                          {topico.data}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 pl-9 md:pl-0">
                                    <div className="w-16 text-center text-xs font-semibold text-emerald-500">
                                      {topico?.acertos ?? 0}
                                    </div>

                                    <div className="w-16 text-center text-xs font-semibold text-red-400">
                                      {topico?.erros ?? 0}
                                    </div>

                                    <div className="w-20 flex justify-center">
                                      <span
                                        className={`inline-flex min-w-[54px] items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                                          percentual >= 80
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                            : percentual >= 70
                                            ? 'bg-orange-50 text-orange-700 border border-orange-100'
                                            : percentual > 0
                                            ? 'bg-red-50 text-red-700 border border-red-100'
                                            : 'border border-slate-200 bg-slate-100 text-slate-500'
                                        }`}
                                      >
                                        {percentual}%
                                      </span>
                                    </div>

                                    <div className="w-24 flex justify-center">
                                      <button
                                        onClick={() => setLinkModalOpen?.(true)}
                                        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 transition-all duration-300 hover:bg-blue-50 hover:text-blue-700"
                                      >
                                        <LinkIcon size={13} />
                                        Adicionar
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TopStat({ icon: Icon, label, value, accent }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
          styles[accent] || styles.blue
        }`}
      >
        <Icon size={18} />
      </div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="text-xl font-semibold leading-none text-slate-900">{value}</p>
    </div>
  );
}

function AiMiniInfo({ label, value }) {
  return (
    <div className="rounded-xl border border-violet-100 bg-white/90 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}
