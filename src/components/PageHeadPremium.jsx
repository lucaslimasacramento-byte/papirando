import React from 'react';

/** Padding e densidade alinhados ao cabeçalho de Disciplinas (padrão global). */
const SHELL_BASE =
  'page-head page-head-premium-dark relative w-full min-w-0 max-w-full box-border overflow-visible px-4 py-4 sm:px-5 sm:py-4';

export function PageHeadPremiumShell({ children, className = '' }) {
  return <div className={`${SHELL_BASE} ${className}`.trim()}>{children}</div>;
}

export function PageHeadPremiumIconTile({ children, className = '' }) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_2px_10px_rgba(15,23,42,0.35)] ring-1 ring-white/15 sm:h-12 sm:w-12 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeadPremiumBadge({ icon: Icon, children, className = '' }) {
  return (
    <span
      className={`mb-0.5 inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300 backdrop-blur-sm ${className}`}
    >
      {Icon ? <Icon size={12} className="text-slate-400" /> : null}
      {children}
    </span>
  );
}

/** Classes do glyphe Lucide dentro do tile (padrão Disciplinas). */
export const PAGE_HEAD_PREMIUM_ICON_GLYPH_CLASS =
  'h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5';

const ACCENT = {
  blue: 'bg-blue-500/20 text-blue-300',
  indigo: 'bg-indigo-500/20 text-indigo-200',
  emerald: 'bg-emerald-500/20 text-emerald-300',
  orange: 'bg-orange-500/20 text-orange-300',
  violet: 'bg-violet-500/20 text-violet-200',
  amber: 'bg-amber-500/20 text-amber-300',
  red: 'bg-red-500/20 text-red-300',
};

/**
 * KPI “vidro” no cabeçalho premium (padrão visual único).
 * @param {'left' | 'hero'} valueLayout — `hero`: valor centralizado e maior (ex.: Histórico).
 */
export function PageHeadPremiumStatCompact({
  icon: Icon,
  label,
  value,
  accent = 'blue',
  valueClassName = '',
  className = '',
  valueLayout = 'left',
}) {
  const wrap = ACCENT[accent] || ACCENT.blue;
  const shell =
    'min-w-0 rounded-xl border border-white/10 bg-white/[0.06] shadow-none backdrop-blur-md transition-colors duration-200 hover:border-white/15 hover:bg-white/[0.08]';

  if (valueLayout === 'hero') {
    return (
      <div className={`${shell} flex min-h-[6.75rem] flex-col p-2.5 sm:min-h-[7.25rem] sm:p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${wrap}`}>
            <Icon size={14} strokeWidth={2} aria-hidden />
          </div>
          <p className="min-w-0 text-[9px] font-semibold uppercase leading-tight tracking-[0.16em] text-slate-500">
            {label}
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center px-0.5 pt-1 sm:pt-1.5">
          <p
            className={`max-w-full text-center text-2xl font-bold tabular-nums leading-none tracking-tight text-white sm:text-3xl ${valueClassName}`}
          >
            {value}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${shell} p-2.5 sm:p-3 ${className}`}>
      <div className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${wrap}`}>
        <Icon size={14} strokeWidth={2} aria-hidden />
      </div>
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`truncate text-base font-bold tabular-nums leading-none text-white sm:text-lg ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

/** Alias do cartão compacto — mantido para imports antigos. */
export const PageHeadPremiumStat = PageHeadPremiumStatCompact;

/**
 * Cabeçalho premium escuro padrão: ícone obrigatório, badge opcional, KPIs ou trailing.
 * Sem KPIs e sem trailing: subtítulo usa max-w-3xl.
 */
export default function PageHeadPremium({
  icon: Icon,
  badge = null,
  title,
  titleAs: TitleTag = 'h2',
  subtitle = null,
  subtitleClassName = '',
  leadingExtra = null,
  stats = null,
  trailing = null,
  statGridClassName = '',
  className = '',
  /** Classes extras no bloco ícone + título (ex.: limitar largura em telas xl). */
  leadingClassName = '',
  /** Classes extras no wrapper do `trailing` (ex.: `xl:flex-1` para KPIs ocuparem o restante). */
  trailingClassName = '',
  /** Classes extras no container externo do bloco `trailing/stats` (ex.: aumentar max-width no xl). */
  trailingWrapClassName = '',
}) {
  const statList = Array.isArray(stats) ? stats : [];
  const hasStats = statList.length > 0;
  const hasTrailing = Boolean(trailing);
  const wideSubtitle = !hasStats && !hasTrailing;

  const defaultStatGrid =
    statList.length <= 1
      ? 'grid min-w-0 grid-cols-1 gap-2 sm:gap-3'
      : statList.length === 2
        ? 'grid min-w-0 grid-cols-2 gap-2 sm:gap-3'
        : statList.length === 3
          ? 'grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3'
          : 'grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3';

  return (
    <PageHeadPremiumShell
      className={`flex w-full min-w-0 max-w-full flex-col justify-center gap-3 sm:gap-4 sm:items-center xl:flex-row xl:flex-wrap xl:items-center xl:justify-between ${className}`}
    >
      <div
        className={`relative z-10 flex min-w-0 flex-1 basis-0 items-center gap-3 sm:min-h-0 sm:gap-3.5 ${leadingClassName}`.trim()}
      >
        <PageHeadPremiumIconTile>
          <Icon className={PAGE_HEAD_PREMIUM_ICON_GLYPH_CLASS} strokeWidth={2} aria-hidden />
        </PageHeadPremiumIconTile>
        <div className="min-w-0 flex flex-1 flex-col justify-center self-stretch sm:self-auto">
          {badge}
          <TitleTag className="m-0 text-base font-semibold tracking-tight text-white sm:text-lg">{title}</TitleTag>
          {subtitle ? (
            <p
              className={`mt-0.5 w-full min-w-0 text-xs font-normal leading-snug text-slate-400 sm:mt-1 sm:text-[13px] sm:leading-relaxed ${wideSubtitle ? 'max-w-3xl' : 'xl:max-w-none'} ${subtitleClassName}`}
            >
              {subtitle}
            </p>
          ) : null}
          {leadingExtra ? <div className="mt-2">{leadingExtra}</div> : null}
        </div>
      </div>
      {hasStats || hasTrailing ? (
        <div
          className={`relative z-10 flex w-full min-w-0 max-w-full flex-col items-stretch gap-3 sm:gap-4 xl:w-auto xl:min-w-0 xl:max-w-md xl:shrink xl:flex-row xl:items-center xl:justify-end ${hasStats && hasTrailing ? 'xl:gap-4' : ''} ${trailingWrapClassName}`.trim()}
        >
          {hasStats ? (
            <div className={`min-w-0 max-w-full ${statGridClassName || defaultStatGrid}`.trim()}>
              {statList.map((item, i) => (
                <PageHeadPremiumStatCompact key={item.key ?? i} {...item} />
              ))}
            </div>
          ) : null}
          {hasTrailing ? (
            <div className={`w-full min-w-0 max-w-full shrink xl:w-auto ${trailingClassName}`.trim()}>{trailing}</div>
          ) : null}
        </div>
      ) : null}
    </PageHeadPremiumShell>
  );
}
