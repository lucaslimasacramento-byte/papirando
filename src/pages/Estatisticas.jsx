import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  Layers,
  PieChart,
} from 'lucide-react';
import {
  buildCanonicalHistory,
  calculateStudyStreak,
  formatMinutesLabel,
  parseStudyTimeToMinutes,
} from '../lib/studyAnalytics';
import { canonicalizeSubjectName } from '../lib/subjectCatalogUtils';
import { getSubjectColor } from '../lib/subjectPalette';

export default function Estatisticas({
  setIsFilterPanelOpen,
  historicoReal = [],
  bancoDisciplinas = [],
  subjectCatalog = [],
  redacaoSummary = {},
}) {
  const [period, setPeriod] = useState(30);
  const canonicalHistory = useMemo(
    () => buildCanonicalHistory(historicoReal, subjectCatalog),
    [historicoReal, subjectCatalog]
  );

  const materias = useMemo(() => {
    const map = new Map();
    canonicalHistory.forEach((item) => {
      const nome = item.disciplinaCanonica || item.disciplina || item.subject || '';
      if (!nome) return;
      const current = map.get(nome) || { nome, tempoMin: 0, acertos: 0, erros: 0 };
      current.tempoMin += parseStudyTimeToMinutes(item.tempo);
      current.acertos += Number(item.acertos || 0);
      current.erros += Number(item.erros || 0);
      map.set(nome, current);
    });
    return [...map.values()]
      .map((item) => {
        const questions = item.acertos + item.erros;
        return {
          ...item,
          questions,
          acuracia: questions > 0 ? Math.round((item.acertos / questions) * 100) : 0,
          color: getSubjectColor(item.nome),
        };
      })
      .sort((a, b) => b.tempoMin - a.tempoMin);
  }, [canonicalHistory]);

  const totals = useMemo(() => {
    const totalTempo = materias.reduce((acc, item) => acc + item.tempoMin, 0);
    const totalQuestoes = materias.reduce((acc, item) => acc + item.questions, 0);
    const totalAcertos = materias.reduce((acc, item) => acc + item.acertos, 0);
    const topicosConcluidos = bancoDisciplinas.reduce(
      (acc, disciplina) => acc + (disciplina.topicos || []).filter((topico) => topico.concluido).length,
      0
    );
    const totalTopicos = bancoDisciplinas.reduce((acc, disciplina) => acc + (disciplina.topicos || []).length, 0);
    return {
      totalTempo,
      totalQuestoes,
      totalAcertos,
      acuraciaGlobal: totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0,
      streak: calculateStudyStreak(canonicalHistory),
      edital: totalTopicos > 0 ? Math.round((topicosConcluidos / totalTopicos) * 100) : 0,
      topicosConcluidos,
    };
  }, [bancoDisciplinas, canonicalHistory, materias]);

  const evolucao = useMemo(() => buildEvolution(canonicalHistory, period), [canonicalHistory, period]);
  const melhor = [...materias].filter((item) => item.questions > 0).sort((a, b) => b.acuracia - a.acuracia)[0] || null;
  const pior = [...materias].filter((item) => item.questions > 0).sort((a, b) => a.acuracia - b.acuracia)[0] || null;
  const updatedAt = canonicalHistory.length > 0 ? 'há poucos instantes' : 'sem registros';

  return (
    <div className="pl-paper-bg-soft" style={{ flex: 1, overflow: 'auto', padding: '18px 20px 40px' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <EstatisticasHeader onFiltros={() => setIsFilterPanelOpen?.(true)} />

        <KpiStrip totals={totals} />

        <SecondaryStatsStrip
          redacaoSummary={redacaoSummary}
          stats={{ simulados: 0, mediaSimulados: '0%' }}
          updatedAt={updatedAt}
        />

        <section className="stats-visual-grid">
          <EvolucaoCard data={evolucao} period={period} onPeriod={setPeriod} />
          <DistribuicaoDonutCard materias={materias} totalTempo={totals.totalTempo} />
        </section>

        <AnaliseMateriasCard materias={materias} melhor={melhor} pior={pior} />

        <BizuDiagnosticoCard
          melhor={melhor}
          pior={pior}
          acuraciaGlobal={totals.acuraciaGlobal}
          topicRows={buildTopicRows(bancoDisciplinas, subjectCatalog)}
        />
      </div>
    </div>
  );
}

function EstatisticasHeader({ onFiltros }) {
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
      <div>
          <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
            Estatísticas profundas<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
            Tempo, acurácia e distribuição por matéria para enxergar onde seu estudo está rendendo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="pl-btn pl-btn-ghost">Matérias padronizadas</button>
          <button type="button" className="pl-btn pl-btn-secondary" onClick={onFiltros}>
            <Filter size={14} />
            Filtros avançados
          </button>
        </div>
    </header>
  );
}

function KpiStrip({ totals }) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
      <StatKpi icon={Clock} label="Tempo de estudo" value={formatMinutesLabel(totals.totalTempo)} sub="volume acumulado" tone="ink" />
      <StatKpi icon={Flame} label="Constância" value={`${totals.streak} dias`} sub="sequência atual" tone="warn" />
      <StatKpi icon={CheckCircle2} label="Desempenho" value={`${totals.acuraciaGlobal}%`} sub={`${totals.totalAcertos}/${totals.totalQuestoes} questões`} tone="success" />
      <StatKpi icon={Layers} label="Edital coberto" value={`${totals.edital}%`} sub={`${totals.topicosConcluidos} tópicos concluídos`} tone="accent" />
    </section>
  );
}

