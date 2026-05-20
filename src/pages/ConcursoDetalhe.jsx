import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Compass,
  DollarSign,
  ExternalLink,
  GraduationCap,
  Heart,
  Layers3,
  LibraryBig,
  Plus,
  Users,
} from 'lucide-react';

const STATUS_LABELS = {
  confirmado: 'Confirmado',
  previsto: 'Previsto',
  suspeito: 'Em análise',
  suspenso: 'Suspenso',
  encerrado: 'Encerrado',
};

const STAGE_LABELS = {
  prova_objetiva: 'Prova objetiva',
  prova_discursiva: 'Prova discursiva',
  redacao: 'Redação',
  taf: 'TAF',
  avaliacao_psicologica: 'Avaliação psicológica',
  investigacao_social: 'Investigação social',
  exames_medicos: 'Exames médicos',
  toxicologico: 'Exame toxicológico',
  heteroidentificacao: 'Heteroidentificação',
  curso_formacao: 'Curso de formação',
};

export default function ConcursoDetalhe({
  contest,
  onBack,
  onImport,
  onToggleFavorite,
  onToggleInterested,
  onOpenDisciplinas,
  contestTracker = {},
  onToggleContestTask,
  isTargetContest = false,
  onSetTargetContest,
  importingId = '',
  limiteAtingido = false,
  cursos = [],
  bancoDisciplinas = [],
  isFavorite = false,
  isInterested = false,
}) {
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setImageError(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [contest?.id, contest?.imagem_url]);

  const topicosCount = useMemo(
    () =>
      (contest?.disciplinas || []).reduce(
        (acc, subject) => acc + (subject.topicos?.length || 0),
        0
      ),
    [contest]
  );

  const courseMatches = useMemo(() => {
    if (!contest) return [];

    return cursos.filter(
      (curso) =>
        curso.plano === contest.plano ||
        curso.nome === contest.nome ||
        curso.concurso === contest.concurso
    );
  }, [contest, cursos]);

  const startedSubjectsCount = useMemo(() => {
    if (!courseMatches.length) return 0;
    const planNames = new Set(courseMatches.map((curso) => curso.plano));
    return bancoDisciplinas.filter(
      (disciplina) =>
        planNames.has(disciplina.plano) &&
        ((disciplina.topicos || []).some((topico) => topico.concluido || topico.acertos || topico.erros) ||
          Number(disciplina.percentual || 0) > 0)
    ).length;
  }, [bancoDisciplinas, courseMatches]);

  const contestMoment = useMemo(() => {
    if (!contest) return null;

    if (contest.status_concurso === 'suspenso') {
      return {
        title: 'Concurso suspenso',
        text: 'Esse edital está suspenso no momento. Vale acompanhar atualizações antes de montar um plano pesado.',
        tone: 'amber',
      };
    }

    if (contest.status_concurso === 'encerrado') {
      return {
        title: 'Concurso encerrado',
        text: 'Esse concurso está encerrado e hoje serve mais como referência de estrutura e histórico.',
        tone: 'gray',
      };
    }

    if (contest.prova_data) {
      const provaDate = new Date(`${contest.prova_data}T00:00:00`);
      const today = new Date();
      const diffDays = Math.ceil((provaDate.getTime() - today.getTime()) / 86400000);

      if (diffDays >= 0 && diffDays <= 45) {
        return {
          title: 'Janela de prova próxima',
          text: `Faltam cerca de ${diffDays} dia(s) para a prova. Esse é o momento de priorizar revisão, questões e pontos de alto impacto.`,
          tone: 'red',
        };
      }
    }

    return {
      title: 'Bom momento para organizar',
      text: 'Esse concurso parece estar em uma fase útil para planejamento, estruturação das disciplinas e montagem do ciclo.',
      tone: 'blue',
    };
  }, [contest]);

  const contestAlerts = useMemo(() => {
    if (!contest) return [];

    const alerts = [];

    if (contest.status_concurso === 'suspenso') {
      alerts.push({
        title: 'Edital suspenso',
        text: 'Acompanhe retificações e novas publicações antes de acelerar o planejamento.',
        tone: 'amber',
      });
    }

    if (contest.prova_data) {
      const provaDate = new Date(`${contest.prova_data}T00:00:00`);
      const today = new Date();
      const diffDays = Math.ceil((provaDate.getTime() - today.getTime()) / 86400000);

      if (diffDays >= 0 && diffDays <= 60) {
        alerts.push({
          title: 'Prova no radar',
          text: `Faltam ${diffDays} dia(s) para a prova. Vale concentrar revisão, questões e simulados.`,
          tone: diffDays <= 30 ? 'red' : 'blue',
        });
      }
    } else {
      alerts.push({
        title: 'Data da prova pendente',
        text: 'Ainda não há uma data cadastrada. Bom momento para estruturar base e acompanhar retificações.',
        tone: 'gray',
      });
    }

    if (contest.edital_url) {
      alerts.push({
        title: 'Edital disponível',
        text: 'O PDF oficial já está anexado e pode ser consultado a qualquer momento.',
        tone: 'green',
      });
    }

    return alerts.slice(0, 3);
  }, [contest]);

  const formatDateBR = (value) => {
    if (!value) return 'Sem data';
    const [year, month, day] = String(value).split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return value;
  };

  const formatCurrencyBR = (value) => {
    const cleaned = String(value || '').trim();
    if (!cleaned) return 'A definir';

    const numeric = Number(cleaned.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) return 'A definir';

    return numeric.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const agendaItems = [
    {
      label: 'Status do concurso',
      value: STATUS_LABELS[contest?.status_concurso] || 'Em análise',
    },
    {
      label: 'Data da prova',
      value: formatDateBR(contest?.prova_data),
    },
    {
      label: 'Valor da inscrição',
      value: formatCurrencyBR(contest?.inscricao_valor),
    },
    {
      label: 'Etapas mapeadas',
      value:
        contest?.etapas_tags?.length > 0
          ? `${contest.etapas_tags.length} etapa(s)`
          : contest?.etapas || 'A definir',
    },
  ];

  const actionChecklist = [
    {
      key: 'edital_lido',
      label: 'Ler o edital completo',
      hint: 'Marque quando já tiver passado pelos pontos principais do PDF.',
      done: Boolean(contestTracker.edital_lido),
    },
    {
      key: 'prova_no_calendario',
      label: 'Colocar a prova no calendário',
      hint: 'Serve para não perder datas importantes e ajustar o ciclo.',
      done: Boolean(contestTracker.prova_no_calendario),
    },
    {
      key: 'inscricao_planejada',
      label: 'Planejar a inscrição',
      hint: 'Separe valor, prazo e documentos necessários.',
      done: Boolean(contestTracker.inscricao_planejada),
    },
    {
      key: 'taf_em_preparacao',
      label: 'Iniciar preparação das etapas físicas',
      hint: 'Ative quando esse concurso tiver TAF ou etapas práticas.',
      done: Boolean(contestTracker.taf_em_preparacao),
      hidden: !contest?.etapas_tags?.includes('taf'),
    },
    {
      key: 'simulados_planejados',
      label: 'Reservar bloco de simulados',
      hint: 'Ajuda a transformar o edital em rotina de execução.',
      done: Boolean(contestTracker.simulados_planejados),
    },
  ].filter((item) => !item.hidden);

  const checklistDoneCount = actionChecklist.filter((item) => item.done).length;

  if (!contest) {
    return (
      <div className="pl-paper-bg" style={{ display: 'flex', minHeight: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, textAlign: 'center', padding: 40 }}>
        <div className="pl-eyebrow">Concurso</div>
        <h2 className="pl-display" style={{ fontSize: 30 }}>Nenhum concurso selecionado.</h2>
        <button type="button" className="pl-btn pl-btn-primary" onClick={onBack}>
          <ArrowLeft size={13} /> Voltar para concursos
        </button>
      </div>
    );
  }

  return (
    <div className="pl-paper-bg" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '28px 28px 56px' }}>
      {/* Top nav */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <button type="button" className="pl-btn pl-btn-ghost" onClick={onBack}>
          <ArrowLeft size={13} /> Voltar
        </button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button type="button" className="pl-btn pl-btn-ghost" style={{ color: isFavorite ? 'var(--pl-danger)' : undefined }} onClick={() => onToggleFavorite?.(contest.id)}>
            <Heart size={13} style={{ fill: isFavorite ? 'currentColor' : 'none' }} />
            {isFavorite ? 'Favoritado' : 'Favoritar'}
          </button>
          <button type="button" className="pl-btn pl-btn-ghost" style={{ color: isInterested ? 'var(--pl-warn)' : undefined }} onClick={() => onToggleInterested?.(contest.id)}>
            <Bookmark size={13} style={{ fill: isInterested ? 'currentColor' : 'none' }} />
            {isInterested ? 'Quero estudar' : 'Marcar interesse'}
          </button>
          <button type="button" className="pl-btn pl-btn-ghost" onClick={() => onSetTargetContest?.(contest.id)}>
            <BadgeCheck size={13} />
            {isTargetContest ? 'Concurso alvo' : 'Definir como alvo'}
          </button>
          {contest.edital_url && (
            <button type="button" className="pl-btn pl-btn-ghost" onClick={() => window.open(contest.edital_url, '_blank', 'noopener,noreferrer')}>
              Edital <ExternalLink size={11} />
            </button>
          )}
          <button type="button" className="pl-btn pl-btn-primary" onClick={() => onImport?.(contest)} disabled={importingId === contest.id || limiteAtingido} style={{ opacity: (importingId === contest.id || limiteAtingido) ? 0.6 : 1 }}>
            {limiteAtingido ? 'Limite atingido' : importingId === contest.id ? 'Importando…' : 'Adicionar aos meus cursos'}
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      <section className="pl-card">
        <div className="grid gap-0 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="border-b border-gray-100 bg-gray-50 xl:border-b-0 xl:border-r">
            {contest.imagem_url && !imageError ? (
              <img
                src={contest.imagem_url}
                alt={contest.nome}
                onError={() => setImageError(true)}
                className="h-full min-h-[260px] w-full object-contain bg-white p-6"
              />
            ) : (
              <div
                className="flex min-h-[260px] w-full items-center justify-center text-white"
                style={{ background: `linear-gradient(135deg, ${contest.cor || '#2563eb'} 0%, #1e3a8a 100%)` }}
              >
                <LibraryBig size={56} />
              </div>
            )}
          </div>

          <div className="p-6 lg:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{contest.area || 'Geral'}</Badge>
              <Badge tone="green">{STATUS_LABELS[contest.status_concurso] || 'Em análise'}</Badge>
            </div>

            <h1 className="pl-display" style={{ fontSize: 30, marginTop: 12, marginBottom: 0 }}>{contest.nome}</h1>
            <p className="mt-2 text-base font-semibold text-gray-500">{contest.cargo || contest.concurso}</p>
            <p className="mt-1 text-sm font-medium text-gray-500">{contest.banca || 'Banca a definir'}</p>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatBox label="Prova" value={formatDateBR(contest.prova_data)} icon={CalendarDays} />
              <StatBox label="Salário" value={formatCurrencyBR(contest.salario)} icon={DollarSign} />
              <StatBox label="Inscrição" value={formatCurrencyBR(contest.inscricao_valor)} icon={DollarSign} />
              <StatBox label="Nível" value={contest.escolaridade || 'A definir'} icon={GraduationCap} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatBox label="Disciplinas" value={String(contest.disciplinas?.length || 0)} icon={Layers3} />
              <StatBox label="Tópicos" value={String(topicosCount)} icon={BadgeCheck} />
              <StatBox label="Vagas" value={contest.vagas || 'A definir'} icon={Users} />
              <StatBox label="Lotação" value={contest.lotacao || 'A definir'} icon={Compass} />
            </div>

            {contest.descricao && (
              <div className="mt-6 rounded-[1.5rem] border border-gray-200 bg-gray-50/70 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Resumo</p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">{contest.descricao}</p>
              </div>
            )}

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <StatusPanel
                label="Já importado"
                value={courseMatches.length > 0 ? `${courseMatches.length} curso(s)` : 'Ainda não'}
                tone={courseMatches.length > 0 ? 'blue' : 'gray'}
              />
              <StatusPanel
                label="Disciplinas iniciadas"
                value={String(startedSubjectsCount)}
                tone={startedSubjectsCount > 0 ? 'green' : 'gray'}
              />
              <StatusPanel
                label="Interesse"
                value={isInterested ? 'Na sua mira' : 'Ainda não marcado'}
                tone={isInterested ? 'amber' : 'gray'}
              />
            </div>

            {contestMoment && (
              <div className={`mt-6 rounded-[1.5rem] border p-5 ${momentToneClasses[contestMoment.tone] || momentToneClasses.blue}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">Momento do concurso</p>
                <p className="mt-3 text-lg font-semibold">{contestMoment.title}</p>
                <p className="mt-2 text-sm font-medium leading-relaxed">{contestMoment.text}</p>
              </div>
            )}

            {courseMatches.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => onOpenDisciplinas?.(contest)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600"
                >
                  Abrir disciplinas desse concurso
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="pl-card">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Estrutura do edital</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Disciplinas e tópicos</h2>
            </div>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-500">
              {contest.disciplinas?.length || 0} disciplinas
            </span>
          </div>

          <div className="space-y-3">
            {(contest.disciplinas || []).map((disciplina) => {
              const isExpanded = Boolean(expandedSubjects[disciplina.nome]);
              return (
                <div key={disciplina.nome} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{disciplina.nome}</p>
                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        {disciplina.topicos?.length || 0} tópicos mapeados
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSubjects((prev) => ({
                          ...prev,
                          [disciplina.nome]: !prev[disciplina.nome],
                        }))
                      }
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600"
                    >
                      <Plus size={16} className={`transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                      {(disciplina.topicos || []).length > 0 ? (
                        (disciplina.topicos || []).map((topico) => (
                          <div
                            key={topico.id || topico.nome}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
                          >
                            {topico.nome}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500">
                          Nenhum tópico detalhado ainda.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="pl-card">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Etapas e contexto</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Leitura rápida</h2>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <InfoCard label="Banca" value={contest.banca || 'A definir'} />
            <InfoCard label="Concurso" value={contest.concurso || contest.nome} />
            <InfoCard label="Cargo" value={contest.cargo || 'A definir'} />
            <InfoCard label="Área" value={contest.area || 'Geral'} />
          </div>

          {contestAlerts.length > 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Alertas do concurso</p>
              <div className="mt-4 space-y-3">
                {contestAlerts.map((alert) => (
                  <div
                    key={alert.title}
                    className={`rounded-[1.1rem] border px-4 py-4 ${momentToneClasses[alert.tone] || momentToneClasses.blue}`}
                  >
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="mt-1 text-sm font-medium leading-relaxed">{alert.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Agenda essencial</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {agendaItems.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{item.label}</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Próximos passos</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Checklist de acompanhamento</p>
              </div>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                {checklistDoneCount}/{actionChecklist.length} concluído(s)
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {actionChecklist.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onToggleContestTask?.(contest.id, item.key)}
                  className={`flex w-full items-start justify-between gap-4 rounded-xl border px-4 py-4 text-left transition-all ${
                    item.done
                      ? 'border-emerald-100 bg-emerald-50'
                      : 'border-slate-200 bg-slate-50/70 hover:border-blue-200 hover:bg-blue-50/60'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${item.done ? 'text-emerald-700' : 'text-slate-900'}`}>{item.label}</p>
                    <p className="mt-1 text-sm font-medium text-gray-500">{item.hint}</p>
                  </div>
                  <span
                    className={`mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-2 text-xs font-semibold ${
                      item.done
                        ? 'border-emerald-200 bg-white text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-400'
                    }`}
                  >
                    {item.done ? 'OK' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {(contest.etapas || contest.etapas_tags?.length > 0) && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Etapas</p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">
                {contest.etapas || 'Etapas não detalhadas.'}
              </p>

              {contest.etapas_tags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {contest.etapas_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
                    >
                      {STAGE_LABELS[tag] || tag}
                    </span>
                  ))}
                </div>
              )}

              {contest.taf_itens?.length > 0 && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Itens do TAF</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {contest.taf_itens.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white bg-white px-3 py-1 text-xs font-bold text-gray-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Badge({ children }) {
  return <span className="pl-tag" style={{ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{children}</span>;
}

function StatBox({ label, value, icon: Icon }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--pl-rule-strong)', background: 'var(--pl-bg-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon size={12} style={{ color: 'var(--pl-ink-3)' }} />
        <span className="pl-eyebrow" style={{ fontSize: 9 }}>{label}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>{value}</div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--pl-rule-strong)', background: 'var(--pl-bg-soft)' }}>
      <div className="pl-eyebrow" style={{ fontSize: 9, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{value}</div>
    </div>
  );
}

function StatusPanel({ label, value, tone = 'gray' }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid var(--pl-rule-strong)', background: 'var(--pl-bg-soft)' }}>
      <div className="pl-eyebrow" style={{ fontSize: 9, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{value}</div>
    </div>
  );
}

const momentToneClasses = {
  blue: 'border-blue-100 bg-blue-50 text-blue-700',
  amber: 'border-amber-100 bg-amber-50 text-amber-700',
  red: 'border-red-100 bg-red-50 text-red-700',
  green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  gray: 'border-gray-200 bg-gray-50 text-gray-700',
};
