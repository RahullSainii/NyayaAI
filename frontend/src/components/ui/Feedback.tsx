import React from 'react';

/** Indeterminate progress. `label` is announced; the ring itself is decorative. */
export function Spinner({
  size = 'md',
  label = 'Loading',
  className = '',
}: {
  size?: 'md' | 'lg';
  label?: string;
  className?: string;
}) {
  return (
    <span role="status" className={`inline-flex items-center ${className}`}>
      <span className={size === 'lg' ? 'spinner spinner-lg' : 'spinner'} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Fills the shape of content that is still loading. Never announced. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />;
}

/**
 * Empty states earn their space: they say what this area is for and give the
 * one action that fills it.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center px-6 py-12 text-center ${className}`}>
      {icon && (
        <div
          className="mb-4 grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface-2 text-fg-subtle"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <p className="t-ui text-fg">{title}</p>
      {description && <p className="t-sm mt-1.5 max-w-sm text-fg-subtle">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Inline message for form and request outcomes. Uses colour *and* an icon slot,
 * so it never relies on hue alone.
 */
export function Notice({
  tone,
  icon,
  children,
  className = '',
}: {
  tone: 'error' | 'success' | 'info';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    error: 'border-danger/25 bg-danger/8 text-danger',
    success: 'border-affirm/25 bg-affirm/8 text-affirm',
    info: 'border-line-2 bg-surface-2 text-fg-muted',
  } as const;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-[0.8125rem] leading-relaxed ${tones[tone]} ${className}`}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span className="min-w-0">{children}</span>
    </div>
  );
}
