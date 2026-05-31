import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CreditCard,
  Crown,
  Download,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  Medal,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  User2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Assinatura from './Assinatura';
import { isValidCpf, normalizeCpf, PROGRESS_METRIC_OPTIONS } from '../lib/profileProgress';
import { normalizeUsername, validateUsername, USERNAME_MAX_LENGTH } from '../lib/usernameRules';
import { startCheckout } from '../lib/subscriptionApi';
import { showAlert, showConfirm, showToast } from '../lib/dialogs';

const navItems = [
  { id: 'overview', label: 'Visão geral', icon: User2 },
  { id: 'achievements', label: 'Conquistas', icon: Trophy },
  { id: 'assinatura', label: 'Assinatura', icon: CreditCard },
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

function getInitials(name, email) {
  const source = String(name || email || 'PP').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function getBadgeTone(unlocked, color) {
  if (!unlocked) return 'neutral';
  if (color === 'orange' || color === 'yellow' || color === 'amber') return 'warn';
  if (color === 'emerald' || color === 'green') return 'success';
  return 'accent';
}

function formatBadgeRequirement(badge) {
  const metricLabel = PROGRESS_METRIC_OPTIONS.find((option) => option.value === badge?.metric)?.label || 'progresso';
  const target = formatNumber(badge?.target || 1);
  return `${target} ${metricLabel.toLowerCase()}`;
}

/** Small badge/pill helper mapping tone to pl-tag class */
function TagBadge({ children, tone = 'neutral' }) {
  const cls =
    tone === 'warn' ? 'pl-tag pl-tag-warn'
    : tone === 'success' ? 'pl-tag pl-tag-success'
    : tone === 'accent' ? 'pl-tag pl-tag-accent'
    : tone === 'danger' ? 'pl-tag pl-tag-danger'
    : 'pl-tag';
  return <span className={cls}>{children}</span>;
}

function SectionHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</p>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--pl-ink)', margin: 0 }}>{title}</h2>
          {subtitle ? <p style={{ marginTop: 3, fontSize: 12.5, color: 'var(--pl-ink-2)' }}>{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

function ToneIconWrap({ tone = 'accent', children }) {
  let bg, color;
  if (tone === 'warn' || tone === 'gold') {
    bg = 'var(--pl-warn-soft)';
    color = 'var(--pl-warn)';
  } else if (tone === 'success' || tone === 'green') {
    bg = 'var(--pl-success-soft)';
    color = 'var(--pl-success)';
  } else if (tone === 'danger' || tone === 'red') {
    bg = 'var(--pl-danger-soft)';
    color = 'var(--pl-danger)';
  } else {
    bg = 'var(--pl-accent-soft)';
    color = 'var(--pl-accent)';
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 44, height: 44, borderRadius: 12,
      background: bg, color: color, flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, disabled = false, type = 'text', autoComplete, maxLength }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 5 }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className="pl-input"
        style={{ width: '100%', height: 34 }}
      />
    </label>
  );
}

function ToggleChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 20,
        border: active ? '1.5px solid var(--pl-accent)' : '1.5px solid var(--pl-rule-2)',
        background: active ? 'var(--pl-accent)' : 'var(--pl-surface)',
        color: active ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
        padding: '7px 14px',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function InfoTile({ label, value, helper, icon }) {
  const IconComponent = icon;
  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid var(--pl-rule-2)',
      background: 'var(--pl-bg-soft)',
      padding: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', flexShrink: 0,
        }}>
          {IconComponent ? <IconComponent style={{ width: 16, height: 16, color: 'var(--pl-ink)' }} /> : null}
        </div>
        <div>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink)' }}>{label}</p>
          <p style={{ marginTop: 3, fontSize: 12.5, color: 'var(--pl-ink-2)' }}>{value}</p>
          <p style={{ marginTop: 3, fontSize: 11.5, color: 'var(--pl-ink-3)' }}>{helper}</p>
        </div>
      </div>
    </div>
  );
}

