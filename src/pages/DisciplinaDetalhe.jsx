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
  const progressoPercentual = totalDeTopicos > 0 ? Math.round((topicosConcluidos / totalDeTopicos) * 100) : 0;
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

  const kpis = [
    { label: 'Tempo', value: tempoFormatado, icon: Clock3 },
    { label: 'Desempenho', value: `${desempenhoPercentual}%`, icon: TrendingUp },
    { label: 'Concluídos', value: String(topicosConcluidos), icon: CheckCircle2 },
    { label: 'Pendentes', value: String(topicosPendentes), icon: CircleDashed },
  ];

  return (
    <div className="pl-paper-bg" style={{ padding: '28px 28px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero editorial ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 24, alignItems: 'start' }}>
        <div>
          <p className="pl-eyebrow" style={{ marginBottom: 8 }}>
            <BookOpen size={11} style={{ display: 'inline', marginRight: 5 }} />
            Visão estratégica
          </p>
          <h1 className="pl-display" style={{ marginBottom: 10 }}>{viewingDiscipline.nome}<span style={{ color: 'var(--pl-accent)' }}>.</span></h1>
          <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', marginBottom: 14, fontWeight: 500 }}>
            Plano: <strong style={{ color: 'var(--pl-ink)' }}>{viewingDiscipline.plano || 'Geral'}</strong>
          </p>
          {/* Progress bar */}
          <div style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--pl-ink-3)' }}>
              <span>Progresso</span>
              <span style={{ color: 'var(--pl-success)' }}>{progressoPercentual}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'var(--pl-rule-2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'var(--pl-success)', width: `${progressoPercentual}%`, transition: 'width 0.5s' }} />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
          <button
            type="button"
            onClick={() => setEditingDiscipline?.(viewingDiscipline)}
            className="pl-btn pl-btn-primary"
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={15} /> Adicionar tópico
          </button>
          <button
            type="button"
            onClick={() => setLinkModalOpen?.(true)}
            className="pl-btn pl-btn-ghost"
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Calculator size={15} /> Relacionar
          </button>
          <button
            type="button"
            onClick={() => setViewingDiscipline(null)}
            className="pl-btn pl-btn-ghost"
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <X size={15} /> Fechar
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="pl-card" style={{ padding: '12px 16px' }}>
            <p className="pl-eyebrow" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon size={11} /> {label}
            </p>
            <p className="pl-num" style={{ fontSize: 22, color: 'var(--pl-ink)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── AI Insight card ── */}
      <div className="pl-card-ai" style={{ padding: 24, borderRadius: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)', padding: '4px 14px', marginBottom: 16 }}>
          <Sparkles size={12} style={{ color: 'var(--pl-accent)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--pl-accent)' }}>Leitura da IA</span>
        </div>

        <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)', marginBottom: 10 }}>Diagnóstico da disciplina</h3>
        <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', lineHeight: 1.6, marginBottom: 16, maxWidth: 580 }}>
          Você já tem uma visão clara da disciplina. Agora a ideia é usar esse painel para decidir
          onde acelerar, onde revisar e qual tópico puxar em seguida.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <InsightRow title="O que está forte" text={insightForte} />
          <InsightRow title="O que pede pressão" text={insightPressao} />
          <InsightRow title="Próxima jogada" text={insightNext} />
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '10px 16px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--pl-ink-3)' }}>Potencial de crescimento</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 18, fontWeight: 700, color: 'var(--pl-accent)' }}>
            +{potencial}%
            <ArrowUpRight size={14} />
          </span>
        </div>
      </div>

      {/* ── Topics list ── */}
      <div className="pl-card" style={{ overflow: 'hidden', padding: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)', padding: '16px 24px' }}>
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Mapa da disciplina</p>
            <h4 style={{ fontSize: 17, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>Tópicos cadastrados</h4>
          </div>
          <span style={{ borderRadius: 999, border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)', padding: '4px 14px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-accent)' }}>
            {totalDeTopicos} tópicos
          </span>
        </div>

        {topicos.length > 0 ? (
          topicos.map((topico, index) => {
            const isHighlighted = String(topico?.id || '') === String(highlightedTopicId || '');
            return (
              <div
                key={topico?.id || index}
                id={topico?.id ? `disciplina-topico-${topico.id}` : undefined}
                style={{
                  borderBottom: '1px solid var(--pl-rule)',
                  padding: '14px 24px',
                  background: isHighlighted ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
                  transition: 'background 0.2s',
                  outline: isHighlighted ? '1px solid var(--pl-accent)' : 'none',
                  outlineOffset: -1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flex: 1 }}>
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleEditalTopico?.(viewingDiscipline.id, topico.id)}
                      aria-label={topico?.concluido ? 'Desmarcar tópico como concluído' : 'Marcar tópico como concluído'}
                      style={{
                        marginTop: 2,
                        flexShrink: 0,
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: `2px solid ${topico?.concluido ? 'var(--pl-success)' : 'var(--pl-rule-strong)'}`,
                        background: topico?.concluido ? 'var(--pl-success)' : 'var(--pl-surface)',
                        color: topico?.concluido ? 'white' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Check size={13} strokeWidth={3} />
                    </button>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ borderRadius: 999, background: 'var(--pl-bg-soft)', padding: '2px 8px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-ink-3)' }}>
                          #{index + 1}
                        </span>
                        {topico?.concluido ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, background: 'var(--pl-success-soft)', padding: '2px 8px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-success)' }}>
                            <CheckCircle2 size={10} /> Concluído
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, background: 'var(--pl-warn-soft)', padding: '2px 8px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-warn)' }}>
                            <CircleDashed size={10} /> Pendente
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: topico?.concluido ? 'var(--pl-ink-3)' : 'var(--pl-ink)', textDecoration: topico?.concluido ? 'line-through' : 'none' }}>
                        {topico?.nome || 'Tópico sem nome'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ margin: '0 auto 16px', width: 48, height: 48, borderRadius: 16, background: 'var(--pl-bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-ink-3)' }}>
              <Plus size={20} />
            </div>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--pl-ink)', marginBottom: 8 }}>Nenhum tópico cadastrado ainda</h4>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-3)' }}>
              Use o botão acima para começar a estruturar essa disciplina.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InsightRow({ title, text }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 16px' }}>
      <p className="pl-eyebrow" style={{ marginBottom: 6, color: 'var(--pl-accent)' }}>{title}</p>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)', lineHeight: 1.55, margin: 0 }}>{text}</p>
    </div>
  );
}
