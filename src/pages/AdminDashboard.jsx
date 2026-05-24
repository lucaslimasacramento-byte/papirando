import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Compass,
  Crown,
  EyeOff,
  FolderKanban,
  Headphones,
  Layers3,
  MessageSquareHeart,
  Network,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';
import { buildFinanceSnapshot, formatCurrency } from '../lib/adminFinance';
import { buildCrmSnapshot } from '../lib/adminCrm';
import { supabase } from '../lib/supabase';
import AdminPageHeader from '../components/AdminPageHeader';
import { CONTEST_STATUS_LABELS, normalizeContestStatus } from '../lib/contestGrouping';

const STATUS_LABELS = CONTEST_STATUS_LABELS;

export default function AdminDashboard({
  contestLibrary: contestLibraryProp = [],
  cursos: cursosProp = [],
  historicoReal: historicoRealProp = [],
  profiles: profilesProp = [],
  expenses: expensesProp = [],
  leads: leadsProp = [],
  setActiveTab,
}) {
  // Defensive: coerce every collection to an array even if parent passes null/undefined/non-array.
  const contestLibrary = Array.isArray(contestLibraryProp) ? contestLibraryProp : [];
  const cursos = Array.isArray(cursosProp) ? cursosProp : [];
  const historicoReal = Array.isArray(historicoRealProp) ? historicoRealProp : [];
  const profiles = Array.isArray(profilesProp) ? profilesProp : [];
  const expenses = Array.isArray(expensesProp) ? expensesProp : [];
  const leads = Array.isArray(leadsProp) ? leadsProp : [];

  const [realMetrics, setRealMetrics] = useState({
    totalUsers: 0,
    sessionsToday: 0,
    essaySubmissions: 0,
    activeQuestions: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRealMetrics() {
      setMetricsLoading(true);
      const today = new Date().toISOString().slice(0, 10);

      try {
        const [
          { count: totalUsers, error: usersError },
          { count: sessionsToday, error: sessionsError },
          { count: essaySubmissions, error: essaysError },
          { count: activeQuestions, error: questionsError },
        ] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('study_sessions').select('id', { count: 'exact', head: true }).eq('data', today),
          supabase.from('essay_submissions').select('id', { count: 'exact', head: true }),
          supabase.from('questions').select('id', { count: 'exact', head: true }).eq('is_public', true),
        ]);

        if (usersError) throw usersError;
        if (sessionsError) throw sessionsError;
        if (essaysError) throw essaysError;
        if (questionsError) throw questionsError;

        if (!cancelled) {
          setRealMetrics({
            totalUsers: Number(totalUsers || 0),
            sessionsToday: Number(sessionsToday || 0),
            essaySubmissions: Number(essaySubmissions || 0),
            activeQuestions: Number(activeQuestions || 0),
          });
        }
      } catch (error) {
        console.error('Erro ao carregar métricas reais do admin:', error);
        if (!cancelled) {
          setRealMetrics({
            totalUsers: 0,
            sessionsToday: 0,
            essaySubmissions: 0,
            activeQuestions: 0,
          });
        }
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    }

    loadRealMetrics();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => {
    const publicados = contestLibrary.filter((item) => item.is_public).length;
    const rascunhos = contestLibrary.filter((item) => !item.is_public).length;
    const semImagem = contestLibrary.filter((item) => !item.imagem_url).length;
    const semEdital = contestLibrary.filter((item) => !item.edital_url).length;
    const semProva = contestLibrary.filter((item) => !item.prova_data).length;
    const importadosCatalogo = cursos.filter((item) => item.origem === 'catalogo').length;
    const importadosIA = cursos.filter((item) => item.origem === 'ia').length;
    const totalChecks = semImagem + semEdital + semProva;
    const maxChecks = Math.max(contestLibrary.length * 3, 1);
    const healthScore = Math.max(0, Math.round(100 - (totalChecks / maxChecks) * 100));

    return {
      publicados,
      rascunhos,
      semImagem,
      semEdital,
      semProva,
      importadosCatalogo,
      importadosIA,
      sessoes: historicoReal.length,
      healthScore,
    };
  }, [contestLibrary, cursos, historicoReal]);

  const areas = useMemo(() => {
    const grouped = contestLibrary.reduce((acc, contest) => {
      const area = contest.area || 'Geral';
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [contestLibrary]);

  const topImported = useMemo(() => {
    const importsByPlan = cursos.reduce((acc, curso) => {
      const key = curso.plano || curso.nome;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return contestLibrary
      .map((contest) => ({
        ...contest,
        imports: importsByPlan[contest.plano] || importsByPlan[contest.nome] || 0,
      }))
      .sort((a, b) => b.imports - a.imports)
      .slice(0, 5);
  }, [contestLibrary, cursos]);

  const editorialBacklog = useMemo(() => {
    return contestLibrary
      .map((contest) => {
        const pendencias = [];
        if (!contest.imagem_url) pendencias.push('Sem imagem');
        if (!contest.edital_url) pendencias.push('Sem edital');
        if (!contest.prova_data) pendencias.push('Sem prova');
        return { ...contest, pendencias };
      })
      .filter((contest) => contest.pendencias.length > 0)
      .sort((a, b) => b.pendencias.length - a.pendencias.length)
      .slice(0, 6);
  }, [contestLibrary]);

  const recentCatalog = useMemo(() => contestLibrary.slice(0, 5), [contestLibrary]);
  const finance = useMemo(() => buildFinanceSnapshot(profiles, expenses), [profiles, expenses]);
  const crm = useMemo(() => buildCrmSnapshot(leads), [leads]);

  return (
    <div className="pl-page">
      <AdminPageHeader
        icon={Crown}
        badgeIcon={Crown}
        badge="Comando do site"
        title="Dashboard admin"
        subtitle="Resumo do produto, da biblioteca, da operação e dos gargalos principais para o lançamento."
        statsClassName="xl:grid-cols-5"
        stats={[
          {
            key: 'u',
            label: 'Usuários',
            value: metricsLoading ? '—' : String(realMetrics.totalUsers),
            icon: Users,
            accent: 'blue',
          },
          {
            key: 's',
            label: 'Sessões hoje',
            value: metricsLoading ? '—' : String(realMetrics.sessionsToday),
            icon: BookOpen,
            accent: 'indigo',
          },
          {
            key: 'e',
            label: 'Redações',
            value: metricsLoading ? '—' : String(realMetrics.essaySubmissions),
            icon: MessageSquareHeart,
            accent: 'violet',
          },
          {
            key: 'q',
            label: 'Questões',
            value: metricsLoading ? '—' : String(realMetrics.activeQuestions),
            icon: Layers3,
            accent: 'emerald',
          },
          {
            key: 'h',
            label: 'Saúde editorial',
            value: `${metrics.healthScore}%`,
            icon: Sparkles,
            accent: 'emerald',
          },
        ]}
      />

      <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Painel de ação</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Acessos rápidos do admin</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ActionCard icon={ShieldCheck} title="Biblioteca de concursos" text="Editar concurso, PDF, imagem, data e publicação." actionLabel="Abrir biblioteca" onClick={() => setActiveTab?.('admin_concursos')} />
            <ActionCard icon={Layers3} title="Banco de disciplinas" text="Manter disciplina padrão, nomes canônicos e estrutura base." actionLabel="Abrir disciplinas" onClick={() => setActiveTab?.('admin_disciplinas')} />
            <ActionCard icon={Users} title="Usuários e assinaturas" text="Revisar planos, limites e status da base ativa." actionLabel="Abrir usuários" onClick={() => setActiveTab?.('admin_usuarios')} />
            <ActionCard icon={WalletCards} title="Financeiro admin" text="Receita, despesas, saldo e estrutura de custos." actionLabel="Abrir financeiro" onClick={() => setActiveTab?.('admin_finance')} />
            <ActionCard icon={MessageSquareHeart} title="CRM comercial" text="Leads, oportunidades e conversão do funil." actionLabel="Abrir CRM" onClick={() => setActiveTab?.('admin_crm')} />
            <ActionCard
              icon={Headphones}
              title="Catálogo de audiolivros"
              text="Obras, faixas e URLs de áudio exibidas na área de audiolivros do app."
              actionLabel="Abrir catálogo"
              onClick={() => setActiveTab?.('admin_audiolivros')}
            />
            <ActionCard
              icon={Network}
              title="Galeria de mapas mentais"
              text="Modelos prontos que aparecem na página Mapas mentais para todos copiarem e editarem."
              actionLabel="Gerir galeria"
              onClick={() => setActiveTab?.('admin_mapas_mentais')}
            />
            <ActionCard
              icon={Scale}
              title="Legislação (Vade Mecum)"
              text="PDF base, edição e metadados exibidos na área Legislação do app."
              actionLabel="Abrir legislação admin"
              onClick={() => setActiveTab?.('admin_legislacao')}
            />
            <ActionCard icon={Compass} title="Configurações do produto" text="XP, níveis, selos e regras administráveis em uma área própria." actionLabel="Abrir configurações" onClick={() => setActiveTab?.('admin_configuracoes')} />
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Adoção e demanda</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Mais importados e áreas fortes</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_0.9fr]">
            <div className="space-y-3">
              {topImported.map((contest) => (
                <div key={contest.id} className="rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{contest.nome}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-500">{contest.area || 'Geral'} · {contest.cargo || contest.concurso}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-slate-900">{contest.imports}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Importações</p>
                    </div>
                  </div>
                </div>
              ))}
              {topImported.length === 0 && <EmptyState text="Ainda não há importações suficientes para montar esse ranking." />}
            </div>

            <div className="space-y-3">
              {areas.map(([area, count]) => (
                <div key={area} className="rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <p className="font-semibold text-slate-900">{area}</p>
                    <span className="text-lg font-semibold text-slate-900">{count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.round((count / Math.max(contestLibrary.length, 1)) * 100))}%` }} />
                  </div>
                </div>
              ))}
              {areas.length === 0 && <EmptyState text="Sem concursos publicados ainda para montar o mapa por área." />}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr]">
        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Backlog editorial</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Concursos que pedem ação rápida</h3>
          </div>

          <div className="space-y-4">
            {editorialBacklog.map((contest) => (
              <div key={contest.id} className="rounded-[1.5rem] border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{contest.nome}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-500">{contest.area || 'Geral'} · {contest.cargo || contest.concurso}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {contest.pendencias.map((item) => (
                        <span key={item} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab?.('admin_concursos')}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600"
                  >
                    Resolver no editor
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
            {editorialBacklog.length === 0 && <EmptyState text="A biblioteca está redonda. Nenhuma pendência editorial crítica encontrada." />}
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Resumo executivo</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Produto, receita e aquisição</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <OpsCard icon={BookOpen} label="Cursos por IA" value={metrics.importadosIA} />
            <OpsCard icon={FolderKanban} label="Cursos de catálogo" value={metrics.importadosCatalogo} />
            <OpsCard icon={WalletCards} label="Receita recorrente" value={formatCurrency(finance.receitaRecorrente)} />
            <OpsCard icon={Users} label="Leads abertos" value={crm.emContato} />
          </div>

          <div className="mt-6 space-y-3">
            {recentCatalog.map((contest) => (
              <div key={contest.id} className="rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{contest.nome}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-500">
                      {STATUS_LABELS[normalizeContestStatus(contest.status_concurso)] || 'Previsto'} · {contest.prova_data || 'Sem data'}
                    </p>
                  </div>
                  <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-500">
                    {contest.area || 'Geral'}
                  </span>
                </div>
              </div>
            ))}
            {recentCatalog.length === 0 && <EmptyState text="Nenhum concurso cadastrado ainda." />}
          </div>
        </section>
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, text, actionLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[1.6rem] border border-gray-200 bg-gray-50/70 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        <Icon size={20} />
      </div>
      <p className="mt-4 text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-gray-500">{text}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
        {actionLabel}
        <ArrowRight size={15} />
      </div>
    </button>
  );
}

function OpsCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-gray-50/70 px-4 py-5 text-sm font-semibold text-gray-500">
      {text}
    </div>
  );
}


