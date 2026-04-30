import React from 'react';

/** Padding e densidade alinhados ao cabecalho de Disciplinas (padrao global). */
const SHELL_BASE =
  'page-head page-head-premium-dark relative w-full min-w-0 max-w-full box-border overflow-hidden px-4 py-4 sm:px-5 sm:py-4';

export const PAGE_HEAD_PREMIUM_BADGE_CLASS =
  'mb-1 inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300 backdrop-blur-sm';

export const PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS =
  'page-head-premium-action page-head-premium-action-primary';

export const PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS =
  'page-head-premium-action page-head-premium-action-secondary';

/** CTA “Gerar / IA” no header premium escuro — gradiente fúcsia–violeta (ver `index.css`). */
export const PAGE_HEAD_PREMIUM_IA_ACTION_CLASS =
  'page-head-premium-action page-head-premium-action-ia';

export const PAGE_HEAD_PREMIUM_TOGGLE_GROUP_CLASS =
  'page-head-premium-toggle-group flex shrink-0 items-center rounded-xl border border-white/[0.12] bg-white/[0.08] p-0.5 sm:p-1';

export const PAGE_HEAD_PREMIUM_TOGGLE_BUTTON_CLASS =
  'page-head-premium-toggle-button flex items-center gap-1.5 rounded-[0.9rem] px-3 py-2 text-xs font-semibold transition-colors sm:gap-2 sm:px-4 sm:text-[13px]';

export const PAGE_HEAD_PREMIUM_TOGGLE_BUTTON_ACTIVE_CLASS =
  'page-head-premium-toggle-button is-active flex items-center gap-1.5 rounded-[0.9rem] px-3 py-2 text-xs font-semibold transition-colors sm:gap-2 sm:px-4 sm:text-[13px]';

export function PageHeadPremiumCenterNote({
  quote,
  author = '',
  className = '',
  quoteClassName = '',
  authorClassName = '',
}) {
  if (!quote) return null;

  return (
    <div
      className={`mx-auto w-full max-w-[29rem] rounded-[1.2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] px-5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_14px_34px_rgba(8,15,30,0.22)] backdrop-blur-xl xl:px-6 xl:py-3.5 ${className}`.trim()}
    >
      <p
        className={`text-[14px] font-medium leading-[1.55] tracking-[-0.015em] text-white [text-shadow:0_1px_10px_rgba(15,23,42,0.35)] [text-wrap:balance] ${quoteClassName}`.trim()}
      >
        {quote}
      </p>
      {author ? (
        <p
          className={`mt-2 text-[10px] font-bold uppercase tracking-[0.24em] text-blue-50 [text-shadow:0_1px_8px_rgba(15,23,42,0.3)] ${authorClassName}`.trim()}
        >
          {author}
        </p>
      ) : null}
    </div>
  );
}

export function PageHeadPremiumShell({ children, className = '' }) {
  return <div className={`${SHELL_BASE} ${className}`.trim()}>{children}</div>;
}

export function PageHeadPremiumIconTile({ children, className = '' }) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-gradient-to-br from-[#4f8df7] via-[#547eff] to-[#5d63f4] text-white shadow-[0_12px_30px_rgba(85,122,255,0.34)] ring-1 ring-white/10 sm:h-12 sm:w-12 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeadPremiumBadge({ icon: Icon, children, className = '' }) {
  return (
    <span
      className={`${PAGE_HEAD_PREMIUM_BADGE_CLASS} ${className}`}
    >
      {Icon ? <Icon size={12} className="text-slate-300" /> : null}
      {children}
    </span>
  );
}

/** Classes do glyphe Lucide dentro do tile (padrao Disciplinas). */
export const PAGE_HEAD_PREMIUM_ICON_GLYPH_CLASS =
  'h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5';