function StatKpi({ icon: Icon, label, value, sub, tone }) {
  const toneClass = tone === 'success' ? 'pl-tag-success' : tone === 'warn' ? 'pl-tag-warn' : 'pl-tag-accent';
  return (
    <div className="pl-card" style={{ padding: 18, position: 'relative' }}>
      <span className={`pl-tag ${toneClass}`}><Icon size={12} />{label}</span>
      <div className="pl-serif-number" style={{ marginTop: 12, fontSize: 38, lineHeight: 1 }}>{value}</div>
      <p className="pl-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>{sub}</p>
    </div>
  );
}

function SecondaryStatsStrip({ redacaoSummary, stats, updatedAt }) {
  return (
    <section className="stats-secondary-strip">
      <MicroStat label="Redações" value={redacaoSummary.corrected || 0} />
      <MicroStat label="Melhor nota" value={redacaoSummary.bestScore || 0} />
      <MicroStat label="Rascunhos" value={redacaoSummary.drafts || 0} />
      <MicroStat label="Simulados" value={stats.simulados} />
      <MicroStat label="Média simulados" value={stats.mediaSimulados} />
      <div style={{ flex: 1 }} />
      <span className="pl-muted" style={{ fontSize: 12, fontWeight: 700 }}>Última atualização {updatedAt}</span>
    </section>
  );
}

