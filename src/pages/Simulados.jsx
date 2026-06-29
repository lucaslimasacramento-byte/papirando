import React, { useEffect, useMemo, useState } from 'react';
import PremiumGate from '../components/PremiumGate';
import { usePlanLimits } from '../hooks/usePlanLimits';
import {
  ArrowRight,
  ClipboardList,
  PlusSquare,
  Search,
  Settings,
  Trophy,
} from 'lucide-react';
import SimuladosRankingPanel from '../components/SimuladosRankingPanel';
import { loadSimuladosLeaderboard, rankLeaderboard, displayNameFromRow } from '../lib/simuladosRankingData';
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
  isPremium = false,
  onUpgrade,
}) {
  const [historyQuery, setHistoryQuery] = useState('');
  const [rankingOpen, setRankingOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    let cancelled = false;
    loadSimuladosLeaderboard({ currentUserId, profile })
      .then((data) => {
        if (!cancelled) setLeaderboard(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setLeaderboard([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserId, profile]);

  // Preview real da sidebar (top 5 por nota Geral + posição do usuário).
  const rankingPreview = useMemo(() => {
    const ranked = rankLeaderboard(leaderboard, 'geral');
    const self = ranked.find((row) => row.isSelf);
    return {
      selfRank: self?.rank || null,
      rows: ranked.slice(0, 5).map((row) => ({
        id: row.id,
        rank: row.rank,
        name: row.isSelf ? 'Você' : displayNameFromRow(row),
        score: row.displayScore,
        isSelf: row.isSelf,
      })),
    };
  }, [leaderboard]);

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

  const tempoMedio = formatTempoMedio(groupedSimulados);
  const emptyState = groupedSimulados.length === 0 && simuladoHistory.length === 0;

  const { canUse: canUseLimit, getUsed, getLimit, increment: incUsage } = usePlanLimits(currentUserId, isPremium);
  const simuladosUsed  = getUsed('simulados_monthly');
  const simuladosLimit = getLimit('simulados_monthly');
  const simuladoLimitReached = !isPremium && !canUseLimit('simulados_monthly');

  function handleRegistrar() {
    if (simuladoLimitReached) { if (typeof onUpgrade === 'function') onUpgrade(); return; }
    // Cota só é consumida quando o simulado é REALMENTE salvo (callback no save),
    // não ao abrir o modal — antes, cancelar o modal já queimava 1 cota.
    openSimuladoReviewModal?.('novo', {
      onSaved: () => { if (!isPremium) incUsage('simulados_monthly'); },
    });
  }

  return (
    <div className="pl-page">
      <div className="simulados-wrap">
        <SimuladosHeader
          onRanking={() => setRankingOpen(true)}
          onCaderno={() => setIsCadernoModalOpen(true)}
          onRegistrar={handleRegistrar}
        />
        {simuladoLimitReached && (
          <div style={{ marginBottom: 12 }}>
            <PremiumGate locked mode="banner" feature="simulados_monthly"
              used={simuladosUsed} limit={simuladosLimit} onUpgrade={onUpgrade} />
          </div>
        )}

        <SimuladosRankingPanel
          open={rankingOpen}
          onClose={() => setRankingOpen(false)}
          profile={profile}
          currentUserId={currentUserId}
        />

        {emptyState ? (
          <SimuladosEmptyState
            onRegistrar={handleRegistrar}
            onCaderno={() => setIsCadernoModalOpen(true)}
          />
        ) : (
          <>
            <SimuladosKpiStrip
              totals={{
                total: displayTotal,
                media: displayAverage,
                melhor: displayBest,
                questoes: summary.totalQuestions,
                tempoMedio,
              }}
            />

            <section className="simulados-dashboard-grid">
              <div className="simulados-main-column">
                <div className="simulados-pathway-grid">
                  <PathwayCard
                    primary
                    onAction={handleRegistrar}
                    badge="Fluxo rápido"
                    badgeTone="accent"
                    title="Registrar prova externa"
                    description="Lance acertos, erros, brancos, tempo e banca para transformar qualquer prova em histórico."
                    meta={['Disciplinas por linha', 'Cronômetro opcional', 'Peso por matéria']}
                    cta="Abrir formulário"
                  />
                  <PathwayCard
                    onAction={() => setIsCadernoModalOpen(true)}
                    badge="Personalizado"
                    badgeTone="success"
                    title="Montar prova no caderno"
                    description="Combine questões do banco em uma prova sob medida e registre o desempenho depois."
                    meta={['Foco por disciplina', '+1.500 questões filtráveis', 'Mesma experiência de estudo']}
                    cta="Abrir caderno"
                  />
                </div>

                <HistoricoTabela
                  items={filteredHistory}
                  total={groupedSimulados.length}
                  query={historyQuery}
                  setQuery={setHistoryQuery}
                  onRevisar={(row) => openSimuladoReviewModal?.(row.id)}
                />
              </div>

              <aside className="simulados-side-column">
                <UltimoSimuladoDark
                  latest={latestSimulado}
                  onRevisar={() => latestSimulado && openSimuladoReviewModal?.(latestSimulado.id)}
                  onLinhaDoTempo={() => openHistoricoWithFilter?.('simulados')}
                />
                <EvolucaoPorMateria items={disciplineProgress} />
                <RankingSidebar
                  ranking={rankingPreview}
                  onAbrir={() => setRankingOpen(true)}
                />
              </aside>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function SimuladosHeader({ onRanking, onCaderno, onRegistrar }) {
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
      <div>
        <span className="pl-eyebrow">Prática em prova</span>
        <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
          Simulados<span style={{ color: 'var(--pl-accent)' }}>.</span>
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
          Registre provas externas, revise sua evolução e deixe o Papirando <span className="pl-mark-text">montar um caderno sob medida</span> quando quiser treinar.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" className="pl-btn" onClick={onRanking}><Trophy size={13} /> Ranking</button>
        <button type="button" className="pl-btn" onClick={onCaderno}><Settings size={13} /> Montar no caderno</button>
        <button type="button" className="pl-btn pl-btn-primary" onClick={onRegistrar}><PlusSquare size={13} /> Registrar prova</button>
      </div>
    </header>
  );
}

function SimuladosKpiStrip({ totals }) {
  const items = [
    { label: 'Realizados', value: String(totals.total).padStart(2, '0'), sub: `${totals.questoes} questões contadas` },
    { label: 'Média geral', value: `${totals.media}%`, sub: 'meta saudável >= 70%', tone: 'accent' },
    { label: 'Melhor nota', value: `${totals.melhor}%`, sub: 'seu pico até aqui', tone: 'success' },
    { label: 'Tempo médio', value: totals.tempoMedio, sub: 'por prova', tone: 'warn' },
  ];
  return (
    <section className="simulados-kpi-grid">
      {items.map((item) => (
        <div key={item.label} className={`pl-card simulados-kpi-card ${item.tone ? `simulados-kpi-${item.tone}` : ''}`}>
          <div className="pl-overline">{item.label}</div>
          <div className="simulados-kpi-value">{item.value}</div>
          <p>{item.sub}</p>
        </div>
      ))}
    </section>
  );
}

function PathwayCard({ onAction, badge, badgeTone = 'accent', title, description, meta, cta, primary = false }) {
  return (
    <article className="pl-card simulados-pathway-card">
      <div className="simulados-card-corner" />
      <span className={`pl-tag pl-tag-${badgeTone}`}>{badge}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <ul>
        {meta.map((text) => (
          <li key={text}><span className={primary ? 'is-primary' : ''} />{text}</li>
        ))}
      </ul>
      <button type="button" className={primary ? 'pl-btn pl-btn-primary' : 'pl-btn'} onClick={onAction}>{cta} <ArrowRight size={12} /></button>
    </article>
  );
}

function HistoricoTabela({ items, total, query, setQuery, onRevisar }) {
  return (
    <section className="pl-card simulados-history-card">
      <div className="simulados-history-head">
        <div>
          <div className="pl-overline">Arquivo</div>
          <h2>Histórico de simulados</h2>
          <p>{items.length} de {total} exibidos</p>
        </div>
        <label className="simulados-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar prova, banca ou data" /></label>
      </div>
      <div className="simulados-table-head">
        <span>Data</span><span>Prova</span><span>Banca</span><span>Desemp.</span><span>Questões</span><span>Tempo</span><span></span>
      </div>
      {items.length === 0 ? (
        <div className="simulados-table-empty">
          <ClipboardList size={34} />
          <h3>{total === 0 ? 'Nenhum simulado registrado ainda' : 'Nenhum resultado para a busca'}</h3>
          <p>{total === 0 ? 'Use Registrar prova para lançar sua primeira prova.' : 'Ajuste a busca ou limpe o campo.'}</p>
        </div>
      ) : (
        <div className="simulados-table-body">
          {items.map((row, index) => (
            <div key={row.id} className={`simulados-table-row ${index % 2 ? 'is-alt' : ''}`}>
              <span>{formatDate(row.date)}</span>
              <span><strong>{row.title}</strong><em>{`Acertos ${row.acertos} · Erros ${row.erros} · Brancos ${row.brancos} · Líquida ${row.notaLiquida}`}</em></span>
              <span>{row.banca || '-'}</span>
              <span><b className={`pl-tag ${accuracyTagClass(row.accuracy)}`}>{row.accuracy}%</b></span>
              <span className="pl-serif-number">{row.questions || '-'}</span>
              <span>{row.tempo || '-'}</span>
              <button type="button" className="pl-btn-link" onClick={() => onRevisar(row)}>Revisar <ArrowRight size={11} /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UltimoSimuladoDark({ latest, onRevisar, onLinhaDoTempo }) {
  if (!latest) {
    return <section className="simulados-dark-card"><div className="pl-overline">Último simulado</div><h3>Nenhum registro ainda.</h3></section>;
  }
  return (
    <section className="simulados-dark-card">
      <div className="simulados-card-corner" />
      <div className="pl-overline">Último simulado / {formatDate(latest.date)}</div>
      <h3>{latest.title}</h3>
      <p>{latest.banca || 'Banca não informada'} / tempo {latest.tempo || '-'}</p>
      <div className="simulados-dark-score"><strong>{latest.accuracy}%</strong><span>desempenho final</span></div>
      <div className="simulados-breakdown">
        <span className="is-success"><b>{latest.acertos}</b>Acertos</span>
        <span className="is-danger"><b>{latest.erros}</b>Erros</span>
        <span><b>{latest.brancos}</b>Brancos</span>
      </div>
      <div className="simulados-dark-actions"><button type="button" onClick={onRevisar}>Revisar prova</button><button type="button" onClick={onLinhaDoTempo}>Linha do tempo</button></div>
    </section>
  );
}

function EvolucaoPorMateria({ items }) {
  return (
    <section className="pl-card simulados-progress-card">
      <div className="pl-overline">Por disciplina</div>
      <h3>Evolução em prova</h3>
      {items.length === 0 ? <div className="simulados-dashed-note">Sem disciplinas suficientes ainda.</div> : items.slice(0, 6).map((item) => <ProgressRow key={item.name} item={item} />)}
    </section>
  );
}

function ProgressRow({ item }) {
  const tone = item.accuracy >= 80 ? 'success' : item.accuracy >= 65 ? 'accent' : 'warn';
  return (
    <div className={`simulados-progress-row tone-${tone}`}>
      <div><span>{item.name}</span><b>{item.accuracy}%</b></div>
      <div><i style={{ width: `${Math.min(100, item.accuracy)}%` }} /></div>
    </div>
  );
}

function RankingSidebar({ ranking, onAbrir }) {
  return (
    <section className="pl-card-paper simulados-ranking-card">
      <div className="simulados-ranking-head"><div><div className="pl-overline">Comunidade</div><h3>Ranking</h3></div><strong>#{ranking.selfRank || '-'}</strong></div>
      <div className="simulados-ranking-list">
        {ranking.rows.map((row) => <div key={row.id} className={row.isSelf ? 'is-self' : ''}><span>{row.rank}</span><b>{row.name}</b><em>{row.score}</em></div>)}
      </div>
      <button type="button" className="pl-btn-link" onClick={onAbrir}>Ver ranking completo <ArrowRight size={12} /></button>
    </section>
  );
}

function SimuladosEmptyState({ onRegistrar, onCaderno }) {
  return (
    <section className="pl-card-paper simulados-empty-state">
      <div className="pl-overline">Primeira prova</div>
      <h2>A prova vira linha de histórico em 30 segundos.</h2>
      <p>Comece registrando uma prova externa ou monte um caderno personalizado com o banco de questões.</p>
      <div className="simulados-pathway-grid">
        <PathwayCard primary badge="01 Fluxo rápido" badgeTone="accent" title="Registrar prova externa" description="Lance totais por disciplina e salve o desempenho." meta={['Acertos, erros e brancos', 'Tempo e banca', 'Comentário final']} cta="Registrar" onAction={onRegistrar} />
        <PathwayCard badge="02 Personalizado" badgeTone="success" title="Montar no caderno" description="Escolha filtros e gere uma prova sob medida." meta={['Quantidade ajustável', 'Filtros por banca', 'Resultado vira histórico']} cta="Montar" onAction={onCaderno} />
      </div>
    </section>
  );
}

function accuracyTagClass(accuracy) {
  if (accuracy >= 80) return 'pl-tag-success';
  if (accuracy >= 65) return 'pl-tag-accent';
  return 'pl-tag-warn';
}

function formatTempoMedio(items) {
  if (!items.length) return '--';
  const minutes = Math.round(items.reduce((acc, item) => acc + parseStudyTimeToMinutes(item.tempo), 0) / items.length);
  const hh = Math.floor(minutes / 60);
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}h${mm}`;
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
