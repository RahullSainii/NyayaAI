import { Link } from 'react-router-dom';
import logo from '../../assets/nyaya.jpeg';

/**
 * Brand assets, all derived from the single official logo file
 * (`src/assets/nyaya.jpeg`).
 *
 * That file is a complete lockup — scales-and-chatbot emblem, "NYAYA AI"
 * wordmark, and the "Legal chatbot for everyone" tagline — drawn on a light
 * ground at 4:3 with generous margins. Two consequences shape everything below:
 *
 *  1. At UI sizes the baked-in text is unreadable, so small placements show a
 *     crop of the emblem only and pair it with live text. Large placements show
 *     the full lockup, where the type has room to read.
 *  2. The artwork carries its own near-white ground, so on this dark interface
 *     it is presented deliberately: a light plate with a gold hairline, reading
 *     as an impressed seal rather than an image that failed to load
 *     transparently.
 *
 * Crops are expressed as background-size/position, so no second asset and no
 * build step is required. The numbers below are measured from the file rather
 * than eyeballed — the source is 1013×768 (aspect 1.319) and its ink occupies:
 *     emblem    x 198–772,  y 127–461
 *     wordmark  x 176–798,  y 501–599
 *     tagline   x 176–799,  y 619–645
 * Giving these two windows, including a small breathing margin:
 *     emblem  x 0.1735 → 0.7841,  y 0.1363 → 0.6293   (aspect 1.634)
 *     lockup  x 0.1517 → 0.8107,  y 0.1363 → 0.8689   (aspect 1.187)
 * For a window of width fraction fw and height fraction fh, the CSS is
 * `background-size: 100/fw%` with `background-position: x0/(1-fw), y0/(1-fh)`.
 * Replacing the logo file means re-measuring these two windows and nothing else.
 */

const PLATE =
  'bg-[#eef0f3] bg-no-repeat shadow-[0_1px_3px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-gold/30';

const EMBLEM_CROP = {
  backgroundImage: `url(${logo})`,
  backgroundSize: '163.8% auto',
  backgroundPosition: '44.5% 26.9%',
} as const;

const LOCKUP_CROP = {
  backgroundImage: `url(${logo})`,
  backgroundSize: '151.7% auto',
  backgroundPosition: '44.5% 51%',
} as const;

const EMBLEM_SIZES = {
  sm: 'h-7 rounded-[5px]',
  md: 'h-8 rounded-md',
  lg: 'h-11 rounded-lg',
} as const;

export type BrandSize = keyof typeof EMBLEM_SIZES;

/**
 * The emblem on its plate. Aspect ratio is fixed to the crop window so the
 * artwork is never squashed, whatever height it is given.
 */
export function BrandMark({
  size = 'md',
  /**
   * Only pass this when the mark stands alone. Every current placement sits
   * beside a visible "NyayaAI" label or inside an already-labelled link, where
   * naming it again would have a screen reader announce the brand twice.
   */
  label,
  className = '',
}: {
  size?: BrandSize;
  label?: string;
  className?: string;
}) {
  return (
    <span
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      style={{ ...EMBLEM_CROP, aspectRatio: '1.634' }}
      className={`inline-block shrink-0 ${PLATE} ${EMBLEM_SIZES[size]} ${className}`}
    />
  );
}

/**
 * The complete logo, wordmark and tagline included. For places with room to do
 * it justice: the sign-in panel and the footer.
 */
export function BrandFullLogo({
  label,
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      style={{ ...LOCKUP_CROP, aspectRatio: '1.187' }}
      className={`block rounded-lg ${PLATE} ${className}`}
    />
  );
}

/**
 * Emblem plus live wordmark. Used in every piece of chrome: header, mobile
 * sheet, chat sidebar, footer.
 */
export function BrandLockup({
  to = '/',
  size = 'md',
  showTagline = false,
  className = '',
}: {
  to?: string | null;
  size?: BrandSize;
  showTagline?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <BrandMark size={size} />
      <span className="min-w-0">
        {/* Only the accent syllable is lit, and only faintly — the wordmark sits
            in the header on every page, so anything stronger would compete with
            the page's own heading for attention. */}
        <span className="block font-display text-[1.0625rem] font-semibold leading-none tracking-[0.02em] text-fg">
          Nyaya
          <span className="text-gold [text-shadow:0_0_12px_rgb(var(--lum-gold)/0.3)]">AI</span>
        </span>
        {/* Dropped below `sm`: at 320px the tagline pushes the lockup past the
            header's available width. */}
        {showTagline && (
          <span className="mt-1 hidden text-[0.625rem] font-medium uppercase leading-none tracking-[0.16em] text-fg-subtle sm:block">
            Legal chatbot for everyone
          </span>
        )}
      </span>
    </>
  );

  if (!to) {
    return <span className={`flex items-center gap-2.5 ${className}`}>{inner}</span>;
  }

  return (
    <Link
      to={to}
      aria-label="NyayaAI home"
      className={`flex items-center gap-2.5 rounded-md transition-opacity duration-150 hover:opacity-85 ${className}`}
    >
      {inner}
    </Link>
  );
}
