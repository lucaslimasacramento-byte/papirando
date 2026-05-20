import React from 'react';

/** Padding e densidade alinhados ao cabecalho de Disciplinas (padrao global).
 *  Brandbook: warm paper + ink + Fraunces editorial. A flag `page-head-premium-dark`
 *  foi removida — agora o componente usa o `.page-head` base (faixa accent + paper). */
const SHELL_BASE =
  'page-head page-head-warm relative w-full min-w-0 max-w-full box-border overflow-hidden px-4 py-4 sm:px-5 sm:py-4';

export const PAGE_HEAD_PREMIUM_BADGE_CLASS =
  'mb-1 inline-flex w-fit max-w-full items-center gap-1.5 rounded-sm border border-[#1d4ed8]/24 bg-[#eaf0fd] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#1d4ed8]';

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
      className={`mx-auto w-full max-w-[24rem] rounded-md border border-[#14110d]/12 bg-[#f9f7f0] px-4 py-2.5 shadow-none xl:px-4.5 xl:py-3 ${className}`.trim()}
    >
      <div className="flex items-start gap-3 text-left">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#1d4ed8]/24 bg-[#eaf0fd] text-[15px] font-light leading-none text-[#1d4ed8]"
          style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}
        >
          "
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-[13px] font-medium leading-[1.45] tracking-[-0.01em] text-[#14110d] [text-wrap:balance] ${quoteClassName}`.trim()}
            style={{ fontFamily: 'Fraunces, "Plus Jakarta Sans", serif', fontStyle: 'italic', fontWeight: 400 }}
          >
            {quote}
          </p>
          {author ? (
            <p
              className={`mt-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#847b6c] ${authorClassName}`.trim()}
            >
              {author}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PageHeadPremiumShell({ children, className = '', style = undefined }) {
  return <div className={`${SHELL_BASE} ${className}`.trim()} style={style}>{children}</div>;
}

export function PageHeadPremiumIconTile({ children, className = '' }) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-0 bg-[#14110d] text-[#f3efe5] shadow-none ring-0 sm:h-12 sm:w-12 ${className}`}
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
      {Icon ? <Icon size={12} className="text-[#1d4ed8]" /> : null}
      {children}
    </span>
  );
}

/** Classes do glyphe Lucide dentro do tile (padrao Disciplinas). */
export const PAGE_HEAD_PREMIUM_ICON_GLYPH_CLASS =
  'h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5';

/* ACCENT — tints semanticos warm para o icone do KPI (alinhado ao brandbook).
 * O "indigo" foi remapeado para o accent oficial #1d4ed8 — gradient azul/indigo
 * fica reservado para AI surfaces ("Bizu"). */
const ACCENT = {
  blue:    'border border-[#1d4ed8]/24 bg-[#eaf0fd] text-[#1d4ed8]',
  indigo:  'border border-[#1d4ed8]/24 bg-[#eaf0fd] text-[#1d4ed8]',
  emerald: 'border border-[#4d7c3f]/24 bg-[#e8efdc] text-[#4d7c3f]',
  orange:  'border border-[#b45309]/24 bg-[#fbeacd] text-[#b45309]',
  violet:  'border border-[#1d4ed8]/24 bg-[#eaf0fd] text-[#1d4ed8]',
  amber:   'border border-[#b45309]/24 bg-[#fbeacd] text-[#b45309]',
  red:     'border border-[#b91c1c]/24 bg-[#fde4e4] text-[#b91c1c]',
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
  /* KPI tile warm: surface plana com border ink-2-soft (brandbook diz cards sao planos). */
  const shell =
    'min-w-0 rounded-md border border-[#14110d]/12 bg-white shadow-none transition-colors duration-200 hover:border-[#14110d]/24 hover:bg-[#f9f7f0]';

  if (dense) {
    return (
      <div className={`${shell} flex min-h-0 flex-col items-center gap-1 p-2 text-center sm:p-2 ${className}`.trim()}>
        <div className="flex w-full min-w-0 items-center justify-center gap-1.5">
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${wrap}`}>
            <Icon size={12} strokeWidth={1.75} aria-hidden />
          </div>
          <p className="min-w-0 text-[8px] font-bold uppercase leading-tight tracking-[0.22em] text-[#847b6c]">
            {label}
          </p>
        </div>
        <p
          className={`w-full max-w-full truncate text-sm font-light tabular-nums leading-none text-[#14110d] sm:text-[0.9375rem] ${valueClassName}`.trim()}
          style={{ fontFamily: 'Fraunces, "Plus Jakarta Sans", serif', fontStyle: 'italic', letterSpacing: '-0.04em' }}
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
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${wrap}`}>
            <Icon size={14} strokeWidth={1.75} aria-hidden />
          </div>
          <p className="min-w-0 text-[9px] font-bold uppercase leading-tight tracking-[0.22em] text-[#847b6c]">
            {label}
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center px-0.5 pt-1 sm:pt-1.5">
          <p
            className={`max-w-full text-center text-2xl font-light tabular-nums leading-none text-[#14110d] sm:text-3xl ${valueClassName}`}
            style={{ fontFamily: 'Fraunces, "Plus Jakarta Sans", serif', fontStyle: 'italic', letterSpacing: '-0.045em' }}
          >
            {value}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${shell} flex flex-col items-center p-2.5 text-center sm:p-3 ${className}`}>
      <div className={`mb-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 ${wrap}`}>
        <Icon size={14} strokeWidth={1.75} aria-hidden />
      </div>
      <p className="mb-1 w-full min-w-0 text-[9px] font-bold uppercase leading-tight tracking-[0.22em] text-[#847b6c]">
        {label}
      </p>
      <p
        className={`w-full max-w-full truncate text-center text-base font-light tabular-nums leading-none text-[#14110d] sm:text-lg ${valueClassName}`}
        style={{ fontFamily: 'Fraunces, "Plus Jakarta Sans", serif', fontStyle: 'italic', letterSpacing: '-0.04em' }}
      >
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
  iconSlot = null,
  iconTileClassName = '',
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
  style = undefined,
}) {
  const statList = Array.isArray(stats) ? stats : [];
  const hasStats = statList.length > 0;
  const hasTrailing = Boolean(trailing);
  const wideSubtitle = !hasStats && !hasTrailing;
  const stackStatsBelow = Boolean(statsStackBelowTrailing) && hasStats && hasTrailing;
  /** Três colunas no desktop: título | KPIs centralizados | ações (evita esmagar os KPIs). */
  const headerGridLayout = hasStats && hasTrailing && !stackStatsBelow && !centerSlot;

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
      className={`flex w-full min-w-0 max-w-full flex-col gap-3 sm:gap-4 ${headerGridLayout ? 'lg:!grid lg:!grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-x-3 lg:gap-y-3 2xl:gap-x-5' : 'xl:flex-row xl:items-center xl:justify-between'} ${className}`}
      style={style}
    >
      <div
        className={`relative z-10 flex min-w-0 items-center gap-3 sm:min-h-0 sm:gap-3.5 ${headerGridLayout ? 'shrink-0' : 'flex-1 basis-0'} ${leadingClassName}`.trim()}
      >
        <PageHeadPremiumIconTile className={iconTileClassName}>
          {iconSlot || (Icon ? <Icon className={`${PAGE_HEAD_PREMIUM_ICON_GLYPH_CLASS} block shrink-0`} strokeWidth={2} aria-hidden /> : null)}
        </PageHeadPremiumIconTile>
        <div className="min-w-0 flex flex-1 flex-col justify-center self-stretch sm:self-auto">
          {badge}
          <TitleTag
            className="m-0 text-[1.625rem] font-light leading-[1.05] tracking-tight text-[#14110d] sm:text-[2rem]"
            style={{ fontFamily: 'Fraunces, "Plus Jakarta Sans", serif', fontStyle: 'italic', letterSpacing: '-0.035em' }}
          >
            {title}
          </TitleTag>
          {subtitle ? (
            <p
              className={`mt-0.5 w-full min-w-0 text-sm font-medium leading-snug text-[#3a342c] sm:mt-1 sm:text-[13px] sm:leading-relaxed ${wideSubtitle ? 'max-w-3xl' : 'xl:max-w-none'} ${subtitleClassName}`}
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
      {headerGridLayout && hasStats ? (
        <div className="relative z-10 flex min-h-0 min-w-0 w-full max-w-full items-center justify-center justify-self-center px-0.5 sm:px-2">
          <div className={`min-w-0 ${statGridClassName || defaultStatGrid}`.trim()}>
            {statList.map((item, i) => (
              <PageHeadPremiumStatCompact
                key={item.key ?? i}
                {...item}
                dense={statsDense || item.dense}
              />
            ))}
          </div>
        </div>
      ) : null}
      {headerGridLayout && hasTrailing ? (
        <div className={`page-head-premium-actions relative z-10 min-w-0 max-w-full shrink-0 self-center justify-self-end ${trailingClassName}`.trim()}>
          {trailing}
        </div>
      ) : null}
      {!headerGridLayout && (hasStats || hasTrailing) ? (
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
