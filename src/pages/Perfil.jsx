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
import { supabase } from '../lib/supabase';
import { isValidCpf, normalizeCpf } from '../lib/profileProgress';

const navItems = [
  { id: 'overview', label: 'Visao geral', icon: User2 },
  { id: 'achievements', label: 'Conquistas', icon: Trophy },
  { id: 'security', label: 'Seguranca', icon: ShieldCheck },
];

/** Planos alinhados a pagina Assinatura (precos exibidos; contratacao na area dedicada). */
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
      'Cronometro e registro de sessoes',
      'Edital verticalizado basico',
      '1 ciclo de estudo ativo',
      'Historico resumido e limite diario de questoes',
    ],
  },
  {
    id: 'tatico',
    nome: 'Tatico',
    descricao: 'Para quem leva a aprovacao a serio.',
    precoMensal: '49,90',
    precoAnual: '29,90',
    Icon: Star,
    destaque: true,
    features: [
      'Tudo do Gratuito',
      'Ciclos de estudo ilimitados',
      'Banco de questoes sem limite diario',
      'Estatisticas e dashboards avancados',
      'IA em recursos selecionados (conforme politica do plano)',
    ],
  },
  {
    id: 'elite',
    nome: 'Elite',
    descricao: 'Pacote completo com destaque em IA e experiencia premium.',
    precoMensal: '89,90',
    precoAnual: '59,90',
    Icon: Sparkles,
    destaque: false,
    premium: true,
    features: [
      'Tudo do Tatico',
      'Redacoes e flashcards com IA',
      'Prioridade em novidades e selos premium',
      'Melhor custo-beneficio para uso intensivo',
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
  if (normalized === 'tatico') return 'Tatico';
  return 'Gratuito';
}

function formatSubscriptionStatus(status) {
  const normalized = String(status || 'trial').toLowerCase();
  if (normalized === 'active') return 'Ativa';
  if (normalized === 'trial') return 'Trial';
  if (normalized === 'past_due') return 'Pendente';
  if (normalized === 'canceled') return 'Cancelada';
  return normalized || 'Nao informado';
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
  if (color === 'orange' || color === 'yellow' || color === 'amber') return 'warn';
  if (color === 'emerald' || color === 'green') return 'success';
  return 'accent';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p className="pl-eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--pl-ink)', margin: 0 }}>{title}</h2>
          {subtitle ? <p style={{ marginTop: 4, fontSize: 13, color: 'var(--pl-ink-2)' }}>{subtitle}</p> : null}
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

function Field({ label, value, onChange, placeholder, disabled = false, type = 'text', autoComplete }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className="pl-input"
        style={{ width: '100%' }}
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
        padding: '8px 16px',
        fontSize: 13,
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
      borderRadius: 16,
      border: '1px solid var(--pl-rule-2)',
      background: 'var(--pl-bg-soft)',
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, borderRadius: 12,
          background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', flexShrink: 0,
        }}>
          {IconComponent ? <IconComponent style={{ width: 16, height: 16, color: 'var(--pl-ink)' }} /> : null}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{label}</p>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--pl-ink-2)' }}>{value}</p>
          <p style={{ marginTop: 4, fontSize: 12, color: 'var(--pl-ink-3)' }}>{helper}</p>
        </div>
      </div>
    </div>
  );
}

