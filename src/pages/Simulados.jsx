import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BarChart2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  History,
  ListChecks,
  PieChart,
  PlusSquare,
  Search,
  Settings,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import SimuladosRankingPanel from '../components/SimuladosRankingPanel';
import {
  buildCanonicalHistory,
  buildDisciplineSummaryFromHistory,
  formatMinutesLabel,
  parseStudyTimeToMinutes,
} from '../lib/studyAnalytics';

export default function Simulados({
  openSimuladoReviewModal,
  openHistoricoWithFilter,
  setIsCadernoModalOpen,
  historicoReal = [],
  subjectCatalog = [],
  simulados = [],
  simuladoStats = { total: 0, mediaDesempenho: 0, melhorNota: 0 },
  profile = {},
  currentUserId = '',
  redacaoSummary = {},
  communityMetrics = {},
}) {
  const [historyQuery, setHistoryQuery] = useState('');
  const [rankingOpen, setRankingOpen] = useState(false);

  const realStats = {
    total: Number(simuladoStats?.total || 0),
    mediaDesempenho: Number(simuladoStats?.mediaDesempenho || 0),
    melhorDesempenho: Number(simuladoStats?.melhorDesempenho || simuladoStats?.melhorNota || 0),
  };

  const canonicalHistory = useMemo(
    () => buildCanonicalHistory(historicoReal, subjectCatalog),
    [historicoReal, subjectCatalog]
  );
  const simuladoHistory = useMemo(
    () => canonicalHistory.filter((item) => String(item?.tipo || '').toUpperCase() === 'SIMULADO'),
    [canonicalHistory]
  );

  const groupedSimulados = useMemo(() => {
    if (Array.isArray(simulados) && simulados.length > 0) {
      return simulados
        .map((item) => {
          const rows = Array.isArray(item?.rows) ? item.rows : [];
          const acertos = Number(item?.acertos || 0);
          const erros = Number(item?.erros || 0);
          const brancos = Number(item?.brancos || 0);
          const questions = Number(item?.totalQuestoes || acertos + erros + brancos);

          return {
            id: item.id,
            date: item.data || '',
            title: item.nome || 'Simulado externo',
            tempo: item.tempo || '00:00:00',
            banca: item.banca || '',
            comentarios: item.comentarios || '',
            acertos,
            erros,
            brancos,
            questions,
            rows,
            accuracy: Number(item?.desempenho || (questions > 0 ? Math.round((acertos / questions) * 100) : 0)),
            notaLiquida: Number(item?.notaLiquida ?? item?.nota_liquida ?? (acertos - erros)),
          };
        })
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    }

    const grouped = new Map();

    simuladoHistory.forEach((item) => {
      const key = buildSimuladoKey(item);
      const current = grouped.get(key) || {
        id: key,
        date: item.data || '',
        title: item.material || 'Simulado externo',
        tempo: item.tempo || '00:00:00',
        banca: inferBankFromMaterial(item.material || ''),
        comentarios: inferCommentsFromMaterial(item.material || ''),
        acertos: 0,
        erros: 0,
        brancos: 0,
        questions: 0,
        rows: [],
      };

      current.acertos += Number(item.acertos || 0);
      current.erros += Number(item.erros || 0);
      current.brancos += Number(item.brancos || 0);
      current.questions += Number(item.acertos || 0) + Number(item.erros || 0) + Number(item.brancos || 0);
      current.rows.push({
        id: `${key}-${current.rows.length + 1}`,
        disciplina: item.disciplinaCanonica || item.disciplina || '',
        topico: item.topico || '',
        peso: 1,
        brancos: Number(item.brancos || 0),
        acertos: Number(item.acertos || 0),
        erros: Number(item.erros || 0),
      });
      grouped.set(key, current);
    });

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        accuracy: item.questions > 0 ? Math.round((item.acertos / item.questions) * 100) : 0,
        notaLiquida: Number((item.acertos - item.erros).toFixed(2)),
      }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [simuladoHistory, simulados]);

  const summary = useMemo(() => {
    if (Array.isArray(simulados) && simulados.length > 0) {
      const totalQuestions = groupedSimulados.reduce((acc, item) => acc + item.questions, 0);
      const totalMinutes = groupedSimulados.reduce((acc, item) => acc + parseStudyTimeToMinutes(item.tempo), 0);

      return {
        total: Number(simuladoStats?.total || groupedSimulados.length || 0),
        averageScore: Number(simuladoStats?.mediaDesempenho || 0),
        totalQuestions,
        totalMinutesLabel: formatMinutesLabel(totalMinutes),
        best: groupedSimulados[0] || null,
      };
    }

    const total = groupedSimulados.length;
    const averageScore =
      total > 0 ? Math.round(groupedSimulados.reduce((acc, item) => acc + item.accuracy, 0) / total) : 0;
    const totalQuestions = groupedSimulados.reduce((acc, item) => acc + item.questions, 0);
    const totalMinutes = simuladoHistory.reduce((acc, item) => acc + parseStudyTimeToMinutes(item.tempo), 0);

    return {
      total,
      averageScore,
      totalQuestions,
      totalMinutesLabel: formatMinutesLabel(totalMinutes),
      best: groupedSimulados[0] || null,
    };
  }, [groupedSimulados, simuladoHistory, simuladoStats, simulados]);

  const disciplineProgress = useMemo(
    () =>
      buildDisciplineSummaryFromHistory(simuladoHistory)
        .filter((item) => item.questions > 0)
        .slice(0, 5),
    [simuladoHistory]
  );

  const latestSimulado = groupedSimulados[0] || null;

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return groupedSimulados;
    return groupedSimulados.filter((item) => {
      const hay = `${item.title} ${item.banca} ${item.date} ${item.comentarios}`.toLowerCase();
      return hay.includes(q);
    });
  }, [groupedSimulados, historyQuery]);

  const displayTotal = realStats.total > 0 ? realStats.total : summary.total;
  const displayAverage = realStats.mediaDesempenho > 0 ? realStats.mediaDesempenho : summary.averageScore;
  const displayBest = realStats.melhorDesempenho > 0 ? realStats.melhorDesempenho : summary.best?.accuracy || 0;

  return (
    <div className="pl-paper-bg" style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '28px 28px 56px' }}>

      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="pl-eyebrow" style={{ marginBottom: 6 }}>Prática em prova</div>
          <h1 className="pl-display" style={{ fontSize: 38, margin: 0 }}>Seus simulados.</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="pl-btn pl-btn-ghost" onClick={() => openHistoricoWithFilter?.('simulados')}>
            <History size={13} /> Histórico
          </button>
          <button type="button" className="pl-btn pl-btn-ghost" onClick={() => setIsCadernoModalOpen(true)}>
            <Settings size={13} /> Caderno
          </button>
          {/* Ranking — keeps special gradient styling */}
          <button
            type="button"
            onClick={() => setRankingOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 34, padding: '0 14px', borderRadius: 8, border: 0, cursor: 'pointer',
              background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
              color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
            }}
          >
            <Trophy size={13} style={{ color: '#fbbf24' }} />
            Ranking
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.15)', borderRadius: 4, padding: '1px 5px',
            }}>Top</span>
          </button>
          <button type="button" className="pl-btn pl-btn-primary" onClick={() => openSimuladoReviewModal?.('novo')}>
            <PlusSquare size={13} /> Registrar resultado
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <PlKpi label="Realizados" value={String(displayTotal)} sub="simulados registrados" icon={FileText} />
        <PlKpi label="Média geral" value={`${displayAverage}%`} sub="desempenho médio" icon={BarChart2} />
        <PlKpi label="Melhor nota" value={`${displayBest}%`} sub="máximo registrado" icon={Award} />
      </div>

      <SimuladosRankingPanel
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
        profile={profile}
        currentUserId={currentUserId}
        historicoReal={historicoReal}
        redacaoSummary={redacaoSummary}
        communityMetrics={communityMetrics}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <PathwayCard
              onAction={() => openSimuladoReviewModal?.('novo')}
              badge="Fluxo rápido"
              title="Registrar prova externa"
              description="Lançar acertos, erros, brancos, tempo e banca — ideal para simulados de cursinho ou PDF."
              meta={[
                { icon: ListChecks, text: 'Disciplinas por linha' },
                { icon: Clock, text: 'Cronômetro opcional' },
              ]}
              cta="Abrir formulário"
            />
            <PathwayCard
              onAction={() => setIsCadernoModalOpen(true)}
              badge="Personalizado"
              title="Montar prova no caderno"
              description="Combine questões do banco em uma prova sob medida e registre o desempenho depois."
              meta={[
                { icon: Target, text: 'Foco por disciplina' },
                { icon: FileText, text: 'Mesma experiência de estudo' },
              ]}
              cta="Abrir caderno"
              tone="secondary"
            />
          </div>

          <div className="pl-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--pl-rule)', padding: '14px 18px' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>Histórico de simulados</div>
                <div style={{ fontSize: 11.5, color: 'var(--pl-ink-3)', marginTop: 2 }}>
                  {filteredHistory.length} de {groupedSimulados.length} exibidos
                </div>
              </div>
              <div style={{ position: 'relative', maxWidth: 240 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-ink-4)', pointerEvents: 'none' }} />
                <input
                  type="search"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  placeholder="Buscar por nome, banca…"
                  className="pl-input"
                  style={{ paddingLeft: 30, height: 32, fontSize: 12.5, width: '100%' }}
                />
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <ClipboardList size={28} style={{ color: 'var(--pl-ink-4)', margin: '0 auto 10px' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink-2)', marginBottom: 6 }}>
                  {groupedSimulados.length === 0 ? 'Nenhum simulado registrado ainda' : 'Nenhum resultado para a busca'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--pl-ink-3)' }}>
                  {groupedSimulados.length === 0
                    ? 'Use "Registrar resultado" para lançar sua primeira prova.'
                    : 'Ajuste os termos da busca.'}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--pl-rule)' }}>
                      {['Data', 'Prova', 'Banca', 'Desemp.', 'Questões', 'Tempo', ''].map((col) => (
                        <th key={col} className="pl-eyebrow" style={{
                          fontSize: 9.5, textAlign: 'left', padding: '9px 13px',
                          background: 'var(--pl-bg-soft)',
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--pl-rule)' }}>
                        <td style={{ padding: '11px 13px', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--pl-ink-2)', fontWeight: 600 }}>
                          {formatDate(row.date)}
                        </td>
                        <td style={{ padding: '11px 13px', maxWidth: 200 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.title}>{row.title}</div>
                          {row.comentarios && <div style={{ fontSize: 11, color: 'var(--pl-ink-4)', marginTop: 2 }}>{row.comentarios}</div>}
                        </td>
                        <td style={{ padding: '11px 13px', fontSize: 12, color: 'var(--pl-ink-2)' }}>{row.banca || '—'}</td>
                        <td style={{ padding: '11px 13px', textAlign: 'center' }}>
                          <AccuracyBadge value={row.accuracy} />
                        </td>
                        <td style={{ padding: '11px 13px', textAlign: 'center' }}>
                          <span className="pl-num" style={{ fontSize: 14 }} title={row.questions > 0 ? `${row.acertos} acertos · ${row.erros} erros · ${row.brancos} brancos` : undefined}>
                            {row.questions > 0 ? row.questions : '—'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 13px', fontSize: 12, color: 'var(--pl-ink-2)', whiteSpace: 'nowrap' }}>{row.tempo || '—'}</td>
                        <td style={{ padding: '11px 13px', textAlign: 'right' }}>
                          <button type="button" className="pl-btn pl-btn-ghost" style={{ height: 28, fontSize: 12, padding: '0 10px' }}
                            onClick={() => openSimuladoReviewModal?.(row.id)}>
                            Revisar <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Evolução por matéria */}
          <div className="pl-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <TrendingUp size={13} style={{ color: 'var(--pl-accent)' }} />
              <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Evolução por matéria</span>
            </div>
            {disciplineProgress.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', lineHeight: 1.5 }}>
                Quando houver simulados com disciplinas no histórico, o desempenho médio aparece aqui.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {disciplineProgress.map((item) => {
                  const barColor = item.accuracy >= 80 ? 'var(--pl-success)' : item.accuracy >= 65 ? 'var(--pl-accent)' : 'var(--pl-warn)';
                  return (
                    <div key={item.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        <span className="pl-num" style={{ fontSize: 13, color: barColor, flexShrink: 0 }}>{item.accuracy}%</span>
                      </div>
                      <div className="pl-progress">
                        <div className="pl-progress-bar" style={{ width: `${Math.min(100, item.accuracy)}%`, background: barColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Último simulado */}
          <div className="pl-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <History size={13} style={{ color: 'var(--pl-accent)' }} />
              <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Último simulado</span>
            </div>
            {latestSimulado ? (
              <div>
                <div className="pl-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Realizado em {formatDate(latestSimulado.date)}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 4 }}>{latestSimulado.title}</div>
                {latestSimulado.banca && <div style={{ fontSize: 12, color: 'var(--pl-ink-3)', marginBottom: 12 }}>Banca: {latestSimulado.banca}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
                  {[['Acertos', latestSimulado.acertos, 'var(--pl-success)'], ['Erros', latestSimulado.erros, 'var(--pl-danger)'], ['Brancos', latestSimulado.brancos, 'var(--pl-ink-4)']].map(([lbl, val, clr]) => (
                    <div key={lbl} style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--pl-bg-soft)', borderRadius: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: clr, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{lbl}</div>
                      <div className="pl-num" style={{ fontSize: 16 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--pl-bg-soft)', borderRadius: 6, marginBottom: 12 }}>
                  <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Nota líquida</span>
                  <span className="pl-num" style={{ fontSize: 20, color: 'var(--pl-success)' }}>{latestSimulado.notaLiquida}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button type="button" className="pl-btn pl-btn-primary" style={{ justifyContent: 'center', fontSize: 12 }} onClick={() => openSimuladoReviewModal?.(latestSimulado.id)}>
                    Revisar
                  </button>
                  <button type="button" className="pl-btn pl-btn-ghost" style={{ justifyContent: 'center', fontSize: 12 }} onClick={() => openHistoricoWithFilter?.('simulados')}>
                    Histórico
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px 12px', textAlign: 'center', border: '1px dashed var(--pl-rule-2)', borderRadius: 8, fontSize: 12.5, color: 'var(--pl-ink-3)' }}>
                Nenhum simulado registrado ainda.
              </div>
            )}
          </div>

          {/* Resumo */}
          <div className="pl-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <PieChart size={13} style={{ color: 'var(--pl-accent)' }} />
              <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Resumo operacional</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Registros fechados', String(displayTotal)],
                ['Questões contabilizadas', String(summary.totalQuestions)],
                ['Média atual', `${displayAverage}%`],
                ['Melhor desempenho', `${displayBest}%`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--pl-bg-soft)', borderRadius: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{label}</span>
                  <span className="pl-num" style={{ fontSize: 14 }}>{value}</span>
                </div>
              ))}
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

function AccuracyBadge({ value }) {
  const color = value >= 80 ? 'var(--pl-success)' : value >= 65 ? 'var(--pl-accent)' : value <= 0 ? 'var(--pl-ink-4)' : 'var(--pl-warn)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 44, height: 22, padding: '0 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 700,
      background: color + '18',
      color,
      border: `1px solid ${color}40`,
    }}>
      {value}%
    </span>
  );
}

function PathwayCard({ onAction, badge, title, description, meta, cta, tone = 'primary' }) {
  return (
    <div className="pl-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--pl-rule)' }}>
        <span className="pl-tag">{badge}</span>
      </div>
      <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 6 }}>{title}</div>
        <p style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', lineHeight: 1.5, flex: 1, margin: '0 0 14px' }}>{description}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {meta.map((m) => (
            <li key={m.text} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
              <m.icon size={13} style={{ color: 'var(--pl-accent)', flexShrink: 0 }} />
              {m.text}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onAction}
          className={tone === 'secondary' ? 'pl-btn pl-btn-ghost' : 'pl-btn pl-btn-primary'}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {cta}
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString('pt-BR');
}

function buildSimuladoKey(item) {
  return `${item.data || 'sem-data'}|${item.material || 'Simulado externo'}`;
}

function inferBankFromMaterial(material = '') {
  const parts = String(material || '')
    .split(' | ')
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length < 2) return '';
  return parts[1] || '';
}

function inferCommentsFromMaterial(material = '') {
  const parts = String(material || '')
    .split(' | ')
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length < 3) return '';
  return parts.slice(2).join(' | ');
}
