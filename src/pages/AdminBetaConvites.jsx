import React, { useCallback, useEffect, useState } from 'react';
import { Check, Clock, Copy, Loader2, Mail, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';
import {
  buildInviteUrl,
  createBetaInvite,
  deleteBetaInvite,
  loadBetaInvites,
} from '../lib/betaInvitesApi';

const MAX_SLOTS = 50;

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminBetaConvites() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [observacao, setObservacao] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Copy feedback
  const [copiedId, setCopiedId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loadBetaInvites();
      setRows(data);
    } catch (e) {
      setError(e?.message || 'Nao foi possivel carregar os convites.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { setFormError('E-mail obrigatorio.'); return; }
    if (rows.length >= MAX_SLOTS) { setFormError(`Limite de ${MAX_SLOTS} convites atingido.`); return; }

    setCreating(true);
    try {
      const newInvite = await createBetaInvite({ email: trimmedEmail, nome: nome.trim(), observacao: observacao.trim() });
      setRows((prev) => [newInvite, ...prev]);
      setEmail('');
      setNome('');
      setObservacao('');
    } catch (e) {
      setFormError(e?.message || 'Nao foi possivel criar o convite.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (token) => {
    const url = buildInviteUrl(token);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(token);
      setTimeout(() => setCopiedId(''), 2000);
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este convite? O link ficara invalido.')) return;
    setDeletingId(id);
    try {
      await deleteBetaInvite(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert(e?.message || 'Nao foi possivel remover.');
    } finally {
      setDeletingId('');
    }
  };

  const usedCount = rows.filter((r) => r.used_at).length;
  const pendingCount = rows.length - usedCount;
  const slotsLeft = MAX_SLOTS - rows.length;
  const progressPct = Math.min((rows.length / MAX_SLOTS) * 100, 100);

  return (
    <div className="page-shell mx-auto flex h-full w-full max-w-[1320px] flex-col gap-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <PageHeadPremium
          icon={Mail}
          titleAs="h1"
          badge={
            <PageHeadPremiumBadge icon={ShieldCheck}>
              Admin · beta fechado
            </PageHeadPremiumBadge>
          }
          title="Convites beta"
          subtitle={
            loading
              ? 'Carregando...'
              : `${rows.length}/${MAX_SLOTS} slots · ${usedCount} acessaram · ${pendingCount} pendentes`
          }
        />

        {/* Progress bar */}
        <div className="section-card space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{rows.length} convidados</span>
            <span>{slotsLeft} slots restantes</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Limite de {MAX_SLOTS} usuarios para o beta fechado.
          </p>
        </div>

        {/* Add form */}
        <div className="section-card space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Adicionar convite
          </p>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600" htmlFor="invite-email">
                  E-mail *
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@email.com"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                  disabled={creating || rows.length >= MAX_SLOTS}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600" htmlFor="invite-nome">
                  Nome (opcional)
                </label>
                <input
                  id="invite-nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do convidado"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  disabled={creating || rows.length >= MAX_SLOTS}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600" htmlFor="invite-obs">
                Observacao (opcional)
              </label>
              <input
                id="invite-obs"
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: amigo, influencer, parceiro..."
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                disabled={creating || rows.length >= MAX_SLOTS}
              />
            </div>
            {formError ? (
              <p className="text-xs font-semibold text-red-600">{formError}</p>
            ) : null}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={creating || rows.length >= MAX_SLOTS}
                className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Plus size={15} />
                )}
                {rows.length >= MAX_SLOTS ? 'Limite atingido' : 'Convidar'}
              </button>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Atualizar
              </button>
            </div>
          </form>
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {error}
          </div>
        ) : null}

        {/* List */}
        <div className="section-card space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Lista de convidados ({rows.length})
          </p>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm font-semibold text-slate-500">
              <Loader2 size={18} className="animate-spin text-blue-700" />
              Carregando...
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-slate-500">
              Nenhum convite ainda. Adicione o primeiro acima!
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Left: info */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {row.used_at ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          <Check size={10} />
                          Acessou
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          <Clock size={10} />
                          Pendente
                        </span>
                      )}
                      <span className="truncate text-sm font-semibold text-slate-800">{row.email}</span>
                      {row.nome ? (
                        <span className="text-xs text-slate-500">({row.nome})</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
                      {row.observacao ? <span>{row.observacao}</span> : null}
                      <span>Convidado: {formatDate(row.invited_at)}</span>
                      {row.used_at ? <span>Acessou: {formatDate(row.used_at)}</span> : null}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(row.token)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      {copiedId === row.token ? (
                        <>
                          <Check size={12} className="text-emerald-600" />
                          <span className="text-emerald-600">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          Copiar link
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      disabled={deletingId === row.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === row.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
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
