import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSubjectColor } from '../lib/subjectPalette';
import { showToast } from '../lib/dialogs';

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

function inputCls() {
  return 'pl-input';
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

  const metaItems = useMemo(() => {
    return allDisciplinas.map((disciplina) => {
      const goal = goals.find((g) => g.disciplina === disciplina);
      const alvoMin = (goal?.meta_horas || 0) * 60;
      const feitoMin = actualByDisciplina[disciplina] || 0;
      const pct = alvoMin > 0 ? Math.min(100, Math.round((feitoMin / alvoMin) * 100)) : 0;
      const questoesAlvo = goal?.questoes_meta || 0;
      const questoesFeitas = actualQuestoesByDisciplina[disciplina] || 0;
      const questoesPct = questoesAlvo > 0 ? Math.min(100, Math.round((questoesFeitas / questoesAlvo) * 100)) : 0;
      const horasOk = !goal || alvoMin <= 0 || pct >= 100;
      const questoesOk = !goal || questoesAlvo <= 0 || questoesPct >= 100;
      return {
        id: goal?.id || disciplina,
        goal,
        disciplina,
        alvoMin,
        feitoMin,
        pct,
        questoesAlvo,
        questoesFeitas,
        questoesPct,
        cumprida: Boolean(goal && horasOk && questoesOk),
        naoIniciou: Boolean(goal && feitoMin === 0 && questoesFeitas === 0),
      };
    });
  }, [actualByDisciplina, actualQuestoesByDisciplina, allDisciplinas, goals]);

  const metasCumpridas = metaItems.filter((meta) => meta.cumprida).length;

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
    // PostgREST resolve com { error } — não lança; sem o check, a meta sumia da
    // tela mas continuava no banco e reaparecia no F5.
    try {
      const { error } = await supabase.from('weekly_goals').delete().eq('id', goal.id);
      if (error) throw error;
      setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    } catch (error) {
      console.error('[MetasSemana] erro ao excluir meta:', error?.message || error);
      showToast('Não foi possível excluir a meta. Verifique a conexão e tente de novo.', 'error');
    }
  }

  if (!currentUserId) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-ink-3)' }}>
        <p style={{ fontSize: 14 }}>Faça login para ver suas metas.</p>
      </div>
    );
  }

  return (
    <div className="pl-page">
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <MetasHeader onNovaMeta={() => openAddGoal()} />

        <section className="metas-top-grid">
          <WeekPicker
            monday={monday}
            isCurrentWeek={isCurrentWeek}
            onPrev={() => setWeekOffset((offset) => offset - 1)}
            onNext={() => setWeekOffset((offset) => offset + 1)}
            disableNext={weekOffset >= 0}
          />
          <TotalCumpridoKpi feito={totalActualMins} alvo={totalGoalMins} pct={totalPct} />
          <MetasCumpridasKpi cumpridas={metasCumpridas} total={metaItems.length} />
        </section>

        {loading ? (
          <div className="pl-card" style={{ padding: 48, display: 'grid', placeItems: 'center' }}>
            <Loader2 size={24} className="animate-spin" color="var(--pl-ink-3)" />
          </div>
        ) : metaItems.length === 0 ? (
          <MetasEmptyState onBizu={() => openAddGoal()} onManual={() => openAddGoal()} />
        ) : (
          <>
            <MetasList
              metas={metaItems}
              onEditar={(meta) => (meta.goal ? openEditGoal(meta.goal) : openAddGoal(meta.disciplina))}
              onExcluir={(meta) => meta.goal && handleDeleteGoal(meta.goal)}
              onPapirar={(meta) => openAddGoal(meta.disciplina)}
              onReplanejar={() => openAddGoal()}
            />
            <MetaBizuSuggestion metas={metaItems} onReplanejar={() => openAddGoal()} />
          </>
        )}

        {totalGoalQuestoes > 0 ? (
          <section className="pl-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <span className="pl-tag pl-tag-accent">Questões da semana</span>
              <strong style={{ color: 'var(--pl-ink)' }}>{totalActualQuestoes} / {totalGoalQuestoes} ({totalQuestoesPct}%)</strong>
            </div>
            <div className="pl-progress-track" style={{ marginTop: 12 }}>
              <div className="pl-progress-fill" style={{ width: `${totalQuestoesPct}%`, background: questoesMetaDone ? 'var(--pl-success)' : 'var(--pl-accent)' }} />
            </div>
            {allMetasDone && goals.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, color: 'var(--pl-success)', fontWeight: 800 }}>
                <Trophy size={15} />
                Metas da semana atingidas!
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      {/* Edit/Add modal */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)', padding: 16, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 400, borderRadius: 20, background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', boxShadow: 'var(--pl-sh-high)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--pl-rule)', padding: '16px 24px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', margin: 0 }}>
                {editGoal ? 'Editar meta' : 'Nova meta'}
              </h3>
              <button onClick={() => setEditModal(false)} style={{ borderRadius: 8, padding: 6, color: 'var(--pl-ink-3)', background: 'transparent', border: 0, cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formErr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--pl-danger)' }}>
                  <X size={13} />
                  {formErr}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="pl-eyebrow">Disciplina *</label>
                {editGoal ? (
                  <p style={{ borderRadius: 10, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', margin: 0 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="pl-eyebrow">Meta semanal (horas) *</label>
                <input
                  type="number"
                  min={0.5}
                  max={40}
                  step={0.5}
                  className={inputCls()}
                  value={editForm.meta_horas}
                  onChange={(e) => setEditForm((f) => ({ ...f, meta_horas: e.target.value }))}
                />
                <p style={{ fontSize: 11.5, color: 'var(--pl-ink-3)', margin: 0 }}>Ex: 2.5 = 2 horas e 30 minutos por semana</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="pl-eyebrow">Meta de questões (opcional)</label>
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
                <p style={{ fontSize: 11.5, color: 'var(--pl-ink-3)', margin: 0 }}>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--pl-rule)', padding: '14px 24px' }}>
              <button onClick={() => setEditModal(false)} className="pl-btn pl-btn-ghost">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={saving}
                className="pl-btn pl-btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
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

function MetasHeader({ onNovaMeta }) {
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
      <div>
          <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
            Metas da semana<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
            Defina o alvo por disciplina, acompanhe o que já foi feito e ajuste a semana antes que ela escape.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="pl-btn pl-btn-primary" onClick={onNovaMeta}>
            <Plus size={15} />
            Nova meta
          </button>
        </div>
    </header>
  );
}

function WeekPicker({ monday, isCurrentWeek, onPrev, onNext, disableNext }) {
  return (
    <div className="pl-card metas-week-card">
      <button type="button" className="pl-icon-button" onClick={onPrev} aria-label="Semana anterior">
        <ChevronLeft size={17} />
      </button>
      <div style={{ textAlign: 'center', minWidth: 0 }}>
        <div className="pl-overline">Janela semanal</div>
        <div className="pl-serif-number" style={{ marginTop: 6, fontSize: 24, lineHeight: 1 }}>
          {formatWeekLabel(monday)}
        </div>
        {isCurrentWeek ? <div className="pl-small-label" style={{ justifyContent: 'center', marginTop: 8, color: 'var(--pl-accent)' }}>Esta semana</div> : null}
      </div>
      <button type="button" className="pl-icon-button" onClick={onNext} disabled={disableNext} aria-label="Próxima semana">
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

function TotalCumpridoKpi({ feito, alvo, pct }) {
  return (
    <div className="pl-card" style={{ padding: 18 }}>
      <span className="pl-tag pl-tag-accent">
        <TrendingUp size={12} />
        Total cumprido
      </span>
      <div className="pl-serif-number" style={{ marginTop: 12, fontSize: 36, lineHeight: 1 }}>{fmtHours(feito)}</div>
      <p className="pl-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
        {alvo > 0 ? `${pct}% das ${fmtHours(alvo)} alvo` : 'sem alvo definido'}
      </p>
      {alvo > 0 ? (
        <div className="pl-progress-track" style={{ marginTop: 12 }}>
          <div className="pl-progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--pl-success)' : 'var(--pl-ink)' }} />
        </div>
      ) : null}
    </div>
  );
}

function MetasCumpridasKpi({ cumpridas, total }) {
  const allDone = total > 0 && cumpridas === total;
  const tone = total === 0 ? 'pl-tag-accent' : allDone ? 'pl-tag-success' : 'pl-tag-warn';

  return (
    <div className="pl-card" style={{ padding: 18 }}>
      <span className={`pl-tag ${tone}`}>
        <Trophy size={12} />
        Metas cumpridas
      </span>
      <div className="pl-serif-number" style={{ marginTop: 12, fontSize: 36, lineHeight: 1 }}>{cumpridas}/{total}</div>
      <p className="pl-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
        {total === 0 ? 'nenhuma meta ainda' : allDone ? 'sem pendências' : `${total - cumpridas} pendente(s)`}
      </p>
    </div>
  );
}

function MetasList({ metas, onEditar, onExcluir, onPapirar, onReplanejar }) {
  return (
    <section className="pl-card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end', marginBottom: 16 }}>
        <div>
          <div className="pl-overline">Por disciplina</div>
          <h2 className="pl-section-title" style={{ marginTop: 7 }}>{metas.length} metas pra papirar</h2>
        </div>
        <button type="button" className="pl-btn-link" onClick={onReplanejar}>Replanejar com IA →</button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {metas.map((meta) => (
          <MetaRow
            key={meta.id}
            meta={meta}
            onEditar={() => onEditar(meta)}
            onExcluir={() => onExcluir(meta)}
            onPapirar={() => onPapirar(meta)}
          />
        ))}
      </div>
    </section>
  );
}

function MetaRow({ meta, onEditar, onExcluir, onPapirar }) {
  const color = getSubjectColor(meta.disciplina);
  const showQuestions = meta.questoesAlvo > 0;

  return (
    <div className={meta.cumprida ? 'metas-row is-done' : 'metas-row'}>
      <span className="metas-subject-bar" style={{ background: color }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <strong style={{ color: 'var(--pl-ink)', fontSize: 14 }}>{meta.disciplina}</strong>
          {meta.cumprida ? <span className="pl-tag pl-tag-success">Cumprida</span> : null}
          {meta.naoIniciou ? <span className="pl-tag pl-tag-warn">Não iniciada</span> : null}
          {!meta.goal ? <span className="pl-tag">Sem meta</span> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="pl-progress-track" style={{ flex: 1 }}>
            <div className="pl-progress-fill" style={{ width: `${meta.pct}%`, background: meta.cumprida ? 'var(--pl-success)' : color }} />
          </div>
          <span className="planning-time-label">{fmtHours(meta.feitoMin)} / {meta.alvoMin > 0 ? fmtHours(meta.alvoMin) : 'sem alvo'}</span>
        </div>
        {showQuestions ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <div className="pl-progress-track" style={{ flex: 1, height: 3 }}>
              <div className="pl-progress-fill" style={{ width: `${meta.questoesPct}%`, background: 'var(--pl-accent)' }} />
            </div>
            <span className="planning-time-label">{meta.questoesFeitas} / {meta.questoesAlvo} questões</span>
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button type="button" className="pl-btn pl-btn-sm" onClick={onEditar}>
          <Pencil size={13} />
          Editar
        </button>
        {meta.goal ? (
          <button type="button" className="pl-icon-button" onClick={onExcluir} title="Excluir meta">
            <Trash2 size={13} />
          </button>
        ) : null}
        {!meta.cumprida ? (
          <button type="button" className="pl-btn pl-btn-primary pl-btn-sm" onClick={onPapirar}>
            <Play size={13} fill="currentColor" />
            Papirar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MetaBizuSuggestion({ metas, onReplanejar }) {
  const total = metas.filter((meta) => meta.goal).length;
  const done = metas.filter((meta) => meta.cumprida).length;
  const notStarted = metas.find((meta) => meta.goal && meta.naoIniciou);
  const lagging = [...metas].filter((meta) => meta.goal && !meta.cumprida).sort((a, b) => a.pct - b.pct)[0];
  const subject = notStarted?.disciplina || lagging?.disciplina || '';
  const message =
    total > 0 && done === total
      ? 'Semana fechada antes da hora — quer subir as metas pra próxima ou descansar?'
      : notStarted
      ? `Falta uma frente que ainda nem começou: ${subject}. 30min hoje resolve o pior.`
      : lagging
      ? `O ponto mais atrasado da semana é ${subject} — vale ir lá agora enquanto o resto está em dia.`
      : 'Defina uma meta para o Bizu calibrar sua semana.';

  return (
    <section className="pl-card-ai metas-bizu">
      <div>
        <span className="pl-tag-ai"><Sparkles size={13} /> Bizu IA</span>
        <p className="pl-section-title" style={{ marginTop: 10, fontSize: 24 }}>
          {subject ? message.replace(subject, '') : message}
          {subject ? <span className="pl-mark-text">{subject}</span> : null}
        </p>
      </div>
      <button type="button" className="pl-btn-ai pl-btn" onClick={onReplanejar}>
        <Sparkles size={14} />
        Replanejar semana
      </button>
    </section>
  );
}

function MetasEmptyState({ onBizu, onManual }) {
  return (
    <section className="pl-card-paper" style={{ padding: 32 }}>
      <div className="pl-overline">Sem metas ainda</div>
      <h2 className="pl-section-title" style={{ marginTop: 10 }}>Qual o ritmo da sua semana?</h2>
      <p className="pl-body" style={{ maxWidth: 680, marginTop: 8 }}>
        Crie metas por disciplina para enxergar o avanço semanal e deixar o Bizu apontar o próximo melhor movimento.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
        <button type="button" className="pl-btn-ai pl-btn" onClick={onBizu}>
          <Sparkles size={14} />
          Deixar o Bizu definir
        </button>
        <button type="button" className="pl-btn pl-btn-secondary" onClick={onManual}>
          <Plus size={14} />
          Criar meta manual
        </button>
      </div>
    </section>
  );
}