function MicroStat({ label, value }) {
  return (
    <span className="stats-micro">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function EvolucaoCard({ data, period, onPeriod }) {
  return (
    <section className="pl-card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
        <div>
          <div className="pl-overline">Evolução</div>
          <h2 className="pl-section-title" style={{ marginTop: 7 }}>Desempenho nos últimos dias</h2>
        </div>
        <div className="planning-segment">
          {[7, 30, 90].map((item) => (
            <button key={item} type="button" className={period === item ? 'is-active' : ''} onClick={() => onPeriod(item)}>
              {item}d
            </button>
          ))}
        </div>
      </div>
      <EvolucaoChart data={data} />
    </section>
  );
}

function EvolucaoChart({ data }) {
  const width = 720;
  const height = 200;
  const left = 36;
  const right = 14;
  const top = 14;
  const bottom = 28;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const points = data.length > 0 ? data : [{ dia: 1, valor: 0 }];
  const mapped = points.map((point, index) => ({
    x: left + (points.length === 1 ? plotW : (index / (points.length - 1)) * plotW),
    y: top + plotH - (Math.max(0, Math.min(100, point.valor)) / 100) * plotH,
    ...point,
  }));
  const pathD = mapped.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const first = mapped[0];
  const last = mapped[mapped.length - 1];
  const baselineY = top + plotH;
  const areaD = `${pathD} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="220" role="img" aria-label="Evolução de desempenho">
      {[40, 60, 80, 100].map((guide) => {
        const y = top + plotH - (guide / 100) * plotH;
        return (
          <g key={guide}>
            <line x1={left} x2={width - right} y1={y} y2={y} stroke="var(--pl-rule)" strokeDasharray="4 5" />
            <text x={6} y={y + 4} fill="var(--pl-ink-3)" fontSize="10" fontWeight="700">{guide}%</text>
          </g>
        );
      })}
      <path d={areaD} fill="var(--pl-ink)" opacity="0.06" />
      <path d={pathD} fill="none" stroke="var(--pl-ink)" strokeWidth="1.7" />
      <circle cx={last.x} cy={last.y} r="8" fill="var(--pl-ink)" opacity="0.12" />
      <circle cx={last.x} cy={last.y} r="4" fill="var(--pl-ink)" />
      <text x={Math.max(80, last.x - 28)} y={Math.max(24, last.y - 12)} fill="var(--pl-ink)" style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 20 }}>
        {last.valor}%
      </text>
      <text x={left} y={height - 6} fill="var(--pl-ink-3)" fontSize="10" fontWeight="700">dia {points[0]?.dia || 1}</text>
      <text x={width / 2} y={height - 6} textAnchor="middle" fill="var(--pl-ink-3)" fontSize="10" fontWeight="700">meio</text>
      <text x={width - right} y={height - 6} textAnchor="end" fill="var(--pl-ink-3)" fontSize="10" fontWeight="700">hoje</text>
    </svg>
  );
}

function DistribuicaoDonutCard({ materias, totalTempo }) {
  const top = materias.slice(0, 6);
  return (
    <section className="pl-card" style={{ padding: 22 }}>
      <div className="pl-overline">Tempo por matéria</div>
      <h2 className="pl-section-title" style={{ marginTop: 7 }}>Distribuição</h2>
      <div className="stats-donut-wrap"><Donut materias={top} totalTempo={totalTempo} /></div>
      <div style={{ display: 'grid', gap: 8 }}>
        {top.map((item) => (
          <div key={item.nome} className="stats-donut-legend-row">
            <span style={{ background: item.color }} />
            <strong>{item.nome}</strong>
            <small>{totalTempo > 0 ? Math.round((item.tempoMin / totalTempo) * 100) : 0}%</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function Donut({ materias, totalTempo }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 88;
  const rInner = 62;
  let cum = 0;
  const segs = materias.map((item) => {
    const f = totalTempo > 0 ? item.tempoMin / totalTempo : 0;
    const start = cum * 360 - 90;
    const end = (cum + f) * 360 - 90;
    cum += f;
    return { ...item, start, end };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segs.map((seg) => (
        <path key={seg.nome} d={arcPath(cx, cy, rOuter, seg.start, seg.end, rInner)} fill={seg.color}>
          <title>{seg.nome}: {formatMinutesLabel(seg.tempoMin)}</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={54} fill="var(--pl-surface)" />
      <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 24 }} fill="var(--pl-ink)">
        {formatMinutesLabel(totalTempo)}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" style={{ fontFamily: 'var(--pl-sans)', fontWeight: 800, fontSize: 9, letterSpacing: '0.12em' }} fill="var(--pl-ink-3)">
        NO TOTAL
      </text>
    </svg>
  );
}

function AnaliseMateriasCard({ materias, melhor, pior }) {
  const maxTempo = Math.max(...materias.map((item) => item.tempoMin), 1);
  return (
    <section className="pl-card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'end', marginBottom: 16 }}>
        <div>
          <div className="pl-overline">Análise por matéria</div>
          <h2 className="pl-section-title" style={{ marginTop: 7 }}>Tempo, acurácia e força por frente</h2>
        </div>
        <span className="pl-small-label">Ordenado por tempo</span>
      </div>
      <div className="stats-table">
        <div className="stats-table-head">
          <span>Matéria</span><span>Tempo</span><span>Acurácia</span><span>Distribuição</span><span>Força</span>
        </div>
        {materias.length === 0 ? (
          <div className="planning-empty">Ainda não há registros suficientes para montar as estatísticas por matéria.</div>
        ) : materias.map((item) => (
          <MateriaRow key={item.nome} item={item} maxTempo={maxTempo} isBest={melhor?.nome === item.nome} isWorst={pior?.nome === item.nome} />
        ))}
      </div>
    </section>
  );
}

function MateriaRow({ item, maxTempo, isBest, isWorst }) {
  const width = Math.max(4, Math.round((item.tempoMin / maxTempo) * 100));
  const strength = Math.ceil(item.acuracia / 20);
  const accuracyColor = item.acuracia >= 75 ? 'var(--pl-success)' : item.acuracia >= 60 ? 'var(--pl-ink)' : 'var(--pl-warn)';
  return (
    <div className="stats-materia-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
        <span className="planning-subject-bar" style={{ background: item.color }} />
        <div style={{ minWidth: 0 }}>
          <strong>{item.nome}</strong>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {isBest ? <span className="pl-tag pl-tag-success">Forte</span> : null}
            {isWorst ? <span className="pl-tag pl-tag-warn">Gargalo</span> : null}
            <span className="pl-muted" style={{ fontSize: 11 }}>{item.questions} questões registradas</span>
          </div>
        </div>
      </div>
      <span className="pl-serif-number">{formatMinutesLabel(item.tempoMin)}</span>
      <span>
        <strong style={{ color: accuracyColor, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 19 }}>{item.acuracia}%</strong>
        <small>{item.acertos} ✓ · {item.erros} ✕</small>
      </span>
      <div className="pl-progress-track" style={{ height: 6 }}><div className="pl-progress-fill" style={{ width: `${width}%`, background: item.color }} /></div>
      <div className="stats-strength">{[1, 2, 3, 4, 5].map((bar) => <span key={bar} className={bar <= strength ? 'on' : ''} />)}</div>
    </div>
  );
}

function BizuDiagnosticoCard({ melhor, pior, acuraciaGlobal, topicRows }) {
  const potential = `+${Math.max(5, 100 - acuraciaGlobal)}%`;
  return (
    <section className="pl-card-ai stats-bizu">
      <div className="stats-bizu-head">
        <div>
          <span className="pl-tag-ai"><BrainCircuit size={13} /> Leitura da IA</span>
          <h2 className="pl-section-title" style={{ marginTop: 10 }}>Diagnóstico estratégico</h2>
        </div>
        <span className="pl-tag pl-tag-success">Potencial de subida {potential}</span>
      </div>
      <p className="pl-body">
        {melhor ? <strong>{melhor.nome}</strong> : 'Sua melhor frente'} está sustentando o desempenho.
        {' '}O gargalo mais claro agora é {pior ? <span className="pl-mark-text">{pior.nome}</span> : 'aguardar mais dados'}.
      </p>
      <div className="stats-bizu-grid">
        <BizuQuadrant label="O que está forte" title={melhor?.nome || 'Sem destaque'} detail={melhor ? `${melhor.acuracia}% de acurácia em ${melhor.questions} questões.` : 'Registre mais sessões para detectar força.'} accent="var(--pl-success)" />
        <BizuQuadrant label="O que pede ataque" title={pior?.nome || 'Sem gargalo'} detail={pior ? `${pior.acuracia}% de acurácia. Vale revisar antes de avançar.` : 'Nenhum ponto crítico detectado.'} accent="var(--pl-warn)" />
        <BizuQuadrant label="Próxima jogada" title="Bloco dirigido" detail={pior ? `Faça 30 a 45min de questões em ${pior.nome}.` : 'Siga registrando estudos para calibrar a próxima jogada.'} accent="var(--pl-ink)" />
        <BizuQuadrant label="Tópicos mais expandidos" title={topicRows[0]?.topico || 'Sem tópicos'} detail={topicRows[0] ? `${topicRows[0].qTot} questões em ${topicRows[0].disc}.` : 'Resolva questões por tópico para enriquecer este bloco.'} accent="var(--pl-highlight)" />
      </div>
    </section>
  );
}

function BizuQuadrant({ label, title, detail, accent }) {
  return (
    <div className="stats-bizu-quadrant" style={{ borderLeftColor: accent }}>
      <div className="pl-eyebrow" style={{ color: accent }}>{label}</div>
      <div className="pl-serif-number" style={{ fontSize: 20, marginTop: 7 }}>{title}</div>
      <p className="pl-muted" style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.45 }}>{detail}</p>
    </div>
  );
}

function buildEvolution(history, period) {
  const days = new Map();
  history.forEach((item) => {
    const day = String(item.data || '').slice(0, 10);
    if (!day) return;
    const current = days.get(day) || { acertos: 0, erros: 0 };
    current.acertos += Number(item.acertos || 0);
    current.erros += Number(item.erros || 0);
    days.set(day, current);
  });
  const sorted = [...days.entries()].sort().slice(-period);
  return sorted.map(([_, value], index) => {
    const total = value.acertos + value.erros;
    return { dia: index + 1, valor: total > 0 ? Math.round((value.acertos / total) * 100) : 0 };
  });
}

function buildTopicRows(bancoDisciplinas, subjectCatalog) {
  return bancoDisciplinas
    .flatMap((disciplina) =>
      (disciplina.topicos || []).map((topico) => {
        const total = Number(topico.acertos || 0) + Number(topico.erros || 0);
        return {
          disc: canonicalizeSubjectName(disciplina.nome, subjectCatalog),
          topico: topico.nome,
          qTot: total,
        };
      })
    )
    .filter((item) => item.qTot > 0)
    .sort((a, b) => b.qTot - a.qTot)
    .slice(0, 8);
}

function arcPath(cx, cy, rOuter, start, end, rInner) {
  const polar = (r, angle) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  });
  const s1 = polar(rOuter, end);
  const e1 = polar(rOuter, start);
  const s2 = polar(rInner, start);
  const e2 = polar(rInner, end);
  const large = end - start <= 180 ? '0' : '1';
  return `M ${s1.x} ${s1.y} A ${rOuter} ${rOuter} 0 ${large} 0 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${rInner} ${rInner} 0 ${large} 1 ${e2.x} ${e2.y} Z`;
}
