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
      setLoadError(String(e?.message || 'Não foi possível carregar o ranking.'));
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
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-[#14110d]/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" aria-label="Fechar ranking" className="absolute inset-0" onClick={onClose} />
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
    <div className="fixed inset-0 z-[100] flex justify-end sm:justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" aria-label="Fechar" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md animate-in slide-in-from-bottom-4 flex-col overflow-hidden rounded-t-3xl border border-slate-200/90 bg-white shadow-[0_-12px_60px_rgba(15,23,42,0.2)] duration-300 sm:h-auto sm:max-h-[90vh] sm:rounded-3xl sm:shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-blue-600/10 via-violet-500/5 to-transparent" />
        <div className="relative flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Perfil</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>
        <div className="relative flex-1 overflow-y-auto px-5 pb-8 pt-2">
          <div className="mx-auto flex max-w-[220px] flex-col items-center text-center">
            <div className="relative">
              <div className="h-28 w-28 overflow-hidden rounded-3xl border-4 border-white shadow-xl ring-2 ring-slate-100">
                <img src={avatarSrc(person)} alt="" className="h-full w-full object-cover" />
              </div>
              {isSelf ? (
                <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-md">
                  <User size={11} />
                  Você
                </span>
              ) : null}
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">{display}</h3>
            {full && full !== display.replace(/^@/, '') ? (
              <p className="mt-1 text-sm font-medium text-slate-500">{full}</p>
            ) : null}
            {person.rank ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                Posição <span className="tabular-nums text-slate-900">#{person.rank}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50/90 p-3 sm:gap-3 sm:p-4">
            <div className="rounded-xl bg-white px-2 py-3 text-center shadow-sm sm:py-4">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Total</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{person.totalScore}</p>
            </div>
            <div className="rounded-xl bg-white px-2 py-3 text-center shadow-sm sm:py-4">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-blue-600">Questões</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-blue-700">{person.questionPoints}</p>
            </div>
            <div className="rounded-xl bg-white px-2 py-3 text-center shadow-sm sm:py-4">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-violet-600">Redação</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-violet-800">{person.redacaoPoints || 0}</p>
            </div>
          </div>

          <dl className="mt-6 space-y-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
            <div className="flex justify-between gap-3 border-b border-slate-50 pb-3">
              <dt className="font-medium text-slate-500">Tentativas (questões)</dt>
              <dd className="font-semibold tabular-nums text-slate-900">{person.questionAttempts}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-medium text-slate-500">Plano</dt>
              <dd className="max-w-[55%] text-right font-semibold capitalize text-slate-800">{person.plan || '—'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
