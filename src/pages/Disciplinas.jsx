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
  BrainCircuit,
  AlertTriangle,
  Crosshair,
  Layers,
  Sparkles,
  Play,
} from 'lucide-react';
import { getAreaToken } from '../lib/areaTokens';

export default function Disciplinas({
  bancoDisciplinas = [],
  setBancoDisciplinas,
  setEditingDiscipline,
  setViewingDiscipline,
  setRegistroEstudoModalOpen,
  setActiveTab,
  subjectCatalog = [],
  historicoReal = [],
  studyRecommendation = null,
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

  const enrichedDisciplinas = useMemo(
    () => enrichDisciplines(bancoDisciplinas, historicoReal, studyRecommendation),
    [bancoDisciplinas, historicoReal, studyRecommendation]
  );

  const enrichedFiltered = useMemo(() => {
    const allowed = new Set(disciplinasFiltradas.map((disciplina) => disciplina.id || disciplina.nome));
    return enrichedDisciplinas.filter((disciplina) => allowed.has(disciplina.id || disciplina.nome));
  }, [disciplinasFiltradas, enrichedDisciplinas]);

  const isEmpty = !loadingDisciplinas && bancoDisciplinas.length === 0;

  const handleDeleteDiscipline = async (disciplina) => {
    const totalTopicosDisciplina = disciplina.topicos?.length || 0;
    const confirmar = window.confirm(
      `Excluir a disciplina "${disciplina.nome}"? Voce perdera ${totalTopicosDisciplina} topicos e o progresso associado a ela.`
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
      alert('Nao foi possivel excluir a disciplina.');
    }
  };

  return (
    <div className="pl-paper-bg-soft" style={{ flex: 1, overflow: 'auto', padding: '18px 20px 40px' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <DisciplinasHeader
          avancoGlobal={progressoGeral}
          onRegistrarEstudo={() => setRegistroEstudoModalOpen?.(true)}
          onNovaDisciplina={() => setEditingDiscipline?.({})}
        />

        <KpiStrip
          totalDisciplinas={totalDisciplinas}
          totalConcluidos={totalConcluidos}
          totalPendentes={totalPendentes}
          progressoGeral={progressoGeral}
        />

        {isEmpty ? (
          <DisciplinasEmptyState
            onNovaDisciplina={() => setEditingDiscipline?.({})}
            onAbrirBiblioteca={() => setActiveTab?.('concursos')}
            onRegistrarEstudo={() => setRegistroEstudoModalOpen?.(true)}
          />
        ) : (
          <>
            <TabelaDisciplinas
              data={enrichedFiltered}
              loading={loadingDisciplinas}
              query={query}
              setQuery={setQuery}
              planoFiltro={planoFiltro}
              setPlanoFiltro={setPlanoFiltro}
              planos={planos}
              totalCount={bancoDisciplinas.length}
              onOpen={(disciplina) => setViewingDiscipline?.(disciplina)}
              onEdit={(disciplina) => setEditingDiscipline?.(disciplina)}
              onDelete={handleDeleteDiscipline}
            />

            {bancoDisciplinas.length > 0 && (
              <BizuDiagnostico
                disciplinas={enrichedDisciplinas}
                onStart={() => setRegistroEstudoModalOpen?.(true)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DisciplinasHeader({ avancoGlobal, onRegistrarEstudo, onNovaDisciplina }) {
  return (
    <section className="pl-card-paper" style={{ padding: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24, alignItems: 'end' }}>
        <div>
          <div className="pl-overline">Estudos / Disciplinas</div>
          <h1 className="pl-display" style={{ margin: '14px 0 8px', fontSize: 'clamp(44px, 5vw, 78px)' }}>
            Matérias no ponto.
          </h1>
          <p className="pl-body" style={{ maxWidth: 760, fontSize: 18 }}>
            Organize o edital por disciplina, avance por tópicos e deixe a rotina puxar o que precisa de revisão.
          </p>
          <div style={{ marginTop: 18, maxWidth: 620 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <span className="pl-small-label">Cobertura global do edital</span>
              <span className="pl-small-label" style={{ color: 'var(--pl-ink)' }}>{avancoGlobal}%</span>
            </div>
            <div className="pl-progress-track">
              <div className="pl-progress-fill" style={{ width: `${avancoGlobal}%` }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifySelf: 'end', width: '100%' }}>
          <button type="button" className="pl-btn pl-btn-primary" onClick={onRegistrarEstudo}>
            <Play size={15} fill="currentColor" />
            Registrar estudo
          </button>
          <button type="button" className="pl-btn pl-btn-secondary" onClick={onNovaDisciplina}>
            <Plus size={15} />
            Nova disciplina
          </button>
        </div>
      </div>
    </section>
  );
}

function KpiStrip({ totalDisciplinas, totalConcluidos, totalPendentes, progressoGeral }) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
      <Kpi icon={BookOpen} label="Disciplinas" value={totalDisciplinas} sub="base ativa" />
      <Kpi icon={CheckCircle2} label="Concluídos" value={totalConcluidos} sub="tópicos finalizados" />
      <Kpi icon={Clock3} label="Pendentes" value={totalPendentes} sub="a executar" />
      <Kpi icon={BarChart3} label="Cobertura" value={`${progressoGeral}%`} sub="do edital" />
    </section>
  );
}

function Kpi({ icon: Icon, label, value, sub }) {
  return (
    <div className="pl-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span className="pl-small-label">{label}</span>
        <Icon size={16} color="var(--pl-muted)" />
      </div>
      <div className="pl-serif-number" style={{ marginTop: 12, fontSize: 44, lineHeight: 1 }}>
        {value}
      </div>
      <p className="pl-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>{sub}</p>
    </div>
  );
}

function TabelaDisciplinas({
  data,
  loading,
  query,
  setQuery,
  planoFiltro,
  setPlanoFiltro,
  planos,
  totalCount,
  onOpen,
  onEdit,
  onDelete,
}) {
  return (
    <section className="pl-card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1fr) auto',
          gap: 14,
          alignItems: 'center',
          padding: '16px 18px',
          borderBottom: '1px solid var(--pl-rule)',
        }}
      >
        <div>
          <div className="pl-overline">Biblioteca do edital</div>
          <h2 className="pl-section-title" style={{ marginTop: 6 }}>Suas disciplinas</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <label className="pl-search-control" style={{ width: 290 }}>
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar disciplina..."
            />
          </label>
          <span className="pl-filter-label"><Filter size={13} /> Plano</span>
          <button
            type="button"
            className={planoFiltro === 'Todos' ? 'pl-chip is-active' : 'pl-chip'}
            onClick={() => setPlanoFiltro('Todos')}
          >
            Todos
          </button>
          {planos.map((plano) => (
            <button
              key={plano}
              type="button"
              title={plano}
              className={planoFiltro === plano ? 'pl-chip is-active' : 'pl-chip'}
              onClick={() => setPlanoFiltro(plano)}
            >
              {plano}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="pl-editorial-table">
          <thead>
            <tr>
              <th>Disciplina</th>
              <th>Plano</th>
              <th>Tópicos</th>
              <th>Concluídos</th>
              <th>Progresso</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6}>
                  <EmptyDashed icon={BrainCircuit} title="Carregando disciplinas..." />
                </td>
              </tr>
            )}

            {!loading && data.map((disciplina, index) => (
              <DisciplinaRow
                key={disciplina.id || disciplina.nome || index}
                disciplina={disciplina}
                index={index}
                onOpen={onOpen}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}

            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyDashed icon={Search} title="Nenhuma disciplina encontrada." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--pl-rule)', color: 'var(--pl-muted)', fontSize: 13 }}>
        Mostrando {data.length} de {totalCount} disciplinas.
      </div>
    </section>
  );
}

function DisciplinaRow({ disciplina, index, onOpen, onEdit, onDelete }) {
  const token = getAreaToken(disciplina.areaKey || disciplina.area || inferAreaFromText(disciplina.nome, disciplina.plano));
  const topicos = disciplina.topicos || [];
  const concluidos = topicos.filter((topico) => topico.concluido).length;
  const progresso = topicos.length > 0 ? Math.round((concluidos / topicos.length) * 100) : Number(disciplina.percentual || 0);

  return (
    <tr className={index % 2 === 1 ? 'is-striped' : undefined}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 300 }}>
          <span className="pl-area-marker" style={{ background: token.cover }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 750, color: 'var(--pl-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {disciplina.nome}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 5 }}>
              <span className="pl-mini-chip" style={{ background: token.chip, color: token.chipInk }}>{token.label}</span>
              {disciplina.needsReview && <span className="pl-mini-chip is-warning">revisão urgente</span>}
              <span className="pl-muted" style={{ fontSize: 12 }}>
                {disciplina.lastStudyLabel ? `último estudo ${disciplina.lastStudyLabel}` : 'sem estudo recente'}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td>
        <span className="pl-pill-muted">{disciplina.plano || 'Geral'}</span>
      </td>
      <td>{topicos.length}</td>
      <td>{concluidos}</td>
      <td>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 42px', alignItems: 'center', gap: 10, minWidth: 160 }}>
          <div className="pl-progress-track">
            <div className="pl-progress-fill" style={{ width: `${progresso}%`, background: token.cover }} />
          </div>
          <strong style={{ color: token.cover, textAlign: 'right' }}>{progresso}%</strong>
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="pl-btn pl-btn-compact pl-btn-primary" onClick={() => onOpen(disciplina)}>
            Abrir
            <ArrowUpRight size={13} />
          </button>
          <button type="button" className="pl-icon-button" title="Editar disciplina" onClick={() => onEdit(disciplina)}>
            <Edit3 size={14} />
          </button>
          <button type="button" className="pl-icon-button" title="Excluir disciplina" onClick={() => onDelete(disciplina)}>
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function BizuDiagnostico({ disciplinas, onStart }) {
  const ordered = [...disciplinas].sort((a, b) => {
    if (a.needsReview !== b.needsReview) return a.needsReview ? -1 : 1;
    return a.coverage - b.coverage;
  });
  const critical = ordered[0];
  const best = [...disciplinas].sort((a, b) => b.coverage - a.coverage)[0];
  const suggestions = ordered.slice(0, 3);

  return (
    <section className="pl-card-ai" style={{ padding: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.75fr)', gap: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="pl-tag-ai"><Sparkles size={13} /> Bizu IA</span>
            <span className="pl-small-label">Diagnóstico das disciplinas</span>
          </div>
          <h3 className="pl-section-title" style={{ marginTop: 14 }}>
            {critical?.needsReview ? `Reforce ${critical.nome}` : 'Base estável para continuar'}
          </h3>
          <p className="pl-body" style={{ maxWidth: 780, marginTop: 8 }}>
            {critical?.needsReview
              ? `Essa disciplina combina baixa cobertura com pouco estudo recente. Vale encaixar uma sessão curta antes de avançar para novos tópicos.`
              : best
              ? `${best.nome} está puxando a fila. Use esse ritmo para destravar as matérias com menor cobertura.`
              : 'Cadastre disciplinas e registre estudo para a IA montar um diagnóstico útil.'}
          </p>
          <div style={{ marginTop: 18 }}>
            <button type="button" className="pl-btn-ai" onClick={onStart}>
              <Sparkles size={15} />
              Registrar sessão guiada
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <Insight label="Cobertura mais baixa" value={critical ? `${critical.coverage}%` : '0%'} detail={critical?.nome || 'Sem dados'} />
          <Insight label="Melhor tração" value={best ? `${best.coverage}%` : '0%'} detail={best?.nome || 'Sem dados'} />
          <Insight label="Sugestões ativas" value={suggestions.length} detail="ordem sugerida para revisar" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 18 }}>
        {suggestions.map((disciplina, index) => (
          <SuggestionRow key={disciplina.id || disciplina.nome} disciplina={disciplina} index={index} />
        ))}
      </div>
    </section>
  );
}

function Insight({ label, value, detail }) {
  return (
    <div className="pl-ai-mini">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function SuggestionRow({ disciplina, index }) {
  const token = getAreaToken(disciplina.areaKey || disciplina.area || inferAreaFromText(disciplina.nome, disciplina.plano));

  return (
    <div className="pl-ai-suggestion">
      <span className="pl-serif-number">{index + 1}</span>
      <div>
        <strong>{disciplina.nome}</strong>
        <p>{disciplina.needsReview ? 'Revisar antes de avançar' : `${disciplina.coverage}% de cobertura`}</p>
      </div>
      <span className="pl-area-dot" style={{ background: token.cover }} />
    </div>
  );
}

function DisciplinasEmptyState({ onNovaDisciplina, onAbrirBiblioteca, onRegistrarEstudo }) {
  return (
    <section className="pl-card-paper" style={{ padding: 28 }}>
      <div className="pl-overline">Primeiro mapa do edital</div>
      <h2 className="pl-section-title" style={{ marginTop: 10 }}>Monte suas disciplinas em três passos.</h2>
      <p className="pl-body" style={{ marginTop: 8, maxWidth: 720 }}>
        Sem disciplinas cadastradas ainda. Comece pela estrutura do edital, conecte ao concurso e registre a primeira sessão para ativar os diagnósticos.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 22 }}>
        <EmptyAction number="1" title="Criar disciplina" text="Cadastre a matéria e seus tópicos principais." action="Nova disciplina" onClick={onNovaDisciplina} />
        <EmptyAction number="2" title="Abrir biblioteca" text="Use o concurso-alvo como referência de organização." action="Ver concursos" onClick={onAbrirBiblioteca} />
        <EmptyAction number="3" title="Registrar estudo" text="Alimente o histórico para a IA sugerir prioridades." action="Registrar" onClick={onRegistrarEstudo} />
      </div>
    </section>
  );
}

function EmptyAction({ number, title, text, action, onClick }) {
  return (
    <div className="pl-card" style={{ padding: 18 }}>
      <span className="pl-empty-number">{number}</span>
      <h3 style={{ margin: '14px 0 6px', fontWeight: 800 }}>{title}</h3>
      <p className="pl-muted" style={{ minHeight: 42, margin: 0 }}>{text}</p>
      <button type="button" className="pl-btn pl-btn-secondary" style={{ marginTop: 16, width: '100%' }} onClick={onClick}>
        {action}
      </button>
    </div>
  );
}

function EmptyDashed({ icon: Icon, title }) {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--pl-muted)' }}>
      <div
        style={{
          width: 54,
          height: 54,
          margin: '0 auto 12px',
          border: '1px dashed var(--pl-rule-strong)',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 999,
        }}
      >
        <Icon size={20} />
      </div>
      <strong>{title}</strong>
    </div>
  );
}

function enrichDisciplines(disciplinas, historicoReal, studyRecommendation) {
  return disciplinas.map((disciplina) => {
    const relatedHistory = (historicoReal || []).filter((item) => sameSubject(item, disciplina));
    const sortedHistory = relatedHistory
      .filter((item) => item.data || item.created_at || item.date)
      .sort((a, b) => new Date(b.data || b.created_at || b.date) - new Date(a.data || a.created_at || a.date));
    const lastDate = sortedHistory[0]?.data || sortedHistory[0]?.created_at || sortedHistory[0]?.date;
    const coverage = getCoverage(disciplina);
    const recommendedSubject = studyRecommendation?.subject || studyRecommendation?.disciplina || studyRecommendation?.materia;
    const isRecommended = recommendedSubject && sameSubject({ disciplina: recommendedSubject, materia: recommendedSubject, subject: recommendedSubject }, disciplina);

    return {
      ...disciplina,
      coverage,
      lastStudyLabel: formatRelativeDate(lastDate),
      needsReview: isRecommended || coverage < 35 || relatedHistory.length === 0,
      areaKey: disciplina.area || disciplina.categoria || inferAreaFromText(disciplina.nome, disciplina.plano),
    };
  });
}

function sameSubject(item, disciplina) {
  const source = String(item?.disciplina || item?.materia || item?.subject || item?.nome || '').toLowerCase();
  const target = String(disciplina?.nome || '').toLowerCase();
  return Boolean(source && target && (source.includes(target) || target.includes(source)));
}

function getCoverage(disciplina) {
  const topicos = disciplina.topicos || [];
  if (topicos.length > 0) {
    const concluidos = topicos.filter((topico) => topico.concluido).length;
    return Math.round((concluidos / topicos.length) * 100);
  }
  return Number(disciplina.percentual || 0);
}

function inferAreaFromText(nome = '', plano = '') {
  const text = `${nome} ${plano}`.toLowerCase();
  if (/militar|soldado|pm|bombeiro|marinha|exercito|aeronautica/.test(text)) return 'militar';
  if (/policia|policial|pc-|pf|prf|delegado|investigador/.test(text)) return 'policial';
  if (/fiscal|tributario|receita|sefaz|auditor/.test(text)) return 'fiscal';
  if (/tribunal|tj|trf|tre|mp|promotor|analista/.test(text)) return 'tribunais';
  if (/saude|sus|enfermagem|medicina/.test(text)) return 'saude';
  return 'outros';
}

function formatRelativeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  const diffMs = today.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0);
  const diffDays = Math.max(0, Math.round(diffMs / 86400000));
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'ontem';
  return `ha ${diffDays} dias`;
}
