import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquare, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { showConfirm, showToast } from '../lib/dialogs';
import AdminPageHeader from '../components/AdminPageHeader';
import { deleteBetaFeedbackItem, loadBetaFeedback } from '../lib/betaFeedbackApi';

const TIPO_LABELS = { bug: 'Bug', sugestao: 'Sugestao', elogio: 'Elogio', geral: 'Outro' };

function tipoTagStyle(tipo) {
  switch (tipo) {
    case 'bug': return { border: '1px solid var(--pl-danger)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)' };
    case 'sugestao': return { border: '1px solid var(--pl-accent)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' };
    case 'elogio': return { border: '1px solid var(--pl-success)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' };
    default: return { border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)' };
  }
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminBetaFeedback() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loadBetaFeedback();
      setRows(data);
    } catch (e) {
      setError(e?.message || 'Nao foi possivel carregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id) => {
    if (!await showConfirm('Remover este feedback?', { confirmLabel: 'Remover', danger: true })) return;
    setDeletingId(id);
    try {
      await deleteBetaFeedbackItem(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      showToast(e?.message || 'Não foi possível remover.', 'error');
    } finally {
      setDeletingId('');
    }
  };

  const countByTipo = rows.reduce((acc, r) => {
    acc[r.tipo] = (acc[r.tipo] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="pl-page">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <AdminPageHeader
          icon={MessageSquare}
          badge="Admin · feedback"
          title="Feedback dos usuários"
          subtitle={
            loading
              ? 'Carregando...'
              : `${rows.length} respostas recebidas` +
                (countByTipo.bug ? ` · ${countByTipo.bug} bug${countByTipo.bug !== 1 ? 's' : ''}` : '') +
                (countByTipo.sugestao ? ` · ${countByTipo.sugestao} sugestao${countByTipo.sugestao !== 1 ? 'es' : ''}` : '') +
                (countByTipo.elogio ? ` · ${countByTipo.elogio} elogio${countByTipo.elogio !== 1 ? 's' : ''}` : '')
          }
          stats={[
            { key: 'total', label: 'Total', value: loading ? '…' : String(rows.length), icon: MessageSquare, accent: 'blue' },
            { key: 'bugs', label: 'Bugs', value: loading ? '…' : String(countByTipo.bug || 0), icon: ShieldCheck, accent: 'orange' },
            { key: 'sug', label: 'Sugestões', value: loading ? '…' : String(countByTipo.sugestao || 0), icon: MessageSquare, accent: 'indigo' },
            { key: 'elogios', label: 'Elogios', value: loading ? '…' : String(countByTipo.elogio || 0), icon: MessageSquare, accent: 'emerald' },
          ]}
        />

        <div className="pl-card" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--pl-ink-2)' }}>
            Feedbacks enviados pelos usuarios via widget in-app.
          </p>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="pl-btn pl-btn-ghost pl-btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Atualizar
          </button>
        </div>

        {error ? (
          <div style={{ borderRadius: 10, border: '1px solid var(--pl-warn)', background: 'var(--pl-warn-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>
            {error}
          </div>
        ) : null}

        <div className="pl-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="pl-eyebrow">
            Respostas ({rows.length})
          </p>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '40px 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--pl-accent)' }} />
              Carregando...
            </div>
          ) : rows.length === 0 ? (
            <p style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
              Nenhum feedback ainda. Compartilhe o app com os usuarios!
            </p>
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, listStyle: 'none', margin: 0, padding: 0 }}>
              {rows.map((row) => (
                <li key={row.id} className="pl-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          borderRadius: 6,
                          padding: '2px 8px',
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          ...tipoTagStyle(row.tipo),
                        }}
                      >
                        {TIPO_LABELS[row.tipo] || row.tipo}
                      </span>
                      {row.page ? (
                        <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--pl-ink-3)' }}>
                          /{row.page}
                        </span>
                      ) : null}
                      <span style={{ fontSize: 10, color: 'var(--pl-ink-3)' }}>{formatDate(row.created_at)}</span>
                    </div>
                    <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink)' }}>
                      {row.mensagem}
                    </p>
                    {row.email ? (
                      <p style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>{row.email}</p>
                    ) : null}
                    <div>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 8, border: '1px solid var(--pl-danger)', background: 'var(--pl-surface)', padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'var(--pl-danger)', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} />
                        Remover
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
