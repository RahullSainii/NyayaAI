import AetherCanvas from './AetherCanvas';

/**
 * Sits behind page content and fades out before the fold ends.
 *
 * `local` switches it to `absolute`, for when it should fill one column rather
 * than the viewport — a fixed layer would paint over its siblings.
 */
export function Backdrop({ local = false }: { local?: boolean } = {}) {
  return (
    <div
      className="backdrop"
      style={local ? { position: 'absolute' } : undefined}
      aria-hidden="true"
    />
  );
}

/**
 * The hero band.
 *
 * Two earlier versions of this file made the shader effectively invisible, and
 * the mistake was the same both times: veiling the *whole band* to protect the
 * text. Stacked multiplicatively — a 50% canvas under a flat 55% wash under a
 * left-to-right ink gradient — around 7% of the shader survived mid-canvas and
 * none at all on the left.
 *
 * The approach here is different in kind rather than degree:
 *
 *  1. The canvas composites with `mix-blend-mode: screen`, so its large black
 *     areas are a no-op and only the bright streaks add light. Nothing needs to
 *     be dimmed to keep the page dark.
 *  2. Nothing full-bleed is painted over it. Legibility is handled locally, by a
 *     soft gradient that only reaches across the copy column and fades out well
 *     before the middle of the band.
 *
 * Net effect: the streaks read at full strength across most of the hero, and the
 * headline still sits on near-solid ink.
 */
export function HeroBackdrop() {
  /* `bg-ink` on the wrapper is load-bearing, not cosmetic: `screen` blends
     against whatever is painted beneath it within the stacking context, and the
     hero section sets `isolate`. Without an opaque backdrop inside that isolated
     group, the shader's black areas composite as black instead of vanishing. */
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-ink"
      aria-hidden="true"
    >
      {/* Warm base, beneath the shader */}
      <div className="backdrop-glow" />

      {/* The shader itself, unobstructed */}
      <AetherCanvas />

      {/* Local protection for the copy only — reaches ~55% across on wide
          screens and stops. Below lg the copy is full-width, so it becomes a
          gentle top-down wash instead. */}
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          backgroundImage:
            /* Clears at 66%, not 58%: the hero paragraph's longest lines were
               ending just past the old fade and losing contrast against the
               brightest part of the shader. */
            'linear-gradient(96deg,' +
            'color-mix(in srgb, var(--color-ink) 90%, transparent) 0%,' +
            'color-mix(in srgb, var(--color-ink) 82%, transparent) 30%,' +
            'color-mix(in srgb, var(--color-ink) 52%, transparent) 50%,' +
            'color-mix(in srgb, var(--color-ink) 22%, transparent) 62%,' +
            'transparent 74%)',
        }}
      />
      <div
        className="absolute inset-0 lg:hidden"
        style={{
          backgroundImage:
            'linear-gradient(180deg,' +
            'color-mix(in srgb, var(--color-ink) 72%, transparent) 0%,' +
            'color-mix(in srgb, var(--color-ink) 62%, transparent) 60%,' +
            'transparent 100%)',
        }}
      />

      {/* Settle the top edge so the fixed header has something to sit on */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-ink/90 to-transparent" />

      {/* Resolve into the page instead of stopping at an edge */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-ink" />
    </div>
  );
}

/**
 * The same effect for the sign-in, register and password routes.
 *
 * One canvas spans the whole page rather than one per column — a second WebGL
 * context for what is visually a single background would be wasteful. The veil
 * is mirrored relative to the hero: the effect carries the left context panel,
 * and thickens to near-solid ink under the form column so inputs, labels and
 * validation text stay legible.
 */
export function AuthBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-ink"
      aria-hidden="true"
    >
      <div className="backdrop-glow" />

      <AetherCanvas />

      {/* Two columns: clear on the left, solid under the form on the right. */}
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          backgroundImage:
            'linear-gradient(90deg,' +
            'transparent 0%,' +
            'color-mix(in srgb, var(--color-ink) 18%, transparent) 38%,' +
            'color-mix(in srgb, var(--color-ink) 68%, transparent) 50%,' +
            'color-mix(in srgb, var(--color-ink) 94%, transparent) 62%,' +
            'var(--color-ink) 74%)',
        }}
      />

      {/* One column: the form spans the width, so keep the effect to the top. */}
      <div
        className="absolute inset-0 lg:hidden"
        style={{
          backgroundImage:
            'linear-gradient(180deg,' +
            'color-mix(in srgb, var(--color-ink) 42%, transparent) 0%,' +
            'color-mix(in srgb, var(--color-ink) 84%, transparent) 26%,' +
            'var(--color-ink) 52%)',
        }}
      />

      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ink" />
    </div>
  );
}
