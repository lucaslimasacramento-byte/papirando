import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCopy,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';
import {
  buildInviteUrl,
  createBetaInvite,
  deleteBetaInvite,
  loadBetaInvites,
} from '../lib/betaInvitesApi';

const MAX_BETA_USERS = 50;

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handle}
      title="Copiar link"
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
    >
      {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <ClipboardCopy size={13} />}
      {copied ? 'Copiado!' : 'Link'}
    </button>
  );
}

export default function AdminBetaConvites() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formObs, setFormObs] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const emailRef = useRef(null);

  const [deletingId, setDeletingId] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loadBetaInvites();
      setRows(data);
    } catch (e) {
      setError(e?.message || 'Nao foi possivel carregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (showForm) setTimeout(() => emailRef.current?.focus(), 50);
  }, [showForm]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const email = formEmail.trim().toLowerCase();
    if (!email.includes('@')) { setFormError('E-mail invalido.'); return; }
    if (rows.length >= MAX_BETA_USERS) { setFormError(`Limite de ${MAX_BETA_USERS} convidados atingido.`); return; }
    setFormError('');
    setFormLoading(true);
    try {
      const item = await createBetaInvite({ email, nome: formNome.trim(), observacao: formObs.trim() });
      setRows((prev) => [item, ...prev]);
      setFormEmail('');
      setFormNome('');
      setFormObs('');
      setShowForm(false);
    } catch (e) {
      setFormError(e?.message || 'Nao foi possivel criar.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este convite?')) return;
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
  const pendingCount = rows.filter((r) => !r.used_at).length;
  const spotsLeft = MAX_BETA_USERS - rows.length;

  return (
    <div className="page-shell mx-auto flex h-full w-full max-w-[1320px] flex-col gap-6">
      <div className="flex flex-col gap-6">
        <PageHeadPremium
          icon={Mail}
          titleAs="h1"
          badge={
            <PageHeadPremiumBadge icon={ShieldCheck}>
              Admin · beta fechado
            </PageHeadPremiumBadge>
          }
          title="Convites beta"
          subtitle={`${rows.length}/${MAX_BETA_USERS} convidados · ${usedCount} acessaram · ${pendingCount} pendentes`}
        />

        {/* Barra de progresso */}
        <div className="section-card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                <span>Vagas preenchidas</span>
                <span>{rows.length}/{MAX_BETA_USERS}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${Math.min((rows.length / MAX_BETA_USERS) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex gap-4 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <UserCheck size={10} className="text-emerald-500" />
                  {usedCount} acessaram
                </span>
                <span className="flex items-center gap-1">
                  <UserX size={10} className="text-amber-500" />
                  {pendingCount} pendentes
                </span>
                <span>{spotsLeft > 0 ? `${spotsLeft} vagas restantes` : 'Lista completa'}</span>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="btn-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Atualizar
              </button>
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                disabled={spotsLeft <= 0}
                className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs disabled:opacity-50"
              >
                {showForm ? <X size={14} /> : <Plus size={14} />}
                {showForm ? 'Cancelar' : 'Convidar'}
              </button>
            </div>
          </div>

          {/* Formulário inline */}
          {showForm ? (
            <form
              onSubmit={handleAdd}
              className="mt-2 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4"
            >
              <p className="text-xs font-bold text-blue-800">Novo convite</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    E-mail *
                  </label>
                  <input
                    ref={emailRef}
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    placeholder="usuario@email.com"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Nome (opcional)
                  </label>
                  <input
                    type="text"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Nome do convidado"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Observacao interna (opcional)
                </label>
                <input
                  type="text"
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  placeholder="Ex: amigo, instagram, turma..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              {formError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {formError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={formLoading}
                className="btn-primary self-start rounded-xl px-5 py-2 text-sm font-bold disabled:opacity-50"
              >
                {formLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Criando...
                  </span>
                ) : 'Criar convite'}
              </button>
            </form>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {error}
          </div>
        ) : null}

        {/* Lista */}
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
              Nenhum convite ainda. Clique em "Convidar" para adicionar o primeiro beta tester.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className={`rounded-xl border p-3.5 transition ${
                    row.used_at
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {row.used_at ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            <UserCheck size={10} />
                            Acessou
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            <UserX size={10} />
                            Pendente
                          </span>
                        )}
                        <span className="text-sm font-semibold text-slate-800">
                          {row.nome || row.email}
                        </span>
                        {row.nome ? (
                          <span className="text-xs text-slate-400">{row.email}</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
                        <span>Convidado: {formatDate(row.invited_at)}</span>
                        {row.used_at ? (
                          <span className="text-emerald-600">Primeiro acesso: {formatDate(row.used_at)}</span>
                        ) : null}
                        {row.observacao ? <span>· {row.observacao}</span> : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {!row.used_at ? (
                        <CopyButton text={buildInviteUrl(row.token)} />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
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
