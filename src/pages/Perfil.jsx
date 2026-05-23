import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Crown,
  Download,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  Medal,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  User2,
  Users,
} from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';
import { supabase } from '../lib/supabase';
import { isValidCpf, normalizeCpf } from '../lib/profileProgress';

/** Paleta alinhada ao app (--accent #1e3a5f, superfícies frias). */
const HERO_BAR =
  'bg-gradient-to-br from-slate-900 via-[#0f172a] to-blue-900 ring-1 ring-blue-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
const ACCENT_BTN = 'bg-blue-700 hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500/40';
const PAGE_BG = 'bg-[var(--bg-canvas)]';

const navItems = [
  { id: 'overview', label: 'Visão geral', icon: User2 },
  { id: 'achievements', label: 'Conquistas', icon: Trophy },
  { id: 'security', label: 'Segurança', icon: ShieldCheck },
];

/** Planos alinhados à página Assinatura (preços exibidos; contratação na área dedicada). */
const PERFIL_PLANOS = [
  {
    id: 'gratuito',
    nome: 'Gratuito',
    descricao: 'O essencial para organizar estudos e acompanhar edital.',
    precoMensal: '0',
    precoAnual: '0',
    Icon: Circle,
    destaque: false,
    features: [
      'Cronômetro e registro de sessões',
      'Edital verticalizado básico',
      '1 ciclo de estudo ativo',
      'Histórico resumido e limite diário de questões',
    ],
  },
  {
    id: 'tatico',
    nome: 'Tático',
    descricao: 'Para quem leva a aprovação a sério.',
    precoMensal: '49,90',
    precoAnual: '29,90',
    Icon: Star,
    destaque: true,
    features: [
      'Tudo do Gratuito',
      'Ciclos de estudo ilimitados',
      'Banco de questões sem limite diário',
      'Estatísticas e dashboards avançados',
      'IA em recursos selecionados (conforme política do plano)',
    ],
  },
  {
    id: 'elite',
    nome: 'Elite',
    descricao: 'Pacote completo com destaque em IA e experiência premium.',
    precoMensal: '89,90',
    precoAnual: '59,90',
    Icon: Sparkles,
    destaque: false,
    premium: true,
    features: [
      'Tudo do Tático',
      'Redações e flashcards com IA',
      'Prioridade em novidades e selos premium',
      'Melhor custo-benefício para uso intensivo',
    ],
  },
];

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function Card({ children, className = '' }) {
  return (
    <div
      className={cn(
        'rounded-[30px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]',
        className
      )}
    >
      {children}
    </div>
  );
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-slate-200 bg-slate-100 text-slate-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    gold: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    dark: 'border-white/15 bg-white/10 text-white',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em]',
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

function SectionHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function ToneIconWrap({ tone = 'blue', children }) {
  const cls =
    tone === 'gold'
      ? 'bg-amber-100 text-amber-700'
      : tone === 'green'
        ? 'bg-emerald-100 text-emerald-700'
        : tone === 'red'
          ? 'bg-red-100 text-red-700'
          : 'bg-blue-100 text-blue-700';
  return <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', cls)}>{children}</div>;
}

function formatCpf(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatPlanLabel(plan) {
  const normalized = String(plan || 'gratuito').toLowerCase();
  if (normalized === 'elite') return 'Elite';
  if (normalized === 'tatico') return 'Tático';
  if (normalized === 'beta') return 'Beta 3 meses';
  return 'Gratuito';
}

function formatSubscriptionStatus(status) {
  const normalized = String(status || 'trial').toLowerCase();
  if (normalized === 'active') return 'Ativa';
  if (normalized === 'trial') return 'Trial';
  if (normalized === 'past_due') return 'Pendente';
  if (normalized === 'canceled') return 'Cancelada';
  return normalized || 'Não informado';
}

function formatHours(minutes) {
  const total = Number(minutes || 0);
  if (!total) return '0h';
  const hours = total / 60;
  return hours >= 10 ? `${Math.round(hours)}h` : `${hours.toFixed(1).replace('.', ',')}h`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0));
}

function formatAudiobookHours(seconds) {
  const totalMinutes = Math.round(Math.max(0, Number(seconds || 0)) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function getInitials(name, email) {
  const source = String(name || email || 'PP').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function getBadgeTone(unlocked, color) {
  if (!unlocked) return 'neutral';
  if (color === 'orange' || color === 'yellow' || color === 'amber') return 'gold';
  if (color === 'emerald' || color === 'green') return 'green';
  return 'blue';
}

function Field({ label, value, onChange, placeholder, disabled = false, type = 'text', autoComplete }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
    </label>
  );
}

function ToggleChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border px-4 py-2.5 text-sm font-semibold transition',
        active
          ? 'border-blue-700 bg-blue-700 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700'
      )}
    >
      {children}
    </button>
  );
}

