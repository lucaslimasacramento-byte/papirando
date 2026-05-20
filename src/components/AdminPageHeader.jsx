import React from 'react';
import {
  PAGE_HEAD_PREMIUM_ICON_GLYPH_CLASS,
  PageHeadPremiumBadge,
  PageHeadPremiumIconTile,
  PageHeadPremiumShell,
  PageHeadPremiumStatCompact,
} from './PageHeadPremium';

export default function AdminPageHeader({
  icon: Icon,
  badgeIcon,
  badge,
  title,
  subtitle,
  stats = [],
  trailing = null,
  className = '',
  statsClassName = '',
  trailingClassName = '',
}) {
  const hasStats = Array.isArray(stats) && stats.length > 0;

  return (
    <PageHeadPremiumShell className={`!px-0 !py-0 ${className}`.trim()}>
      <div className="flex flex-col">
        <div className="flex flex-col gap-4 px-4 py-3.5 sm:px-5 sm:py-4 xl:flex-row xl:items-center xl:justify-between xl:gap-5">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-3.5">
            <PageHeadPremiumIconTile>
              <Icon className={`${PAGE_HEAD_PREMIUM_ICON_GLYPH_CLASS} block shrink-0`} strokeWidth={2} aria-hidden />
            </PageHeadPremiumIconTile>
            <div className="min-w-0 flex-1">
              <PageHeadPremiumBadge icon={badgeIcon || Icon}>{badge}</PageHeadPremiumBadge>
              <h2 className="m-0 text-[1.4rem] font-extrabold leading-[1.02] tracking-tight text-white sm:text-[1.72rem]">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-[13px] font-medium leading-relaxed text-ink-300/90 sm:text-[14px]">{subtitle}</p>
              ) : null}
            </div>
          </div>

          {trailing ? (
            <div className={`w-full xl:w-auto xl:max-w-[21rem] ${trailingClassName}`.trim()}>
              {trailing}
            </div>
          ) : null}
        </div>

        {hasStats ? (
          <div className="border-t border-white/10 px-4 py-2.5 sm:px-5">
            <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 xl:auto-rows-fr ${stats.length >= 5 ? 'xl:grid-cols-5' : ''} ${statsClassName}`.trim()}>
              {stats.map((item, index) => (
                <PageHeadPremiumStatCompact
                  key={item.key ?? index}
                  {...item}
                  className={`min-h-[6rem] justify-center px-2.5 py-2.5 ${item.className || ''}`.trim()}
                  valueClassName={`!truncate !text-[0.98rem] sm:!text-[1.08rem] ${item.valueClassName || ''}`.trim()}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </PageHeadPremiumShell>
  );
}
