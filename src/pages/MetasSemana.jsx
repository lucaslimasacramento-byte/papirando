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

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
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
  return date.toISOString().slice(0, 10);
}

function formatWeekLabel(monday) {
  const sunday = getSundayOfWeek(monday);
  const fmt = (d) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

function parseTime(tempo) {
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

// ─── Accent colors for discipline dots ─────────────────────────────────────

const ACCENT_COLORS = [
  'var(--pl-accent)', '#10b981', '#7c3aed', '#f59e0b',
  '#ef4444', '#06b6d4', '#6366f1', '#f97316',
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MetasSemana({ currentUserId, historicoReal }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [goals, setGoals]           = useState([]);
  const [loading, setLoading]       = useState(true);

  const [editModal, setEditModal]   = useState(false);
  const [editGoal, setEditGoal]     = useState(null);
  const [editForm, setEditForm]     = useState({ disciplina: '', meta_horas: 2, questoes_meta: '' });
  const [saving, setSaving]         = useState(false);
  const [formErr, setFormErr]       = useState('');

  const monday = useMemo(() => {
    const d = getMondayOfWeek(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekStartISO = formatDateISO(monday);
  const sunday       = getSundayOfWeek(monday);
  const sundayISO    = formatDateISO(sunday);

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
    const timer = window.setTimeout(() => { loadGoals(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadGoals]);

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

  const studiedDisciplinas = useMemo(() => Object.keys(actualByDisciplina).sort(), [actualByDisciplina]);

  const allDisciplinas = useMemo(() => {
    const fromGoals = goals.map((g) => g.disciplina);
    return [...new Set([...fromGoals, ...studiedDisciplinas])].sort();
  }, [goals, studiedDisciplinas]);

  const totalGoalMins = goals.reduce((acc, g) => acc + (g.meta_horas || 0) * 60, 0);
  const totalActualMins = goals.reduce((acc, g) => acc + (actualByDisciplina[g.disciplina] || 0), 0);
  const totalPct = totalGoalMins > 0 ? Math.min(100, Math.round((totalActualMins / totalGoalMins) * 100)) : 0;

  const totalGoalQuestoes = goals.reduce((acc, g) => acc + (g.questoes_meta || 0), 0);
  const totalActualQuestoes = goals.reduce((acc, g) => acc + (actualQuestoesByDisciplina[g.disciplina] || 0), 0);
  const totalQuestoesPct = totalGoalQuestoes > 0 ? Math.min(100, Math.round((totalActualQuestoes / totalGoalQuestoes) * 100)) : 0;

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
      if (!Number.isFinite(parsed) || parsed < 0) { setFormErr('Meta de questões inválida.'); return; }
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
    if (error) { setFormErr(error.message || 'Não foi possível salvar a meta.'); return; }
    if (!data) { setFormErr('Meta salva, mas a lista não atualizou. Recarregue a página.'); return; }

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
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-ink-3)' }}>
        <p style={{ fontSize: 13 }}>Faça login para ver suas metas.</p>
      </div>
    );
  }

  return (
    <div className="pl-paper-bg" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Hero */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        flexWrap: 'wrap', padding: '22px 24px 16px',
        borderBottom: '1px solid var(--pl-rule)',
        flexShrink: 0,
      }}>
        <div>
          <div className="pl-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>Acompanhamento semanal</div>
          <h1 className="pl-display" style={{ fontSize: 28, margin: 0 }}>Metas da semana.</h1>
        </div>
        <button type="button" className="pl-btn pl-btn-primary" onClick={() => openAddGoal()}>
          <Plus size={13} /> Nova meta
        </button>
      </div>

      {/* Week navigator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 24px', borderBottom: '1px solid var(--pl-rule)',
        background: 'var(--pl-surface)', flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          style={{ width: 30, height: 30, border: '1px solid var(--pl-rule-strong)', borderRadius: 6, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-ink-3)' }}
        >
          <ChevronLeft size={15} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--pl-ink)' }}>{formatWeekLabel(monday)}</div>
          {isCurrentWeek && (
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--pl-accent)', marginTop: 1 }}>Esta semana</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          disabled={weekOffset >= 0}
          style={{
            width: 30, height: 30, border: '1px solid var(--pl-rule-strong)', borderRadius: 6, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-ink-3)',
            opacity: weekOffset >= 0 ? 0.35 : 1, pointerEvents: weekOffset >= 0 ? 'none' : undefined,
          }}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Summary bar */}
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid var(--pl-rule)',
        background: 'var(--pl-bg-soft)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <TrendingUp size={13} style={{ color: 'var(--pl-accent)' }} />
            <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Total da semana</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>
            <span className="pl-num">{fmtHours(totalActualMins)}</span>
            {totalGoalMins > 0 && (
              <span style={{ fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500 }}> / {fmtHours(totalGoalMins)}</span>
            )}
          </div>
        </div>
        {totalGoalMins > 0 && (
          <div className="pl-progress">
            <div className="pl-progress-bar" style={{
              width: `${totalPct}%`,
              background: totalPct >= 100 ? 'var(--pl-success)' : 'var(--pl-accent)',
            }} />
          </div>
        )}
        {totalGoalQuestoes > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span className="pl-eyebrow" style={{ fontSize: 9.5 }}>Questões</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                {totalActualQuestoes} / {totalGoalQuestoes} ({totalQuestoesPct}%)
              </span>
            </div>
            <div className="pl-progress">
              <div className="pl-progress-bar" style={{
                width: `${totalQuestoesPct}%`,
                background: questoesMetaDone ? 'var(--pl-success)' : '#7c3aed',
              }} />
            </div>
          </div>
        )}
        {allMetasDone && goals.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: 'var(--pl-success)' }}>
            <Trophy size={13} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>Metas da semana atingidas!</span>
          </div>
        )}
      </div>

      {/* Goals list */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px 0' }}>
            <Loader2 size={22} style={{ color: 'var(--pl-accent)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : allDisciplinas.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--pl-bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={24} style={{ color: 'var(--pl-ink-4)' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 6 }}>Nenhuma meta definida</div>
              <div style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', maxWidth: 320 }}>
                Defina metas de horas por disciplina para acompanhar seu progresso semanal.
              </div>
            </div>
            <button type="button" className="pl-btn pl-btn-primary" onClick={() => openAddGoal()}>
              <Plus size={13} /> Criar primeira meta
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {allDisciplinas.map((disc, idx) => {
              const goal       = goals.find((g) => g.disciplina === disc);
              const goalMins   = (goal?.meta_horas || 0) * 60;
              const actualMins = actualByDisciplina[disc] || 0;
              const pct        = goalMins > 0 ? Math.min(100, Math.round((actualMins / goalMins) * 100)) : null;
              const goalQuestoes   = goal ? goal.questoes_meta || 0 : 0;
              const actualQuestoes = actualQuestoesByDisciplina[disc] || 0;
              const qPct       = goal && goalQuestoes > 0 ? Math.min(100, Math.round((actualQuestoes / goalQuestoes) * 100)) : null;
              const color      = ACCENT_COLORS[idx % ACCENT_COLORS.length];
              const done       = pct !== null && pct >= 100;
              const doneQuestoes = qPct !== null && qPct >= 100;
              const showCheck  = Boolean(goal && (!goalMins || done) && (!goalQuestoes || doneQuestoes));

              return (
                <div key={disc} className="pl-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 9, height: 9, borderRadius: 99, background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{disc}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', marginTop: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: color }}>{fmtHours(actualMins)} estudados</span>
                          {goalMins > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--pl-ink-4)' }}>/ meta {fmtHours(goalMins)}</span>
                          )}
                          {goal && goalQuestoes > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed' }}>{actualQuestoes}/{goalQuestoes} q</span>
                          )}
                          {!goal && (
                            <span className="pl-tag" style={{ fontSize: 9.5 }}>sem meta</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      {showCheck && <Check size={13} style={{ color: 'var(--pl-success)' }} />}
                      <button
                        type="button"
                        className="pl-btn pl-btn-ghost"
                        style={{ width: 26, height: 26, padding: 0, justifyContent: 'center' }}
                        onClick={() => (goal ? openEditGoal(goal) : openAddGoal(disc))}
                        title={goal ? 'Editar meta' : 'Definir meta'}
                      >
                        <Pencil size={11} />
                      </button>
                      {goal && (
                        <button
                          type="button"
                          className="pl-btn pl-btn-ghost"
                          style={{ width: 26, height: 26, padding: 0, justifyContent: 'center', color: 'var(--pl-danger)' }}
                          onClick={() => handleDeleteGoal(goal)}
                          title="Excluir meta"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Hours progress */}
                  {pct !== null && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span className="pl-eyebrow" style={{ fontSize: 9 }}>Horas</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: done ? 'var(--pl-success)' : 'var(--pl-ink-2)' }}>{pct}%</span>
                      </div>
                      <div className="pl-progress">
                        <div className="pl-progress-bar" style={{ width: `${pct}%`, background: done ? 'var(--pl-success)' : color }} />
                      </div>
                    </div>
                  )}

                  {/* Questões progress */}
                  {qPct !== null && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span className="pl-eyebrow" style={{ fontSize: 9 }}>Questões</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: doneQuestoes ? 'var(--pl-success)' : 'var(--pl-ink-2)' }}>{qPct}%</span>
                      </div>
                      <div className="pl-progress">
                        <div className="pl-progress-bar" style={{ width: `${qPct}%`, background: doneQuestoes ? 'var(--pl-success)' : '#7c3aed' }} />
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
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          padding: 16,
        }}>
          <div className="pl-card" style={{ width: '100%', maxWidth: 380, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--pl-rule)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)' }}>
                {editGoal ? 'Editar meta' : 'Nova meta'}
              </div>
              <button type="button" className="pl-btn pl-btn-ghost" style={{ width: 28, height: 28, padding: 0, justifyContent: 'center' }} onClick={() => setEditModal(false)}>
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formErr && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  borderRadius: 6, border: '1px solid var(--pl-danger)', background: 'var(--pl-danger-soft)',
                  fontSize: 13, fontWeight: 600, color: 'var(--pl-danger)',
                }}>
                  <X size={12} /> {formErr}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="pl-eyebrow" style={{ fontSize: 9.5 }}>Disciplina *</label>
                {editGoal ? (
                  <div style={{ padding: '10px 12px', background: 'var(--pl-bg-soft)', borderRadius: 6, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>
                    {editGoal.disciplina}
                  </div>
                ) : (
                  <input
                    type="text"
                    list="disc-suggestions"
                    className="pl-input"
                    placeholder="Ex: Direito Constitucional"
                    value={editForm.disciplina}
                    onChange={(e) => setEditForm((f) => ({ ...f, disciplina: e.target.value }))}
                  />
                )}
                {!editGoal && studiedDisciplinas.length > 0 && (
                  <datalist id="disc-suggestions">
                    {studiedDisciplinas.map((d) => <option key={d} value={d} />)}
                  </datalist>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="pl-eyebrow" style={{ fontSize: 9.5 }}>Meta semanal (horas) *</label>
                <input
                  type="number"
                  min={0.5}
                  max={40}
                  step={0.5}
                  className="pl-input"
                  value={editForm.meta_horas}
                  onChange={(e) => setEditForm((f) => ({ ...f, meta_horas: e.target.value }))}
                />
                <p style={{ fontSize: 11, color: 'var(--pl-ink-4)' }}>Ex: 2.5 = 2 horas e 30 minutos</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="pl-eyebrow" style={{ fontSize: 9.5 }}>Meta de questões (opcional)</label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  step={1}
                  className="pl-input"
                  placeholder="Automático: ~10 questões por hora"
                  value={editForm.questoes_meta}
                  onChange={(e) => setEditForm((f) => ({ ...f, questoes_meta: e.target.value }))}
                />
                <p style={{ fontSize: 11, color: 'var(--pl-ink-4)' }}>
                  Em branco: {Math.max(0, Math.round((Number.isFinite(parseFloat(editForm.meta_horas)) ? parseFloat(editForm.meta_horas) : 0) * 10))} questões (10× as horas).
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--pl-rule)' }}>
              <button type="button" className="pl-btn pl-btn-ghost" onClick={() => setEditModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="pl-btn pl-btn-primary"
                onClick={handleSaveGoal}
                disabled={saving}
                style={{ opacity: saving ? 0.6 : 1 }}
              >
                {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
