import { ArrowRight } from 'lucide-react';

/**
 * The one visual atom the whole product is built around: an IPC provision and
 * what it became under the BNS.
 *
 * Colour carries meaning here rather than decoration — muted for the repealed
 * code, gold for the law in force — so the direction of the translation is
 * readable before any label is.
 */
export function SectionMappingRow({
  ipcSection,
  bnsSection,
  size = 'md',
}: {
  ipcSection: string;
  /** Empty when the provision has no numbered successor. */
  bnsSection: string;
  size?: 'md' | 'lg';
}) {
  const large = size === 'lg';

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span
        className={
          large
            ? 'flex items-baseline gap-1.5 rounded-md bg-past/10 px-2.5 py-1 font-mono text-[0.9375rem] font-medium text-past ring-1 ring-inset ring-past/20'
            : 'badge badge-past'
        }
      >
        <span className={large ? 'text-[0.6875rem] uppercase tracking-wider text-past-2' : 'sr-only'}>
          IPC
        </span>
        {!large && 'IPC '}
        {ipcSection}
      </span>

      <ArrowRight
        className={`shrink-0 text-fg-subtle ${large ? 'h-4 w-4' : 'h-3 w-3'}`}
        aria-hidden="true"
      />

      {bnsSection ? (
        <span
          /* The provision in force is the lit one. Colour and label carry the
             same distinction, so the glow is reinforcement, never the signal. */
          className={
            large
              ? 'lum-metric flex items-baseline gap-1.5 rounded-md bg-gold/10 px-2.5 py-1 font-mono text-[0.9375rem] font-medium shadow-[0_0_18px_rgb(var(--lum-gold)/0.12)] ring-1 ring-inset ring-gold/25'
              : 'badge badge-current'
          }
        >
          <span className={large ? 'text-[0.6875rem] uppercase tracking-wider text-gold/70' : 'sr-only'}>
            BNS
          </span>
          {!large && 'BNS '}
          {bnsSection}
        </span>
      ) : (
        <span
          className={
            large
              ? 'inline-flex items-center rounded-md bg-surface-2 px-2.5 py-1 font-mono text-[0.8125rem] text-fg-subtle ring-1 ring-inset ring-line'
              : 'badge badge-neutral'
          }
        >
          No direct successor
        </span>
      )}
    </div>
  );
}
