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
    <div className="fixed inset-0 z-[95] flex items-end justify-center px-0 pt-10 pb-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Fechar ranking"
        className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px] transition-opacity hover:bg-ink-950/60"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex max-h-[min(92vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] border border-ink-200/90 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:max-h-[88vh] sm:rounded-[1.75rem]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ranking-dialog-title"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-50/90 via-white to-transparent" />

        <header className="relative flex shrink-0 items-start justify-between gap-4 border-b border-ink-100 px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-ink-200/80 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500 shadow-sm">
              <Sparkles size={12} className="text-blue-500" />
              Papirando
            </div>
            <h2 id="ranking-dialog-title" className="page-title mt-2 text-xl tracking-tight text-ink-900 sm:text-2xl">
              Ranking
            </h2>
            <p className="mt-1.5 max-w-md text-xs font-medium leading-relaxed text-ink-500 sm:text-sm">
              Pontuação oficial: <span className="font-semibold text-ink-700">acertos em questões</span> somados aos{' '}
              <span className="font-semibold text-ink-700">pontos de redação</span> do seu histórico. Outros usuários
              aparecem com base nas respostas públicas registradas na plataforma.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/90 px-3 py-1 text-[11px] font-semibold text-blue-800">
                <Target size={13} className="text-blue-600" />
                Suas questões: {selfPreview.questionPts} pts
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50/90 px-3 py-1 text-[11px] font-semibold text-violet-900">
                <PenLine size={13} className="text-violet-600" />
                Sua redação: {selfPreview.redacaoPts} pts
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-[11px] font-semibold text-ink-700">
                <BarChart2 size={13} className="text-ink-500" />
                Total: {selfPreview.total}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 shadow-sm transition hover:border-ink-300 hover:bg-ink-50 hover:text-ink-800"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="size-9 animate-spin text-blue-600" strokeWidth={2} />
              <p className="text-sm font-medium text-ink-500">Carregando perfis oficiais…</p>
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-6 text-center text-sm font-medium text-rose-800">
              {loadError}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/90 px-4 py-12 text-center">
              <Trophy className="mx-auto size-10 text-ink-300" strokeWidth={1.25} />
              <p className="mt-3 text-sm font-semibold text-ink-700">Nenhuma pontuação registrada ainda</p>
              <p className="mx-auto mt-2 max-w-xs text-xs font-medium text-ink-500">
                Responda questões no banco e envie redações corrigidas para entrar no ranking.
              </p>
            </div>
          ) : (
            <ul className="space-y-2 sm:space-y-2.5">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPerson(row)}
                    className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left shadow-sm transition sm:gap-4 sm:px-4 sm:py-3 ${
                      row.isSelf
                        ? 'border-blue-200/90 bg-gradient-to-r from-blue-50/90 via-white to-white ring-1 ring-blue-100/80'
                        : 'border-ink-100 bg-white hover:border-blue-200/60 hover:shadow-md'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums sm:h-10 sm:w-10 ${
                        row.rank === 1
                          ? 'bg-amber-100 text-amber-900'
                          : row.rank === 2
                            ? 'bg-ink-100 text-ink-700'
                            : row.rank === 3
                              ? 'bg-orange-100 text-orange-900'
                              : 'bg-ink-50 text-ink-500'
                      }`}
                    >
                      {row.rank}
                    </div>
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-ink-200/80 bg-ink-50 shadow-inner sm:h-12 sm:w-12">
                      <img src={avatarSrc(row)} alt="" className="h-full w-full object-cover" loading="lazy" />
                      {row.isSelf ? (
                        <span className="absolute bottom-0 right-0 rounded-tl-md bg-blue-600 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                          você
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink-900 sm:text-[15px]">{displayNameFromRow(row)}</p>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-ink-500">
                        <span>Questões {row.questionPoints}</span>
                        <span className="text-ink-300">·</span>
                        <span>
                          Redação {row.isSelf || row.redacaoPoints > 0 ? row.redacaoPoints : '—'}
                        </span>
                        {row.plan ? (
                          <>
                            <span className="text-ink-300">·</span>
                            <span className="capitalize">{row.plan}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold tabular-nums tracking-tight text-ink-900 sm:text-xl">{row.totalScore}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">pts</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="relative shrink-0 border-t border-ink-100 bg-ink-50/80 px-5 py-3 text-center sm:px-7">
          <p className="text-[11px] font-medium text-ink-400">
            Redação de outros candidatos só entra na conta quando o histórico público estiver disponível para o ranking.
          </p>
        </footer>
      </div>

      {selectedPerson ? (
        <MiniProfileSheet person={selectedPerson} profile={profile} onClose={() => setSelectedPerson(null)} />
      ) : null}
    </div>
  );
}

function MiniProfileSheet({ person, profile, onClose }) {
  const isSelf = Boolean(person?.isSelf);
  const display = displayNameFromRow(person);
  const full = isSelf ? String(profile?.full_name || person.fullName || '').trim() : String(person.fullName || '').trim();

  return (
    <div className="fixed inset-0 z-[100] flex justify-end sm:justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-ink-950/35 backdrop-blur-sm" aria-label="Fechar" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md animate-in slide-in-from-bottom-4 flex-col overflow-hidden rounded-t-3xl border border-ink-200/90 bg-white shadow-[0_-12px_60px_rgba(15,23,42,0.2)] duration-300 sm:h-auto sm:max-h-[90vh] sm:rounded-3xl sm:shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-blue-600/10 via-violet-500/5 to-transparent" />
        <div className="relative flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">Perfil</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-ink-200 bg-white p-2 text-ink-500 transition hover:bg-ink-50"
          >
            <X size={16} />
          </button>
        </div>
        <div className="relative flex-1 overflow-y-auto px-5 pb-8 pt-2">
          <div className="mx-auto flex max-w-[220px] flex-col items-center text-center">
            <div className="relative">
              <div className="h-28 w-28 overflow-hidden rounded-3xl border-4 border-white shadow-xl ring-2 ring-ink-100">
                <img src={avatarSrc(person)} alt="" className="h-full w-full object-cover" />
              </div>
              {isSelf ? (
                <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-md">
                  <User size={11} />
                  Você
                </span>
              ) : null}
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink-900">{display}</h3>
            {full && full !== display.replace(/^@/, '') ? (
              <p className="mt-1 text-sm font-medium text-ink-500">{full}</p>
            ) : null}
            {person.rank ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-600">
                Posição <span className="tabular-nums text-ink-900">#{person.rank}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2 rounded-2xl border border-ink-100 bg-ink-50/90 p-3 sm:gap-3 sm:p-4">
            <div className="rounded-xl bg-white px-2 py-3 text-center shadow-sm sm:py-4">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-400">Total</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-ink-900">{person.totalScore}</p>
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

          <dl className="mt-6 space-y-3 rounded-2xl border border-ink-100 bg-white p-4 text-sm shadow-sm">
            <div className="flex justify-between gap-3 border-b border-ink-50 pb-3">
              <dt className="font-medium text-ink-500">Tentativas (questões)</dt>
              <dd className="font-semibold tabular-nums text-ink-900">{person.questionAttempts}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-medium text-ink-500">Plano</dt>
              <dd className="max-w-[55%] text-right font-semibold capitalize text-ink-800">{person.plan || '—'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
