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
    <div className="pl-paper-bg" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '28px 28px 56px' }}>

      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="pl-eyebrow" style={{ marginBottom: 6 }}>Meus concursos</div>
          <h1 className="pl-display" style={{ fontSize: 38, margin: 0 }}>
            {contests.length > 0 ? 'Seus concursos ativos.' : 'Comece aqui.'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="pl-tag" style={{ height: 28, display: 'inline-flex', alignItems: 'center' }}>{importedCount} importado(s)</span>
          <span className="pl-tag" style={{ height: 28, display: 'inline-flex', alignItems: 'center' }}>{contests.length - importedCount} no radar</span>
        </div>
      </div>

      {/* Target contest highlight */}
      {targetContest && (
        <div className="pl-card-ai" style={{ padding: 20 }}>
          <div className="pl-eyebrow" style={{ fontSize: 9.5, marginBottom: 10 }}>Concurso alvo</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div>
              <div style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: 'var(--pl-ink)', letterSpacing: '-0.04em', marginBottom: 4 }}>
                {targetContest.nome}
              </div>
              <div style={{ fontSize: 13, color: 'var(--pl-ink-3)' }}>{targetContest.cargo || targetContest.concurso}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="pl-tag" style={{ height: 30 }}>
                {targetContest.diasParaProva !== null ? `Faltam ${targetContest.diasParaProva} dia(s)` : 'Sem prova definida'}
              </span>
              <button type="button" className="pl-btn pl-btn-primary" onClick={() => onOpenContest?.(targetContest.id)}>
                Abrir concurso <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contests grid */}
      <div className="pl-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--pl-rule)' }}>
          <div>
            <div className="pl-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>Sua base</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)' }}>Concursos acompanhados</div>
          </div>
          <span className="pl-tag">{contests.length} concurso(s)</span>
        </div>

        <div style={{ padding: 20 }}>
          {contests.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', border: '1px dashed var(--pl-rule-2)', borderRadius: 8, fontSize: 13, color: 'var(--pl-ink-3)' }}>
              Seus concursos vão aparecer aqui quando você importar, favoritar ou marcar interesse.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {contests.map((contest) => (
                <article key={contest.id} className="pl-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {contest.isTarget && <span className="pl-tag pl-tag-warn">Alvo</span>}
                    {contest.imported && <span className="pl-tag">Importado</span>}
                    {contest.favorite && <span className="pl-tag">Favorito</span>}
                    {contest.interested && <span className="pl-tag">Interesse</span>}
                  </div>

                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 4 }}>{contest.nome}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', minHeight: 36, marginBottom: 12 }}>
                    {contest.cargo || contest.concurso}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                    <MiniBox icon={<CalendarDays size={12} style={{ color: 'var(--pl-accent)' }} />} label="Prova" value={contest.prova_data ? String(contest.prova_data).split('-').reverse().join('/') : 'A definir'} />
                    <MiniBox icon={<Layers3 size={12} style={{ color: 'var(--pl-accent)' }} />} label="Etapas" value={`${contest.checklistDoneCount} feita(s)`} />
                    <MiniBox icon={<Crown size={12} style={{ color: 'var(--pl-accent)' }} />} label="Disciplinas" value={String(contest.disciplinas?.length || 0)} />
                    <MiniBox icon={<Heart size={12} style={{ color: 'var(--pl-accent)' }} />} label="Andamento" value={`${contest.disciplinasIniciadas} iniciada(s)`} />
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="pl-btn pl-btn-ghost"
                      style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                      onClick={() => onSetTargetContest?.(contest.id)}
                    >
                      {contest.isTarget ? 'Alvo atual' : 'Definir como alvo'}
                    </button>
                    <button
                      type="button"
                      className="pl-btn pl-btn-primary"
                      style={{ fontSize: 12, justifyContent: 'center' }}
                      onClick={() => onOpenContest?.(contest.id)}
                    >
                      Abrir <ArrowRight size={11} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniBox({ icon, label, value }) {
  return (
    <div style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--pl-rule-strong)', background: 'var(--pl-bg-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {icon}
        <span className="pl-eyebrow" style={{ fontSize: 9 }}>{label}</span>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink)' }}>{value}</div>
    </div>
  );
}
