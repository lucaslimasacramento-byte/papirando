import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart2, Loader2, PenLine, Sparkles, Target, Trophy, User, X } from 'lucide-react';
import {
  computeRedacaoRankingPoints,
  displayNameFromRow,
  loadOfficialRankingBoard,
} from '../lib/simuladosRankingData';

function avatarFallbackSeed(row) {
  return encodeURIComponent(String(row?.username || row?.fullName || row?.id || 'u').slice(0, 48));
}

function avatarSrc(row) {
  const url = String(row?.avatarUrl || '').trim();
  if (url) return url;
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${avatarFallbackSeed(row)}`;
}

export default function SimuladosRankingPanel({
  open,
  onClose,
  profile = {},
  currentUserId = '',
  historicoReal = [],
  redacaoSummary = {},
  communityMetrics = {},
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);

  const selfPreview = useMemo(() => {
    const rq = computeRedacaoRankingPoints(redacaoSummary);
    const qq = Number(
      communityMetrics?.correctAnswers != null
        ? communityMetrics.correctAnswers
        : (Array.isArray(historicoReal) ? historicoReal : []).reduce((a, r) => a + Number(r?.acertos || 0), 0)
    );
    return { questionPts: qq, redacaoPts: rq, total: qq + rq };
  }, [communityMetrics, historicoReal, redacaoSummary]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await loadOfficialRankingBoard({
        currentUserId,
        historicoReal,
        redacaoSummary,
        communityMetrics,
        profile,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(String(e?.message || 'Nao foi possivel carregar o ranking.'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [communityMetrics, currentUserId, historicoReal, profile, redacaoSummary]);

  useEffect(() => {
    if (!open) return undefined;
    refresh();
    return undefined;
  }, [open, refresh]);

  useEffect(() => {
    if (!open) setSelectedPerson(null);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 95, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(20,17,13,0.70)', backdropFilter: 'blur(4px)', padding: 0 }}>
      <button type="button" aria-label="Fechar ranking" style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
      <div className="simulados-modal-shell simulados-ranking-modal" role="dialog" aria-modal="true" aria-labelledby="ranking-dialog-title">
        <header className="simulados-modal-head">
          <div>
            <div className="pl-overline">Comunidade Papirando</div>
            <h2 id="ranking-dialog-title">Ranking.</h2>
            <p>Pontuacao oficial: acertos em questoes somados aos pontos de redacao.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </header>

        <div className="simulados-ranking-stats">
          <span><b>{selfPreview.questionPts}</b>Questoes</span>
          <span><b>{selfPreview.redacaoPts}</b>Redacao</span>
          <span className="is-total"><b>{selfPreview.total}</b>Total</span>
        </div>

        <div className="simulados-ranking-body">
          {loading ? (
            <div className="simulados-ranking-empty"><Loader2 className="animate-spin" size={28} /><p>Carregando perfis oficiais...</p></div>
          ) : loadError ? (
            <div className="simulados-ranking-empty"><p>{loadError}</p></div>
          ) : rows.length === 0 ? (
            <div className="simulados-ranking-empty"><Trophy size={34} /><p>Nenhuma pontuacao registrada ainda.</p></div>
          ) : (
            <ul className="simulados-ranking-modal-list">
              {rows.map((row) => (
                <li key={row.id} className={row.isSelf ? 'is-self' : ''}>
                  <button type="button" onClick={() => setSelectedPerson(row)}>
                    <span className="rank">{String(row.rank).padStart(2, '0')}</span>
                    <img src={avatarSrc(row)} alt="" loading="lazy" />
                    <span className="person"><b>{displayNameFromRow(row)}</b><em>Questoes {row.questionPoints} / Redacao {row.isSelf || row.redacaoPoints > 0 ? row.redacaoPoints : '-'}</em></span>
                    {row.isSelf && <span className="self-badge">VOCE</span>}
                    <strong>{row.totalScore}</strong>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="simulados-modal-footer">
          <p>Redacao de outros candidatos entra quando o historico publico estiver disponivel.</p>
        </footer>
      </div>
      {selectedPerson ? <MiniProfileSheet person={selectedPerson} profile={profile} onClose={() => setSelectedPerson(null)} /> : null}
    </div>
  );
}

function MiniProfileSheet({ person, profile, onClose }) {
  const isSelf = Boolean(person?.isSelf);
  const display = displayNameFromRow(person);
  const full = isSelf ? String(profile?.full_name || person.fullName || '').trim() : String(person.fullName || '').trim();

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <button
        type="button"
        style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(4px)' }}
        aria-label="Fechar"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: 448,
          height: '100%',
          overflow: 'hidden',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          border: '1px solid var(--pl-rule-2)',
          background: 'var(--pl-surface)',
          boxShadow: 'var(--pl-sh-high)',
        }}
      >
        {/* Decorative header gradient */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 160,
            background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(139,92,246,0.04) 60%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top bar */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--pl-rule)',
            padding: '16px 20px',
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: 'var(--pl-ink-3)',
            }}
          >
            Perfil
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: 10,
              border: '1px solid var(--pl-rule-2)',
              background: 'var(--pl-surface)',
              padding: 8,
              color: 'var(--pl-ink-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: '8px 20px 32px' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 220, margin: '0 auto' }}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: 112,
                  height: 112,
                  overflow: 'hidden',
                  borderRadius: 24,
                  border: '4px solid var(--pl-surface)',
                  boxShadow: 'var(--pl-sh-high)',
                  outline: '2px solid var(--pl-rule-2)',
                }}
              >
                <img src={avatarSrc(person)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              {isSelf ? (
                <span
                  style={{
                    position: 'absolute',
                    bottom: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    borderRadius: 999,
                    background: 'var(--pl-accent)',
                    padding: '4px 12px',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: 'var(--pl-bg)',
                    boxShadow: 'var(--pl-sh-low)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <User size={11} />
                  Voce
                </span>
              ) : null}
            </div>

            <h3
              style={{
                marginTop: 20,
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--pl-ink)',
              }}
            >
              {display}
            </h3>
            {full && full !== display.replace(/^@/, '') ? (
              <p style={{ marginTop: 4, fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)' }}>{full}</p>
            ) : null}
            {person.rank ? (
              <p
                style={{
                  marginTop: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 999,
                  border: '1px solid var(--pl-rule-2)',
                  background: 'var(--pl-bg-soft)',
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--pl-ink-2)',
                }}
              >
                Posicao{' '}
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--pl-ink)' }}>#{person.rank}</span>
              </p>
            ) : null}
          </div>

          {/* Stats grid */}
          <div
            style={{
              marginTop: 32,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              borderRadius: 16,
              border: '1px solid var(--pl-rule)',
              background: 'var(--pl-bg-soft)',
              padding: 12,
            }}
          >
            {[
              { label: 'Total', value: person.totalScore, color: 'var(--pl-ink)' },
              { label: 'Questoes', value: person.questionPoints, color: 'var(--pl-accent)' },
              { label: 'Redacao', value: person.redacaoPoints || 0, color: 'var(--pl-accent)' },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  borderRadius: 10,
                  background: 'var(--pl-surface)',
                  padding: '12px 8px',
                  textAlign: 'center',
                  boxShadow: 'var(--pl-sh-low)',
                }}
              >
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: 'var(--pl-ink-3)',
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    marginTop: 4,
                    fontSize: 20,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: stat.color,
                  }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Details list */}
          <dl
            style={{
              marginTop: 24,
              borderRadius: 16,
              border: '1px solid var(--pl-rule)',
              background: 'var(--pl-surface)',
              padding: 16,
              fontSize: 14,
              boxShadow: 'var(--pl-sh-low)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                borderBottom: '1px solid var(--pl-rule)',
                paddingBottom: 12,
                marginBottom: 12,
              }}
            >
              <dt style={{ fontWeight: 500, color: 'var(--pl-ink-2)' }}>Tentativas (questoes)</dt>
              <dd style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--pl-ink)' }}>
                {person.questionAttempts}
              </dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <dt style={{ fontWeight: 500, color: 'var(--pl-ink-2)' }}>Plano</dt>
              <dd
                style={{
                  maxWidth: '55%',
                  textAlign: 'right',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  color: 'var(--pl-ink)',
                }}
              >
                {person.plan || '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
