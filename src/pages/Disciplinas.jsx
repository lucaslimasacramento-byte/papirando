import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { canonicalizeSubjectName } from '../lib/subjectCatalogUtils';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Clock3,
  Edit3,
  Trash2,
  ArrowUpRight,
  Filter,
  BarChart3,
  TrendingUp,
  BrainCircuit,
  AlertTriangle,
  Flame,
  Crosshair,
  Layers,
} from 'lucide-react';
import PageHeadPremium, {
  PageHeadPremiumBadge,
  PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS,
  PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS,
} from '../components/PageHeadPremium';

/** Tom primário alinhado ao design system (`btn-primary` = blue-700). */
const DISCIPLINE_ACCENT_FALLBACK = '#1d4ed8';

export default function Disciplinas({
  bancoDisciplinas = [],
  setBancoDisciplinas,
  setEditingDiscipline,
  setViewingDiscipline,
  setRegistroEstudoModalOpen,
  subjectCatalog = [],
  forcedPlanoFiltro = 'Todos',
}) {
  const [query, setQuery] = useState('');
  const [planoFiltro, setPlanoFiltro] = useState('Todos');
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false);

  useEffect(() => {
    if (!setBancoDisciplinas) return;

    const fetchDisciplinas = async () => {
      setLoadingDisciplinas(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          setBancoDisciplinas([]);
          return;
        }

        const { data: subjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (subjectsError) throw subjectsError;

        if (!subjects || subjects.length === 0) {
          setBancoDisciplinas([]);
          return;
        }

        const subjectIds = subjects.map((subject) => subject.id);

        const { data: topics, error: topicsError } = await supabase
          .from('topics')
          .select('*')
          .in('subject_id', subjectIds)
          .order('ordem', { ascending: true });

        if (topicsError) throw topicsError;

        const disciplinasFormatadas = (subjects || []).map((subject) => {
          const topicosDaDisciplina = (topics || []).filter((topic) => topic.subject_id === subject.id);
          const concluidos = topicosDaDisciplina.filter((t) => t.concluido).length;
          const totalTopicos = topicosDaDisciplina.length;
          const percentualCalculado =
            totalTopicos > 0 ? Math.round((concluidos / totalTopicos) * 100) : subject.percentual || 0;

          const tempoMin = Number(subject.tempo_total_min || 0);
          const horas = Math.floor(tempoMin / 60);
          const minutos = tempoMin % 60;

          return {
            ...subject,
            nome: canonicalizeSubjectName(subject.nome, subjectCatalog),
            tempo: `${horas}h ${String(minutos).padStart(2, '0')}m`,
            percentual: percentualCalculado,
            topicosTot: totalTopicos,
            topicos: topicosDaDisciplina.map((topic) => ({
              id: topic.id,
              nome: topic.nome,
              concluido: topic.concluido,
              acertos: Number(topic.acertos || 0),
              erros: Number(topic.erros || 0),
              percentual: Number(topic.percentual || 0),
              data: topic.data_conclusao || null,
              ordem: Number(topic.ordem || 0),
            })),
          };
        });

        setBancoDisciplinas(disciplinasFormatadas);
      } catch (error) {
        console.error('Erro ao buscar disciplinas:', error);
      } finally {
        setLoadingDisciplinas(false);
      }
    };

    fetchDisciplinas();
  }, [setBancoDisciplinas, subjectCatalog]);

  useEffect(() => {
    setPlanoFiltro(forcedPlanoFiltro || 'Todos');
  }, [forcedPlanoFiltro]);

  const totalDisciplinas = bancoDisciplinas.length;
  const totalTopicos = bancoDisciplinas.reduce((acc, item) => acc + ((item.topicos && item.topicos.length) || 0), 0);
  const totalConcluidos = bancoDisciplinas.reduce(
    (acc, item) => acc + ((item.topicos && item.topicos.filter((t) => t.concluido).length) || 0),
    0
  );
  const progressoGeral = totalTopicos > 0 ? Math.round((totalConcluidos / totalTopicos) * 100) : 0;
  const totalPendentes = Math.max(totalTopicos - totalConcluidos, 0);

  const planos = Array.from(new Set(bancoDisciplinas.map((d) => d.plano || 'Geral')));

  const disciplinasFiltradas = useMemo(() => {
    return bancoDisciplinas.filter((disciplina) => {
      const nome = (disciplina.nome || '').toLowerCase();
      const plano = disciplina.plano || 'Geral';
      const matchQuery = nome.includes(query.toLowerCase());
      const matchPlano = planoFiltro === 'Todos' || plano === planoFiltro;
      return matchQuery && matchPlano;
    });
  }, [bancoDisciplinas, query, planoFiltro]);

  const iaInsights = useMemo(() => {
    if (!bancoDisciplinas || bancoDisciplinas.length === 0) {
      return {
        tracao: {
          titulo: 'Sem dados',
          texto: 'Adicione disciplinas para ver análises.',
          icon: Flame,
          color: 'text-gray-400',
        },
        alerta: {
          titulo: 'Sem dados',
          texto: 'Aguardando informações do edital.',
          icon: Clock3,
          color: 'text-gray-400',
        },
        dificuldade: {
          titulo: 'Sem dados',
          texto: 'Comece a resolver questões nos tópicos.',
          icon: AlertTriangle,
          color: 'text-gray-400',
        },
        potencial: '0%',
      };
    }

    const stats = bancoDisciplinas.map((d) => {
      const topicos = d.topicos || [];
      const concluidos = topicos.filter((t) => t.concluido).length;
      const total = topicos.length;
      const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0;

      const acertos = topicos.reduce((acc, t) => acc + (Number(t.acertos) || 0), 0);
      const erros = topicos.reduce((acc, t) => acc + (Number(t.erros) || 0), 0);
      const totalQuestoes = acertos + erros;
      const taxaErro = totalQuestoes > 0 ? Math.round((erros / totalQuestoes) * 100) : 0;

      return { ...d, progresso, acertos, erros, taxaErro, total, concluidos };
    });

    const maisAvancada = [...stats].filter((d) => d.total > 0).sort((a, b) => b.progresso - a.progresso)[0];
    const maisAtrasada = [...stats].filter((d) => d.total > 0).sort((a, b) => a.progresso - b.progresso)[0];
    const comQuestoes = stats.filter((d) => d.acertos + d.erros > 0);
    const maisDificil = comQuestoes.length > 0 ? [...comQuestoes].sort((a, b) => b.taxaErro - a.taxaErro)[0] : null;

    return {
      tracao: {
        titulo: 'Puxando a fila',
        texto:
          maisAvancada && maisAvancada.progresso > 0
            ? `Sua melhor execução está em ${maisAvancada.nome} (${maisAvancada.progresso}% concluído).`
            : 'Você ainda não iniciou os tópicos do edital.',
        icon: Flame,
        color: 'text-orange-400',
      },
      alerta: {
        titulo: 'Atenção urgente',
        texto:
          maisAtrasada && (maisAvancada?.id !== maisAtrasada?.id || maisAtrasada.progresso === 0)
            ? `${maisAtrasada.nome} está ficando para trás (${maisAtrasada.progresso}%).`
            : 'Todas as disciplinas estão caminhando de forma equilibrada.',
        icon: Crosshair,
        color: 'text-emerald-400',
      },
      dificuldade: {
        titulo: 'Ponto de atrito',
        texto:
          maisDificil && maisDificil.taxaErro > 20
            ? `${maisDificil.nome} está exigindo reforço (${maisDificil.taxaErro}% de erro).`
            : maisDificil
            ? 'Seu aproveitamento geral está bom. Nenhuma disciplina crítica detectada.'
            : 'Preencha acertos e erros nos tópicos para mapear suas dificuldades.',
        icon: AlertTriangle,
        color: 'text-red-400',
      },
      potencial:
        totalTopicos > 0
          ? `+${Math.min(99, Math.max(10, Math.round((totalPendentes / totalTopicos) * 100)))}%`
          : '0%',
    };
  }, [bancoDisciplinas, totalTopicos, totalPendentes]);

  const handleDeleteDiscipline = async (disciplina) => {
    const totalTopicosDisciplina = disciplina.topicos?.length || 0;
    const confirmar = window.confirm(
      `Excluir a disciplina "${disciplina.nome}"? Você perderá ${totalTopicosDisciplina} tópicos e o progresso associado a ela.`
    );
    if (!confirmar) return;

    try {
      const topicIds = (disciplina.topicos || []).map((topico) => topico.id).filter(Boolean);

      if (topicIds.length > 0) {
        const { error: topicsError } = await supabase.from('topics').delete().in('id', topicIds);
        if (topicsError) throw topicsError;
      }

      const { error: subjectError } = await supabase.from('subjects').delete().eq('id', disciplina.id);
      if (subjectError) throw subjectError;

      if (setBancoDisciplinas) {
        setBancoDisciplinas((prev) => prev.filter((d) => d.id !== disciplina.id));
      }
    } catch (error) {
      console.error('Erro ao excluir disciplina:', error);
      alert('Não foi possível excluir a disciplina.');
    }
  };

  return (
    <div className="page-shell animate-in fade-in duration-500 pb-16 !pt-4 sm:!pt-5">
      <PageHeadPremium
        className="lg:!flex-row lg:!items-center lg:!justify-between"
        icon={Layers}
        badge={<PageHeadPremiumBadge icon={BarChart3}>Gestão do edital</PageHeadPremiumBadge>}
        title="Disciplinas"
        subtitle="Abra uma disciplina para editar a estrutura, adicionar tópicos e acompanhar a execução do edital por aqui."
        leadingClassName="items-center lg:max-w-[calc(100%-29rem)] xl:max-w-[52rem]"
        trailingWrapClassName="lg:ml-auto lg:w-auto lg:max-w-[28rem] lg:self-center"
        trailing={(
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={() => setRegistroEstudoModalOpen && setRegistroEstudoModalOpen(true)}
              className={PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS}
            >
              <Plus size={14} strokeWidth={2} />
              Registrar estudo
            </button>
            <button
              type="button"
              onClick={() => setEditingDiscipline && setEditingDiscipline({})}
              className={PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS}
            >
              <Edit3 size={14} strokeWidth={2} />
              Nova disciplina
            </button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Disciplinas" value={totalDisciplinas} sub="Base total organizada" accent="blue" icon={BookOpen} />
        <KpiCard label="Tópicos concluídos" value={totalConcluidos} sub="Já estudados e marcados" accent="emerald" icon={CheckCircle2} />
        <KpiCard label="Tópicos pendentes" value={totalPendentes} sub="Ainda sem execução" accent="orange" icon={Clock3} />
        <KpiCard label="Aproveitamento" value={`${progressoGeral}%`} sub="Cobertura real da base" accent="indigo" icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.75fr)_330px]">
        <div className="section-card flex flex-col overflow-hidden p-0">
          <div className="border-b border-ink-200 px-5 py-5 sm:px-6 sm:py-6">
            <div className="soft-accent rounded-xl p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wider text-ink-500">Avanço global</p>
                </div>
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span className="text-2xl font-semibold leading-none text-blue-900">{progressoGeral}</span>
                  <span className="text-sm font-semibold text-blue-900">%</span>
                </div>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-blue-100/80">
                <div className="h-full rounded-full bg-blue-700 transition-all duration-700" style={{ width: `${progressoGeral}%` }} />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative max-w-md flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar disciplina..."
                  className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-ink-700 outline-none transition-all duration-300 hover:border-blue-200 focus:border-blue-700 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  <Filter size={12} />
                  Plano
                </div>
                <button
                  onClick={() => setPlanoFiltro('Todos')}
                  className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-300 ${
                    planoFiltro === 'Todos'
                      ? 'border border-blue-100 bg-blue-50 text-blue-700'
                      : 'border border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
                  }`}
                >
                  Todos
                </button>
                {planos.map((plano) => (
                  <button
                    key={plano}
                    onClick={() => setPlanoFiltro(plano)}
                    className={`max-w-[240px] truncate rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-300 ${
                      planoFiltro === plano
                        ? 'border border-blue-100 bg-blue-50 text-blue-700'
                        : 'border border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
                    }`}
                    title={plano}
                  >
                    {plano}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="scrollbar-thin overflow-x-auto">
            <table className="min-w-[1120px] w-full table-fixed">
              <thead className="bg-ink-50/80">
                <tr className="border-b border-ink-200 text-left">
                  <th className="w-[38%] px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">Disciplina</th>
                  <th className="w-[22%] px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">Plano</th>
                  <th className="w-[8%] px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-500">Tópicos</th>
                  <th className="w-[10%] px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-500">Concluídos</th>
                  <th className="w-[14%] px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-500">Progresso</th>
                  <th className="w-[210px] px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-500">Ações</th>
                </tr>
              </thead>

              <tbody>
                {loadingDisciplinas && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-ink-100 text-ink-400">
                        <BrainCircuit size={22} />
                      </div>
                      <div className="mt-4 text-sm font-semibold text-ink-500">Carregando disciplinas...</div>
                    </td>
                  </tr>
                )}

                {!loadingDisciplinas &&
                  disciplinasFiltradas.map((disciplina, idx) => {
                    const topicos = disciplina.topicos || [];
                    const concluidos = topicos.filter((t) => t.concluido).length;
                    const progresso = topicos.length > 0 ? Math.round((concluidos / topicos.length) * 100) : 0;

                    return (
                      <tr key={disciplina.id || idx} className="border-b border-ink-100 transition-all duration-300 hover:bg-blue-50/30">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                              style={{ backgroundColor: disciplina.cor || DISCIPLINE_ACCENT_FALLBACK }}
                            >
                              <BookOpen size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-base font-semibold text-ink-900">{disciplina.nome}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            title={disciplina.plano || 'Geral'}
                            className="inline-flex max-w-full rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-xs font-semibold leading-5 text-ink-700"
                          >
                            {disciplina.plano || 'Geral'}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-ink-800">{topicos.length}</span>
                        </td>

                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-emerald-600">{concluidos}</span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${progresso}%`,
                                    backgroundColor: disciplina.cor || DISCIPLINE_ACCENT_FALLBACK,
                                  }}
                                />
                              </div>
                            </div>
                            <span
                              className="w-10 text-right text-sm font-semibold"
                              style={{ color: disciplina.cor || DISCIPLINE_ACCENT_FALLBACK }}
                            >
                              {progresso}%
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setViewingDiscipline && setViewingDiscipline(disciplina)}
                              className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-100"
                            >
                              Abrir
                              <ArrowUpRight size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDiscipline && setEditingDiscipline(disciplina)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-ink-50 text-ink-500 transition-all duration-300 hover:border-blue-700 hover:bg-blue-700 hover:text-white"
                              title="Editar disciplina"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDiscipline(disciplina)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-ink-50 text-ink-500 transition-all duration-300 hover:border-red-600 hover:bg-red-600 hover:text-white"
                              title="Excluir disciplina"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {!loadingDisciplinas && disciplinasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-ink-100 text-ink-400">
                        <BrainCircuit size={22} />
                      </div>
                      <div className="mt-4 text-sm font-semibold text-ink-500">Nenhuma disciplina encontrada.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-ink-100 bg-ink-50/60 px-8 py-4 text-xs font-semibold text-ink-500">
            Mostrando {disciplinasFiltradas.length} disciplinas.
          </div>
        </div>

        <div className="section-card soft-accent sticky top-6 h-fit p-5">

          <div>
            <div className="brand-badge gap-2 px-3 py-1.5 font-semibold tracking-[0.18em]">
              <BrainCircuit size={12} />
              Raio-X do edital
            </div>

            <h3 className="mt-4 text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">Diagnóstico inteligente</h3>
            <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
              Análise em tempo real do seu desempenho nas matérias cadastradas.
            </p>

            <div className="mt-6 space-y-3">
              <InsightCard
                icon={iaInsights.tracao.icon}
                iconColor={iaInsights.tracao.color}
                title={iaInsights.tracao.titulo}
                text={iaInsights.tracao.texto}
              />
              <InsightCard
                icon={iaInsights.alerta.icon}
                iconColor={iaInsights.alerta.color}
                title={iaInsights.alerta.titulo}
                text={iaInsights.alerta.texto}
              />
              <InsightCard
                icon={iaInsights.dificuldade.icon}
                iconColor={iaInsights.dificuldade.color}
                title={iaInsights.dificuldade.titulo}
                text={iaInsights.dificuldade.texto}
              />
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-blue-100 bg-white/90 px-4 py-4 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">Potencial em aberto</span>
              <div className="flex items-center gap-2 text-3xl font-semibold text-blue-900">
                {iaInsights.potencial}
                <ArrowUpRight size={22} className="text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, text, icon: Icon, iconColor }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white/90 p-3.5 shadow-sm transition-all duration-300 hover:bg-white">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 ${iconColor}`}>
          <Icon size={14} strokeWidth={3} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-700">{title}</p>
      </div>
      <p className="mt-3 text-sm font-semibold leading-relaxed text-ink-500">{text}</p>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className="kpi-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${styles[accent]}`}>
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-5 text-3xl font-semibold leading-none text-blue-900 sm:text-4xl">{value}</p>
      <p className="mt-2 text-sm font-semibold text-ink-500">{sub}</p>
    </div>
  );
}