function InfoTile({ label, value, helper, icon }) {
  const IconComponent = icon;
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
          {IconComponent ? <IconComponent className="h-4 w-4 text-slate-900" /> : null}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-950">{label}</p>
          <p className="mt-1 text-sm text-slate-700">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function SecurityRow({ icon, label, value, helper }) {
  const IconComponent = icon;
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
          {IconComponent ? <IconComponent className="h-4 w-4 text-slate-900" /> : null}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-950">{label}</p>
          <p className="mt-1 break-all text-sm text-slate-700">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function LgpdButton({ icon, label, description, tone = 'slate', onClick }) {
  const IconComponent = icon;
  const toneClasses = {
    blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700',
    slate: 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700',
    red: 'border-red-200 bg-red-50 hover:bg-red-100 text-red-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${toneClasses[tone] || toneClasses.slate}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
        {IconComponent && <IconComponent className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs opacity-70">{description}</p>
      </div>
    </button>
  );
}

function ActionTile({ icon, title, desc, actionLabel, onClick, disabled = false }) {
  const IconComponent = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
        {IconComponent ? <IconComponent className="h-4 w-4 text-slate-900" /> : null}
      </div>
      <p className="mt-4 text-sm font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
      <p className="mt-4 text-sm font-semibold text-blue-700">{actionLabel}</p>
    </button>
  );
}

export default function Perfil(props) {
  const {
    setActiveTab,
    profile = {},
    profileHasValidCpf = false,
    currentUserId = '',
    currentUserEmail = '',
    xpSummary = {},
    badgeSummary = {},
    essaySummary = {},
    squadSummary = { memberships: [] },
    audiobookSummary = {},
    onOpenSquad,
    onSaveProfile,
    onChangeAvatar,
    onLogout,
    onSessionRefresh,
  } = props;

  const [activeTab, setActiveTabState] = useState('overview');
  const [form, setForm] = useState({
    nome: '',
    username: '',
    celular: '',
    cpf: '',
    rankingDisplayMode: 'username',
    rankingCodename: '',
  });
  const [saveState, setSaveState] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordChangeBusy, setPasswordChangeBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [planoPrecoAnual, setPlanoPrecoAnual] = useState(true);
  const fileInputRef = useRef(null);

  const cpfDigitsPreview = useMemo(() => normalizeCpf(form.cpf || ''), [form.cpf]);
  const cpfLooksValid = cpfDigitsPreview.length === 11 && isValidCpf(cpfDigitsPreview);

  const profileData = useMemo(() => {
    const base = profile && typeof profile === 'object' ? profile : {};
    const remote = remoteProfile && typeof remoteProfile === 'object' ? remoteProfile : {};
    const merged = { ...base };

    Object.entries(remote).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        merged[key] = value;
      }
    });

    if (!merged.email && currentUserEmail) {
      merged.email = currentUserEmail;
    }

    return merged;
  }, [profile, remoteProfile, currentUserEmail]);

  useEffect(() => {
    setForm({
      nome: String(profileData?.nome || profileData?.name || '').trim(),
      username: String(profileData?.username || '').trim(),
      celular: String(profileData?.celular || profileData?.telefone || '').trim(),
      cpf: formatCpf(profileData?.cpf || ''),
      rankingDisplayMode: String(profileData?.ranking_display_mode || 'username'),
      rankingCodename: String(profileData?.ranking_codename || '').trim(),
    });
  }, [profileData]);

  const loadRemoteProfile = useCallback(async () => {
    if (!currentUserId) {
      setRemoteProfile(null);
      return;
    }

    // Try/catch externo evita que uma rejeição inesperada (timeout do fetch,
    // erro do client antes do response, falha de RLS recursiva) deixe o
    // componente em estado inconsistente e cause crash ao abrir a aba de
    // Segurança/Conquistas que dependem de profileData.
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', currentUserId).single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.warn('Não foi possível carregar o perfil remoto:', error.message);
        }
        setRemoteProfile({ email: currentUserEmail || '' });
        return;
      }

      setRemoteProfile(data || { email: currentUserEmail || '' });
    } catch (error) {
      console.warn('Falha inesperada ao carregar perfil remoto:', error);
      setRemoteProfile({ email: currentUserEmail || '' });
    }
  }, [currentUserEmail, currentUserId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadRemoteProfile();
      } catch (error) {
        if (!cancelled) {
          console.warn('Erro ignorado ao chamar loadRemoteProfile no efeito:', error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRemoteProfile]);

  const memberships = Array.isArray(squadSummary?.memberships) ? squadSummary.memberships : [];
  const badges = Array.isArray(badgeSummary?.badges) ? badgeSummary.badges : [];
  const unlockedBadges = badges.filter((badge) => badge.unlocked);
  const avatarInitials = getInitials(profileData?.nome || profileData?.name, currentUserEmail);
  const planLabel = formatPlanLabel(profileData?.subscription_plan || profileData?.plano);
  const subscriptionStatus = formatSubscriptionStatus(profileData?.subscription_status);
  const currentPlanId = useMemo(() => {
    const raw = String(profileData?.subscription_plan || profileData?.plano || 'gratuito').toLowerCase();
    if (raw === 'elite') return 'elite';
    if (raw === 'tatico') return 'tatico';
    return 'gratuito';
  }, [profileData?.subscription_plan, profileData?.plano]);
  const rankingPreview = useMemo(() => {
    if (form.rankingDisplayMode === 'codename' && String(form.rankingCodename || '').trim()) {
      return String(form.rankingCodename).trim();
    }
    return String(form.username || profileData?.username || profileData?.nome || profileData?.name || currentUserEmail || 'usuário').trim();
  }, [form.rankingDisplayMode, form.rankingCodename, form.username, profileData, currentUserEmail]);

  const completionPercent = useMemo(() => {
    const checks = [
      Boolean(profileData?.nome || profileData?.name),
      Boolean(profileData?.username),
      Boolean(profileData?.avatar_url),
      Boolean(profileData?.ranking_codename || form.rankingDisplayMode !== 'codename'),
      profileHasValidCpf,
      memberships.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profileData, form.rankingDisplayMode, profileHasValidCpf, memberships.length]);

  const heroStats = [
    { label: 'Perfil', value: `${completionPercent}% completo` },
    { label: 'Selos', value: formatNumber(unlockedBadges.length) },
    { label: 'Level', value: `Lv ${formatNumber(xpSummary.level || 1)}` },
    { label: 'Audiolivros', value: `${formatNumber(audiobookSummary.inProgress || 0)} em curso` },
  ];

  const kpis = [
    { label: 'Horas focadas', value: formatHours(xpSummary.totalMinutes), helper: 'Histórico real salvo' },
    { label: 'Questões', value: formatNumber(xpSummary.totalQuestions), helper: 'Acertos + erros' },
    { label: 'Ofensiva', value: `${formatNumber(xpSummary.streakDays)} dias`, helper: 'Melhor sequência' },
    { label: 'XP total', value: formatNumber(xpSummary.xpTotal), helper: `Progresso ${formatNumber(xpSummary.progressPercent)}%` },
    {
      label: 'Redações',
      value: formatNumber(essaySummary.corrected || 0),
      helper: essaySummary.averageScore ? `Média ${String(essaySummary.averageScore).replace('.', ',')}` : 'Sem correção ainda',
    },
  ];

  const linkageCards = [
    {
      title: 'Esquadrões',
      text: memberships.length > 0 ? `${formatNumber(memberships.length)} vínculo(s) ativo(s) na comunidade.` : 'Sem esquadrões vinculados no momento.',
      tone: memberships.length > 0 ? 'blue' : 'red',
      icon: Users,
    },
    {
      title: 'Selos',
      text: unlockedBadges.length > 0 ? `${formatNumber(unlockedBadges.length)} selo(s) desbloqueado(s).` : 'Nenhum selo desbloqueado ainda.',
      tone: unlockedBadges.length > 0 ? 'gold' : 'red',
      icon: Medal,
    },
    {
      title: 'XP acumulado',
      text: `${formatNumber(xpSummary.xpTotal)} XP acumulado na plataforma.`,
      tone: xpSummary.xpTotal > 0 ? 'blue' : 'green',
      icon: Crown,
    },
    {
      title: 'Audiolivros',
      text:
        audiobookSummary.totalBooks > 0
          ? `${formatNumber(audiobookSummary.favoriteCount || 0)} favorito(s), ${formatNumber(audiobookSummary.inProgress || 0)} em andamento e ${formatAudiobookHours(audiobookSummary.totalListenedSeconds || 0)} de reprodução.`
          : 'Nenhum audiolivro iniciado ainda.',
      tone: (audiobookSummary.inProgress || 0) > 0 ? 'blue' : 'red',
      icon: Trophy,
    },
    {
      title: 'Redações',
      text:
        essaySummary.corrected > 0
          ? `${formatNumber(essaySummary.corrected)} correção(ões) com média ${String(essaySummary.averageScore || 0).replace('.', ',')}.`
          : 'Nenhuma redação corrigida ainda.',
      tone: essaySummary.corrected > 0 ? 'blue' : 'red',
      icon: CheckCircle2,
    },
  ];

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (saveState.message) setSaveState({ type: '', message: '' });
  };

  const handleSave = async () => {
    if (typeof onSaveProfile !== 'function') return;
    if (!currentUserId) {
      setSaveState({ type: 'error', message: 'Sessão indisponível. Entre novamente para salvar o perfil.' });
      return;
    }
    const normalizedCpf = normalizeCpf(form.cpf);
    if (normalizedCpf && !isValidCpf(normalizedCpf)) {
      setSaveState({ type: 'error', message: 'CPF inválido. Revise os números antes de salvar.' });
      return;
    }
    setSaving(true);
    setSaveState({ type: '', message: '' });
    try {
      const result = await onSaveProfile({
        ...profileData,
        ...form,
        celular: formatPhone(form.celular),
        cpf: formatCpf(form.cpf),
        ranking_display_mode: form.rankingDisplayMode,
        ranking_codename: form.rankingCodename,
      });
      if (result?.ok) {
        setSaveState({
          type: result.partial ? 'warning' : 'success',
          message: result.partial
            ? 'Perfil salvo localmente. A sincronização remota falhou.'
            : 'Dados do perfil salvos com sucesso.',
        });
        await loadRemoteProfile();
      } else {
        setSaveState({
          type: 'error',
          message: result?.message || 'Não foi possível salvar o perfil. Corrija os campos indicados.',
        });
      }
    } catch (error) {
      console.error(error);
      setSaveState({ type: 'error', message: 'Não foi possível salvar o perfil agora.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarInput = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || typeof onChangeAvatar !== 'function') return;
    const isImage = String(file.type || '').startsWith('image/');
    if (!isImage) {
      setSaveState({ type: 'error', message: 'Formato inválido. Envie uma imagem.' });
      return;
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setSaveState({ type: 'error', message: 'Imagem muito grande. O limite é 5 MB.' });
      return;
    }
    setAvatarBusy(true);
    setSaveState({ type: '', message: '' });
    try {
      await onChangeAvatar(file);
      setSaveState({ type: 'success', message: 'Foto atualizada com persistência real.' });
      await loadRemoteProfile();
    } catch (error) {
      console.error(error);
      setSaveState({ type: 'error', message: 'Não foi possível atualizar a foto.' });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    const accountEmail = String(profileData?.email || currentUserEmail || '').trim();
    if (!accountEmail) {
      setSaveState({ type: 'error', message: 'E-mail da conta não encontrado para enviar a redefinição.' });
      return;
    }
    setPasswordBusy(true);
    setSaveState({ type: '', message: '' });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(accountEmail, {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      });
      if (error) throw error;
      setSaveState({
        type: 'success',
        message: `E-mail de redefinição enviado para ${accountEmail}. Verifique a caixa de entrada e o spam.`,
      });
    } catch (error) {
      console.error(error);
      setSaveState({ type: 'error', message: error?.message || 'Não foi possível enviar o link agora.' });
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleEmailChange = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setSaveState({ type: 'error', message: 'Digite o novo e-mail.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSaveState({ type: 'error', message: 'Formato de e-mail inválido.' });
      return;
    }
    if (email === String(currentUserEmail || '').toLowerCase()) {
      setSaveState({ type: 'error', message: 'Este já é o e-mail da sua conta.' });
      return;
    }
    if (!currentUserId) return;

    setEmailBusy(true);
    setSaveState({ type: '', message: '' });
    try {
      const { error: authError } = await supabase.auth.updateUser({ email });
      if (authError) throw authError;

      const { error: profileError } = await supabase.from('profiles').update({ email }).eq('id', currentUserId);
      if (profileError) {
        console.warn('Perfil: e-mail na tabela profiles não atualizado:', profileError.message);
      }

      setNewEmail('');
      setSaveState({
        type: 'success',
        message:
          'Solicitação de troca de e-mail enviada. Se o projeto exigir confirmação, abra o link no novo endereço; depois disso o login usará o e-mail novo.',
      });
      await onSessionRefresh?.();
      await loadRemoteProfile();
    } catch (error) {
      console.error(error);
      setSaveState({
        type: 'error',
        message: error?.message || 'Não foi possível alterar o e-mail. Tente novamente ou use outro endereço.',
      });
    } finally {
      setEmailBusy(false);
    }
  };

  const handlePasswordChangeDirect = async () => {
    if (newPassword.length < 6) {
      setSaveState({ type: 'error', message: 'A nova senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSaveState({ type: 'error', message: 'A confirmação da senha não confere.' });
      return;
    }

    setPasswordChangeBusy(true);
    setSaveState({ type: '', message: '' });
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setSaveState({
        type: 'success',
        message: 'Senha atualizada. Nas próximas vezes use a nova senha para entrar.',
      });
    } catch (error) {
      console.error(error);
      setSaveState({
        type: 'error',
        message: error?.message || 'Não foi possível alterar a senha.',
      });
    } finally {
      setPasswordChangeBusy(false);
    }
  };

  const saveTone =
    saveState.type === 'success' ? 'green' : saveState.type === 'error' ? 'red' : saveState.type === 'warning' ? 'gold' : 'blue';

  return (
    <div className={cn('min-h-screen text-slate-900', PAGE_BG)}>
      <div className="mx-auto max-w-[1540px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="grid gap-6 xl:grid-cols-[285px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <Card className="overflow-hidden">
              <div className={cn('relative px-6 py-6 text-white', HERO_BAR)}>
                <div className="relative">
                  <Badge tone="dark">Área privada</Badge>
                  <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Meu perfil</h1>
                  <p className="mt-2 text-sm leading-6 text-blue-100">
                    Dados da conta, ranking, progresso e vínculos reais da sua jornada.
                  </p>
                </div>
              </div>

              <div className="p-4">
                <div className="relative h-44 overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100 shadow-sm sm:h-52 lg:h-48">
                  {profileData?.avatar_url ? (
                    <img
                      src={profileData.avatar_url}
                      alt={profileData?.nome || profileData?.name || 'Avatar'}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-5xl font-bold text-white">
                      {avatarInitials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarBusy}
                    className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white/95 shadow-lg backdrop-blur disabled:opacity-60"
                    aria-label="Alterar foto do perfil"
                  >
                    <Camera className="h-4 w-4 text-slate-900" />
                  </button>
                </div>

                <nav className="mt-4 space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTabState(item.id)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-[22px] px-4 py-3.5 text-left transition-all',
                          active
                            ? 'bg-blue-700 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-200 hover:text-slate-950 hover:shadow-sm'
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', active ? 'bg-white/10' : 'bg-slate-100')}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="text-sm font-semibold">{item.label}</span>
                        </span>
                        <ChevronRight className={cn('h-4 w-4', active ? 'text-white/70' : 'text-slate-400')} />
                      </button>
                    );
                  })}
                </nav>

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarInput} />
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Snapshot</p>
              <h3 className="mt-3 text-xl font-bold text-slate-950">Leitura rápida</h3>
              <div className="mt-4 space-y-3">
                {[
                  ['Ranking atual', rankingPreview],
                  ['Esquadrões', memberships.length > 0 ? `${memberships.length} ativo(s)` : 'Nenhum vinculo'],
                  ['Proxima meta', `${formatNumber(xpSummary.nextLevelXp || 0)} XP`],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-600">{label}</span>
                    <span className="block min-w-0 truncate text-right text-sm font-bold text-slate-950" title={String(value || '')}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </aside>

          <main className="space-y-6">
            <Card className="overflow-hidden p-0">
              <PageHeadPremium
                className="!rounded-none lg:!flex-row lg:!items-center lg:!justify-between"
                icon={User2}
                badge={
                  <PageHeadPremiumBadge icon={ShieldCheck}>Perfil conectado</PageHeadPremiumBadge>
                }
                title="Controle real da sua conta e da sua presença na plataforma"
                titleAs="h2"
                subtitle="Username, codinome, CPF, XP, selos e esquadrões alimentados pelos dados reais do app."
                statGridClassName="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2 [&>*]:min-w-0"
                stats={[
                  { key: 'p', label: 'Perfil', value: heroStats[0].value, icon: User2, accent: 'blue' },
                  { key: 'sl', label: 'Selos', value: heroStats[1].value, icon: Medal, accent: 'amber' },
                  { key: 'lv', label: 'Level', value: heroStats[2].value, icon: Sparkles, accent: 'violet' },
                  { key: 'ab', label: 'Audiolivros', value: heroStats[3].value, icon: BookOpen, accent: 'emerald' },
                ]}
                leadingClassName="min-w-0 flex-1 items-center lg:max-w-[calc(100%-34rem)] xl:max-w-[46rem]"
                trailingWrapClassName="lg:ml-auto lg:w-auto lg:max-w-[33rem] lg:self-center"
              />
            </Card>

            {saveState.message ? (
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ToneIconWrap tone={saveTone}>
                      <CheckCircle2 className="h-5 w-5" />
                    </ToneIconWrap>
                    <p className="text-sm font-semibold text-slate-700">{saveState.message}</p>
                  </div>
                  <button type="button" onClick={() => setSaveState({ type: '', message: '' })} className="text-sm font-semibold text-slate-500 hover:text-slate-900">
                    Fechar
                  </button>
                </div>
              </Card>
            ) : null}

            {activeTab === 'overview' && (
              <div className="space-y-6">
                <SectionHeader
                  eyebrow="Dados da conta"
                  title="Informacoes editaveis do perfil"
                  subtitle="Persistidas pelo fluxo real de perfil do app."
                  action={
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60',
                        ACCENT_BTN
                      )}
                    >
                      {saving ? 'Salvando...' : 'Salvar perfil'}
                    </button>
                  }
                />

                <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                  <Card className="p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Nome completo"
                        value={form.nome}
                        onChange={(value) => handleFieldChange('nome', value)}
                        placeholder="Seu nome completo"
                        autoComplete="name"
                      />
                      <Field
                        label="Username"
                        value={form.username}
                        onChange={(value) => handleFieldChange('username', value.toLowerCase().replace(/\s+/g, ''))}
                        placeholder="apenas letras minúsculas, números, . e _"
                        autoComplete="username"
                      />
                      <Field
                        label="Celular"
                        value={form.celular}
                        onChange={(value) => handleFieldChange('celular', formatPhone(value))}
                        placeholder="(75) 99999-9999"
                        autoComplete="tel"
                      />
                      <div className="sm:col-span-2">
                        <Field
                          label="CPF"
                          value={form.cpf}
                          onChange={(value) => handleFieldChange('cpf', formatCpf(value))}
                          placeholder="000.000.000-00"
                          autoComplete="off"
                        />
                        <p
                          className={cn(
                            'mt-2 text-xs font-semibold',
                            cpfDigitsPreview.length === 0
                              ? 'text-slate-500'
                              : cpfDigitsPreview.length < 11
                                ? 'text-slate-500'
                                : cpfLooksValid
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                          )}
                        >
                          {cpfDigitsPreview.length === 0
                            ? 'CPF obrigatório para validar a conta e usar recursos vinculados.'
                            : cpfDigitsPreview.length < 11
                              ? 'Digite os 11 dígitos.'
                              : cpfLooksValid
                                ? 'CPF válido. Clique em Salvar perfil para persistir.'
                                : 'CPF inválido — confira os números ou os dígitos verificadores.'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Preferencia de ranking</p>
                          <p className="mt-2 text-sm text-slate-600">Escolha como seu nome aparece nos rankings e areas sociais.</p>
                        </div>
                        <Badge tone="blue">{rankingPreview}</Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <ToggleChip active={form.rankingDisplayMode === 'username'} onClick={() => handleFieldChange('rankingDisplayMode', 'username')}>
                          Mostrar username
                        </ToggleChip>
                        <ToggleChip active={form.rankingDisplayMode === 'codename'} onClick={() => handleFieldChange('rankingDisplayMode', 'codename')}>
                          Mostrar codinome
                        </ToggleChip>
                      </div>

                      <div className="mt-4">
                        <Field
                          label="Codinome"
                          value={form.rankingCodename}
                          onChange={(value) => handleFieldChange('rankingCodename', value)}
                          placeholder="Ex.: Aguia Azul"
                          disabled={form.rankingDisplayMode !== 'codename'}
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <InfoTile
                        label="Email da conta"
                        value={profileData?.email || currentUserEmail || 'Não informado'}
                        helper={
                          profileData?.created_at
                            ? `Cadastro em ${new Date(profileData.created_at).toLocaleDateString('pt-BR')}`
                            : 'Email autenticado atual'
                        }
                        icon={Mail}
                      />
                      <InfoTile
                        label="Status do CPF"
                        value={profileHasValidCpf ? 'Valido' : 'Pendente'}
                        helper={profileHasValidCpf ? 'Documento apto para vínculos' : 'Revise o CPF e salve'}
                        icon={BadgeCheck}
                      />
                    </div>
                  </Card>

                  <div className="grid gap-5">
                    <Card className="p-6">
                      <SectionHeader eyebrow="KPIs" title="Métricas reais" subtitle="Calculadas a partir do histórico salvo e do motor de XP." />

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {kpis.map((item) => (
                          <div key={item.label} className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                            <p className="mt-3 text-3xl font-extrabold text-slate-950">{item.value}</p>
                            <p className="mt-2 text-sm text-slate-600">{item.helper}</p>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="overflow-hidden">
                      <div className={cn('p-6 text-white', HERO_BAR)}>
                        <Badge tone="dark">XP atual</Badge>
                        <h3 className="mt-4 text-2xl font-bold">Nivel {formatNumber(xpSummary.level || 1)}</h3>
                        <p className="mt-2 text-sm leading-6 text-blue-100">
                          {formatNumber(xpSummary.xpTotal || 0)} XP acumulado. Faltam{' '}
                          {formatNumber(Math.max(0, Number(xpSummary.nextLevelXp || 0) - Number(xpSummary.xpTotal || 0)))} XP para o próximo nível.
                        </p>
                      </div>
                      <div className="p-6">
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#1e3a8a,#1e3a5f)]"
                            style={{ width: `${Math.max(0, Math.min(100, Number(xpSummary.progressPercent || 0)))}%` }}
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                          <span>XP atual</span>
                          <span className="font-semibold">{formatNumber(xpSummary.progressPercent || 0)}%</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                <Card className="p-6">
                  <SectionHeader
                    eyebrow="Vinculos"
                    title="Esquadrões, selos e XP"
                    subtitle="Resumo funcional do que a conta ja possui dentro da plataforma."
                  />

                  <div className="mt-5 grid gap-5 xl:grid-cols-3">
                    {linkageCards.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Card key={item.title} className="p-6 shadow-none">
                          <ToneIconWrap tone={item.tone}>
                            <Icon className="h-5 w-5" />
                          </ToneIconWrap>
                          <h3 className="mt-5 text-lg font-bold text-slate-950">{item.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                        </Card>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}
            {activeTab === 'achievements' && (
              <div className="space-y-6">
                <SectionHeader
                  eyebrow="Conquistas"
                  title="Selos e vínculos desbloqueados"
                  subtitle="Tudo alimentado por XP, histórico real e memberships atuais."
                />

                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {badges.length > 0 ? (
                    badges.map((badge) => (
                      <Card key={badge.id} className="p-6">
                        <div className="flex items-start justify-between gap-3">
                          <ToneIconWrap tone={getBadgeTone(badge.unlocked, badge.color)}>
                            <Medal className="h-5 w-5" />
                          </ToneIconWrap>
                          <Badge tone={getBadgeTone(badge.unlocked, badge.color)}>
                            {badge.unlocked ? 'Desbloqueado' : `${formatNumber(badge.progressPercent)}%`}
                          </Badge>
                        </div>
                        <h3 className="mt-5 text-lg font-bold text-slate-950">{badge.nome}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{badge.descricao}</p>
                        <p className="mt-4 text-sm font-semibold text-slate-700">
                          Progresso: {formatNumber(badge.current)} / {formatNumber(badge.target)}
                        </p>
                      </Card>
                    ))
                  ) : (
                    <Card className="p-6 md:col-span-2 2xl:col-span-3">
                      <p className="text-sm font-semibold text-slate-600">Ainda não existem selos configurados para esta conta.</p>
                    </Card>
                  )}
                </div>

                <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <Card className="p-6">
                    <SectionHeader eyebrow="Resumo" title="Leitura das conquistas" subtitle="Selos ativos, squads vinculados e nivel atual." />
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      {[
                        ['Selos ativos', formatNumber(badgeSummary.unlockedCount || 0)],
                        ['Esquadrões', formatNumber(memberships.length)],
                        ['Nivel atual', formatNumber(xpSummary.level || 1)],
                      ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl bg-slate-50 p-5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</p>
                          <p className="mt-3 text-3xl font-extrabold text-slate-950">{value}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <SectionHeader eyebrow="Esquadrões" title="Memberships atuais" subtitle="Atalhos para abrir o esquadrao conectado a este perfil." />
                    <div className="mt-5 space-y-4">
                      {memberships.length > 0 ? (
                        memberships.map((membership) => (
                          <div
                            key={membership.id}
                            className="flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-950">{membership.name || membership.id}</p>
                              <p className="mt-1 text-sm text-slate-600">Papel: {membership.role || 'Membro'} · Status: {membership.status || 'Ativo'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onOpenSquad?.(membership.id)}
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                            >
                              Abrir esquadrao
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm font-semibold text-slate-600">Nenhum esquadrao vinculado a esta conta.</p>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {false && activeTab === 'assinatura' && (
              <div className="space-y-6">
                <SectionHeader
                  eyebrow="Planos Papirando"
                  title="Assinatura e benefícios"
                  subtitle="Compare os níveis, veja o seu plano atual e abra a área de pagamento quando quiser mudar ou renovar."
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveTab?.('assinatura')}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5',
                        ACCENT_BTN
                      )}
                    >
                      Pagamentos e contratação
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  }
                />

                <Card className={cn('overflow-hidden text-white', HERO_BAR)}>
                  <div className="px-6 py-6 sm:px-8 sm:py-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-100/90">Sua assinatura</p>
                        <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                          Plano {planLabel} · {subscriptionStatus}
                        </h2>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100/95">
                          O plano ativo vale para recursos premium, limites de IA e ranking. Alterações de cobrança ficam na página
                          dedicada de assinatura.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <span className="inline-flex items-center rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-white">
                          {currentPlanId === 'elite' ? 'Nível máximo' : currentPlanId === 'tatico' ? 'Plano intermediário' : 'Nível inicial'}
                        </span>
                        {currentPlanId !== 'elite' ? (
                          <button
                            type="button"
                            onClick={() => setActiveTab?.('assinatura')}
                            className="rounded-2xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
                          >
                            Fazer upgrade
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 sm:px-5">
                  <p className="text-sm font-semibold text-slate-700">Preços exibidos por mês (referência)</p>
                  <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setPlanoPrecoAnual(false)}
                      className={cn(
                        'rounded-xl px-3 py-2 text-xs font-bold transition',
                        !planoPrecoAnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      )}
                    >
                      Mensal
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanoPrecoAnual(true)}
                      className={cn(
                        'rounded-xl px-3 py-2 text-xs font-bold transition',
                        planoPrecoAnual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      )}
                    >
                      Anual
                    </button>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  {PERFIL_PLANOS.map((plano) => {
                    const isCurrent = currentPlanId === plano.id;
                    const Icon = plano.Icon;
                    const isElite = plano.id === 'elite';
                    const isTatico = plano.id === 'tatico';
                    const precoValor =
                      plano.id === 'gratuito' ? 'R$ 0' : planoPrecoAnual ? `R$ ${plano.precoAnual}` : `R$ ${plano.precoMensal}`;

                    return (
                      <Card
                        key={plano.id}
                        className={cn(
                          'relative flex flex-col p-6 transition',
                          isElite &&
                            'border-amber-300/80 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-[0_20px_50px_rgba(180,83,9,0.18)] ring-2 ring-amber-400/50 lg:scale-[1.03] lg:z-10',
                          isTatico &&
                            !isElite &&
                            'border-blue-400/50 bg-gradient-to-b from-blue-700 to-blue-900 text-white shadow-[0_16px_40px_rgba(30,58,138,0.35)] ring-1 ring-blue-400/40',
                          !isTatico && !isElite && 'border-slate-200/90',
                          isCurrent && 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white'
                        )}
                      >
                        {isCurrent ? (
                          <span className="absolute right-4 top-4 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                            Seu plano
                          </span>
                        ) : null}
                        {plano.destaque && !isCurrent ? (
                          <span
                            className={cn(
                              'absolute right-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                              isTatico ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                            )}
                          >
                            Popular
                          </span>
                        ) : null}
                        {plano.premium ? (
                          <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-100/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                            <Sparkles className="h-3 w-3" />
                            Premium
                          </span>
                        ) : null}

                        <div className={cn('mt-8 flex h-12 w-12 items-center justify-center rounded-2xl', isTatico ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700', isElite && 'bg-amber-500/20 text-amber-900')}>
                          <Icon className="h-6 w-6" strokeWidth={2} />
                        </div>
                        <h3 className={cn('mt-5 text-xl font-extrabold', isTatico ? 'text-white' : 'text-slate-950')}>{plano.nome}</h3>
                        <p className={cn('mt-2 text-sm leading-relaxed', isTatico ? 'text-blue-100' : 'text-slate-600')}>{plano.descricao}</p>
                        <p className={cn('mt-5 text-3xl font-black tracking-tight', isTatico ? 'text-white' : 'text-slate-950')}>
                          {precoValor}
                          {plano.id !== 'gratuito' ? (
                            <span className={cn('text-sm font-semibold', isTatico ? 'text-blue-200' : 'text-slate-500')}>/mês</span>
                          ) : null}
                        </p>
                        {plano.id !== 'gratuito' && planoPrecoAnual ? (
                          <p className={cn('text-xs font-medium', isTatico ? 'text-blue-200/90' : 'text-slate-500')}>Valores na cobrança anual (referência da página de assinatura).</p>
                        ) : null}

                        <ul className="mt-6 flex-1 space-y-3">
                          {plano.features.map((line) => (
                            <li key={line} className="flex gap-2.5 text-sm">
                              <Check className={cn('mt-0.5 h-4 w-4 shrink-0', isTatico ? 'text-emerald-300' : 'text-emerald-600')} strokeWidth={2.5} />
                              <span className={cn('leading-snug', isTatico ? 'text-blue-50' : 'text-slate-700')}>{line}</span>
                            </li>
                          ))}
                        </ul>

                        <button
                          type="button"
                          onClick={() => setActiveTab?.('assinatura')}
                          className={cn(
                            'mt-8 w-full rounded-2xl py-3.5 text-sm font-bold transition',
                            isCurrent
                              ? 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                              : isTatico
                                ? 'bg-white text-blue-900 shadow-md hover:bg-blue-50'
                                : isElite
                                  ? cn(ACCENT_BTN, 'text-white shadow-md')
                                  : cn(ACCENT_BTN, 'text-white')
                          )}
                        >
                          {isCurrent ? 'Gerenciar na página de assinatura' : plano.id === 'gratuito' ? 'Detalhes e limites' : `Quero o ${plano.nome}`}
                        </button>
                      </Card>
                    );
                  })}
                </div>

                <Card className="p-6">
                  <p className="text-sm leading-relaxed text-slate-600">
                    Dúvidas sobre cobrança, nota fiscal ou troca de cartão use a página <strong className="font-semibold text-slate-800">Assinatura</strong> do app
                    (mesmo menu onde você acessa este perfil). Os preços finais podem incluir promoções ativas no checkout.
                  </p>
                </Card>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <SectionHeader
                  eyebrow="Segurança"
                  title="Dados sensiveis e acessos"
                  subtitle="Sem botões mortos: tudo abaixo executa alguma ação real ou mostra o estado atual da conta."
                />

                <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <Card className="p-6">
                    <SectionHeader eyebrow="Conta" title="Dados principais" subtitle="Origem real do profile autenticado." />
                    <div className="mt-5 space-y-4">
                      <SecurityRow icon={Mail} label="Email autenticado" value={profileData?.email || currentUserEmail || 'Não informado'} helper="Usado para login e recuperação" />
                      <SecurityRow icon={ShieldCheck} label="CPF" value={form.cpf || 'Não informado'} helper={profileHasValidCpf ? 'Documento valido no perfil' : 'Revise e salve para validar'} />
                      <SecurityRow icon={User2} label="Identificacao no ranking" value={rankingPreview} helper={form.rankingDisplayMode === 'codename' ? 'Modo codinome ativo' : 'Modo username ativo'} />
                    </div>
                  </Card>

                  <Card className="p-6">
                    <SectionHeader eyebrow="Conta" title="Status e indicações" subtitle="Resumo operacional da conta no app." />
                    <div className="mt-5 space-y-4">
                      <SecurityRow icon={RefreshCw} label="XP total" value={formatNumber(xpSummary.xpTotal)} helper={`Level ${formatNumber(xpSummary.level || 1)}`} />
                      <SecurityRow
                        icon={BadgeCheck}
                        label="Referral code"
                        value={profileData?.referral_code || 'Não gerado'}
                        helper={profileData?.referred_by_code ? `Indicado por ${profileData.referred_by_code}` : 'Conta sem indicacao vinculada'}
                      />
                    </div>
                  </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <Card className="p-6">
                    <SectionHeader
                      eyebrow="E-mail"
                      title="Trocar e-mail"
                      subtitle="O login passará a usar o novo endereço após a confirmação exigida pelo provedor (verifique inbox e spam)."
                    />
                    <div className="mt-5 space-y-4">
                      <Field
                        label="Novo e-mail"
                        type="email"
                        value={newEmail}
                        onChange={setNewEmail}
                        placeholder="voce@exemplo.com"
                        autoComplete="email"
                      />
                      <p className="text-xs text-slate-600">
                        E-mail atual:{' '}
                        <span className="font-semibold text-slate-800">{profileData?.email || currentUserEmail || '—'}</span>
                      </p>
                      <button
                        type="button"
                        onClick={handleEmailChange}
                        disabled={emailBusy || !currentUserId}
                        className={cn(
                          'w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60 sm:w-auto',
                          ACCENT_BTN
                        )}
                      >
                        {emailBusy ? 'Atualizando...' : 'Solicitar troca de e-mail'}
                      </button>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <SectionHeader
                      eyebrow="Senha"
                      title="Nova senha (logado)"
                      subtitle="Atualização imediata enquanto a sessão está ativa. Mínimo de 6 caracteres."
                    />
                    <div className="mt-5 grid gap-4">
                      <Field
                        label="Nova senha"
                        type="password"
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <Field
                        label="Confirmar nova senha"
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="Repita a senha"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={handlePasswordChangeDirect}
                        disabled={passwordChangeBusy}
                        className={cn(
                          'w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60 sm:w-auto',
                          ACCENT_BTN
                        )}
                      >
                        {passwordChangeBusy ? 'Salvando...' : 'Salvar nova senha'}
                      </button>
                    </div>
                  </Card>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <Card className="p-6">
                    <SectionHeader eyebrow="Ações reais" title="Recuperação e sessão" subtitle="Fluxos funcionais ligados ao Supabase e ao app." />
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <ActionTile
                        icon={KeyRound}
                        title="Redefinir senha"
                        desc="Envia um link real de redefinicao para o email autenticado."
                        actionLabel={passwordBusy ? 'Enviando...' : 'Enviar link'}
                        onClick={handlePasswordReset}
                        disabled={passwordBusy || !currentUserEmail}
                      />
                      <ActionTile icon={LogOut} title="Encerrar sessão" desc="Sai da conta atual e retorna ao fluxo de login." actionLabel="Sair da conta" onClick={() => onLogout?.()} />
                    </div>
                  </Card>

                  <Card className="overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Base da conta</p>
                      <h3 className="mt-2 text-xl font-bold text-slate-950">Sinais de integracao</h3>
                    </div>
                    <div className="space-y-4 p-6">
                      {[
                        { label: 'Foto do perfil', value: profileData?.avatar_url ? 'Persistida' : 'Sem foto', tone: profileData?.avatar_url ? 'green' : 'red' },
                        { label: 'Username', value: profileData?.username || 'Não informado', tone: profileData?.username ? 'blue' : 'red' },
                        { label: 'Referral code', value: profileData?.referral_code || 'Não gerado', tone: profileData?.referral_code ? 'green' : 'red' },
                      ].map((item) => (
                        <div key={item.label} className="rounded-[22px] border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-slate-950">{item.label}</p>
                              <p className="mt-1 text-sm text-slate-600">{item.value}</p>
                            </div>
                            <Badge tone={item.tone}>{item.value}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* LGPD — Seus dados */}
                <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <Card className="p-6">
                    <SectionHeader
                      eyebrow="LGPD"
                      title="Seus dados"
                      subtitle="Exporte uma cópia completa dos seus dados ou leia nossa política de privacidade."
                    />
                    <div className="mt-5 space-y-3">
                      <LgpdButton
                        icon={Download}
                        label="Exportar meus dados"
                        description="Baixa um JSON com todo o seu histórico"
                        tone="blue"
                        onClick={async () => {
                          try {
                            const { data, error } = await supabase.rpc('export_my_data');
                            if (error) throw error;
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `papirando-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } catch {
                            alert('Erro ao exportar dados. Tente novamente.');
                          }
                        }}
                      />
                      <LgpdButton
                        icon={FileText}
                        label="Política de Privacidade"
                        description="Veja como tratamos seus dados"
                        tone="slate"
                        onClick={() => setActiveTab('privacidade')}
                      />
                      <LgpdButton
                        icon={FileText}
                        label="Termos de Uso"
                        description="Regras e condições da plataforma"
                        tone="slate"
                        onClick={() => setActiveTab('termos')}
                      />
                    </div>
                  </Card>

                  <Card className="p-6 border border-red-100">
                    <SectionHeader
                      eyebrow="Zona de perigo"
                      title="Excluir conta"
                      subtitle="A exclusão é irreversível. Seus dados serão removidos em até 30 dias."
                    />
                    <div className="mt-5">
                      <LgpdButton
                        icon={Trash2}
                        label="Solicitar exclusão de conta"
                        description="Inicia o processo de remoção permanente"
                        tone="red"
                        onClick={async () => {
                          const confirmed = window.confirm(
                            'Tem certeza? Sua conta e todos os dados serão excluídos permanentemente em até 30 dias. Esta ação não pode ser desfeita.'
                          );
                          if (!confirmed) return;
                          try {
                            const { data, error } = await supabase.rpc('request_account_deletion');
                            if (error) throw error;
                            alert(data?.message || 'Solicitação registrada. Entraremos em contato.');
                          } catch {
                            alert('Erro ao registrar solicitação. Entre em contato: privacidade@papirando.com');
                          }
                        }}
                      />
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