function SecurityRow({ icon, label, value, helper }) {
  const IconComponent = icon;
  return (
    <div style={{
      borderRadius: 16,
      border: '1px solid var(--pl-rule-2)',
      background: 'var(--pl-bg-soft)',
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, borderRadius: 12,
          background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', flexShrink: 0,
        }}>
          {IconComponent ? <IconComponent style={{ width: 16, height: 16, color: 'var(--pl-ink)' }} /> : null}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{label}</p>
          <p style={{ marginTop: 4, wordBreak: 'break-all', fontSize: 13, color: 'var(--pl-ink-2)' }}>{value}</p>
          <p style={{ marginTop: 4, fontSize: 12, color: 'var(--pl-ink-3)' }}>{helper}</p>
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
        padding: 14, textAlign: 'left', cursor: 'pointer', transition: 'opacity 0.15s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
      }}>
        {IconComponent && <IconComponent style={{ width: 16, height: 16 }} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600 }}>{label}</p>
        <p style={{ marginTop: 2, fontSize: 12, opacity: 0.7 }}>{description}</p>
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
        borderRadius: 18, border: '1px solid var(--pl-rule-2)',
        background: 'var(--pl-bg-soft)', padding: 20, textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s', width: '100%',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: 12,
        background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
      }}>
        {IconComponent ? <IconComponent style={{ width: 16, height: 16, color: 'var(--pl-ink)' }} /> : null}
      </div>
      <p style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{title}</p>
      <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{desc}</p>
      <p style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: 'var(--pl-accent)' }}>{actionLabel}</p>
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
  const [currentPassword, setCurrentPassword] = useState('');
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

    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', currentUserId).single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.warn('Nao foi possivel carregar o perfil remoto:', error.message);
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
    return String(form.username || profileData?.username || profileData?.nome || profileData?.name || currentUserEmail || 'usuario').trim();
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
    { label: 'Horas focadas', value: formatHours(xpSummary.totalMinutes), helper: 'Historico real salvo' },
    { label: 'Questoes', value: formatNumber(xpSummary.totalQuestions), helper: 'Acertos + erros' },
    { label: 'Ofensiva', value: `${formatNumber(xpSummary.streakDays)} dias`, helper: 'Melhor sequencia' },
    { label: 'XP total', value: formatNumber(xpSummary.xpTotal), helper: `Progresso ${formatNumber(xpSummary.progressPercent)}%` },
    {
      label: 'Redacoes',
      value: formatNumber(essaySummary.corrected || 0),
      helper: essaySummary.averageScore ? `Media ${String(essaySummary.averageScore).replace('.', ',')}` : 'Sem correcao ainda',
    },
  ];

  const linkageCards = [
    {
      title: 'Esquadroes',
      text: memberships.length > 0 ? `${formatNumber(memberships.length)} vinculo(s) ativo(s) na comunidade.` : 'Sem esquadroes vinculados no momento.',
      tone: memberships.length > 0 ? 'accent' : 'danger',
      icon: Users,
    },
    {
      title: 'Selos',
      text: unlockedBadges.length > 0 ? `${formatNumber(unlockedBadges.length)} selo(s) desbloqueado(s).` : 'Nenhum selo desbloqueado ainda.',
      tone: unlockedBadges.length > 0 ? 'warn' : 'danger',
      icon: Medal,
    },
    {
      title: 'XP acumulado',
      text: `${formatNumber(xpSummary.xpTotal)} XP acumulado na plataforma.`,
      tone: xpSummary.xpTotal > 0 ? 'accent' : 'success',
      icon: Crown,
    },
    {
      title: 'Audiolivros',
      text:
        audiobookSummary.totalBooks > 0
          ? `${formatNumber(audiobookSummary.favoriteCount || 0)} favorito(s), ${formatNumber(audiobookSummary.inProgress || 0)} em andamento e ${formatAudiobookHours(audiobookSummary.totalListenedSeconds || 0)} de reproducao.`
          : 'Nenhum audiolivro iniciado ainda.',
      tone: (audiobookSummary.inProgress || 0) > 0 ? 'accent' : 'danger',
      icon: Trophy,
    },
    {
      title: 'Redacoes',
      text:
        essaySummary.corrected > 0
          ? `${formatNumber(essaySummary.corrected)} correcao(oes) com media ${String(essaySummary.averageScore || 0).replace('.', ',')}.`
          : 'Nenhuma redacao corrigida ainda.',
      tone: essaySummary.corrected > 0 ? 'accent' : 'danger',
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
      setSaveState({ type: 'error', message: 'Sessao indisponivel. Entre novamente para salvar o perfil.' });
      return;
    }
    const normalizedCpf = normalizeCpf(form.cpf);
    if (normalizedCpf && !isValidCpf(normalizedCpf)) {
      setSaveState({ type: 'error', message: 'CPF invalido. Revise os numeros antes de salvar.' });
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
            ? 'Perfil salvo localmente. A sincronizacao remota falhou.'
            : 'Dados do perfil salvos com sucesso.',
        });
        await loadRemoteProfile();
      } else {
        setSaveState({
          type: 'error',
          message: result?.message || 'Nao foi possivel salvar o perfil. Corrija os campos indicados.',
        });
      }
    } catch (error) {
      console.error(error);
      setSaveState({ type: 'error', message: 'Nao foi possivel salvar o perfil agora.' });
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
      setSaveState({ type: 'error', message: 'Formato invalido. Envie uma imagem.' });
      return;
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setSaveState({ type: 'error', message: 'Imagem muito grande. O limite e 5 MB.' });
      return;
    }
    setAvatarBusy(true);
    setSaveState({ type: '', message: '' });
    try {
      await onChangeAvatar(file);
      setSaveState({ type: 'success', message: 'Foto atualizada com persistencia real.' });
      await loadRemoteProfile();
    } catch (error) {
      console.error(error);
      setSaveState({ type: 'error', message: 'Nao foi possivel atualizar a foto.' });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    const accountEmail = String(profileData?.email || currentUserEmail || '').trim();
    if (!accountEmail) {
      setSaveState({ type: 'error', message: 'E-mail da conta nao encontrado para enviar a redefinicao.' });
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
        message: `E-mail de redefinicao enviado para ${accountEmail}. Verifique a caixa de entrada e o spam.`,
      });
    } catch (error) {
      console.error(error);
      setSaveState({ type: 'error', message: error?.message || 'Nao foi possivel enviar o link agora.' });
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
      setSaveState({ type: 'error', message: 'Formato de e-mail invalido.' });
      return;
    }
    if (email === String(currentUserEmail || '').toLowerCase()) {
      setSaveState({ type: 'error', message: 'Este ja e o e-mail da sua conta.' });
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
        console.warn('Perfil: e-mail na tabela profiles nao atualizado:', profileError.message);
      }

      setNewEmail('');
      setSaveState({
        type: 'success',
        message:
          'Solicitacao de troca de e-mail enviada. Se o projeto exigir confirmacao, abra o link no novo endereco; depois disso o login usara o e-mail novo.',
      });
      await onSessionRefresh?.();
      await loadRemoteProfile();
    } catch (error) {
      console.error(error);
      setSaveState({
        type: 'error',
        message: error?.message || 'Nao foi possivel alterar o e-mail. Tente novamente ou use outro endereco.',
      });
    } finally {
      setEmailBusy(false);
    }
  };

  const handlePasswordChangeDirect = async () => {
    if (!currentPassword) {
      setSaveState({ type: 'error', message: 'Digite a senha atual para confirmar a alteracao.' });
      return;
    }
    if (newPassword.length < 6) {
      setSaveState({ type: 'error', message: 'A nova senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSaveState({ type: 'error', message: 'A confirmacao da senha nao confere.' });
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
        message: 'Senha atualizada. Nas proximas vezes use a nova senha para entrar.',
      });
    } catch (error) {
      console.error(error);
      setSaveState({
        type: 'error',
        message: error?.message || 'Nao foi possivel alterar a senha.',
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
    <div className="pl-paper-bg" style={{ padding: '28px 28px 48px' }}>
      <div style={{ maxWidth: 1540, margin: '0 auto' }}>
        {/* Hero editorial */}
        <div style={{ marginBottom: 32 }}>
          <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Conta</p>
          <h1 className="pl-display" style={{ marginBottom: 12 }}>Meu perfil.</h1>
          <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', maxWidth: 520 }}>
            Dados da conta, ranking, progresso e vinculos reais da sua jornada.
          </p>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
          {heroStats.map((k) => (
            <div key={k.label} className="pl-card" style={{ padding: '12px 16px' }}>
              <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{k.label}</p>
              <p className="pl-num" style={{ fontSize: 20, color: 'var(--pl-ink)' }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '280px minmax(0,1fr)' }}>
          {/* Sidebar */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Avatar card */}
            <div className="pl-card" style={{ overflow: 'hidden' }}>
              <div style={{
                position: 'relative', height: 180, overflow: 'hidden',
                borderRadius: '6px 6px 0 0',
                background: 'linear-gradient(135deg, var(--pl-ink) 0%, var(--pl-accent) 100%)',
              }}>
                {profileData?.avatar_url ? (
                  <img
                    src={profileData.avatar_url}
                    alt={profileData?.nome || profileData?.name || 'Avatar'}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
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

              <nav style={{ padding: '12px 12px 16px' }}>
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
                        borderRadius: 14, padding: '10px 14px', textAlign: 'left',
                        marginBottom: 6,
                        background: active ? 'var(--pl-accent)' : 'transparent',
                        border: active ? '1px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
                        color: active ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 36, height: 36, borderRadius: 10,
                          background: active ? 'rgba(255,255,255,0.15)' : 'var(--pl-bg-soft)',
                        }}>
                          <Icon style={{ width: 16, height: 16 }} />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                      </span>
                      <ChevronRight style={{ width: 16, height: 16, opacity: active ? 0.7 : 0.4 }} />
                    </button>
                  );
                })}
              </nav>

              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarInput} />
            </div>

            {/* Snapshot card */}
            <div className="pl-card" style={{ padding: 20 }}>
              <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Snapshot</p>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 14 }}>Leitura rapida</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Ranking atual', rankingPreview],
                  ['Esquadroes', memberships.length > 0 ? `${memberships.length} ativo(s)` : 'Nenhum vinculo'],
                  ['Proxima meta', `${formatNumber(xpSummary.nextLevelXp || 0)} XP`],
                ].map(([label, value]) => (
                  <div key={label} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1.35fr',
                    alignItems: 'center', gap: 12,
                    borderRadius: 12, background: 'var(--pl-bg-soft)',
                    padding: '10px 14px',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--pl-ink-2)' }}>{label}</span>
                    <span style={{
                      display: 'block', minWidth: 0, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)',
                    }} title={String(value || '')}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <SectionHeader
                  eyebrow="Dados da conta"
                  title="Informacoes editaveis do perfil"
                  subtitle="Persistidas pelo fluxo real de perfil do app."
                  action={
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="pl-btn pl-btn-primary"
                      style={{ opacity: saving ? 0.6 : 1 }}
                    >
                      {saving ? 'Salvando...' : 'Salvar perfil'}
                    </button>
                  }
                />

                <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1.2fr 0.8fr' }}>
                  {/* Profile fields */}
                  <div className="pl-card" style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
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
                        placeholder="apenas letras minusculas, numeros, . e _"
                        autoComplete="username"
                      />
                      <Field
                        label="Celular"
                        value={form.celular}
                        onChange={(value) => handleFieldChange('celular', formatPhone(value))}
                        placeholder="(75) 99999-9999"
                        autoComplete="tel"
                      />
                      <div style={{ gridColumn: 'span 2' }}>
                        <Field
                          label="CPF"
                          value={form.cpf}
                          onChange={(value) => handleFieldChange('cpf', formatCpf(value))}
                          placeholder="000.000.000-00"
                          autoComplete="off"
                        />
                        <p style={{
                          marginTop: 8, fontSize: 12, fontWeight: 600,
                          color: cpfDigitsPreview.length === 0
                            ? 'var(--pl-ink-3)'
                            : cpfDigitsPreview.length < 11
                              ? 'var(--pl-ink-3)'
                              : cpfLooksValid
                                ? 'var(--pl-success)'
                                : 'var(--pl-danger)',
                        }}>
                          {cpfDigitsPreview.length === 0
                            ? 'CPF obrigatorio para validar a conta e usar recursos vinculados.'
                            : cpfDigitsPreview.length < 11
                              ? 'Digite os 11 digitos.'
                              : cpfLooksValid
                                ? 'CPF valido. Clique em Salvar perfil para persistir.'
                                : 'CPF invalido — confira os numeros ou os digitos verificadores.'}
                        </p>
                      </div>
                    </div>

                    {/* Ranking preference */}
                    <div style={{
                      marginTop: 20, borderRadius: 18, border: '1px solid var(--pl-rule-2)',
                      background: 'var(--pl-bg-soft)', padding: 16,
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                        <div>
                          <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Preferencia de ranking</p>
                          <p style={{ fontSize: 13, color: 'var(--pl-ink-2)' }}>Escolha como seu nome aparece nos rankings e areas sociais.</p>
                        </div>
                        <TagBadge tone="accent">{rankingPreview}</TagBadge>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                        <ToggleChip active={form.rankingDisplayMode === 'username'} onClick={() => handleFieldChange('rankingDisplayMode', 'username')}>
                          Mostrar username
                        </ToggleChip>
                        <ToggleChip active={form.rankingDisplayMode === 'codename'} onClick={() => handleFieldChange('rankingDisplayMode', 'codename')}>
                          Mostrar codinome
                        </ToggleChip>
                      </div>

                      <Field
                        label="Codinome"
                        value={form.rankingCodename}
                        onChange={(value) => handleFieldChange('rankingCodename', value)}
                        placeholder="Ex.: Aguia Azul"
                        disabled={form.rankingDisplayMode !== 'codename'}
                      />
                    </div>

                    {/* Info tiles */}
                    <div style={{ marginTop: 20, display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                      <InfoTile
                        label="Email da conta"
                        value={profileData?.email || currentUserEmail || 'Nao informado'}
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
                        helper={profileHasValidCpf ? 'Documento apto para vinculos' : 'Revise o CPF e salve'}
                        icon={BadgeCheck}
                      />
                    </div>
                  </div>

                  {/* Right column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* KPIs card */}
                    <div className="pl-card" style={{ padding: 24 }}>
                      <SectionHeader eyebrow="KPIs" title="Metricas reais" subtitle="Calculadas a partir do historico salvo e do motor de XP." />
                      <div style={{ marginTop: 20, display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
                        {kpis.map((item) => (
                          <div key={item.label} style={{
                            borderRadius: 14, border: '1px solid var(--pl-rule-2)',
                            background: 'var(--pl-bg-soft)', padding: 18,
                          }}>
                            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>{item.label}</p>
                            <p className="pl-num" style={{ fontSize: 28, color: 'var(--pl-ink)' }}>{item.value}</p>
                            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--pl-ink-2)' }}>{item.helper}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* XP card */}
                    <div className="pl-card" style={{ overflow: 'hidden' }}>
                      <div style={{
                        padding: 24,
                        background: 'linear-gradient(135deg, var(--pl-ink) 0%, var(--pl-accent) 100%)',
                        color: 'var(--pl-bg)',
                      }}>
                        <TagBadge tone="neutral">XP atual</TagBadge>
                        <h3 style={{ marginTop: 14, fontSize: 20, fontWeight: 700 }}>Nivel {formatNumber(xpSummary.level || 1)}</h3>
                        <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>
                          {formatNumber(xpSummary.xpTotal || 0)} XP acumulado. Faltam{' '}
                          {formatNumber(Math.max(0, Number(xpSummary.nextLevelXp || 0) - Number(xpSummary.xpTotal || 0)))} XP para o proximo nivel.
                        </p>
                      </div>
                      <div style={{ padding: 20 }}>
                        <div className="pl-progress">
                          <div
                            className="pl-progress-bar"
                            style={{ width: `${Math.max(0, Math.min(100, Number(xpSummary.progressPercent || 0)))}%` }}
                          />
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--pl-ink-2)' }}>
                          <span>XP atual</span>
                          <span style={{ fontWeight: 600 }}>{formatNumber(xpSummary.progressPercent || 0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linkage cards */}
                <div className="pl-card" style={{ padding: 24 }}>
                  <SectionHeader
                    eyebrow="Vinculos"
                    title="Esquadroes, selos e XP"
                    subtitle="Resumo funcional do que a conta ja possui dentro da plataforma."
                  />
                  <div style={{ marginTop: 20, display: 'grid', gap: 20, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {linkageCards.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="pl-card" style={{ padding: 24, boxShadow: 'none' }}>
                          <ToneIconWrap tone={item.tone}>
                            <Icon style={{ width: 20, height: 20 }} />
                          </ToneIconWrap>
                          <h3 style={{ marginTop: 18, fontSize: 16, fontWeight: 700, color: 'var(--pl-ink)' }}>{item.title}</h3>
                          <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{item.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Achievements tab */}
            {activeTab === 'achievements' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <SectionHeader
                  eyebrow="Conquistas"
                  title="Selos e vinculos desbloqueados"
                  subtitle="Tudo alimentado por XP, historico real e memberships atuais."
                />

                <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {badges.length > 0 ? (
                    badges.map((badge) => (
                      <div key={badge.id} className="pl-card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <ToneIconWrap tone={getBadgeTone(badge.unlocked, badge.color)}>
                            <Medal style={{ width: 20, height: 20 }} />
                          </ToneIconWrap>
                          <TagBadge tone={getBadgeTone(badge.unlocked, badge.color)}>
                            {badge.unlocked ? 'Desbloqueado' : `${formatNumber(badge.progressPercent)}%`}
                          </TagBadge>
                        </div>
                        <h3 style={{ marginTop: 18, fontSize: 16, fontWeight: 700, color: 'var(--pl-ink)' }}>{badge.nome}</h3>
                        <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{badge.descricao}</p>
                        <p style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                          Progresso: {formatNumber(badge.current)} / {formatNumber(badge.target)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="pl-card" style={{ padding: 24, gridColumn: 'span 3' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Ainda nao existem selos configurados para esta conta.</p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
                  {/* Summary */}
                  <div className="pl-card" style={{ padding: 24 }}>
                    <SectionHeader eyebrow="Resumo" title="Leitura das conquistas" subtitle="Selos ativos, squads vinculados e nivel atual." />
                    <div style={{ marginTop: 20, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      {[
                        ['Selos ativos', formatNumber(badgeSummary.unlockedCount || 0)],
                        ['Esquadroes', formatNumber(memberships.length)],
                        ['Nivel atual', formatNumber(xpSummary.level || 1)],
                      ].map(([label, value]) => (
                        <div key={label} style={{
                          borderRadius: 12, background: 'var(--pl-bg-soft)', padding: 18,
                        }}>
                          <p className="pl-eyebrow" style={{ marginBottom: 8 }}>{label}</p>
                          <p className="pl-num" style={{ fontSize: 28, color: 'var(--pl-ink)' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Memberships */}
                  <div className="pl-card" style={{ padding: 24 }}>
                    <SectionHeader eyebrow="Esquadroes" title="Memberships atuais" subtitle="Atalhos para abrir o esquadrao conectado a este perfil." />
                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {memberships.length > 0 ? (
                        memberships.map((membership) => (
                          <div
                            key={membership.id}
                            style={{
                              display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                              borderRadius: 14, border: '1px solid var(--pl-rule-2)',
                              background: 'var(--pl-bg-soft)', padding: 14,
                            }}
                          >
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{membership.name || membership.id}</p>
                              <p style={{ marginTop: 4, fontSize: 13, color: 'var(--pl-ink-2)' }}>Papel: {membership.role || 'Membro'} · Status: {membership.status || 'Ativo'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onOpenSquad?.(membership.id)}
                              className="pl-btn pl-btn-ghost"
                              style={{ fontSize: 13 }}
                            >
                              Abrir esquadrao
                            </button>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Nenhum esquadrao vinculado a esta conta.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'assinatura' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <SectionHeader
                  eyebrow="Planos Papirando"
                  title="Assinatura e beneficios"
                  subtitle="Compare os niveis, veja o seu plano atual e abra a area de pagamento quando quiser mudar ou renovar."
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveTab?.('assinatura')}
                      className="pl-btn pl-btn-primary"
                    >
                      Pagamentos e contratacao
                      <ChevronRight style={{ width: 16, height: 16 }} />
                    </button>
                  }
                />

                {/* Current plan banner */}
                <div className="pl-card" style={{
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, var(--pl-ink) 0%, var(--pl-accent) 100%)',
                  color: 'var(--pl-bg)',
                  padding: '24px 28px',
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <p className="pl-eyebrow" style={{ marginBottom: 8, color: 'rgba(255,255,255,0.7)' }}>Sua assinatura</p>
                      <h2 style={{ fontSize: 22, fontWeight: 700 }}>
                        Plano {planLabel} · {subscriptionStatus}
                      </h2>
                      <p style={{ marginTop: 8, maxWidth: 480, fontSize: 13, lineHeight: 1.6, opacity: 0.88 }}>
                        O plano ativo vale para recursos premium, limites de IA e ranking. Alteracoes de cobranca ficam na pagina dedicada de assinatura.
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        borderRadius: 20, border: '1px solid rgba(255,255,255,0.25)',
                        background: 'rgba(255,255,255,0.12)',
                        padding: '6px 12px', fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.28em',
                      }}>
                        {currentPlanId === 'elite' ? 'Nivel maximo' : currentPlanId === 'tatico' ? 'Plano intermediario' : 'Nivel inicial'}
                      </span>
                      {currentPlanId !== 'elite' ? (
                        <button
                          type="button"
                          onClick={() => setActiveTab?.('assinatura')}
                          style={{
                            borderRadius: 14, border: '1px solid rgba(255,255,255,0.3)',
                            background: 'rgba(255,255,255,0.12)', color: 'var(--pl-bg)',
                            padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            backdropFilter: 'blur(8px)', transition: 'background 0.15s',
                          }}
                        >
                          Fazer upgrade
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Price toggle */}
                <div style={{
                  display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  borderRadius: 14, border: '1px solid var(--pl-rule-2)',
                  background: 'var(--pl-surface)', padding: '12px 18px',
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Precos exibidos por mes (referencia)</p>
                  <div style={{
                    display: 'flex', borderRadius: 14, border: '1px solid var(--pl-rule-2)',
                    background: 'var(--pl-bg-soft)', padding: 4,
                  }}>
                    {[
                      { label: 'Mensal', val: false },
                      { label: 'Anual', val: true },
                    ].map(({ label, val }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setPlanoPrecoAnual(val)}
                        style={{
                          borderRadius: 10, padding: '6px 14px',
                          fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                          background: planoPrecoAnual === val ? 'var(--pl-surface)' : 'transparent',
                          color: planoPrecoAnual === val ? 'var(--pl-ink)' : 'var(--pl-ink-3)',
                          boxShadow: planoPrecoAnual === val ? 'var(--pl-sh-low)' : 'none',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plan cards */}
                <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {PERFIL_PLANOS.map((plano) => {
                    const isCurrent = currentPlanId === plano.id;
                    const Icon = plano.Icon;
                    const isElite = plano.id === 'elite';
                    const isTatico = plano.id === 'tatico';
                    const precoValor =
                      plano.id === 'gratuito' ? 'R$ 0' : planoPrecoAnual ? `R$ ${plano.precoAnual}` : `R$ ${plano.precoMensal}`;

                    return (
                      <div
                        key={plano.id}
                        className="pl-card"
                        style={{
                          position: 'relative', display: 'flex', flexDirection: 'column', padding: 24,
                          ...(isElite && {
                            border: '2px solid var(--pl-warn)',
                            background: 'linear-gradient(160deg, var(--pl-warn-soft) 0%, var(--pl-surface) 60%)',
                            boxShadow: 'var(--pl-sh-mid)',
                          }),
                          ...(isTatico && !isElite && {
                            border: '1.5px solid var(--pl-accent)',
                            background: 'linear-gradient(160deg, var(--pl-accent) 0%, color-mix(in srgb, var(--pl-accent) 80%, black) 100%)',
                            color: 'var(--pl-bg)',
                          }),
                          ...(isCurrent && { outline: '2px solid var(--pl-success)', outlineOffset: 2 }),
                        }}
                      >
                        {isCurrent ? (
                          <span className="pl-tag pl-tag-success" style={{ position: 'absolute', right: 14, top: 14 }}>
                            Seu plano
                          </span>
                        ) : null}
                        {plano.destaque && !isCurrent ? (
                          <span className={isTatico ? 'pl-tag' : 'pl-tag pl-tag-accent'} style={{
                            position: 'absolute', right: 14, top: 14,
                            ...(isTatico && { background: 'rgba(255,255,255,0.2)', color: 'var(--pl-bg)', border: '1px solid rgba(255,255,255,0.3)' }),
                          }}>
                            Popular
                          </span>
                        ) : null}
                        {plano.premium ? (
                          <span className="pl-tag pl-tag-warn" style={{ position: 'absolute', left: 14, top: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Sparkles style={{ width: 12, height: 12 }} />
                            Premium
                          </span>
                        ) : null}

                        <div style={{
                          marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 44, height: 44, borderRadius: 12,
                          background: isTatico ? 'rgba(255,255,255,0.15)' : isElite ? 'var(--pl-warn-soft)' : 'var(--pl-bg-soft)',
                          color: isTatico ? 'var(--pl-bg)' : isElite ? 'var(--pl-warn)' : 'var(--pl-ink-2)',
                        }}>
                          <Icon style={{ width: 22, height: 22 }} strokeWidth={2} />
                        </div>
                        <h3 style={{ marginTop: 18, fontSize: 18, fontWeight: 800, color: isTatico ? 'var(--pl-bg)' : 'var(--pl-ink)' }}>{plano.nome}</h3>
                        <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: isTatico ? 'rgba(255,255,255,0.8)' : 'var(--pl-ink-2)' }}>{plano.descricao}</p>
                        <p style={{ marginTop: 18, fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', color: isTatico ? 'var(--pl-bg)' : 'var(--pl-ink)' }}>
                          {precoValor}
                          {plano.id !== 'gratuito' ? (
                            <span style={{ fontSize: 13, fontWeight: 600, color: isTatico ? 'rgba(255,255,255,0.65)' : 'var(--pl-ink-3)' }}>/mes</span>
                          ) : null}
                        </p>
                        {plano.id !== 'gratuito' && planoPrecoAnual ? (
                          <p style={{ fontSize: 12, color: isTatico ? 'rgba(255,255,255,0.65)' : 'var(--pl-ink-3)' }}>Valores na cobranca anual (referencia da pagina de assinatura).</p>
                        ) : null}

                        <ul style={{ marginTop: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {plano.features.map((line) => (
                            <li key={line} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                              <Check style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, color: isTatico ? 'var(--pl-success)' : 'var(--pl-success)' }} strokeWidth={2.5} />
                              <span style={{ lineHeight: 1.5, color: isTatico ? 'rgba(255,255,255,0.9)' : 'var(--pl-ink-2)' }}>{line}</span>
                            </li>
                          ))}
                        </ul>

                        <button
                          type="button"
                          onClick={() => setActiveTab?.('assinatura')}
                          className={isCurrent ? 'pl-btn pl-btn-ghost' : isTatico ? 'pl-btn' : 'pl-btn pl-btn-primary'}
                          style={{
                            marginTop: 24, width: '100%', justifyContent: 'center',
                            ...(isTatico && !isCurrent && {
                              background: 'var(--pl-surface)', color: 'var(--pl-accent)',
                              border: 'none', fontWeight: 700,
                            }),
                          }}
                        >
                          {isCurrent ? 'Gerenciar na pagina de assinatura' : plano.id === 'gratuito' ? 'Detalhes e limites' : `Quero o ${plano.nome}`}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pl-card" style={{ padding: 24 }}>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--pl-ink-2)' }}>
                    Duvidas sobre cobranca, nota fiscal ou troca de cartao use a pagina <strong style={{ fontWeight: 600, color: 'var(--pl-ink)' }}>Assinatura</strong> do app
                    (mesmo menu onde voce acessa este perfil). Os precos finais podem incluir promocoes ativas no checkout.
                  </p>
                </div>
              </div>
            )}

            {/* Security tab */}
            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <SectionHeader
                  eyebrow="Seguranca"
                  title="Dados sensiveis e acessos"
                  subtitle="Sem botoes mortos: tudo abaixo executa alguma acao real ou mostra o estado atual da conta."
                />

                <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
                  <div className="pl-card" style={{ padding: 24 }}>
                    <SectionHeader eyebrow="Conta" title="Dados principais" subtitle="Origem real do profile autenticado." />
                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <SecurityRow icon={Mail} label="Email autenticado" value={profileData?.email || currentUserEmail || 'Nao informado'} helper="Usado para login e recuperacao" />
                      <SecurityRow icon={ShieldCheck} label="CPF" value={form.cpf || 'Nao informado'} helper={profileHasValidCpf ? 'Documento valido no perfil' : 'Revise e salve para validar'} />
                      <SecurityRow icon={User2} label="Identificacao no ranking" value={rankingPreview} helper={form.rankingDisplayMode === 'codename' ? 'Modo codinome ativo' : 'Modo username ativo'} />
                    </div>
                  </div>

                  <div className="pl-card" style={{ padding: 24 }}>
                    <SectionHeader eyebrow="Conta" title="Status e indicacoes" subtitle="Resumo operacional da conta no app." />
                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <SecurityRow icon={RefreshCw} label="XP total" value={formatNumber(xpSummary.xpTotal)} helper={`Level ${formatNumber(xpSummary.level || 1)}`} />
                      <SecurityRow
                        icon={BadgeCheck}
                        label="Referral code"
                        value={profileData?.referral_code || 'Nao gerado'}
                        helper={profileData?.referred_by_code ? `Indicado por ${profileData.referred_by_code}` : 'Conta sem indicacao vinculada'}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
                  {/* Change email */}
                  <div className="pl-card" style={{ padding: 24 }}>
                    <SectionHeader
                      eyebrow="E-mail"
                      title="Trocar e-mail"
                      subtitle="O login passara a usar o novo endereco apos a confirmacao exigida pelo provedor (verifique inbox e spam)."
                    />
                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <Field
                        label="Novo e-mail"
                        type="email"
                        value={newEmail}
                        onChange={setNewEmail}
                        placeholder="voce@exemplo.com"
                        autoComplete="email"
                      />
                      <p style={{ fontSize: 12, color: 'var(--pl-ink-2)' }}>
                        E-mail atual:{' '}
                        <span style={{ fontWeight: 600, color: 'var(--pl-ink)' }}>{profileData?.email || currentUserEmail || '—'}</span>
                      </p>
                      <button
                        type="button"
                        onClick={handleEmailChange}
                        disabled={emailBusy || !currentUserId}
                        className="pl-btn pl-btn-primary"
                        style={{ opacity: (emailBusy || !currentUserId) ? 0.6 : 1 }}
                      >
                        {emailBusy ? 'Atualizando...' : 'Solicitar troca de e-mail'}
                      </button>
                    </div>
                  </div>

                  {/* Change password */}
                  <div className="pl-card" style={{ padding: 24 }}>
                    <SectionHeader
                      eyebrow="Senha"
                      title="Nova senha (logado)"
                      subtitle="Atualizacao imediata enquanto a sessao esta ativa. Minimo de 6 caracteres."
                    />
                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <Field
                        label="Senha atual"
                        type="password"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
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
                        className="pl-btn pl-btn-primary"
                        style={{ opacity: passwordChangeBusy ? 0.6 : 1 }}
                      >
                        {passwordChangeBusy ? 'Salvando...' : 'Salvar nova senha'}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
                  {/* Recovery actions */}
                  <div className="pl-card" style={{ padding: 24 }}>
                    <SectionHeader eyebrow="Acoes reais" title="Recuperacao e sessao" subtitle="Fluxos funcionais ligados ao Supabase e ao app." />
                    <div style={{ marginTop: 20, display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
                      <ActionTile
                        icon={KeyRound}
                        title="Redefinir senha"
                        desc="Envia um link real de redefinicao para o email autenticado."
                        actionLabel={passwordBusy ? 'Enviando...' : 'Enviar link'}
                        onClick={handlePasswordReset}
                        disabled={passwordBusy || !currentUserEmail}
                      />
                      <ActionTile icon={LogOut} title="Encerrar sessao" desc="Sai da conta atual e retorna ao fluxo de login." actionLabel="Sair da conta" onClick={() => onLogout?.()} />
                    </div>
                  </div>

                  {/* Integration signals */}
                  <div className="pl-card" style={{ overflow: 'hidden' }}>
                    <div style={{
                      borderBottom: '1px solid var(--pl-rule-2)',
                      background: 'var(--pl-bg-soft)',
                      padding: '18px 24px',
                    }}>
                      <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Base da conta</p>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--pl-ink)' }}>Sinais de integracao</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
                      {[
                        { label: 'Foto do perfil', value: profileData?.avatar_url ? 'Persistida' : 'Sem foto', tone: profileData?.avatar_url ? 'success' : 'danger' },
                        { label: 'Username', value: profileData?.username || 'Nao informado', tone: profileData?.username ? 'accent' : 'danger' },
                        { label: 'Referral code', value: profileData?.referral_code || 'Nao gerado', tone: profileData?.referral_code ? 'success' : 'danger' },
                      ].map((item) => (
                        <div key={item.label} style={{
                          borderRadius: 14, border: '1px solid var(--pl-rule-2)',
                          background: 'var(--pl-surface)', padding: 14,
                        }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{item.label}</p>
                              <p style={{ marginTop: 4, fontSize: 13, color: 'var(--pl-ink-2)' }}>{item.value}</p>
                            </div>
                            <TagBadge tone={item.tone}>{item.value}</TagBadge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* LGPD */}
                <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
                  <div className="pl-card" style={{ padding: 24 }}>
                    <SectionHeader
                      eyebrow="LGPD"
                      title="Seus dados"
                      subtitle="Exporte uma copia completa dos seus dados ou leia nossa politica de privacidade."
                    />
                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <LgpdButton
                        icon={Download}
                        label="Exportar meus dados"
                        description="Baixa um JSON com todo o seu historico"
                        tone="accent"
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
                        label="Politica de Privacidade"
                        description="Veja como tratamos seus dados"
                        tone="neutral"
                        onClick={() => setActiveTab('privacidade')}
                      />
                      <LgpdButton
                        icon={FileText}
                        label="Termos de Uso"
                        description="Regras e condicoes da plataforma"
                        tone="neutral"
                        onClick={() => setActiveTab('termos')}
                      />
                    </div>
                  </div>

                  <div className="pl-card" style={{ padding: 24, border: '1px solid var(--pl-danger-soft)' }}>
                    <SectionHeader
                      eyebrow="Zona de perigo"
                      title="Excluir conta"
                      subtitle="A exclusao e irreversivel. Seus dados serao removidos em ate 30 dias."
                    />
                    <div style={{ marginTop: 20 }}>
                      <LgpdButton
                        icon={Trash2}
                        label="Solicitar exclusao de conta"
                        description="Inicia o processo de remocao permanente"
                        tone="danger"
                        onClick={async () => {
                          const confirmed = window.confirm(
                            'Tem certeza? Sua conta e todos os dados serao excluidos permanentemente em ate 30 dias. Esta acao nao pode ser desfeita.'
                          );
                          if (!confirmed) return;
                          try {
                            const { data, error } = await supabase.rpc('request_account_deletion');
                            if (error) throw error;
                            alert(data?.message || 'Solicitacao registrada. Entraremos em contato.');
                          } catch {
                            alert('Erro ao registrar solicitacao. Entre em contato: privacidade@papirando.com');
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
