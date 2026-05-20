import React from 'react';
import { ArrowRight, CalendarDays, Crown, Heart, Layers3, Target } from 'lucide-react';

export default function MeusConcursos({
  contests = [],
  targetContestId = '',
  onSetTargetContest,
  onOpenContest,
}) {
  const importedCount = contests.filter((item) => item.imported).length;
  const targetContest = contests.find((item) => item.id === targetContestId) || null;

  return (
    <div className="pl-app pl-mc-shell">

      {/* ── Cabeçalho editorial ── */}
      <header className="pl-mc-head">
        <div className="pl-mc-head-left">
          <span className="pl-eyebrow">
            <Target size={12} strokeWidth={2.5} />
            Meus concursos
          </span>
          <h1 className="pl-mc-title">Seus concursos ativos</h1>
          <p className="pl-mc-subtitle">
            {contests.length > 0
              ? `${contests.length} concurso(s) na sua base`
              : 'Importe um concurso para começar'}
          </p>
        </div>
        <div className="pl-mc-head-stats">
          <span className="pl-mc-stat">
            <strong className="tabular-nums">{importedCount}</strong>
            importado(s)
          </span>
          <span className="pl-mc-stat">
            <strong className="tabular-nums">{contests.length - importedCount}</strong>
            no radar
          </span>
        </div>
      </header>

      {/* ── Concurso alvo ── */}
      {targetContest && (
        <section className="pl-mc-target">
          <p className="pl-eyebrow" style={{ color: 'var(--pl-accent)' }}>
            <Target size={12} strokeWidth={2.5} />
            Concurso alvo
          </p>
          <div className="pl-mc-target-body">
            <div>
              <h3 className="pl-mc-target-nome">{targetContest.nome}</h3>
              <p className="pl-mc-target-cargo">
                {targetContest.cargo || targetContest.concurso}
              </p>
            </div>
            <div className="pl-mc-target-actions">
              <span className="pl-mc-dias">
                {targetContest.diasParaProva !== null
                  ? `Faltam ${targetContest.diasParaProva} dia(s)`
                  : 'Sem prova definida'}
              </span>
              <button
                type="button"
                onClick={() => onOpenContest?.(targetContest.id)}
                className="pl-btn pl-btn-primary pl-mc-abrir"
              >
                Abrir concurso
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Lista de concursos ── */}
      <section className="pl-mc-section">
        <div className="pl-mc-section-head">
          <div>
            <p className="pl-eyebrow">Sua base</p>
            <h3 className="pl-mc-section-title">Concursos acompanhados</h3>
          </div>
          <span className="pl-pill pl-pill-muted">{contests.length} concurso(s)</span>
        </div>

        {contests.length === 0 ? (
          <div className="pl-mc-empty">
            Seus concursos vão aparecer aqui quando você importar, favoritar ou marcar interesse.
          </div>
        ) : (
          <div className="pl-mc-grid">
            {contests.map((contest) => (
              <article key={contest.id} className="pl-mc-card">
                <div className="pl-mc-card-tags">
                  {contest.isTarget && <Tag tone="yellow">Alvo</Tag>}
                  {contest.imported && <Tag tone="blue">Importado</Tag>}
                  {contest.favorite && <Tag tone="rose">Favorito</Tag>}
                  {contest.interested && <Tag tone="amber">Interesse</Tag>}
                </div>

                <h4 className="pl-mc-card-nome">{contest.nome}</h4>
                <p className="pl-mc-card-cargo">
                  {contest.cargo || contest.concurso}
                </p>

                <div className="pl-mc-miniboxes">
                  <MiniBox
                    icon={<CalendarDays size={14} />}
                    label="Prova"
                    value={contest.prova_data ? String(contest.prova_data).split('-').reverse().join('/') : 'A definir'}
                  />
                  <MiniBox
                    icon={<Layers3 size={14} />}
                    label="Checklist"
                    value={`${contest.checklistDoneCount} etapa(s)`}
                  />
                  <MiniBox
                    icon={<Crown size={14} />}
                    label="Disciplinas"
                    value={String(contest.disciplinas?.length || 0)}
                  />
                  <MiniBox
                    icon={<Heart size={14} />}
                    label="Andamento"
                    value={`${contest.disciplinasIniciadas} iniciada(s)`}
                  />
                </div>

                <div className="pl-mc-card-actions">
                  <button
                    type="button"
                    onClick={() => onSetTargetContest?.(contest.id)}
                    className={`pl-mc-alvo-btn ${contest.isTarget ? 'is-target' : ''}`}
                  >
                    {contest.isTarget ? 'Alvo atual' : 'Definir como alvo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenContest?.(contest.id)}
                    className="pl-btn pl-btn-primary pl-mc-abrir"
                  >
                    Abrir
                    <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Tag({ children, tone = 'blue' }) {
  const toneClasses = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    rose: 'border-rose-100 bg-rose-50 text-rose-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    yellow: 'border-yellow-100 bg-yellow-50 text-yellow-700',
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClasses[tone] || toneClasses.blue}`}
    >
      {children}
    </span>
  );
}

function MiniBox({ icon, label, value }) {
  return (
    <div>
      <div className="mb-icon-row">
        {icon}
        <p className="mb-label">{label}</p>
      </div>
      <p className="mb-value">{value}</p>
    </div>
  );
}