const ACCENT = {
  blue: 'border border-blue-300/20 bg-blue-400/14 text-blue-200',
  indigo: 'border border-indigo-300/20 bg-indigo-400/14 text-indigo-100',
  emerald: 'border border-emerald-300/20 bg-emerald-400/14 text-emerald-200',
  orange: 'border border-orange-300/20 bg-orange-400/14 text-orange-200',
  violet: 'border border-violet-300/20 bg-violet-400/14 text-violet-100',
  amber: 'border border-amber-300/20 bg-amber-400/14 text-amber-200',
  red: 'border border-red-300/20 bg-red-400/14 text-red-200',
};

/**
 * KPI "vidro" no cabecalho premium (padrao visual unico).
 * @param {'left' | 'hero'} valueLayout - `hero`: valor centralizado e maior (ex.: Historico).
 * @param {boolean} dense - layout mais baixo (icone + rotulo na mesma linha, valor abaixo).
 */
export function PageHeadPremiumStatCompact({
  icon: Icon,
  label,
  value,
  accent = 'blue',
  valueClassName = '',
  className = '',
  valueLayout = 'left',
  dense = false,
}) {
  const wrap = ACCENT[accent] || ACCENT.blue;
  const shell =
    'min-w-0 rounded-[1.15rem] border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-md transition-colors duration-200 hover:border-white/15 hover:bg-white/[0.08]';

  if (dense) {
    return (
      <div className={`${shell} flex min-h-0 flex-col items-center gap-1 p-2 text-center sm:p-2 ${className}`.trim()}>
        <div className="flex w-full min-w-0 items-center justify-center gap-1.5">
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${wrap}`}>
            <Icon size={12} strokeWidth={2} aria-hidden />
          </div>
          <p className="min-w-0 text-[8px] font-semibold uppercase leading-tight tracking-[0.14em] text-slate-400/90">
            {label}
          </p>
        </div>
        <p
          className={`w-full max-w-full truncate text-sm font-bold tabular-nums leading-none !text-[#ffffff] sm:text-[0.9375rem] ${valueClassName}`.trim()}
        >
          {value}
        </p>
      </div>
    );
  }

  if (valueLayout === 'hero') {
    return (
      <div className={`${shell} flex min-h-[6.75rem] flex-col p-2.5 sm:min-h-[7.25rem] sm:p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${wrap}`}>
            <Icon size={14} strokeWidth={2} aria-hidden />
          </div>
          <p className="min-w-0 text-[9px] font-semibold uppercase leading-tight tracking-[0.16em] text-slate-400/90">
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
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400/90">{label}</p>
      <p className={`truncate text-base font-bold tabular-nums leading-none text-white sm:text-lg ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

/** Alias do cartao compacto - mantido para imports antigos. */
export const PageHeadPremiumStat = PageHeadPremiumStatCompact;

/**
 * Cabecalho premium escuro padrao: icone obrigatorio, badge opcional, KPIs ou trailing.
 * Sem KPIs e sem trailing: subtitulo usa max-w-3xl.
 */
export default function PageHeadPremium({
  icon: Icon,
  badge = null,
  title,
  titleAs: TitleTag = 'h2',
  subtitle = null,
  subtitleClassName = '',
  leadingExtra = null,
  centerSlot = null,
  stats = null,
  trailing = null,
  statGridClassName = '',
  className = '',
  /** Classes extras no bloco icone + titulo (ex.: limitar largura em telas xl). */
  leadingClassName = '',
  /** Classes extras no wrapper do `trailing` (ex.: `xl:flex-1` para KPIs ocuparem o restante). */
  trailingClassName = '',
  /** Classes extras no container externo do bloco `trailing/stats` (ex.: aumentar max-width no xl). */
  trailingWrapClassName = '',
  /** Com stats + trailing: coluna com acoes no topo e KPIs abaixo (evita sobreposicao no xl). */
  statsStackBelowTrailing = false,
  /** KPIs mais baixos quando usar `statsStackBelowTrailing` ou telas estreitas. */
  statsDense = false,
}) {
  const statList = Array.isArray(stats) ? stats : [];
  const hasStats = statList.length > 0;
  const hasTrailing = Boolean(trailing);
  const wideSubtitle = !hasStats && !hasTrailing;
  const stackStatsBelow = Boolean(statsStackBelowTrailing) && hasStats && hasTrailing;

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
      className={`flex w-full min-w-0 max-w-full flex-col gap-3 sm:gap-4 xl:flex-row xl:items-center xl:justify-between ${className}`}
    >
      <div
        className={`relative z-10 flex min-w-0 flex-1 basis-0 items-center gap-3 sm:min-h-0 sm:gap-3.5 ${leadingClassName}`.trim()}
      >
        <PageHeadPremiumIconTile>
          <Icon className={`${PAGE_HEAD_PREMIUM_ICON_GLYPH_CLASS} block shrink-0`} strokeWidth={2} aria-hidden />
        </PageHeadPremiumIconTile>
        <div className="min-w-0 flex flex-1 flex-col justify-center self-stretch sm:self-auto">
          {badge}
          <TitleTag className="m-0 text-[1.55rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[1.75rem]">{title}</TitleTag>
          {subtitle ? (
            <p
              className={`mt-0.5 w-full min-w-0 text-sm font-medium leading-snug text-slate-300/90 sm:mt-1 sm:text-[13px] sm:leading-relaxed ${wideSubtitle ? 'max-w-3xl' : 'xl:max-w-none'} ${subtitleClassName}`}
            >
              {subtitle}
            </p>
          ) : null}
          {leadingExtra ? <div className="mt-2">{leadingExtra}</div> : null}
        </div>
      </div>
      {centerSlot ? (
        <div className="relative z-10 flex w-full min-w-0 max-w-full justify-center xl:pointer-events-none xl:absolute xl:left-1/2 xl:top-1/2 xl:w-[min(86vw,30rem)] xl:max-w-[min(86vw,30rem)] xl:-translate-x-1/2 xl:-translate-y-1/2">
          {centerSlot}
        </div>
      ) : null}
      {hasStats || hasTrailing ? (
        <div
          className={`page-head-premium-trailing relative z-10 flex w-full min-w-0 max-w-full flex-col items-stretch gap-3 sm:gap-4 xl:min-w-0 xl:shrink-0 ${stackStatsBelow ? 'xl:!flex-col xl:items-end xl:justify-start xl:gap-2.5 xl:w-auto' : 'xl:w-auto xl:max-w-md xl:flex-row xl:items-center xl:justify-end'} ${hasStats && hasTrailing && !stackStatsBelow ? 'xl:gap-4' : ''} ${trailingWrapClassName}`.trim()}
        >
          {stackStatsBelow ? (
            <>
              {hasTrailing ? (
                <div className={`page-head-premium-actions w-full min-w-0 max-w-full shrink-0 xl:flex xl:w-auto xl:justify-end ${trailingClassName}`.trim()}>
                  {trailing}
                </div>
              ) : null}
              {hasStats ? (
                <div className={`min-w-0 w-full max-w-full ${statGridClassName || defaultStatGrid}`.trim()}>
                  {statList.map((item, i) => (
                    <PageHeadPremiumStatCompact
                      key={item.key ?? i}
                      {...item}
                      dense={statsDense || item.dense}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <>
              {hasStats ? (
                <div className={`min-w-0 max-w-full ${statGridClassName || defaultStatGrid}`.trim()}>
                  {statList.map((item, i) => (
                    <PageHeadPremiumStatCompact
                      key={item.key ?? i}
                      {...item}
                      dense={statsDense || item.dense}
                    />
                  ))}
                </div>
              ) : null}
              {hasTrailing ? (
                <div className={`page-head-premium-actions w-full min-w-0 max-w-full shrink xl:w-auto ${trailingClassName}`.trim()}>
                  {trailing}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </PageHeadPremiumShell>
  );
}
