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
  Pencil,
  Plus,
  Users,
} from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';
import {
  buildContestForRole,
  CONTEST_STATUS_LABELS,
  findRelatedContests,
  getContestRoles,
  getPrimaryContestRole,
  normalizeContestStatus,
} from '../lib/contestGrouping';
import { getContestAreaTheme } from '../lib/contestAreaTheme';

const STATUS_LABELS = CONTEST_STATUS_LABELS;

const STAGE_LABELS = {
  prova_objetiva: 'Prova objetiva',
  prova_discursiva: 'Prova discursiva',
  avaliacao_curricular: 'AvaliaÃ§Ã£o curricular',
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
  contest: rawContest,
  onBack,
  onImport,
  onToggleFavorite,
  onToggleInterested,
  onOpenDisciplinas,
  onOpenRelatedContest,
  contestTracker = {},
  onToggleContestTask,
  isTargetContest = false,
  onSetTargetContest,
  importingId = '',
  limiteAtingido = false,
  cursos = [],
  concursoCatalog = [],
  bancoDisciplinas = [],
  isAdmin = false,
  isFavorite = false,
  isInterested = false,
  onEditContest,
}) {
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [imageError, setImageError] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const roles = useMemo(() => getContestRoles(rawContest || {}), [rawContest]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const activeRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || getPrimaryContestRole(rawContest || {}),
    [roles, selectedRoleId, rawContest]
  );
  const contest = useMemo(() => {
    if (!rawContest) return null;
    return buildContestForRole(rawContest, activeRole);
  }, [rawContest, activeRole]);
  const normalizedStatus = normalizeContestStatus(contest?.status_concurso);
  const areaTheme = useMemo(() => getContestAreaTheme(contest?.area || 'Geral'), [contest?.area]);
  const headStyle = useMemo(() => ({
    '--page-head-accent-start': areaTheme.accentStart,
    '--page-head-accent-end': areaTheme.accentEnd,
    '--page-head-accent-shadow': areaTheme.accentShadow,
    '--page-head-dark': areaTheme.dark,
    '--page-head-dark-soft': areaTheme.darkSoft,
  }), [areaTheme]);
  const relatedContests = useMemo(
    () => findRelatedContests(concursoCatalog, rawContest || {}),
    [concursoCatalog, rawContest]
  );

  useEffect(() => {
    setSelectedRoleId(getPrimaryContestRole(rawContest || {})?.id || '');
    setExpandedSubjects({});
  }, [rawContest?.id]);

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

    if (normalizedStatus === 'homologado') {
      return {
        title: 'Concurso homologado',
        text: 'Esse concurso já teve resultado final homologado e hoje serve mais como referência de estrutura e histórico.',
        tone: 'gray',
      };
    }

    if (['inscricoes_abertas', 'prova_marcada', 'em_andamento'].includes(normalizedStatus)) {
      return {
        title: 'Concurso ativo',
        text: 'Esse concurso já exige atenção a prazos, prova e execução do plano de estudos.',
        tone: 'blue',
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
  }, [contest, normalizedStatus]);

  const contestAlerts = useMemo(() => {
    if (!contest) return [];

    const alerts = [];

    if (['previsto', 'autorizado', 'comissao_formada', 'banca_em_definicao', 'banca_definida', 'edital_iminente'].includes(normalizedStatus)) {
      alerts.push({
        title: STATUS_LABELS[normalizedStatus] || 'Fase inicial',
        text: 'Use essa fase para construir base e acompanhar as próximas publicações do órgão.',
        tone: 'blue',
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
  }, [contest, normalizedStatus]);

  const formatDateBR = (value) => {
    if (!value) return 'Sem data';
    const [year, month, day] = String(value).split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return value;
  };

  const formatCurrencyBR = (value) => {
    const cleaned = String(value || '').trim();
    if (!cleaned) return 'A definir';
    if (/\s+a\s+R\$/i.test(cleaned)) return cleaned;

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
      value: STATUS_LABELS[normalizedStatus] || 'Previsto',
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
  const logoSrc = contest?.imagem_url && !imageError ? contest.imagem_url : '';

  if (!contest) {
    return (
      <div className="page-shell min-h-full items-center justify-center text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Concurso</p>
        <h2 className="text-3xl font-semibold text-slate-900">Nenhum concurso selecionado</h2>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl bg-[#185FA5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0C447C]"
        >
          <ArrowLeft size={16} />
          Voltar para concursos
        </button>
      </div>
    );
  }

  return (
    <div className="page-shell flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:text-blue-700"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => onEditContest?.(rawContest || contest)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100"
          >
            <Pencil size={14} />
            Admin: editar
          </button>
        ) : null}
      </div>
      <PageHeadPremium
        className="!min-h-[150px] !overflow-hidden !px-5 !py-5 sm:!min-h-[165px] sm:!px-6 sm:!py-6"
        style={headStyle}
        icon={LibraryBig}
        iconTileClassName={logoSrc ? '!h-24 !w-24 !rounded-none !border-transparent !bg-none !bg-transparent !p-0 !shadow-none !ring-0 sm:!h-32 sm:!w-32 lg:!h-36 lg:!w-36' : '!h-16 !w-16 sm:!h-[4.5rem] sm:!w-[4.5rem]'}
        iconSlot={logoSrc ? (
          <img
            src={logoSrc}
            alt=""
            onError={() => setImageError(true)}
            className="h-full w-full object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.28)]"
            aria-hidden
          />
        ) : null}
        badge={
          <PageHeadPremiumBadge icon={Compass}>Concurso</PageHeadPremiumBadge>
        }
        title={contest.nome}
        titleAs="h1"
        subtitle={`${contest.cargo || contest.concurso} · ${contest.banca || 'Banca a definir'}`}
        leadingClassName="min-w-0 flex-1 xl:flex-[1.15]"
        leadingExtra={(
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
              {contest.area || 'Geral'}
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
              {STATUS_LABELS[normalizedStatus] || 'Previsto'}
            </span>
          </div>
        )}
        statGridClassName="hidden"
        stats={[
          { key: 'pr', label: 'Prova', value: formatDateBR(contest.prova_data), icon: CalendarDays, accent: 'blue', valueClassName: '!text-sm sm:!text-base' },
          { key: 'sl', label: 'Salário', value: formatCurrencyBR(contest.salario), icon: DollarSign, accent: 'emerald' },
          { key: 'di', label: 'Disciplinas', value: String(contest.disciplinas?.length || 0), icon: Layers3, accent: 'indigo' },
          { key: 'tp', label: 'Tópicos', value: String(topicosCount), icon: BadgeCheck, accent: 'violet' },
        ]}
        trailingClassName="max-w-full"
        trailingWrapClassName="xl:max-w-[42rem]"
        trailing={(
          <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 xl:justify-end">
            <button
              type="button"
              onClick={() => onToggleFavorite?.(contest.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold sm:text-sm ${
                isFavorite
                  ? 'border-rose-300/50 bg-rose-500/20 text-rose-100'
                  : 'border-white/20 bg-white/5 text-slate-100'
              }`}
            >
              <Heart size={14} className={isFavorite ? 'fill-current' : ''} />
              {isFavorite ? 'Favoritado' : 'Favoritar'}
            </button>
            <button
              type="button"
              onClick={() => onToggleInterested?.(contest.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold sm:text-sm ${
                isInterested
                  ? 'border-amber-300/50 bg-amber-500/20 text-amber-100'
                  : 'border-white/20 bg-white/5 text-slate-100'
              }`}
            >
              <Bookmark size={14} className={isInterested ? 'fill-current' : ''} />
              {isInterested ? 'Quero estudar' : 'Interesse'}
            </button>
            <button
              type="button"
              onClick={() => onSetTargetContest?.(contest.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold sm:text-sm ${
                isTargetContest
                  ? 'border-yellow-300/50 bg-yellow-500/20 text-yellow-100'
                  : 'border-white/20 bg-white/5 text-slate-100'
              }`}
            >
              <BadgeCheck size={14} className={isTargetContest ? 'fill-current' : ''} />
              {isTargetContest ? 'Alvo' : 'Como alvo'}
            </button>
            <button
              type="button"
              onClick={() => setImportConfirmOpen(true)}
              disabled={importingId === contest.id || limiteAtingido}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#185FA5] px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-950/20 hover:bg-[#0C447C] disabled:opacity-60 sm:px-4 sm:text-sm"
            >
              {limiteAtingido ? 'Limite' : importingId === contest.id ? '...' : 'Adicionar aos estudos'}
              <ArrowRight size={14} />
            </button>
            {contest.edital_url ? (
              <button
                type="button"
                onClick={() => window.open(contest.edital_url, '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-bold text-slate-100 sm:text-sm"
              >
                Edital
                <ExternalLink size={14} />
              </button>
            ) : null}
          </div>
        )}
      />

      {importConfirmOpen ? (
        <ImportContestModal
          contest={contest}
          isLoading={importingId === contest.id}
          limiteAtingido={limiteAtingido}
          onCancel={() => setImportConfirmOpen(false)}
          onConfirm={() => {
            onImport?.(contest);
            setImportConfirmOpen(false);
          }}
        />
      ) : null}

      {roles.length > 1 && (
        <section className="relative z-10 overflow-visible rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-[1.5rem] bg-gradient-to-r from-blue-500/30 via-blue-500/10 to-transparent" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Cargos do concurso</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Escolha o cargo para ver o edital correto</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-gray-500">
                Disciplinas, vagas, salário e lotação acompanham a opção selecionada.
              </p>
            </div>
            <span className="w-fit shrink-0 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              {roles.length} cargos cadastrados
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => {
              const selected = activeRole?.id === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`min-h-[155px] rounded-[1.25rem] border p-4 text-left transition-all ${
                    selected
                      ? 'border-blue-300 bg-blue-50 shadow-[0_16px_34px_rgba(37,99,235,0.14)]'
                      : 'border-slate-200 bg-slate-50/60 hover:border-blue-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base font-bold leading-snug text-slate-950">{role.nome}</p>
                    <span className={`mt-0.5 h-3 w-3 rounded-full ${selected ? 'bg-blue-600' : 'bg-slate-300'}`} />
                  </div>
                  <div className="mt-4 grid gap-2 text-[11px] font-bold sm:grid-cols-2">
                    {role.salario && <CargoInfo label="Salário" value={role.salario} tone="green" />}
                    {role.vagas && <CargoInfo label="Vagas" value={role.vagas} />}
                    {role.escolaridade && <CargoInfo label="Nível" value={role.escolaridade} tone="blue" />}
                    {role.lotacao && <CargoInfo label="Lotação" value={role.lotacao} />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {relatedContests.length > 0 && (
        <section className="relative z-10 rounded-[1.5rem] border border-blue-100 bg-blue-50/50 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">Concursos relacionados</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Outros editais da mesma instituição</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Assim Oficial, Praça, PM e Bombeiros ficam vinculados, mas sem virar cargo um do outro.
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {relatedContests.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenRelatedContest?.(item)}
                className="rounded-2xl border border-blue-100 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm"
              >
                <p className="line-clamp-2 text-sm font-bold text-slate-950">{item.nome}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">{item.cargo || item.banca || 'Concurso relacionado'}</p>
                <span className="mt-3 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                  {STATUS_LABELS[normalizeContestStatus(item.status_concurso)] || 'Previsto'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="section-card overflow-hidden p-0">
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatBox label="Inscrição" value={formatCurrencyBR(contest.inscricao_valor)} icon={DollarSign} />
              <StatBox label="Nível" value={contest.escolaridade || 'A definir'} icon={GraduationCap} />
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
        <section className="section-card p-6">
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

        <section className="section-card p-6">
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

function CargoInfo({ label, value, tone = 'slate' }) {
  const toneClasses = {
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    slate: 'bg-white text-slate-700',
  };

  return (
    <div className={`rounded-xl px-3 py-2 ${toneClasses[tone] || toneClasses.slate}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.16em] opacity-60">{label}</p>
      <p className="mt-1 break-words text-xs font-black leading-snug">{value}</p>
    </div>
  );
}

function ImportContestModal({ contest, isLoading, limiteAtingido, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-6 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-200">Adicionar aos estudos</p>
          <h3 className="mt-2 text-2xl font-bold leading-tight">{contest?.nome || 'Concurso selecionado'}</h3>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-300">
            Isso cria um curso na sua área de estudos com as disciplinas, tópicos e dados do edital.
          </p>
        </div>
        <div className="space-y-4 px-6 py-5">
          {limiteAtingido ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Seu limite de cursos foi atingido. Remova algum curso ou ajuste seu plano antes de adicionar este concurso.
            </div>
          ) : (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
              Depois de adicionar, você encontra esse concurso em Meus cursos e pode estudar pelo edital verticalizado.
            </div>
          )}
          <div className="grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Banca: {contest?.banca || 'A definir'}</span>
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">Área: {contest?.area || 'Geral'}</span>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading || limiteAtingido}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-700 disabled:opacity-70"
            >
              {isLoading ? 'Adicionando...' : 'Adicionar agora'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[1.2rem] border border-gray-200 bg-gray-50/70 p-4">
      <div className="flex items-center gap-2 text-gray-400">
        <Icon size={14} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-3 text-lg font-semibold text-[#0C447C]">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-[1.2rem] border border-gray-200 bg-gray-50/70 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-bold text-[#0C447C]">{value}</p>
    </div>
  );
}

function StatusPanel({ label, value, tone = 'gray' }) {
  const toneClasses = {
    gray: 'border-gray-200 bg-gray-50 text-gray-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
  };

  return (
    <div className={`rounded-[1.2rem] border p-4 ${toneClasses[tone] || toneClasses.gray}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
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
