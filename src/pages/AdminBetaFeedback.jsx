import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquare, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';
import { deleteBetaFeedbackItem, loadBetaFeedback } from '../lib/betaFeedbackApi';

const TIPO_LABELS = { bug: 'Bug', sugestao: 'Sugestao', elogio: 'Elogio', geral: 'Outro' };
const TIPO_COLORS = {
  bug: 'border-red-200 bg-red-50 text-red-700',
  sugestao: 'border-blue-200 bg-blue-50 text-blue-700',
  elogio: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  geral: 'border-slate-200 bg-slate-50 text-slate-600',
};

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
    if (!window.confirm('Remover este feedback?')) return;
    setDeletingId(id);
    try {
      await deleteBetaFeedbackItem(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert(e?.message || 'Nao foi possivel remover.');
    } finally {
      setDeletingId('');
    }
  };

  const countByTipo = rows.reduce((acc, r) => {
    acc[r.tipo] = (acc[r.tipo] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page-shell mx-auto flex h-full w-full max-w-[1320px] flex-col gap-6">
      <div className="flex flex-col gap-6">
        <PageHeadPremium
          icon={MessageSquare}
          titleAs="h1"
          badge={
            <PageHeadPremiumBadge icon={ShieldCheck}>
              Admin · beta fechado
            </PageHeadPremiumBadge>
          }
          title="Feedback do beta"
          subtitle={
            loading
              ? 'Carregando...'
              : `${rows.length} respostas recebidas` +
                (countByTipo.bug ? ` · ${countByTipo.bug} bug${countByTipo.bug !== 1 ? 's' : ''}` : '') +
                (countByTipo.sugestao ? ` · ${countByTipo.sugestao} sugestao${countByTipo.sugestao !== 1 ? 'es' : ''}` : '') +
                (countByTipo.elogio ? ` · ${countByTipo.elogio} elogio${countByTipo.elogio !== 1 ? 's' : ''}` : '')
          }
        />

        <div className="section-card flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Feedbacks enviados pelos usuarios beta via widget in-app.
          </p>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="btn-secondary shrink-0 rounded-xl px-4 py-2.5 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Atualizar
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="section-card space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Respostas ({rows.length})
          </p>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm font-semibold text-slate-500">
              <Loader2 size={18} className="animate-spin text-blue-700" />
              Carregando...
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-slate-500">
              Nenhum feedback ainda. Compartilhe o app com os usuarios beta!
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => (
                <li key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            TIPO_COLORS[row.tipo] || TIPO_COLORS.geral
                          }`}
                        >
                          {TIPO_LABELS[row.tipo] || row.tipo}
                        </span>
                        {row.page ? (
                          <span className="text-[10px] font-medium text-slate-400">
                            /{row.page}
                          </span>
                        ) : null}
                        <span className="text-[10px] text-slate-400">{formatDate(row.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm font-medium text-slate-800">
                        {row.mensagem}
                      </p>
                      {row.email ? (
                        <p className="text-xs text-slate-400">{row.email}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      disabled={deletingId === row.id}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      Remover
                    </button>
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
