import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Search,
  Target,
  Timer,
  Trophy,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEFAULT_COURSE_TEMPLATES, normalizeCourseTemplates } from '../lib/courseTemplates';
import { normalizeCpf, isValidCpf } from '../lib/profileProgress';
import { showToast } from '../lib/dialogs';

const TOTAL_STEPS = 4;

const DAYS = [
  { id: 'seg', label: 'Segunda' },
  { id: 'ter', label: 'Terça' },
  { id: 'qua', label: 'Quarta' },
  { id: 'qui', label: 'Quinta' },
  { id: 'sex', label: 'Sexta' },
  { id: 'sab', label: 'Sábado' },
  { id: 'dom', label: 'Domingo' },
];

const EMPTY_DAILY = { seg: 0, ter: 0, qua: 0, qui: 0, sex: 0, sab: 0, dom: 0 };

function sumHours(daily) {
  return Object.values(daily).reduce((acc, v) => acc + (Number(v) || 0), 0);
}

function formatHours(h) {
  if (!h || h <= 0) return '—';
  const totalMin = Math.round(h * 60);
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hrs === 0) return `${min}min`;
  if (min === 0) return `${hrs}h`;
  return `${hrs}h ${min}min`;
}

function formatCpfMask(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// ─── Step 1: Boas-vindas ──────────────────────────────────────────────────────

function StepWelcome({ profile }) {
  const nome = profile?.nome || profile?.name || profile?.full_name || '';
  const firstName = nome.split(' ')[0] || '';

  const features = [
    { icon: Brain, label: 'IA para resumos, flashcards e questões' },
    { icon: Target, label: 'Simulados e banco de questões' },
    { icon: Timer, label: 'Cronômetro e ciclos de estudo' },
    { icon: BookOpen, label: 'Edital verticalizado e plano adaptativo' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'var(--pl-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Trophy size={32} color="var(--pl-bg)" />
      </div>

      <div>
        <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Bem-vindo</p>
        <h2 className="pl-display" style={{ fontSize: 28, marginBottom: 10 }}>
          {firstName ? `Olá, ${firstName}!` : 'Olá!'}
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--pl-ink-2)', lineHeight: 1.55, maxWidth: 340 }}>
          O Papirando é seu estúdio de estudos pessoal com IA. Vamos configurar sua conta
          em 3 passos rápidos.
        </p>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {features.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="pl-card-paper"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}
          >
            <Icon size={15} strokeWidth={1.75} style={{ flexShrink: 0, color: 'var(--pl-accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Objetivo ─────────────────────────────────────────────────────────

function makeObjectiveId(kind, rawId, index) {
  return `${kind}:${rawId || index}`;
}

function buildObjectiveLibrary(contestLibrary = [], courseTemplates = []) {
  const templateSource = Array.isArray(courseTemplates) && courseTemplates.length
    ? courseTemplates
    : DEFAULT_COURSE_TEMPLATES;
  const templates = normalizeCourseTemplates(templateSource)
    .map((template, index) => {
      const rawId = template.id || template.slug || template.nome || template.name;
      const name = template.nome || template.name || 'Objetivo';
      const lowerName = name.toLowerCase();
      const intent = String(template.intent || template.tipo || template.category || '').toLowerCase();
      const isVestibular = intent.includes('vestibular') || lowerName.includes('vestibular') || lowerName.includes('enem');
      return {
        ...template,
        id: makeObjectiveId('course', rawId, index),
        rawId,
        nome: name,
        orgao: template.area || template.orgao || template.organization || (isVestibular ? 'Vestibular' : 'Faculdade'),
        objectiveType: isVestibular ? 'Vestibular' : 'Faculdade',
        sourceKind: 'course',
      };
    });

  const contests = (contestLibrary || [])
    .map((contest, index) => {
      const rawId = contest.id || contest.slug || contest.plano || contest.nome || contest.name;
      return {
        ...contest,
        id: makeObjectiveId('contest', rawId, index),
        rawId,
        nome: contest.nome || contest.name || 'Objetivo',
        orgao: contest.orgao || contest.organization || 'Concurso público',
        objectiveType: 'Concurso',
        sourceKind: 'contest',
      };
    });

  const seen = new Set();
  return [...templates, ...contests].filter((item) => {
    const key = `${item.sourceKind}:${String(item.rawId || item.id).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(item.nome);
  });
}

const OBJECTIVE_TYPES = ['Faculdade', 'Vestibular', 'Concurso'];

function StepContest({ objectiveLibrary, selectedId, onSelect }) {
  const [activeType, setActiveType] = useState('Faculdade');
  const [activeArea, setActiveArea] = useState('');
  const [query, setQuery] = useState('');

  const typeCounts = useMemo(() => (
    OBJECTIVE_TYPES.reduce((acc, type) => {
      acc[type] = (objectiveLibrary || []).filter((item) => item.objectiveType === type).length;
      return acc;
    }, {})
  ), [objectiveLibrary]);

  const areas = useMemo(() => {
    const names = (objectiveLibrary || [])
      .filter((item) => item.objectiveType === activeType)
      .map((item) => item.area || item.orgao || item.organization || 'Geral')
      .filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [activeType, objectiveLibrary]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (objectiveLibrary || [])
      .filter((c) => c.objectiveType === activeType)
      .filter((c) => !activeArea || (c.area || c.orgao || c.organization || 'Geral') === activeArea)
      .filter(
        (c) =>
          !q ||
          (c.nome || c.name || '').toLowerCase().includes(q) ||
          (c.orgao || c.organization || '').toLowerCase().includes(q) ||
          (c.area || '').toLowerCase().includes(q) ||
          (c.objectiveType || '').toLowerCase().includes(q)
      )
      .slice(0, 80);
  }, [activeArea, activeType, objectiveLibrary, query]);

  const handleTypeChange = (type) => {
    setActiveType(type);
    setActiveArea('');
    setQuery('');
    onSelect('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Passo 1</p>
        <h2 className="pl-display" style={{ fontSize: 24, marginBottom: 8 }}>
          O que você está estudando?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--pl-ink-3)' }}>
          Isso orienta seu plano, suas questões e sua rotina. Pode pular se quiser.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        {OBJECTIVE_TYPES.map((type) => {
          const active = activeType === type;
          const label = type === 'Concurso' ? 'Concursos' : type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              style={{
                minWidth: 0,
                border: `1px solid ${active ? 'var(--pl-accent)' : 'var(--pl-rule-2)'}`,
                borderRadius: 999,
                background: active ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
                color: active ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
                padding: '9px 8px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 800,
                textAlign: 'center',
              }}
            >
              <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ display: 'block', marginTop: 1, fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-4)' }}>
                {typeCounts[type] || 0} opções
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="pl-eyebrow" style={{ margin: 0 }}>
          Áreas de {activeType === 'Concurso' ? 'concursos' : activeType.toLowerCase()}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 78, overflowY: 'auto' }}>
          <button
            type="button"
            onClick={() => setActiveArea('')}
            style={{
              border: `1px solid ${!activeArea ? 'var(--pl-accent)' : 'var(--pl-rule-2)'}`,
              borderRadius: 999,
              background: !activeArea ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
              color: !activeArea ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            Todas
          </button>
          {areas.map((area) => {
            const active = activeArea === area;
            return (
              <button
                key={area}
                type="button"
                onClick={() => setActiveArea(active ? '' : area)}
                style={{
                  border: `1px solid ${active ? 'var(--pl-accent)' : 'var(--pl-rule-2)'}`,
                  borderRadius: 999,
                  background: active ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
                  color: active ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                {area}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={13} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--pl-ink-4)', pointerEvents: 'none',
        }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar seu objetivo de estudo..."
          className="pl-input"
          style={{ width: '100%', paddingLeft: 30, boxSizing: 'border-box' }}
        />
      </div>

      <button
        type="button"
        onClick={() => onSelect('')}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '11px 14px',
          border: '1px solid var(--pl-rule-2)',
          borderRadius: 8,
          background: !selectedId ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', margin: 0 }}>
            Pular escolha por enquanto
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--pl-ink-3)', margin: '2px 0 0' }}>
            Você pode escolher curso, faculdade, vestibular ou concurso depois.
          </p>
        </div>
        {!selectedId && <CheckCircle2 size={15} style={{ flexShrink: 0, color: 'var(--pl-accent)' }} />}
      </button>

      <div style={{
        maxHeight: 240, overflowY: 'auto',
        border: '1px solid var(--pl-rule-2)', borderRadius: 8,
        background: 'var(--pl-surface)',
      }}>
        {filtered.length === 0 ? (
          <p style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--pl-ink-3)' }}>
            Nenhum resultado.
          </p>
        ) : (
          filtered.map((c) => {
            const id = c.id || c.slug || c.plano;
            const name = c.nome || c.name || 'Objetivo';
            const org = c.orgao || c.organization || '';
            const logo = c.imagem_url || c.logo_url || '';
            const type = c.objectiveType || 'Objetivo';
            const isSelected = selectedId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(isSelected ? '' : id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', border: 0,
                  borderBottom: '1px solid var(--pl-rule)',
                  background: isSelected ? 'var(--pl-accent-soft)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background .1s',
                }}
              >
                {logo ? (
                  <img src={logo} alt="" style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 6, objectFit: 'contain' }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, flexShrink: 0, borderRadius: 6,
                    background: 'var(--pl-bg-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-3)',
                  }}>
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                  {org ? <p style={{ fontSize: 11, color: 'var(--pl-ink-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org}</p> : null}
                </div>
                <span style={{
                  flexShrink: 0,
                  padding: '3px 7px',
                  borderRadius: 999,
                  background: 'var(--pl-bg-soft)',
                  color: 'var(--pl-ink-3)',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                }}>
                  {type}
                </span>
                {isSelected && <CheckCircle2 size={15} style={{ flexShrink: 0, color: 'var(--pl-accent)' }} />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Horas por dia ────────────────────────────────────────────────────

function StepGoal({ daily, onChange }) {
  const total = sumHours(daily);

  const feedback = total === 0
    ? 'Preencha ao menos um dia para montar seu plano.'
    : total < 7
    ? 'Começando devagar — consistência é o que importa!'
    : total < 20
    ? 'Ritmo sólido — você vai longe com essa constância.'
    : 'Modo foco máximo — sem distrações!';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Passo 2</p>
        <h2 className="pl-display" style={{ fontSize: 24, marginBottom: 8 }}>
          Quanto você estuda por dia?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--pl-ink-3)' }}>
          Coloque as horas que consegue dedicar em cada dia. Pode ajustar depois.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {DAYS.map(({ id, label }) => {
          const val = Number(daily[id]) || 0;
          const totalMin = Math.round(val * 60);
          const hrs = Math.floor(totalMin / 60);
          const mins = totalMin % 60;
          const active = val > 0;

          const setDay = (newHrs, newMins) => {
            const clampedH = Math.min(16, Math.max(0, newHrs));
            const clampedM = Math.min(59, Math.max(0, newMins));
            onChange({ ...daily, [id]: clampedH + clampedM / 60 });
          };

          return (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 12px',
              border: '1px solid var(--pl-rule-2)', borderRadius: 8,
              background: active ? 'var(--pl-accent-soft)' : 'var(--pl-surface)',
              transition: 'background .15s',
            }}>
              <span style={{
                width: 68, flexShrink: 0,
                fontSize: 13, fontWeight: 600,
                color: active ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
              }}>
                {label}
              </span>

              {/* Horas */}
              <input
                type="number"
                min="0"
                max="16"
                step="1"
                value={hrs === 0 ? '' : hrs}
                placeholder="0"
                onChange={(e) => setDay(parseInt(e.target.value) || 0, mins)}
                style={{
                  width: 44, height: 32, padding: '0 6px',
                  border: '1px solid var(--pl-rule-2)', borderRadius: 6,
                  background: 'var(--pl-surface)',
                  fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)',
                  fontFamily: 'var(--pl-mono)', textAlign: 'center',
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--pl-ink-3)', flexShrink: 0 }}>h</span>

              {/* Minutos */}
              <input
                type="number"
                min="0"
                max="59"
                step="1"
                value={mins === 0 ? '' : mins}
                placeholder="00"
                onChange={(e) => {
                  const m = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                  setDay(hrs, m);
                }}
                style={{
                  width: 44, height: 32, padding: '0 6px',
                  border: '1px solid var(--pl-rule-2)', borderRadius: 6,
                  background: 'var(--pl-surface)',
                  fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)',
                  fontFamily: 'var(--pl-mono)', textAlign: 'center',
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--pl-ink-3)', flexShrink: 0 }}>min</span>
            </div>
          );
        })}
      </div>

      {/* Soma total */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderTop: '2px solid var(--pl-rule-strong)',
        marginTop: 2,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Total semanal
        </span>
        <span className="pl-num" style={{ fontSize: 22, color: total > 0 ? 'var(--pl-accent)' : 'var(--pl-ink-4)' }}>
          {formatHours(total)}
        </span>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--pl-ink-3)', marginTop: -8 }}>
        {feedback}
      </p>
    </div>
  );
}

// ─── Step 4: CPF ─────────────────────────────────────────────────────────────

function StepCpf({ value, onChange, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Passo 3</p>
        <h2 className="pl-display" style={{ fontSize: 24, marginBottom: 8 }}>
          Informe seu CPF
        </h2>
        <p style={{ fontSize: 13, color: 'var(--pl-ink-3)' }}>
          Necessário para nota fiscal se você assinar um plano pago. Pode pular por enquanto.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }} htmlFor="onb-cpf">
          CPF
        </label>
        <input
          id="onb-cpf"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(formatCpfMask(e.target.value))}
          placeholder="000.000.000-00"
          maxLength={14}
          className="pl-input"
          style={{
            fontSize: 18, fontWeight: 700, letterSpacing: '0.12em',
            fontFamily: 'var(--pl-mono)',
            borderColor: error ? 'var(--pl-danger)' : undefined,
          }}
        />
        {error ? (
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-danger)' }}>{error}</p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--pl-ink-4)' }}>Pode preencher depois no seu Perfil.</p>
        )}
      </div>

      <div className="pl-card-paper" style={{ padding: '10px 14px' }}>
        <p style={{ fontSize: 12, color: 'var(--pl-ink-3)', lineHeight: 1.5 }}>
          O CPF é exigido somente ao contratar um plano pago. Sem assinatura, não é obrigatório.
        </p>
      </div>
    </div>
  );
}

// ─── Wizard principal ─────────────────────────────────────────────────────────

export default function OnboardingWizard({
  profile,
  contestLibrary = [],
  courseTemplates = [],
  currentUserId,
  setTargetContestId,
  onComplete,
  isPreview = false,
}) {
  const [step, setStep] = useState(1);
  const [contestId, setContestId] = useState('');
  const [daily, setDaily] = useState({ ...EMPTY_DAILY });
  const [cpf, setCpf] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const totalHours = sumHours(daily);
  const objectiveLibrary = useMemo(
    () => buildObjectiveLibrary(contestLibrary, courseTemplates),
    [contestLibrary, courseTemplates]
  );
  const selectedObjective = useMemo(
    () => objectiveLibrary.find((item) => item.id === contestId) || null,
    [objectiveLibrary, contestId]
  );

  const canAdvance = () => {
    if (step === 4 && cpf) {
      return isValidCpf(cpf.replace(/\D/g, ''));
    }
    return true;
  };

  const handleNext = () => {
    if (step === 4) { handleFinish(); return; }
    setStep((s) => s + 1);
  };

  const handleSkipCpf = () => {
    setCpf('');
    setCpfError('');
    if (isPreview) { onComplete?.(); return; }
    handleFinish(true);
  };

  const handleFinish = async (skipCpf = false) => {
    if (!skipCpf && cpf) {
      const digits = cpf.replace(/\D/g, '');
      if (!isValidCpf(digits)) {
        setCpfError('CPF inválido. Verifique os dígitos.');
        return;
      }
    }

    if (isPreview) { onComplete?.(); return; }

    setSaving(true);
    setSaveError('');

    try {
      const updates = {
        onboarding_done: true,
        meta_horas_semana: totalHours || 0,
        updated_at: new Date().toISOString(),
      };

      if (!skipCpf && cpf) {
        const normalizedCpf = normalizeCpf(cpf);
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('cpf', normalizedCpf)
          .neq('id', currentUserId)
          .maybeSingle();
        if (existing) {
          setCpfError('Este CPF já está cadastrado em outra conta.');
          setSaving(false);
          return;
        }
        updates.cpf = normalizedCpf;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUserId);

      if (error) throw error;

      if (selectedObjective?.sourceKind === 'contest') {
        setTargetContestId?.(selectedObjective.rawId || contestId.replace(/^contest:/, ''));
      }

      showToast('Configuração salva! Bem-vindo ao Papirando.', 'success');
      onComplete?.(updates);
    } catch (e) {
      const msg = e?.message || 'Não foi possível salvar. Tente novamente.';
      setSaveError(msg);
      showToast(msg, 'error');
      setSaving(false);
    }
  };

  const stepContent = () => {
    if (step === 1) return <StepWelcome profile={profile} />;
    if (step === 2) return <StepContest objectiveLibrary={objectiveLibrary} selectedId={contestId} onSelect={setContestId} />;
    if (step === 3) return <StepGoal daily={daily} onChange={setDaily} />;
    if (step === 4) return <StepCpf value={cpf} onChange={(v) => { setCpf(v); setCpfError(''); }} error={cpfError} />;
    return null;
  };

  const isLastStep = step === TOTAL_STEPS;

  return (
    <div className="pl-card" style={{
      width: '100%', maxWidth: 480,
      display: 'flex', flexDirection: 'column',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'var(--pl-surface)',
    }}>
      {/* Barra de progresso */}
      <div style={{ display: 'flex', gap: 4, padding: '20px 24px 0' }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 3, borderRadius: 99,
              background: i + 1 <= step ? 'var(--pl-accent)' : 'var(--pl-rule-2)',
              transition: 'background .25s',
            }}
          />
        ))}
      </div>

      {/* Conteúdo do step */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {stepContent()}
      </div>

      {/* Rodapé */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: '14px 24px',
        borderTop: '1px solid var(--pl-rule-2)',
      }}>
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={saving}
            className="pl-btn pl-btn-ghost pl-btn-sm"
          >
            Voltar
          </button>
        ) : (
          <div />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLastStep && (
            <button
              type="button"
              onClick={handleSkipCpf}
              disabled={saving}
              className="pl-btn pl-btn-ghost pl-btn-sm"
            >
              Pular CPF
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={saving || !canAdvance()}
            className="pl-btn pl-btn-primary pl-btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {saving
              ? <Loader2 size={14} className="animate-spin" />
              : <ChevronRight size={14} />}
            {step === 1 ? 'Começar' : step === 2 && !contestId ? 'Pular etapa' : isLastStep ? 'Finalizar' : 'Próximo'}
          </button>
        </div>
      </div>

      {saveError && (
        <p style={{ padding: '0 24px 12px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--pl-danger)' }}>
          {saveError}
        </p>
      )}
    </div>
  );
}
