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

const DISCIPLINE_ACCENT_FALLBACK = 'var(--pl-accent)';

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
        tracao: { titulo: 'Sem dados', texto: 'Adicione disciplinas para ver análises.', icon: Flame },
        alerta: { titulo: 'Sem dados', texto: 'Aguardando informações do edital.', icon: Clock3 },
        dificuldade: { titulo: 'Sem dados', texto: 'Comece a resolver questões nos tópicos.', icon: AlertTriangle },
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
        texto: maisAvancada && maisAvancada.progresso > 0
          ? `Sua melhor execução está em ${maisAvancada.nome} (${maisAvancada.progresso}% concluído).`
          : 'Você ainda não iniciou os tópicos do edital.',
        icon: Flame,
      },
      alerta: {
        titulo: 'Atenção urgente',
        texto: maisAtrasada && (maisAvancada?.id !== maisAtrasada?.id || maisAtrasada.progresso === 0)
          ? `${maisAtrasada.nome} está ficando para trás (${maisAtrasada.progresso}%).`
          : 'Todas as disciplinas estão caminhando de forma equilibrada.',
        icon: Crosshair,
      },
      dificuldade: {
        titulo: 'Ponto de atrito',
        texto: maisDificil && maisDificil.taxaErro > 20
          ? `${maisDificil.nome} está exigindo reforço (${maisDificil.taxaErro}% de erro).`
          : maisDificil
          ? 'Seu aproveitamento geral está bom. Nenhuma disciplina crítica detectada.'
          : 'Preencha acertos e erros nos tópicos para mapear suas dificuldades.',
        icon: AlertTriangle,
      },
      potencial: totalTopicos > 0
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
    <div className="pl-paper-bg" style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '28px 28px 56px' }}>

      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="pl-eyebrow" style={{ marginBottom: 6 }}>Gestão do edital</div>
          <h1 className="pl-display" style={{ fontSize: 38, margin: 0 }}>
            Suas disciplinas.
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="pl-btn pl-btn-ghost"
            onClick={() => setEditingDiscipline && setEditingDiscipline({})}
          >
            <Edit3 size={13} />
            Nova disciplina
          </button>
          <button
            type="button"
            className="pl-btn pl-btn-primary"
            onClick={() => setRegistroEstudoModalOpen && setRegistroEstudoModalOpen(true)}
          >
            <Plus size={13} />
            Registrar estudo
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <PlKpi label="Disciplinas" value={totalDisciplinas} sub="base organizada" icon={Layers} />
        <PlKpi label="Concluídos" value={totalConcluidos} sub="tópicos marcados" icon={CheckCircle2} />
        <PlKpi label="Pendentes" value={totalPendentes} sub="sem execução" icon={Clock3} />
        <PlKpi label="Aproveitamento" value={`${progressoGeral}%`} sub="cobertura real" icon={TrendingUp} />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>

        {/* Discipline table */}
        <div className="pl-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header controls */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--pl-rule)' }}>
            {/* Progress bar */}
            <div style={{
              background: 'var(--pl-bg-soft)', borderRadius: 8, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16,
            }}>
              <div className="pl-eyebrow" style={{ fontSize: 9.5, flexShrink: 0 }}>Avanço global</div>
              <div style={{ flex: 1, height: 6, background: 'var(--pl-rule-2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${progressoGeral}%`,
                  background: 'var(--pl-accent)', borderRadius: 99,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span className="pl-num" style={{ fontSize: 18, flexShrink: 0 }}>{progressoGeral}%</span>
            </div>

            {/* Search + filter */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                <Search size={13} style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--pl-ink-4)', pointerEvents: 'none',
                }} />
                <input
                  className="pl-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar disciplina…"
                  style={{ width: '100%', paddingLeft: 30, height: 32, fontSize: 12.5 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Plano</span>
                {['Todos', ...planos].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlanoFiltro(p)}
                    style={{
                      height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid',
                      fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                      borderColor: planoFiltro === p ? 'var(--pl-accent)' : 'var(--pl-rule-strong)',
                      background: planoFiltro === p ? 'var(--pl-accent-soft)' : 'transparent',
                      color: planoFiltro === p ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
                      transition: 'all 0.12s',
                      maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={p}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--pl-rule)' }}>
                  {['Disciplina', 'Plano', 'Tópicos', 'Concluídos', 'Progresso', 'Ações'].map((col) => (
                    <th key={col} className="pl-eyebrow" style={{
                      fontSize: 9.5, textAlign: 'left', padding: '10px 14px',
                      background: 'var(--pl-bg-soft)',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingDisciplinas && (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <BrainCircuit size={22} style={{ color: 'var(--pl-ink-4)', margin: '0 auto 10px' }} />
                      <div style={{ fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 600 }}>Carregando disciplinas…</div>
                    </td>
                  </tr>
                )}
                {!loadingDisciplinas && disciplinasFiltradas.map((disciplina, idx) => {
                  const topicos = disciplina.topicos || [];
                  const concluidos = topicos.filter((t) => t.concluido).length;
                  const progresso = topicos.length > 0 ? Math.round((concluidos / topicos.length) * 100) : 0;
                  const cor = disciplina.cor || 'var(--pl-accent)';

                  return (
                    <tr
                      key={disciplina.id || idx}
                      style={{ borderBottom: '1px solid var(--pl-rule)' }}
                    >
                      {/* Nome */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                            background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <BookOpen size={16} style={{ color: '#fff' }} />
                          </div>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink)' }}>
                            {disciplina.nome}
                          </span>
                        </div>
                      </td>
                      {/* Plano */}
                      <td style={{ padding: '12px 14px' }}>
                        <span className="pl-tag" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }} title={disciplina.plano || 'Geral'}>
                          {disciplina.plano || 'Geral'}
                        </span>
                      </td>
                      {/* Tópicos */}
                      <td style={{ padding: '12px 14px' }}>
                        <span className="pl-num" style={{ fontSize: 15 }}>{topicos.length}</span>
                      </td>
                      {/* Concluídos */}
                      <td style={{ padding: '12px 14px' }}>
                        <span className="pl-num" style={{ fontSize: 15, color: 'var(--pl-success)' }}>{concluidos}</span>
                      </td>
                      {/* Progresso */}
                      <td style={{ padding: '12px 14px', minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: 'var(--pl-rule-2)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progresso}%`, background: cor, borderRadius: 99, transition: 'width 0.4s' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cor, width: 34, textAlign: 'right' }}>{progresso}%</span>
                        </div>
                      </td>
                      {/* Ações */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="pl-btn pl-btn-ghost"
                            style={{ height: 28, fontSize: 12, padding: '0 10px' }}
                            onClick={() => setViewingDiscipline && setViewingDiscipline(disciplina)}
                          >
                            Abrir <ArrowUpRight size={11} />
                          </button>
                          <button
                            type="button"
                            className="pl-btn pl-btn-ghost"
                            style={{ height: 28, width: 28, padding: 0, justifyContent: 'center' }}
                            onClick={() => setEditingDiscipline && setEditingDiscipline(disciplina)}
                            title="Editar"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="pl-btn pl-btn-ghost"
                            style={{ height: 28, width: 28, padding: 0, justifyContent: 'center', color: 'var(--pl-danger)' }}
                            onClick={() => handleDeleteDiscipline(disciplina)}
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loadingDisciplinas && disciplinasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <BrainCircuit size={22} style={{ color: 'var(--pl-ink-4)', margin: '0 auto 10px' }} />
                      <div style={{ fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 600 }}>Nenhuma disciplina encontrada.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{
            padding: '10px 20px', borderTop: '1px solid var(--pl-rule)',
            fontSize: 11.5, color: 'var(--pl-ink-3)', fontWeight: 600,
            background: 'var(--pl-bg-soft)',
          }}>
            Mostrando {disciplinasFiltradas.length} disciplina{disciplinasFiltradas.length !== 1 ? 's' : ''}.
          </div>
        </div>

        {/* AI Diagnostic panel */}
        <div className="pl-card-ai" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <BrainCircuit size={14} style={{ color: 'var(--pl-accent)' }} />
            <span className="pl-tag pl-tag-ai">Raio-X do edital</span>
          </div>
          <h3 style={{
            fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300,
            fontSize: 20, color: 'var(--pl-ink)', letterSpacing: '-0.04em',
            lineHeight: 1.1, margin: '0 0 6px',
          }}>
            Diagnóstico inteligente.
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', lineHeight: 1.5, margin: '0 0 18px' }}>
            Análise em tempo real das suas matérias cadastradas.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[iaInsights.tracao, iaInsights.alerta, iaInsights.dificuldade].map((insight, i) => {
              const Icon = insight.icon;
              return (
                <div key={i} className="pl-card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon size={13} style={{ color: 'var(--pl-accent)', flexShrink: 0 }} />
                    <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>{insight.titulo}</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--pl-ink-2)', lineHeight: 1.5, margin: 0 }}>
                    {insight.texto}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: 16, padding: '12px 14px',
            borderRadius: 8, border: '1px solid var(--pl-rule-strong)',
            background: 'var(--pl-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div className="pl-eyebrow" style={{ fontSize: 9.5 }}>Potencial em aberto</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pl-num" style={{ fontSize: 24, color: 'var(--pl-ink)' }}>{iaInsights.potencial}</span>
              <ArrowUpRight size={16} style={{ color: 'var(--pl-success)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlKpi({ label, value, sub, icon: Icon }) {
  return (
    <div className="pl-card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <Icon size={13} style={{ color: 'var(--pl-ink-3)' }} />
        <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>{label}</span>
      </div>
      <div className="pl-num" style={{ fontSize: 28, lineHeight: 1, display: 'block', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>{sub}</div>
    </div>
  );
}
