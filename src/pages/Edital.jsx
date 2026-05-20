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


const DISCIPLINE_ACCENT_FALLBACK = '#1d4ed8';

export default function Edital({
  editalText = '',
  bancoDisciplinas = [],
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

  // Extrai todos os planos únicos disponíveis no banco (ignorando 'Geral')
  const planosDisponiveis = useMemo(() => {
    const planos = (bancoDisciplinas || [])
      .map((d) => d?.plano)
      .filter((p) => p && p !== 'Geral');
    return [...new Set(planos)];
  }, [bancoDisciplinas]);

  const [planoSelecionado, setPlanoSelecionado] = useState(planosDisponiveis[0] || '');

  // Garante que se o banco mudar e o planoSelecionado não existir mais, ele pega o primeiro
  useEffect(() => {
    if (planosDisponiveis.length > 0 && !planosDisponiveis.includes(planoSelecionado)) {
      setPlanoSelecionado(planosDisponiveis[0]);
    }
  }, [planosDisponiveis, planoSelecionado]);

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

  // Filtra as disciplinas baseando-se no edital selecionado no filtro (e inclui as disciplinas Gerais)
  const editalAtivo = (bancoDisciplinas || []).filter(
    (d) => d?.plano === planoSelecionado || d?.plano === 'Geral'
  );

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
    <div className="pl-paper-bg" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '28px 28px 56px' }}>
      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="pl-eyebrow" style={{ marginBottom: 6 }}>Painel estratégico</div>
          <h1 className="pl-display" style={{ fontSize: 38, margin: 0 }}>Edital verticalizado.</h1>
          {planosDisponiveis.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Edital</span>
              <select
                value={planoSelecionado}
                onChange={(e) => setPlanoSelecionado(e.target.value)}
                className="pl-input"
                style={{ height: 30, fontSize: 12, paddingLeft: 10 }}
              >
                {planosDisponiveis.map((plano) => (
                  <option key={plano} value={plano}>{plano}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {hasEditalText && (
            <button
              type="button"
              className="pl-btn pl-btn-ai"
              onClick={handleAnalyzeEdital}
              disabled={aiLoading}
              style={{ opacity: aiLoading ? 0.7 : 1 }}
            >
              {aiLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
              {aiLoading ? 'Analisando…' : 'Analisar com IA'}
            </button>
          )}
          <button type="button" className="pl-btn pl-btn-ghost" onClick={() => setLinkModalOpen?.(true)}>
            <Calculator size={13} /> Links
          </button>
          <button type="button" className="pl-btn pl-btn-primary" onClick={() => setRegistroEstudoModalOpen?.(true)}>
            <Plus size={13} /> Adicionar estudo
          </button>
        </div>
      </div>

      <div className="pl-card" style={{ padding: 20 }}>
        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
          {[
            [BookOpen, 'Disciplinas', editalAtivo.length],
            [Layers, 'Tópicos', totTopicosEdital],
            [CheckCircle2, 'Concluídos', concTopicosEdital],
            [Target, 'Pendentes', topicosPendentes],
          ].map(([Icon, label, value]) => (
            <div key={label} className="pl-card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Icon size={12} style={{ color: 'var(--pl-ink-3)' }} />
                <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>{label}</span>
              </div>
              <div className="pl-num" style={{ fontSize: 24 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ padding: '14px 16px', background: 'var(--pl-bg-soft)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
            <div>
              <div className="pl-eyebrow" style={{ fontSize: 9.5, marginBottom: 3 }}>Progresso geral do edital</div>
              <div style={{ fontSize: 12.5, color: 'var(--pl-ink-3)' }}>
                {concTopicosEdital} de {totTopicosEdital} tópicos · {disciplinasConcluidas} disciplinas 100%
              </div>
            </div>
            <span className="pl-num" style={{ fontSize: 28 }}>{progGeralEdital || 0}%</span>
          </div>
          <div className="pl-progress">
            <div className="pl-progress-bar" style={{ width: `${Math.min(100, Math.max(0, progGeralEdital || 0))}%` }} />
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

      <div className="pl-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--pl-rule)', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)' }}>Disciplinas do edital</div>
            <div style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', marginTop: 3 }}>Expanda para marcar os tópicos.</div>
          </div>
          <span className="pl-tag pl-tag-ai" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Sparkles size={10} /> Progresso por tópico
          </span>
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
                    onClick={() => setExpandedEditalSubject(isExpanded ? null : disciplina.id)}
                    style={{
                      cursor: 'pointer', padding: '14px 20px', transition: 'background 0.12s',
                      background: isExpanded ? 'var(--pl-accent-soft)' : 'transparent',
                    }}
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
                          onClick={(e) => { e.stopPropagation(); setEditingDiscipline?.(disciplina); }}
                          className="pl-btn pl-btn-ghost"
                          style={{ width: 32, height: 32, padding: 0, justifyContent: 'center', flexShrink: 0 }}
                          title="Editar disciplina"
                        >
                          <Edit3 size={14} />
                        </button>

                        <div style={{
                          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 6, border: '1px solid', flexShrink: 0,
                          borderColor: isExpanded ? 'var(--pl-accent)' : 'var(--pl-rule-strong)',
                          background: isExpanded ? 'var(--pl-accent-soft)' : 'transparent',
                          color: isExpanded ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
                        }}>
                          <ChevronDown size={15} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
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

function AiMiniInfo({ label, value }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--pl-rule-strong)', background: 'var(--pl-surface)' }}>
      <div className="pl-eyebrow" style={{ fontSize: 9.5, marginBottom: 4, color: 'var(--pl-accent)' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{value}</div>
    </div>
  );
}
