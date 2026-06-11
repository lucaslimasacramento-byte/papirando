import React from 'react';

export default function AdminPageHeader({
  icon: Icon,
  badgeIcon: BadgeIcon,
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
    <div
      className={className}
      style={{ background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--pl-sh-low)' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
              {Icon && (
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--pl-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-accent)', flexShrink: 0 }}>
                  <Icon size={22} strokeWidth={2} />
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                {badge && (
                  <p className="pl-eyebrow" style={{ marginBottom: 4, color: 'var(--pl-accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {BadgeIcon && <BadgeIcon size={12} strokeWidth={2} />}
                    {badge}
                  </p>
                )}
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--pl-ink)' }}>
                  {title}
                </h2>
                {subtitle && (
                  <p style={{ marginTop: 4, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--pl-ink-2)' }}>{subtitle}</p>
                )}
              </div>
            </div>

            {trailing && (
              <div className={trailingClassName} style={{ flexShrink: 0 }}>
                {trailing}
              </div>
            )}
          </div>
        </div>

        {hasStats && (
          <div style={{ borderTop: '1px solid var(--pl-rule)', padding: '12px 20px' }}>
            <div
              className={statsClassName}
              style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`, gap: 8 }}
            >
              {stats.map((item, index) => (
                <div
                  key={item.key ?? index}
                  style={{ background: 'var(--pl-bg-soft)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                  {item.label && (
                    <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{item.label}</p>
                  )}
                  <p className="pl-num" style={{ fontSize: 18, color: 'var(--pl-ink)' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
