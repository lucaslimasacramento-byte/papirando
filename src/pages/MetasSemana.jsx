import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import PageHeadPremium from '../components/PageHeadPremium';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSundayOfWeek(monday) {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDateISO(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatWeekLabel(monday) {
  const sunday = getSundayOfWeek(monday);
  const fmt = (d) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

function parseTime(tempo) {
  // "HH:MM:SS" or "H:MM" → minutes
  if (!tempo) return 0;
  const parts = String(tempo).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function fmtHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

const DISCIPLINE_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500',
];

function inputCls() {
  return 'w-full rounded-xl border-2 border-ink-200 bg-ink-50 px-4 py-3 text-sm font-semibold text-ink-800 outline-none transition-all focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-[#1d4ed8]/15';
}

/** Alinha com Planejamento: alguns bancos usam semana_inicio/horas_meta, outros week_start/meta_horas. */
function normalizeWeeklyGoalRow(row) {
  if (!row?.id) return null;
  const disciplina = String(row.disciplina || '').trim();
  if (!disciplina) return null;
  const metaHoras = Number(row.horas_meta ?? row.meta_horas ?? 0);
  const metaHorasSafe = Number.isFinite(metaHoras) ? metaHoras : 0;
  const rawQm = row.questoes_meta ?? row.questoesMeta;
  const questoesFromDb = Number(rawQm);
  const questoes_meta =
    Number.isFinite(questoesFromDb) && questoesFromDb >= 0
      ? Math.round(questoesFromDb)
      : Math.max(0, Math.round(metaHorasSafe * 10));
  return {
    id: row.id,
    disciplina,
    meta_horas: metaHorasSafe,
    questoes_meta,
  };
}

async function fetchWeeklyGoalsForWeek(userId, weekStartISO) {
  const primary = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('semana_inicio', weekStartISO);

  if (!primary.error) {
    return (primary.data || []).map(normalizeWeeklyGoalRow).filter(Boolean);
  }

  const fallback = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStartISO);

  if (fallback.error) {
    console.warn('[MetasSemana] weekly_goals:', fallback.error.message || fallback.error);
    return [];
  }
  return (fallback.data || []).map(normalizeWeeklyGoalRow).filter(Boolean);
}

async function upsertWeeklyGoalRow({ userId, weekStartISO, disciplina, metaHoras, questoesMeta: questoesMetaOverride }) {
  const autoQuestoes = Math.max(0, Math.round(Number(metaHoras) * 10));
  const questoes =
    questoesMetaOverride != null && Number.isFinite(Number(questoesMetaOverride)) && Number(questoesMetaOverride) >= 0
      ? Math.round(Number(questoesMetaOverride))
      : autoQuestoes;
  const now = new Date().toISOString();

  const primary = await supabase
    .from('weekly_goals')
    .upsert(
      {
        user_id: userId,
        semana_inicio: weekStartISO,
        disciplina,
        horas_meta: metaHoras,
        questoes_meta: questoes,
        updated_at: now,
      },
      { onConflict: 'user_id,semana_inicio,disciplina' }
    )
    .select()
    .maybeSingle();

  if (!primary.error && primary.data) {
    return { data: normalizeWeeklyGoalRow(primary.data), error: null };
  }

  const fallback = await supabase
    .from('weekly_goals')
    .upsert(
      {
        user_id: userId,
        week_start: weekStartISO,
        disciplina,
        meta_horas: metaHoras,
        updated_at: now,
      },
      { onConflict: 'user_id,week_start,disciplina' }
    )
    .select()
    .maybeSingle();

  return {
    data: normalizeWeeklyGoalRow(fallback.data),
    error: fallback.error,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MetasSemana({ currentUserId, historicoReal }) {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [goals, setGoals]           = useState([]); // weekly_goals rows
  const [loading, setLoading]       = useState(true);

  const [editModal, setEditModal]   = useState(false);
  const [editGoal, setEditGoal]     = useState(null); // null = new, or {disciplina, meta_horas}
  const [editForm, setEditForm]     = useState({ disciplina: '', meta_horas: 2, questoes_meta: '' });
  const [saving, setSaving]         = useState(false);
  const [formErr, setFormErr]       = useState('');

  // Compute week dates
  const monday = useMemo(() => {
    const d = getMondayOfWeek(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekStartISO = formatDateISO(monday);
  const sunday       = getSundayOfWeek(monday);
  const sundayISO    = formatDateISO(sunday);

  // Load goals for this week
  const loadGoals = useCallback(async () => {
    if (!currentUserId) {
      setGoals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const rows = await fetchWeeklyGoalsForWeek(currentUserId, weekStartISO);
    setGoals(rows);
    setLoading(false);
  }, [currentUserId, weekStartISO]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadGoals();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadGoals]);

  // Compute actual studied minutes per discipline for this week from historicoReal
  const actualByDisciplina = useMemo(() => {
    const map = {};
    if (!Array.isArray(historicoReal)) return map;
    historicoReal.forEach((session) => {
      const d = session.data || '';
      if (d < weekStartISO || d > sundayISO) return;
      const disc = session.disciplinaCanonica || session.disciplina || '';
      if (!disc) return;
      const mins = parseTime(session.tempo);
      map[disc] = (map[disc] || 0) + mins;
    });
    return map;
  }, [historicoReal, weekStartISO, sundayISO]);

  /** Questões resolvidas na semana (acertos + erros), por disciplina do histórico. */
  const actualQuestoesByDisciplina = useMemo(() => {
    const map = {};
    if (!Array.isArray(historicoReal)) return map;
    historicoReal.forEach((session) => {
      const d = session.data || '';
      if (d < weekStartISO || d > sundayISO) return;
      const disc = session.disciplinaCanonica || session.disciplina || '';
      if (!disc) return;
      const n = Number(session.acertos || 0) + Number(session.erros || 0);
      if (n <= 0) return;
      map[disc] = (map[disc] || 0) + n;
    });
    return map;
  }, [historicoReal, weekStartISO, sundayISO]);

  // Disciplines from history that don't have a goal yet (for suggestion)
  const studiedDisciplinas = useMemo(() => {
    return Object.keys(actualByDisciplina).sort();
  }, [actualByDisciplina]);

  // All disciplines that appear in either goals or history
  const allDisciplinas = useMemo(() => {
    const fromGoals = goals.map((g) => g.disciplina);
    const fromHist  = studiedDisciplinas;
    return [...new Set([...fromGoals, ...fromHist])].sort();
  }, [goals, studiedDisciplinas]);

  // Summary
  const totalGoalMins = goals.reduce((acc, g) => acc + (g.meta_horas || 0) * 60, 0);
  const totalActualMins = goals.reduce(
    (acc, g) => acc + (actualByDisciplina[g.disciplina] || 0),
    0
  );
  const totalPct = totalGoalMins > 0 ? Math.min(100, Math.round((totalActualMins / totalGoalMins) * 100)) : 0;

  const totalGoalQuestoes = goals.reduce((acc, g) => acc + (g.questoes_meta || 0), 0);
  const totalActualQuestoes = goals.reduce(
    (acc, g) => acc + (actualQuestoesByDisciplina[g.disciplina] || 0),
    0
  );
  const totalQuestoesPct =
    totalGoalQuestoes > 0 ? Math.min(100, Math.round((totalActualQuestoes / totalGoalQuestoes) * 100)) : 0;

  const isCurrentWeek = weekOffset === 0;
  const hoursMetaDone = totalGoalMins > 0 && totalPct >= 100;
  const questoesMetaDone = totalGoalQuestoes > 0 && totalQuestoesPct >= 100;
  const allMetasDone = hoursMetaDone && (totalGoalQuestoes === 0 || questoesMetaDone);

  async function openAddGoal(prefillDisciplina = '') {
    setEditGoal(null);
    setEditForm({ disciplina: prefillDisciplina || '', meta_horas: 2, questoes_meta: '' });
    setFormErr('');
    setEditModal(true);
  }

  async function openEditGoal(goal) {
    setEditGoal(goal);
    setEditForm({
      disciplina: goal.disciplina,
      meta_horas: goal.meta_horas,
      questoes_meta: goal.questoes_meta != null ? String(goal.questoes_meta) : '',
    });
    setFormErr('');
    setEditModal(true);
  }

  async function handleSaveGoal() {
    if (!editForm.disciplina.trim()) { setFormErr('Informe a disciplina.'); return; }
    const metaHoras = parseFloat(editForm.meta_horas);
    if (isNaN(metaHoras) || metaHoras <= 0) { setFormErr('Informe uma meta válida (em horas).'); return; }

    const qRaw = String(editForm.questoes_meta || '').trim();
    let questoesMetaOverride = null;
    if (qRaw !== '') {
      const parsed = parseInt(qRaw, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setFormErr('Meta de questões inválida.');
        return;
      }
      questoesMetaOverride = parsed;
    }

    setSaving(true);
    setFormErr('');

    const { data, error } = await upsertWeeklyGoalRow({
      userId: currentUserId,
      weekStartISO,
      disciplina: editForm.disciplina.trim(),
      metaHoras: metaHoras,
      questoesMeta: questoesMetaOverride,
    });

    setSaving(false);
    if (error) {
      setFormErr(error.message || 'Não foi possível salvar a meta.');
      return;
    }
    if (!data) {
      setFormErr('Meta salva, mas a lista não atualizou. Recarregue a página.');
      return;
    }

    setGoals((prev) => {
      const disciplina = data.disciplina;
      const existing = prev.find((g) => g.disciplina === disciplina);
      if (existing) return prev.map((g) => (g.disciplina === disciplina ? data : g));
      return [...prev, data];
    });
    setEditModal(false);
  }

  async function handleDeleteGoal(goal) {
    await supabase.from('weekly_goals').delete().eq('id', goal.id);
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
  }

  if (!currentUserId) {
    return (
      <div className="flex h-full items-center justify-center text-ink-400">
        <p className="text-sm">Faça login para ver suas metas.</p>
      </div>
    );
  }

  return (
    <div className="page-shell flex h-full min-h-0 flex-col gap-0 p-0">
      <PageHeadPremium
        className="shrink-0 lg:!flex-row lg:!items-center lg:!justify-between"
        icon={Target}
        title="Metas semanais"
        subtitle="Horas por disciplina na semana. Metas do assistente de planejamento aparecem aqui automaticamente."
        leadingClassName="items-center lg:max-w-[calc(100%-15rem)] xl:max-w-[50rem]"
        trailingWrapClassName="lg:ml-auto lg:w-auto lg:max-w-[14rem] lg:self-center"
        trailing={
          <div className="flex w-full min-w-0 flex-col items-start gap-1.5 sm:w-auto sm:items-end">
            <button
              type="button"
              onClick={() => openAddGoal()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-300/55 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.38)] ring-1 ring-blue-200/25 transition hover:from-blue-300 hover:via-blue-400 hover:to-indigo-400 hover:shadow-[0_12px_28px_rgba(37,99,235,0.45)] sm:px-3.5 sm:text-[13px]"
            >
              <Plus size={14} />
              Nova meta
            </button>
          </div>
        }
      />

      <div className="section-card mt-3 flex shrink-0 items-center justify-between rounded-2xl px-4 py-3 sm:px-5 lg:px-6">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          className="rounded-xl p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-[#1d4ed8]"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center min-w-0 px-2">
          <p className="inline-flex items-center rounded-full border border-ink-200 bg-ink-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Janela semanal
          </p>
          <p className="text-sm font-bold text-ink-900">{formatWeekLabel(monday)}</p>
          {isCurrentWeek && (
            <p className="text-[11px] font-semibold text-[#1d4ed8]">Esta semana</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          disabled={weekOffset >= 0}
          className="rounded-xl p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-[#1d4ed8] disabled:pointer-events-none disabled:opacity-35"
          aria-label="Próxima semana"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="section-card shrink-0 rounded-none border-x-0 border-t-0 px-4 py-3 sm:px-5 sm:py-3.5 lg:px-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[#1d4ed8]" />
            <span className="text-sm font-bold text-ink-700">Total da semana</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-ink-900">
              {fmtHours(totalActualMins)}
            </span>
            {totalGoalMins > 0 && (
              <span className="text-xs text-ink-500 font-semibold"> / {fmtHours(totalGoalMins)}</span>
            )}
          </div>
        </div>
        {totalGoalMins > 0 && (
          <div className="w-full h-2 rounded-full bg-ink-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${totalPct >= 100 ? 'bg-emerald-500' : 'bg-[#1d4ed8]'}`}
              style={{ width: `${totalPct}%` }}
            />
          </div>
        )}
        {totalGoalQuestoes > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-500">Questões (soma das metas)</span>
              <span className="text-[11px] font-semibold text-ink-700">
                {totalActualQuestoes} / {totalGoalQuestoes}
                <span className="text-ink-400"> ({totalQuestoesPct}%)</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${questoesMetaDone ? 'bg-emerald-500' : 'bg-violet-500'}`}
                style={{ width: `${totalQuestoesPct}%` }}
              />
            </div>
          </div>
        )}
        {allMetasDone && goals.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-emerald-600">
            <Trophy size={14} />
            <span className="text-xs font-bold">Metas da semana atingidas!</span>
          </div>
        )}
      </div>

      {/* Goals list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5 lg:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : allDisciplinas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100">
              <Target size={28} className="text-ink-400" />
            </div>
            <div>
              <p className="font-bold text-ink-700">Nenhuma meta definida</p>
              <p className="text-sm text-ink-500 mt-1">Defina metas de horas por disciplina para acompanhar seu progresso semanal.</p>
            </div>
            <button
              type="button"
              onClick={() => openAddGoal()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300/55 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.38)] ring-1 ring-blue-200/25 transition hover:from-blue-300 hover:via-blue-400 hover:to-indigo-400 hover:shadow-[0_12px_28px_rgba(37,99,235,0.45)]"
            >
              <Plus size={16} />
              Criar primeira meta
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {allDisciplinas.map((disc, idx) => {
              const goal       = goals.find((g) => g.disciplina === disc);
              const goalMins   = (goal?.meta_horas || 0) * 60;
              const actualMins = actualByDisciplina[disc] || 0;
              const pct        = goalMins > 0 ? Math.min(100, Math.round((actualMins / goalMins) * 100)) : null;
              const goalQuestoes = goal ? goal.questoes_meta || 0 : 0;
              const actualQuestoes = actualQuestoesByDisciplina[disc] || 0;
              const qPct =
                goal && goalQuestoes > 0
                  ? Math.min(100, Math.round((actualQuestoes / goalQuestoes) * 100))
                  : null;
              const colorCls   = DISCIPLINE_COLORS[idx % DISCIPLINE_COLORS.length];
              const done       = pct !== null && pct >= 100;
              const doneQuestoes = qPct !== null && qPct >= 100;
              const hoursOk = !goal || goalMins <= 0 || done;
              const questoesOk = !goal || goalQuestoes <= 0 || qPct === null || doneQuestoes;
              const showCheck = Boolean(goal && hoursOk && questoesOk);

              return (
                <div key={disc} className="section-card flex flex-col p-3.5 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${colorCls}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-bold text-ink-800">{disc}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className="text-[11px] font-bold text-[#1d4ed8]">{fmtHours(actualMins)} estudados</span>
                          {goalMins > 0 && (
                            <span className="text-[11px] text-ink-400">/ meta {fmtHours(goalMins)}</span>
                          )}
                          {goal && goalQuestoes > 0 && (
                            <span className="text-[11px] font-semibold text-violet-700">
                              · {actualQuestoes}/{goalQuestoes} questões
                            </span>
                          )}
                          {!goal && (
                            <span className="text-[10px] font-bold text-ink-500 bg-ink-100 rounded-full px-2 py-0.5">
                              sem meta
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {showCheck && <Check size={14} className="text-emerald-500" />}
                      <button
                        type="button"
                        onClick={() => (goal ? openEditGoal(goal) : openAddGoal(disc))}
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-[#1d4ed8]"
                        title={goal ? 'Editar meta' : 'Definir meta'}
                      >
                        <Pencil size={13} />
                      </button>
                      {goal && (
                        <button
                          type="button"
                          onClick={() => handleDeleteGoal(goal)}
                          className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-500"
                          title="Excluir meta"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {pct !== null && (
                    <div className="mt-2.5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wide">Horas</span>
                        <span className={`text-[11px] font-semibold ${done ? 'text-emerald-600' : 'text-ink-700'}`}>{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-ink-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${done ? 'bg-emerald-500' : colorCls}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {qPct !== null && (
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-500">Questões</span>
                        <span className={`text-[11px] font-semibold ${doneQuestoes ? 'text-emerald-600' : 'text-ink-700'}`}>
                          {qPct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${doneQuestoes ? 'bg-emerald-500' : 'bg-violet-500'}`}
                          style={{ width: `${qPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit/Add modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-ink-200">
            <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
              <h3 className="text-base font-bold text-ink-800">
                {editGoal ? 'Editar meta' : 'Nova meta'}
              </h3>
              <button onClick={() => setEditModal(false)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {formErr && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
                  <X size={13} />
                  {formErr}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-ink-500">Disciplina *</label>
                {editGoal ? (
                  <p className="rounded-xl border-2 border-ink-100 bg-ink-50 px-4 py-3 text-sm font-bold text-ink-700">
                    {editGoal.disciplina}
                  </p>
                ) : (
                  <input
                    type="text"
                    list="disc-suggestions"
                    className={inputCls()}
                    placeholder="Ex: Direito Constitucional"
                    value={editForm.disciplina}
                    onChange={(e) => setEditForm((f) => ({ ...f, disciplina: e.target.value }))}
                  />
                )}
                {!editGoal && studiedDisciplinas.length > 0 && (
                  <datalist id="disc-suggestions">
                    {studiedDisciplinas.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-ink-500">Meta semanal (horas) *</label>
                <input
                  type="number"
                  min={0.5}
                  max={40}
                  step={0.5}
                  className={inputCls()}
                  value={editForm.meta_horas}
                  onChange={(e) => setEditForm((f) => ({ ...f, meta_horas: e.target.value }))}
                />
                <p className="text-xs text-ink-400">Ex: 2.5 = 2 horas e 30 minutos por semana</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-ink-500">
                  Meta de questões (opcional)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  step={1}
                  className={inputCls()}
                  placeholder="Automático: ~10 questões por hora"
                  value={editForm.questoes_meta}
                  onChange={(e) => setEditForm((f) => ({ ...f, questoes_meta: e.target.value }))}
                />
                <p className="text-xs text-ink-400">
                  Em branco:{' '}
                  {Math.max(
                    0,
                    Math.round(
                      (Number.isFinite(parseFloat(editForm.meta_horas)) ? parseFloat(editForm.meta_horas) : 0) * 10
                    )
                  )}{' '}
                  questões (10× as horas). O progresso usa acertos + erros do histórico na semana.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-ink-100 px-6 py-4">
              <button onClick={() => setEditModal(false)} className="rounded-xl border-2 border-ink-200 px-4 py-2 text-sm font-bold text-ink-600 hover:bg-ink-50">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#1d4ed8] px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