function SecurityRow({ icon, label, value, helper }) {
  const IconComponent = icon;
  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid var(--pl-rule-2)',
      background: 'var(--pl-bg-soft)',
      padding: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 10,
          background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', flexShrink: 0,
        }}>
          {IconComponent ? <IconComponent style={{ width: 16, height: 16, color: 'var(--pl-ink)' }} /> : null}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink)' }}>{label}</p>
          <p style={{ marginTop: 2, wordBreak: 'break-all', fontSize: 12.5, color: 'var(--pl-ink-2)' }}>{value}</p>
          <p style={{ marginTop: 2, fontSize: 11.5, color: 'var(--pl-ink-3)' }}>{helper}</p>
        </div>
      </div>
    </div>
  );
}

function LgpdButton({ icon, label, description, tone = 'neutral', onClick }) {
  const IconComponent = icon;
  let bg, border, color, hoverBg;
  if (tone === 'blue' || tone === 'accent') {
    bg = 'var(--pl-accent-soft)'; border = 'var(--pl-accent)'; color = 'var(--pl-accent)'; hoverBg = 'var(--pl-accent-soft)';
  } else if (tone === 'red' || tone === 'danger') {
    bg = 'var(--pl-danger-soft)'; border = 'var(--pl-danger)'; color = 'var(--pl-danger)'; hoverBg = 'var(--pl-danger-soft)';
  } else {
    bg = 'var(--pl-bg-soft)'; border = 'var(--pl-rule-2)'; color = 'var(--pl-ink-2)'; hoverBg = 'var(--pl-bg-soft)';
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', width: '100%', alignItems: 'center', gap: 12,
        borderRadius: 14, border: `1px solid ${border}`,
        background: bg, color: color,
        padding: 10, textAlign: 'left', cursor: 'pointer', transition: 'opacity 0.15s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
      }}>
        {IconComponent && <IconComponent style={{ width: 16, height: 16 }} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</p>
        <p style={{ marginTop: 1, fontSize: 11.5, opacity: 0.7 }}>{description}</p>
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
      style={{
        borderRadius: 12, border: '1px solid var(--pl-rule-2)',
        background: 'var(--pl-bg-soft)', padding: 12, textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s', width: '100%',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 10,
        background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
      }}>
        {IconComponent ? <IconComponent style={{ width: 16, height: 16, color: 'var(--pl-ink)' }} /> : null}
      </div>
      <p style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink)' }}>{title}</p>
      <p style={{ marginTop: 4, fontSize: 11.5, lineHeight: 1.45, color: 'var(--pl-ink-2)' }}>{desc}</p>
      <p style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--pl-accent)' }}>{actionLabel}</p>
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
    initialTab = 'overview',
  } = props;

  const [activeTab, setActiveTabState] = useState(initialTab || 'overview');
  const [form, setForm] = useState({
    nome: '',
    username: '',
    celular: '',
    cpf: '',
  });
  const [saveState, setSaveState] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordChangeBusy, setPasswordChangeBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [planoPrecoAnual, setPlanoPrecoAnual] = useState(true);
  const [showBadgeCatalog, setShowBadgeCatalog] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
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
    });
  }, [profileData]);

  const loadRemoteProfile = useCallback(async () => {
    if (!currentUserId) {
      setRemoteProfile(null);
      return;
    }

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
  const lockedBadges = badges.filter((badge) => !badge.unlocked);
  const nextBadge = lockedBadges
    .slice()
    .sort((a, b) => Number(b.progressPercent || 0) - Number(a.progressPercent || 0))[0];
  const avatarInitials = getInitials(profileData?.nome || profileData?.name, currentUserEmail);
  const planLabel = formatPlanLabel(profileData?.subscription_plan || profileData?.plano);
  const subscriptionStatus = formatSubscriptionStatus(profileData?.subscription_status);
  const currentPlanId = useMemo(() => {
    const raw = String(profileData?.subscription_plan || profileData?.plano || 'folha').toLowerCase();
    if (['papiro', 'elite', 'tatico'].includes(raw)) return 'papiro';
    return 'folha';
  }, [profileData?.subscription_plan, profileData?.plano]);

  const handleCheckout = useCallback(async (planId, isAnual) => {
    if (planId === 'folha') return; // plano gratuito, nada a fazer
    setCheckoutBusy(true);
    try {
      const url = await startCheckout({
        planId: 'papiro',
        billing: isAnual ? 'annual' : 'monthly',
      });
      window.location.href = url;
    } catch (err) {
      showToast(err?.message || 'Erro ao iniciar pagamento. Tente novamente.', 'error');
      setCheckoutBusy(false);
    }
  }, []);
  const rankingPreview = useMemo(() => {
    return String(form.username || profileData?.username || currentUserEmail || 'usuario').trim();
  }, [form.username, profileData?.username, currentUserEmail]);
  const usernameValidation = useMemo(() => validateUsername(form.username), [form.username]);
  const usernameChanged = useMemo(() => {
    return normalizeUsername(form.username) !== normalizeUsername(profileData?.username || '');
  }, [form.username, profileData?.username]);

  const completionPercent = useMemo(() => {
    const checks = [
      Boolean(profileData?.nome || profileData?.name),
      Boolean(profileData?.username),
      Boolean(profileData?.avatar_url),
      profileHasValidCpf,
      memberships.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profileData, profileHasValidCpf, memberships.length]);

  const heroStats = [
    { label: 'Perfil', value: `${completionPercent}% completo` },
    { label: 'Selos', value: formatNumber(unlockedBadges.length) },
    { label: 'Nível', value: `Nv ${formatNumber(xpSummary.level || 1)}` },
    { label: 'Audiolivros', value: `${formatNumber(audiobookSummary.inProgress || 0)} em curso` },
  ];

  const kpis = [
    { label: 'Horas focadas', value: formatHours(xpSummary.totalMinutes), helper: 'Histórico real salvo' },
    { label: 'Questões', value: formatNumber(xpSummary.totalQuestions), helper: 'Acertos + erros' },
    { label: 'Ofensiva', value: `${formatNumber(xpSummary.streakDays)} dias`, helper: 'Melhor sequência' },
    {
      label: 'Redações',
      value: formatNumber(essaySummary.corrected || 0),
      helper: essaySummary.averageScore ? `Média ${String(essaySummary.averageScore).replace('.', ',')}` : 'Sem correção ainda',
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
    const nextUsername = validateUsername(form.username);
    if (!nextUsername.ok) {
      setSaveState({ type: 'error', message: nextUsername.message });
      return;
    }
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
        username: nextUsername.username,
        celular: formatPhone(form.celular),
        cpf: formatCpf(form.cpf),
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
      setEditingEmail(false);
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
    if (!currentPassword) {
      setSaveState({ type: 'error', message: 'Digite a senha atual para confirmar a alteração.' });
      return;
    }
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
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: currentUserEmail,
        password: currentPassword,
      });
      if (reAuthError) {
        setSaveState({ type: 'error', message: 'Senha atual incorreta. Verifique e tente novamente.' });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword('');
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

  const saveToneCls =
    saveState.type === 'success' ? 'success'
    : saveState.type === 'error' ? 'danger'
    : saveState.type === 'warning' ? 'warn'
    : 'accent';

  return (
    <div style={{ height: activeTab === 'assinatura' ? 'auto' : '100%', overflow: activeTab === 'assinatura' ? 'visible' : 'hidden', padding: '8px 20px 14px', background: 'transparent' }}>
      <div style={{ height: activeTab === 'assinatura' ? 'auto' : '100%', maxWidth: 1540, margin: '0 auto', overflow: activeTab === 'assinatura' ? 'visible' : 'hidden' }}>
        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
          {heroStats.map((k) => (
            <div key={k.label} className="pl-card" style={{ padding: '9px 14px' }}>
              <p className="pl-eyebrow" style={{ marginBottom: 3 }}>{k.label}</p>
              <p className="pl-num" style={{ fontSize: 18, color: 'var(--pl-ink)' }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '280px minmax(0,1fr)', height: activeTab === 'assinatura' ? 'auto' : 'calc(100% - 76px)', minHeight: 0, overflow: activeTab === 'assinatura' ? 'visible' : 'hidden' }}>
          {/* Sidebar */}
          <aside style={{ display: 'flex', minHeight: 0, flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
            {/* Avatar card */}
            <div className="pl-card" style={{ overflow: 'hidden' }}>
              <div style={{
                position: 'relative', height: 170, overflow: 'hidden',
                borderRadius: '6px 6px 0 0',
                background: 'linear-gradient(135deg, var(--pl-ink) 0%, var(--pl-accent) 100%)',
              }}>
                {profileData?.avatar_url ? (
                  <>
                    <img
                      src={profileData.avatar_url}
                      alt=""
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        filter: 'blur(14px) saturate(0.92)',
                        transform: 'scale(1.12)',
                        opacity: 0.55,
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(20,17,13,0.08), rgba(20,17,13,0.34))',
                    }} />
                    <img
                      src={profileData.avatar_url}
                      alt={profileData?.nome || profileData?.name || 'Avatar'}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: 124,
                        height: 124,
                        transform: 'translate(-50%, -50%)',
                        borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.86)',
                        boxShadow: '0 18px 42px rgba(20,17,13,0.32)',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        background: 'var(--pl-bg-soft)',
                      }}
                    />
                  </>
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 48, fontWeight: 700, color: 'var(--pl-bg)',
                    fontFamily: 'var(--pl-serif)', fontStyle: 'italic',
                  }}>
                    {avatarInitials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarBusy}
                  style={{
                    position: 'absolute', bottom: 12, right: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 38, height: 38, borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.6)',
                    background: 'rgba(255,255,255,0.92)',
                    boxShadow: 'var(--pl-sh-mid)',
                    cursor: avatarBusy ? 'not-allowed' : 'pointer',
                    opacity: avatarBusy ? 0.6 : 1,
                  }}
                  aria-label="Alterar foto do perfil"
                >
                  <Camera style={{ width: 16, height: 16, color: 'var(--pl-ink)' }} />
                </button>
              </div>

              <nav style={{ padding: '8px 10px 10px' }}>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTabState(item.id)}
                      style={{
                        display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                        borderRadius: 12, padding: '7px 10px', textAlign: 'left',
                        marginBottom: 5,
                        background: active ? 'var(--pl-accent)' : 'transparent',
                        border: active ? '1px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
                        color: active ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 30, height: 30, borderRadius: 9,
                          background: active ? 'rgba(255,255,255,0.15)' : 'var(--pl-bg-soft)',
                        }}>
                          <Icon style={{ width: 16, height: 16 }} />
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{item.label}</span>
                      </span>
                      <ChevronRight style={{ width: 16, height: 16, opacity: active ? 0.7 : 0.4 }} />
                    </button>
                  );
                })}
              </nav>

              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarInput} />
            </div>

            {/* Snapshot card */}
            <div className="pl-card" style={{ padding: 14 }}>
              <p className="pl-eyebrow" style={{ marginBottom: 5 }}>Snapshot</p>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 9 }}>Leitura rápida</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['Esquadrões', memberships.length > 0 ? `${memberships.length} ativo(s)` : 'Nenhum vínculo'],
                  ['Próxima meta', `${formatNumber(xpSummary.nextLevelXp || 0)} XP`],
                ].map(([label, value]) => (
                  <div key={label} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1.35fr',
                    alignItems: 'center', gap: 8,
                    borderRadius: 10, background: 'var(--pl-bg-soft)',
                    padding: '7px 10px',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--pl-ink-2)' }}>{label}</span>
                    <span style={{
                      display: 'block', minWidth: 0, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink)',
                    }} title={String(value || '')}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main style={{ display: 'flex', minHeight: 0, flexDirection: 'column', gap: 12, overflow: activeTab === 'assinatura' ? 'auto' : 'hidden' }}>
            {/* Save state banner */}
            {saveState.message ? (
              <div className="pl-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ToneIconWrap tone={saveToneCls}>
                      <CheckCircle2 style={{ width: 20, height: 20 }} />
                    </ToneIconWrap>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{saveState.message}</p>
                  </div>
                  <button type="button" onClick={() => setSaveState({ type: '', message: '' })} style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Fechar
                  </button>
                </div>
              </div>
            ) : null}

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', minHeight: 0, flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
                <div style={{ display: 'grid', minHeight: 0, gap: 14, gridTemplateColumns: '1.2fr 0.8fr', overflow: 'hidden' }}>
                  {/* Profile fields */}
                  <div className="pl-card" style={{ padding: 16, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
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
                        onChange={(value) => handleFieldChange('username', normalizeUsername(value))}
                        placeholder="@papirando"
                        autoComplete="username"
                        maxLength={USERNAME_MAX_LENGTH}
                      />
                      <p style={{
                        gridColumn: '2 / 3',
                        marginTop: -8,
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: usernameValidation.ok ? 'var(--pl-ink-3)' : 'var(--pl-danger)',
                      }}>
                        {usernameChanged
                          ? (usernameValidation.ok ? 'Ao salvar, esse será seu nome público nos rankings.' : usernameValidation.message)
                          : '3 a 30 caracteres. Use letras, números, ponto ou underline.'}
                      </p>
                      <Field
                        label="Celular"
                        value={form.celular}
                        onChange={(value) => handleFieldChange('celular', formatPhone(value))}
                        placeholder="(75) 99999-9999"
                        autoComplete="tel"
                      />
                      <div>
                        <Field
                          label="CPF"
                          value={form.cpf}
                          onChange={(value) => handleFieldChange('cpf', formatCpf(value))}
                          placeholder="000.000.000-00"
                          autoComplete="off"
                        />
                        <p style={{
                          marginTop: 6, fontSize: 11.5, fontWeight: 600,
                          color: cpfDigitsPreview.length === 0
                            ? 'var(--pl-ink-3)'
                            : cpfDigitsPreview.length < 11
                              ? 'var(--pl-ink-3)'
                              : cpfLooksValid
                                ? 'var(--pl-success)'
                                : 'var(--pl-danger)',
                        }}>
                          {cpfDigitsPreview.length === 0
                            ? 'CPF obrigatório para validar a conta e usar recursos vinculados.'
                            : cpfDigitsPreview.length < 11
                              ? 'Digite os 11 dígitos.'
                              : cpfLooksValid
                                ? 'CPF válido. Clique em Salvar perfil para persistir.'
                                : 'CPF inválido: confira os números ou os dígitos verificadores.'}
                        </p>
                      </div>
                    </div>

                    {/* Info tiles */}
                    <div style={{ marginTop: 12, display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
                      <InfoTile
                        label="Email da conta"
                        value={profileData?.email || currentUserEmail || 'Não informado'}
                        helper={
                          profileData?.created_at
                            ? `Cadastro em ${new Date(profileData.created_at).toLocaleDateString('pt-BR')}`
                            : 'E-mail autenticado atual'
                        }
                        icon={Mail}
                      />
                      <InfoTile
                        label="Status do CPF"
                        value={profileHasValidCpf ? 'Válido' : 'Pendente'}
                        helper={profileHasValidCpf ? 'Documento apto para vínculos' : 'Revise o CPF e salve'}
                        icon={BadgeCheck}
                      />
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="pl-btn pl-btn-primary"
                        style={{ opacity: saving ? 0.6 : 1 }}
                      >
                        {saving ? 'Salvando...' : 'Salvar perfil'}
                      </button>
                    </div>
                  </div>

                  {/* Right column */}
                  <div style={{ display: 'flex', minHeight: 0, flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
                    {/* KPIs card */}
                    <div className="pl-card" style={{ padding: 16, overflow: 'hidden' }}>
                      <SectionHeader eyebrow="KPIs" title="Métricas reais" subtitle="Calculadas a partir do histórico salvo e do motor de XP." />
                      <div style={{ marginTop: 12, display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
                        {kpis.map((item) => (
                          <div key={item.label} style={{
                            borderRadius: 12, border: '1px solid var(--pl-rule-2)',
                            background: 'var(--pl-bg-soft)', padding: 12,
                          }}>
                            <p className="pl-eyebrow" style={{ marginBottom: 5 }}>{item.label}</p>
                            <p className="pl-num" style={{ fontSize: 24, color: 'var(--pl-ink)' }}>{item.value}</p>
                            <p style={{ marginTop: 5, fontSize: 11.5, color: 'var(--pl-ink-2)' }}>{item.helper}</p>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        marginTop: 12,
                        borderRadius: 12,
                        border: '1px solid var(--pl-rule-2)',
                        background: 'linear-gradient(135deg, var(--pl-ink) 0%, var(--pl-accent) 100%)',
                        color: 'var(--pl-bg)',
                        padding: 14,
                      }}>
                        <TagBadge tone="neutral">XP atual</TagBadge>
                        <h3 style={{ marginTop: 8, fontSize: 17, fontWeight: 700 }}>Nível {formatNumber(xpSummary.level || 1)}</h3>
                        <p style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45, opacity: 0.88 }}>
                          {formatNumber(xpSummary.xpTotal || 0)} XP acumulado. Faltam{' '}
                          {formatNumber(Math.max(0, Number(xpSummary.nextLevelXp || 0) - Number(xpSummary.xpTotal || 0)))} XP para o próximo nível.
                        </p>
                        <div style={{ marginTop: 10 }}>
                          <div className="pl-progress" style={{ background: 'rgba(255,255,255,0.18)' }}>
                            <div
                              className="pl-progress-bar"
                              style={{
                                width: `${Math.max(0, Math.min(100, Number(xpSummary.progressPercent || 0)))}%`,
                                background: 'var(--pl-highlight)',
                              }}
                            />
                          </div>
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, opacity: 0.82 }}>
                            <span>Progresso do nível</span>
                            <span style={{ fontWeight: 700 }}>{formatNumber(xpSummary.progressPercent || 0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Achievements tab */}
            {activeTab === 'achievements' && (
              <div style={{ display: 'flex', minHeight: 0, flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
                <SectionHeader
                  eyebrow="Conquistas"
                  title="Suas conquistas desbloqueadas"
                  subtitle="Somente selos realmente conquistados com o seu histórico."
                  action={
                    <button
                      type="button"
                      onClick={() => setShowBadgeCatalog(true)}
                      className="pl-btn pl-btn-ghost"
                    >
                      Ver todos os selos
                    </button>
                  }
                />

                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                  {[
                    ['Conquistados', formatNumber(unlockedBadges.length)],
                    ['Disponíveis', formatNumber(badges.length)],
                    ['Faltando', formatNumber(lockedBadges.length)],
                    ['Próximo selo', nextBadge?.nome || 'Nenhum'],
                  ].map(([label, value]) => (
                    <div key={label} className="pl-card" style={{ padding: 12 }}>
                      <p className="pl-eyebrow" style={{ marginBottom: 5 }}>{label}</p>
                      <p className="pl-num" style={{
                        fontSize: label === 'Próximo selo' ? 15 : 21,
                        lineHeight: 1.1,
                        color: 'var(--pl-ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }} title={String(value || '')}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {unlockedBadges.length > 0 ? (
                    unlockedBadges.map((badge) => (
                      <div key={badge.id} className="pl-card" style={{ padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <ToneIconWrap tone={getBadgeTone(true, badge.color)}>
                            <Medal style={{ width: 20, height: 20 }} />
                          </ToneIconWrap>
                          <TagBadge tone={getBadgeTone(true, badge.color)}>Conquistado</TagBadge>
                        </div>
                        <h3 style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>{badge.nome}</h3>
                        <p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.4, color: 'var(--pl-ink-2)' }}>{badge.descricao}</p>
                        <p style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                          Conquistado por cumprir: {formatBadgeRequirement(badge)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="pl-card" style={{ padding: 24, gridColumn: 'span 3' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Nenhuma conquista desbloqueada ainda.</p>
                      <p style={{ marginTop: 6, fontSize: 12.5, color: 'var(--pl-ink-2)' }}>Clique em “Ver todos os selos” para ver os requisitos disponíveis na plataforma.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'assinatura' && (
              <div style={{ minWidth: 0, width: '100%' }}>
                <Assinatura
                  currentPlan={currentPlanId}
                  expiresAt={profileData?.subscription_expires_at || null}
                  onSelectPlan={handleCheckout}
                  checkoutLoading={checkoutBusy}
                />
              </div>
            )}

            {/* Security tab */}
            {activeTab === 'security' && (
              <div style={{ display: 'flex', minHeight: 0, flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                <SectionHeader
                  eyebrow="Segurança"
                  title="Dados sensíveis e acessos"
                  subtitle="Identidade, senha, dados e exclusão num lugar só."
                />

                <div style={{ minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4, paddingBottom: 16 }}>
                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>

                    {/* Identidade + LGPD + Perigo */}
                    <div className="pl-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <p className="pl-eyebrow" style={{ marginBottom: 2 }}>Conta</p>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 4 }}>Identidade da conta</h3>

                      {/* E-mail */}
                      <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <ToneIconWrap tone="neutral"><Mail style={{ width: 15, height: 15 }} /></ToneIconWrap>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>E-mail</p>
                              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profileData?.email || currentUserEmail || 'Não informado'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingEmail((v) => !v)}
                            className="pl-btn pl-btn-ghost"
                            style={{ width: 32, minWidth: 32, height: 30, padding: 0, flexShrink: 0 }}
                            aria-label="Editar e-mail"
                          >
                            <Pencil style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                        {editingEmail && (
                          <div style={{ marginTop: 12, display: 'grid', gap: 8, gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'end' }}>
                            <Field label="Novo e-mail" type="email" value={newEmail} onChange={setNewEmail} placeholder="voce@exemplo.com" autoComplete="email" />
                            <button type="button" onClick={handleEmailChange} disabled={emailBusy || !currentUserId} className="pl-btn pl-btn-primary" style={{ height: 34, opacity: (emailBusy || !currentUserId) ? 0.6 : 1 }}>
                              {emailBusy ? 'Salvando...' : 'Confirmar'}
                            </button>
                            <p style={{ gridColumn: '1 / -1', fontSize: 11.5, color: 'var(--pl-ink-3)' }}>
                              O novo endereço pode exigir confirmação no inbox.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* CPF + Username */}
                      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
                        <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '10px 14px' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>CPF</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: profileHasValidCpf ? 'var(--pl-ink)' : 'var(--pl-warn)' }}>
                            {form.cpf || 'Não informado'}
                          </p>
                          <p style={{ marginTop: 3, fontSize: 11, color: profileHasValidCpf ? 'var(--pl-success)' : 'var(--pl-ink-3)' }}>
                            {profileHasValidCpf ? 'Válido' : 'Preencha em Visão geral'}
                          </p>
                        </div>
                        <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '10px 14px' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Username</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rankingPreview}</p>
                          <p style={{ marginTop: 3, fontSize: 11, color: 'var(--pl-ink-3)' }}>Público nos rankings</p>
                        </div>
                      </div>

                      {/* Divisor */}
                      <div style={{ height: 1, background: 'var(--pl-rule-2)', margin: '2px 0' }} />

                      {/* LGPD + Zona de perigo em grid 2 cols */}
                      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>

                        {/* LGPD */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <p className="pl-eyebrow" style={{ marginBottom: 2 }}>LGPD</p>
                          <LgpdButton icon={Download} label="Exportar dados" description="JSON com seu histórico" tone="accent" onClick={async () => {
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
                              showToast('Dados exportados com sucesso!', 'success');
                            } catch {
                              showToast('Erro ao exportar dados. Tente novamente.', 'error');
                            }
                          }} />
                          <LgpdButton icon={FileText} label="Privacidade" description="Como tratamos seus dados" tone="neutral" onClick={() => window.open('https://papirando.com/privacidade', '_blank')} />
                          <LgpdButton icon={FileText} label="Termos de Uso" description="Regras da plataforma" tone="neutral" onClick={() => window.open('https://papirando.com/termos', '_blank')} />
                        </div>

                        {/* Zona de perigo */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <p className="pl-eyebrow" style={{ marginBottom: 2, color: 'var(--pl-danger)' }}>Zona de perigo</p>
                          <div style={{ borderRadius: 12, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', padding: '10px 12px' }}>
                            <p style={{ fontSize: 12, color: 'var(--pl-ink-2)', marginBottom: 10, lineHeight: 1.5 }}>
                              A exclusão é irreversível e pode levar até 30 dias.
                            </p>
                            <LgpdButton icon={Trash2} label="Solicitar exclusão" description="Inicia a remoção permanente" tone="danger" onClick={async () => {
                              const confirmed = await showConfirm(
                                'Sua conta e todos os dados serão excluídos permanentemente em até 30 dias. Esta ação não pode ser desfeita.',
                                { title: 'Excluir conta?', confirmLabel: 'Sim, excluir', cancelLabel: 'Cancelar', danger: true }
                              );
                              if (!confirmed) return;
                              try {
                                const { data, error } = await supabase.rpc('request_account_deletion');
                                if (error) throw error;
                                await showAlert(data?.message || 'Solicitação registrada. Entraremos em contato em até 30 dias.', { title: 'Solicitação enviada' });
                              } catch {
                                showToast('Erro ao registrar solicitação. Entre em contato: privacidade@papirando.com', 'error');
                              }
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Senha + recuperação */}
                    <div className="pl-card" style={{ padding: 20 }}>
                      <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Senha</p>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 16 }}>Alterar senha</h3>

                      <div style={{ display: 'grid', gap: 10 }}>
                        <Field label="Senha atual" type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="••••••••" autoComplete="current-password" />
                        <Field label="Nova senha" type="password" value={newPassword} onChange={setNewPassword} placeholder="••••••••" autoComplete="new-password" />
                        <Field label="Confirmar nova senha" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repita a senha" autoComplete="new-password" />
                        <button type="button" onClick={handlePasswordChangeDirect} disabled={passwordChangeBusy} className="pl-btn pl-btn-primary" style={{ opacity: passwordChangeBusy ? 0.6 : 1 }}>
                          {passwordChangeBusy ? 'Salvando...' : 'Salvar nova senha'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--pl-rule-2)' }} />
                        <span style={{ fontSize: 11, color: 'var(--pl-ink-3)', fontWeight: 600, letterSpacing: '0.06em' }}>OU</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--pl-rule-2)' }} />
                      </div>

                      <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', marginBottom: 2 }}>Esqueceu a senha?</p>
                          <p style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>Receba um link de redefinição por e-mail.</p>
                        </div>
                        <button type="button" onClick={handlePasswordReset} disabled={passwordBusy || !currentUserEmail} className="pl-btn pl-btn-ghost" style={{ flexShrink: 0, opacity: (passwordBusy || !currentUserEmail) ? 0.5 : 1 }}>
                          {passwordBusy ? 'Enviando...' : 'Enviar link'}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {showBadgeCatalog ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Todos os selos disponíveis"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(20, 17, 13, 0.42)',
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowBadgeCatalog(false);
          }}
        >
          <div className="pl-card" style={{
            width: 'min(980px, calc(100vw - 48px))',
            maxHeight: 'min(760px, calc(100vh - 48px))',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--pl-surface)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              padding: 18,
              borderBottom: '1px solid var(--pl-rule-2)',
            }}>
              <div>
                <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Catálogo de selos</p>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--pl-ink)' }}>Todos os selos disponíveis</h3>
                <p style={{ marginTop: 6, fontSize: 13, color: 'var(--pl-ink-2)' }}>
                  Esses selos são configurados em Admin &gt; Configurações &gt; Selos.
                </p>
              </div>
              <button type="button" className="pl-btn pl-btn-ghost" onClick={() => setShowBadgeCatalog(false)}>
                Fechar
              </button>
            </div>

            <div style={{
              padding: 18,
              overflowY: 'auto',
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            }}>
              {badges.length > 0 ? badges.map((badge) => (
                <div key={badge.id} style={{
                  borderRadius: 12,
                  border: '1px solid var(--pl-rule-2)',
                  background: 'var(--pl-bg-soft)',
                  padding: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <ToneIconWrap tone={getBadgeTone(badge.unlocked, badge.color)}>
                      <Medal style={{ width: 20, height: 20 }} />
                    </ToneIconWrap>
                    <TagBadge tone={getBadgeTone(badge.unlocked, badge.color)}>
                      {badge.unlocked ? 'Conquistado' : 'Disponível'}
                    </TagBadge>
                  </div>
                  <h4 style={{ margin: '10px 0 0', fontSize: 15, fontWeight: 800, color: 'var(--pl-ink)' }}>{badge.nome}</h4>
                  <p style={{ marginTop: 5, fontSize: 12.5, lineHeight: 1.45, color: 'var(--pl-ink-2)' }}>{badge.descricao}</p>
                  <p style={{ marginTop: 9, fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink)' }}>
                    Requisito: {formatBadgeRequirement(badge)}
                  </p>
                </div>
              )) : (
                <div style={{ gridColumn: '1 / -1', padding: 20, color: 'var(--pl-ink-2)' }}>
                  Nenhum selo configurado ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
