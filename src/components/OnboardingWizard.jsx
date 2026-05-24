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
import { normalizeCpf, isValidCpf } from '../lib/profileProgress';

const TOTAL_STEPS = 4;

const GOAL_OPTIONS = [5, 10, 15, 20, 25, 30];

function formatCpfMask(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepWelcome({ profile }) {
  const nome = profile?.nome || profile?.name || profile?.full_name || '';
  const firstName = nome.split(' ')[0] || 'Olá';

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/30">
        <Trophy size={36} className="text-white" />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">Bem-vindo</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          Olá, {firstName}!
        </h1>
        <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-slate-600">
          O Papirando é seu estúdio de estudos pessoal com IA. Vamos configurar sua conta
          em 3 passos rápidos para personalizar sua experiência.
        </p>
      </div>

      <div className="grid w-full max-w-sm gap-3">
        {[
          { icon: Brain, label: 'IA para redações e flashcards' },
          { icon: Target, label: 'Simulados e banco de questões' },
          { icon: Timer, label: 'Cronômetro e ciclos de estudo' },
          { icon: BookOpen, label: 'Edital verticalizado guiado' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <Icon size={16} className="shrink-0 text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepContest({ contestLibrary, selectedId, onSelect }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return (contestLibrary || []).slice(0, 30);
    return (contestLibrary || [])
      .filter(
        (c) =>
          (c.nome || c.name || '').toLowerCase().includes(q) ||
          (c.orgao || c.organization || '').toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [contestLibrary, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">Passo 1</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          O que você está estudando?
        </h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Isso orienta seu plano, suas questões e sua rotina. Pode pular se quiser.
        </p>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar concurso..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-100">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Nenhum resultado.</p>
        ) : (
          filtered.map((c) => {
            const id = c.id || c.slug || c.plano;
            const name = c.nome || c.name || 'Concurso';
            const org = c.orgao || c.organization || '';
            const logo = c.imagem_url || c.logo_url || '';
            const isSelected = selectedId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(isSelected ? '' : id)}
                className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left last:border-0 transition hover:bg-blue-50 ${
                  isSelected ? 'bg-blue-50' : 'bg-white'
                }`}
              >
                {logo ? (
                  <img src={logo} alt="" className="h-7 w-7 shrink-0 rounded-lg object-contain" />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
                  {org ? <p className="truncate text-[11px] text-slate-500">{org}</p> : null}
                </div>
                {isSelected && <CheckCircle2 size={16} className="shrink-0 text-blue-600" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function StepGoal({ value, onChange }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">Passo 2</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Qual é sua meta semanal?
        </h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Quantidade de horas que pretende estudar por semana. Pode ajustar a qualquer momento.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {GOAL_OPTIONS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onChange(h)}
            className={`rounded-2xl border px-4 py-5 text-center transition ${
              value === h
                ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
            }`}
          >
            <span className="block text-2xl font-black">{h}h</span>
            <span className={`mt-0.5 block text-[11px] font-semibold ${value === h ? 'text-blue-100' : 'text-slate-400'}`}>
              por semana
            </span>
          </button>
        ))}
      </div>

      <p className="text-center text-xs font-medium text-slate-400">
        {value < 10
          ? 'Começando devagar — consistência é o que importa!'
          : value < 20
          ? 'Ritmo sólido — você vai longe com essa constância.'
          : 'Modo aprovação total — foco total no objetivo!'}
      </p>
    </div>
  );
}

function StepCpf({ value, onChange, error }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">Passo 3</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Informe seu CPF
        </h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Obrigatório para emissão de nota fiscal caso você assine um plano pago. Seus dados são
          protegidos e criptografados.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-600" htmlFor="onb-cpf">
          CPF *
        </label>
        <input
          id="onb-cpf"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(formatCpfMask(e.target.value))}
          placeholder="000.000.000-00"
          maxLength={14}
          className={`w-full rounded-xl border px-4 py-3 text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-100 ${
            error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white focus:border-blue-400'
          }`}
        />
        {error ? (
          <p className="text-xs font-semibold text-red-600">{error}</p>
        ) : (
          <p className="text-xs font-medium text-slate-400">
            Pode pular e preencher depois no seu Perfil.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold leading-relaxed text-slate-600">
          O CPF é necessário somente no momento de contratar um plano. Sem assinatura, não é
          exigido.
        </p>
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function OnboardingWizard({
  profile,
  contestLibrary = [],
  currentUserId,
  setTargetContestId,
  onComplete,
}) {
  const [step, setStep] = useState(1);
  const [contestId, setContestId] = useState('');
  const [goal, setGoal] = useState(15);
  const [cpf, setCpf] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const canAdvanceStep = () => {
    if (step === 4) {
      // CPF pode ser pulado, mas se preenchido deve ser válido
      if (cpf) {
        const digits = cpf.replace(/\D/g, '');
        return isValidCpf(digits);
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 4) {
      handleFinish();
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSkipCpf = () => {
    setCpf('');
    setCpfError('');
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

    setSaving(true);
    setSaveError('');

    try {
      const updates = {
        onboarding_done: true,
        meta_horas_semana: goal,
        updated_at: new Date().toISOString(),
      };

      if (!skipCpf && cpf) {
        updates.cpf = normalizeCpf(cpf);
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUserId);

      if (error) throw error;

      if (contestId) {
        setTargetContestId?.(contestId);
      }

      onComplete?.(updates);
    } catch (e) {
      setSaveError(e?.message || 'Não foi possível salvar. Tente novamente.');
      setSaving(false);
    }
  };

  const stepContent = () => {
    if (step === 1) return <StepWelcome profile={profile} />;
    if (step === 2) return <StepContest contestLibrary={contestLibrary} selectedId={contestId} onSelect={setContestId} />;
    if (step === 3) return <StepGoal value={goal} onChange={setGoal} />;
    if (step === 4) return <StepCpf value={cpf} onChange={(v) => { setCpf(v); setCpfError(''); }} error={cpfError} />;
    return null;
  };

  const isLastStep = step === TOTAL_STEPS;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col rounded-[2rem] bg-white shadow-2xl shadow-slate-900/20">
        {/* Progress dots */}
        <div className="flex items-center gap-2 px-8 pt-7">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i + 1 <= step ? 'bg-blue-600' : 'bg-slate-100'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">{stepContent()}</div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-8 py-5">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Voltar
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {isLastStep && (
              <button
                type="button"
                onClick={handleSkipCpf}
                disabled={saving}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                Pular CPF
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={saving || !canAdvanceStep()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ChevronRight size={15} />
              )}
              {step === 1 ? 'Começar' : isLastStep ? 'Finalizar' : 'Próximo'}
            </button>
          </div>
        </div>

        {saveError ? (
          <p className="px-8 pb-4 text-center text-xs font-semibold text-red-600">{saveError}</p>
        ) : null}
      </div>
    </div>
  );
}
