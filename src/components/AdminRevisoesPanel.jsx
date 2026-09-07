import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Bot, Check, ExternalLink, User2, X } from 'lucide-react';
import {
  ORIGEM_LABELS,
  approveContestRevision,
  buildRevisionDiff,
  formatRevisionValue,
  loadContestRevisions,
  rejectContestRevision,
} from '../lib/contestRevisionsApi';
import { showConfirm, showToast } from '../lib/dialogs';

const FILTROS = [
  { id: 'pendente', label: 'Pendentes' },
  { id: 'aprovada', label: 'Aprovadas' },
  { id: 'recusada', label: 'Recusadas' },
  { id: 'todas', label: 'Todas' },
];

const ORIGEM_ICON = { robo: Bot, aluno: User2, import: ArrowRight };

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

// Nome legível do alvo. Quando a proposta ainda não achou item no catálogo,
// cai para a identidade da fonte (orgao|edital|cargo) que o coletor mandou.
function targetLabel(revision) {
  return revision?.contest_templates?.nome || revision?.source_identity || 'Item não identificado';
}

export default function AdminRevisoesPanel({ supabase, onApplied }) {
  const [filtro, setFiltro] = useState('pendente');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busyId, setBusyId] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const data = await loadContestRevisions(supabase, { status: filtro });
      setRows(data);
    } catch (e) {
      const message = String(e?.message || e);
      // Erro clássico de migration não aplicada — vale mensagem própria, igual
      // ao padrão das outras telas que dependem de SQL pendente.
      setErro(
        /relation .*contest_revisions.* does not exist|schema cache/i.test(message)
          ? 'Tabela contest_revisions ainda não existe. Rode supabase/migrations/202609070001_contest_revisions.sql no banco.'
          : `Não foi possível carregar a fila: ${message}`
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, filtro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const aprovar = useCallback(
    async (revision) => {
      const diff = buildRevisionDiff(revision);
      const ok = await showConfirm(
        `Aplicar ${diff.length} alteração(ões) em "${targetLabel(revision)}"? O item do catálogo será atualizado.`,
        { title: 'Aprovar revisão', confirmLabel: 'Aprovar' }
      );
      if (!ok) return;
      setBusyId(revision.id);
      try {
        await approveContestRevision(supabase, revision.id);
        showToast('Revisão aplicada ao catálogo.', 'success');
        setRows((prev) => prev.filter((r) => r.id !== revision.id));
        onApplied?.();
      } catch (e) {
        showToast(`Falha ao aprovar: ${e?.message || e}`, 'error');
      } finally {
        setBusyId(null);
      }
    },
    [supabase, onApplied]
  );

  const recusar = useCallback(
    async (revision) => {
      const ok = await showConfirm(
        `Recusar a proposta para "${targetLabel(revision)}"? O catálogo não muda.`,
        { title: 'Recusar revisão', confirmLabel: 'Recusar', danger: true }
      );
      if (!ok) return;
      setBusyId(revision.id);
      try {
        await rejectContestRevision(supabase, revision.id);
        showToast('Proposta recusada.', 'info');
        setRows((prev) => prev.filter((r) => r.id !== revision.id));
      } catch (e) {
        showToast(`Falha ao recusar: ${e?.message || e}`, 'error');
      } finally {
        setBusyId(null);
      }
    },
    [supabase]
  );

  const diffs = useMemo(
    () => new Map(rows.map((r) => [r.id, buildRevisionDiff(r)])),
    [rows]
  );

  return (
    <div className="pl-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <p className="pl-eyebrow" style={{ marginBottom: 2 }}>Catálogo</p>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 4 }}>
            Propostas de revisão
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', lineHeight: 1.5, maxWidth: 560 }}>
            Fila única do robô de monitoramento e da correção enviada por alunos. Nada entra no
            catálogo sem passar por aqui.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTROS.map((f) => {
            const active = filtro === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`pl-btn pl-btn-sm${active ? ' pl-btn-primary' : ''}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {erro ? (
        <div
          style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            borderRadius: 12, border: '1px solid var(--pl-rule-2)',
            background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)',
            padding: '12px 14px', fontSize: 12.5, lineHeight: 1.5,
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{erro}</span>
        </div>
      ) : loading ? (
        <p style={{ fontSize: 12.5, color: 'var(--pl-ink-3)' }}>Carregando fila...</p>
      ) : rows.length === 0 ? (
        <div style={{ borderRadius: 12, border: '1px dashed var(--pl-rule-2)', padding: '28px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)', marginBottom: 4 }}>
            Nenhuma proposta {filtro === 'todas' ? 'registrada' : FILTROS.find((f) => f.id === filtro)?.label.toLowerCase()}.
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--pl-ink-3)' }}>
            O coletor grava aqui quando encontra mudança oficial em item já catalogado.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((revision) => {
            const diff = diffs.get(revision.id) || [];
            const OrigemIcon = ORIGEM_ICON[revision.origem] || Bot;
            const busy = busyId === revision.id;
            const pendente = revision.status === 'pendente';

            return (
              <div
                key={revision.id}
                style={{
                  borderRadius: 12,
                  border: '1px solid var(--pl-rule-2)',
                  background: 'var(--pl-bg-soft)',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <OrigemIcon size={13} style={{ color: 'var(--pl-ink-3)', flexShrink: 0 }} />
                      <span className="pl-tag" style={{ height: 18 }}>
                        {ORIGEM_LABELS[revision.origem] || revision.origem}
                      </span>
                      {!pendente && (
                        <span className={`pl-tag ${revision.status === 'aprovada' ? 'pl-tag-success' : 'pl-tag-danger'}`} style={{ height: 18 }}>
                          {revision.status === 'aprovada' ? 'Aprovada' : 'Recusada'}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--pl-ink-4)' }}>{formatDate(revision.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {targetLabel(revision)}
                    </p>
                    {!revision.contest_template_id && (
                      <p style={{ marginTop: 2, fontSize: 11, color: 'var(--pl-warn)' }}>
                        Sem item correspondente no catálogo — não é aplicável, só informativa.
                      </p>
                    )}
                  </div>

                  {pendente && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => recusar(revision)}
                        disabled={busy}
                        className="pl-btn pl-btn-sm"
                        style={{ color: 'var(--pl-danger)', opacity: busy ? 0.6 : 1 }}
                      >
                        <X size={12} /> Recusar
                      </button>
                      <button
                        type="button"
                        onClick={() => aprovar(revision)}
                        disabled={busy || diff.length === 0 || !revision.contest_template_id}
                        className="pl-btn pl-btn-sm pl-btn-primary"
                        style={{ opacity: busy || diff.length === 0 || !revision.contest_template_id ? 0.6 : 1 }}
                      >
                        <Check size={12} /> {busy ? 'Aplicando...' : 'Aprovar'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Diff campo a campo */}
                {diff.length === 0 ? (
                  <p style={{ marginTop: 8, fontSize: 11.5, color: 'var(--pl-ink-3)' }}>
                    A proposta não difere do que já está no catálogo.
                  </p>
                ) : (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {diff.map((row) => (
                      <div
                        key={row.key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(90px, 150px) minmax(0, 1fr) 14px minmax(0, 1fr)',
                          alignItems: 'baseline',
                          gap: 8,
                          fontSize: 11.5,
                          padding: '5px 8px',
                          borderRadius: 8,
                          background: 'var(--pl-surface)',
                          border: '1px solid var(--pl-rule)',
                        }}
                      >
                        <span style={{ color: 'var(--pl-ink-3)', fontWeight: 600 }}>{row.label}</span>
                        <span style={{ color: 'var(--pl-ink-3)', textDecoration: 'line-through', wordBreak: 'break-word' }}>
                          {formatRevisionValue(row.before)}
                        </span>
                        <ArrowRight size={11} style={{ color: 'var(--pl-ink-4)' }} />
                        <span style={{ color: 'var(--pl-ink)', fontWeight: 600, wordBreak: 'break-word' }}>
                          {formatRevisionValue(row.after)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Evidência — sem fonte a proposta não é revisável */}
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                  {revision.evidencia_url ? (
                    <a
                      href={revision.evidencia_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pl-btn-link"
                      style={{ fontSize: 11.5 }}
                    >
                      <ExternalLink size={11} /> Fonte oficial
                    </a>
                  ) : (
                    <span style={{ color: 'var(--pl-warn)' }}>Sem fonte informada</span>
                  )}
                  {revision.evidencia_nota && (
                    <span style={{ color: 'var(--pl-ink-3)' }}>· {revision.evidencia_nota}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
