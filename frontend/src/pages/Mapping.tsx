import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Check,
  Copy,
  Info,
  MessageSquare,
  RotateCw,
  Scale,
  Search,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { SectionMappingRow } from '../components/SectionMappingRow';
import { Backdrop } from '../components/ui/Backdrop';
import { buttonClass } from '../components/ui/Button';
import { EmptyState, Skeleton } from '../components/ui/Feedback';
import { useSectionLookup } from '../hooks/useSectionLookup';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { normalizeSectionInput, QUICK_PICKS, SECTION_NOTES } from '../lib/sections';
import type { MappingResult } from '../lib/sections';

/** A labelled value in the record. Renders nothing when the value is absent. */
function RecordField({ label, children }: { label: string; children?: React.ReactNode }) {
  if (children === undefined || children === null || children === '') return null;
  return (
    <div className="border-t border-line py-3.5 sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
      <dt className="t-label pt-0.5 text-fg-subtle">{label}</dt>
      <dd className="t-body mt-1 text-fg-muted sm:mt-0">{children}</dd>
    </div>
  );
}

function CopyCitationButton({ result }: { result: MappingResult }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const citation = result.bnsSection
    ? `IPC ${result.ipcSection} → BNS ${result.bnsSection}${result.bnsTitle ? ` — ${result.bnsTitle}` : ''}`
    : `IPC ${result.ipcSection} — no direct BNS successor`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the text is on screen and selectable anyway */
    }
  };

  return (
    <button
      onClick={copy}
      className={buttonClass({ variant: 'ghost', size: 'sm' })}
      aria-label={`Copy citation: ${citation}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-affirm" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? 'Copied' : 'Copy citation'}
    </button>
  );
}

/** The authoritative view of one lookup. */
function MappingRecord({ result }: { result: MappingResult }) {
  if (result.outcome === 'unindexed') {
    return (
      <div className="card p-6 md:p-8">
        <p className="badge badge-neutral">Not in the index</p>
        <h2 className="t-h2 lum-heading mt-4">
          IPC {result.ipcSection} isn’t in the mapping table
        </h2>
        <p className="t-body mt-3 max-w-xl text-fg-muted">
          The index covers the sections most often cited in FIRs and judgments, not the entire code.
          Check the number for a typo — or put the provision to the assistant, which searches the
          full statute corpus rather than this table.
        </p>
        <Link to="/chat" className={buttonClass({ variant: 'primary', className: 'mt-6' })}>
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Ask about IPC {result.ipcSection}
        </Link>
      </div>
    );
  }

  const noEquivalent = result.outcome === 'no-equivalent';

  return (
    <article className="card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-6 md:p-8">
        <div className="min-w-0">
          <SectionMappingRow
            ipcSection={result.ipcSection}
            bnsSection={result.bnsSection}
            size="lg"
          />
          <h2 className="t-h2 lum-heading mt-4">{result.ipcTitle}</h2>
        </div>
        <CopyCitationButton result={result} />
      </header>

      <div className="p-6 md:p-8">
        {noEquivalent && (
          <p className="mb-6 flex items-start gap-2.5 rounded-md border border-line-2 bg-surface-2 px-3.5 py-3 text-[0.8125rem] leading-relaxed text-fg-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-past" aria-hidden="true" />
            This provision was not carried into the Bharatiya Nyaya Sanhita under a section number
            of its own. Its subject matter may be covered elsewhere in the new code, or dropped
            entirely.
          </p>
        )}

        <dl className="[&>div:first-child]:border-t-0">
          {result.bnsSection && (
            <RecordField label="Now reads as">
              <span className="text-fg">BNS section {result.bnsSection}</span>
              {/* For sections without a reviewed note both the heading and this
                  line fall back to the API description; don't print it twice. */}
              {result.bnsTitle && result.bnsTitle !== result.ipcTitle && (
                <span> — {result.bnsTitle}</span>
              )}
            </RecordField>
          )}
          <RecordField label="Punishment">{result.punishment}</RecordField>
          <RecordField label="Nature">
            {result.cognizable === undefined ? undefined : (
              <span className={result.cognizable ? 'badge badge-caution' : 'badge badge-neutral'}>
                {result.cognizable ? 'Cognizable' : 'Non-cognizable'}
              </span>
            )}
          </RecordField>
          <RecordField label="Bail">
            {result.bailable === undefined ? undefined : (
              <span className={result.bailable ? 'badge badge-affirm' : 'badge badge-danger'}>
                {result.bailable ? 'Bailable' : 'Non-bailable'}
              </span>
            )}
          </RecordField>
          <RecordField label="Note">{result.description}</RecordField>
        </dl>

        {!result.reviewed && (
          <p className="t-sm mt-6 text-fg-subtle">
            Punishment and bail details are shown only for sections with a reviewed note. Ask the
            assistant for the statutory text of this provision.
          </p>
        )}

        <div className="mt-7 flex flex-wrap gap-2.5 border-t border-line pt-6">
          <Link
            to={`/chat?q=${encodeURIComponent(
              `Explain ${result.bnsSection ? `BNS section ${result.bnsSection}` : `IPC section ${result.ipcSection}`} in plain language.`,
            )}`}
            className={buttonClass({ variant: 'primary' })}
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Explain this section
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function Mapping() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { status, result, error, recents, lookup, reset } = useSectionLookup();
  const [value, setValue] = useState(() => searchParams.get('ipc') || '');
  const requestedRef = useRef<string | null>(null);

  useDocumentTitle(
    result?.ipcSection ? `IPC ${result.ipcSection} → BNS · NyayaAI` : 'IPC → BNS lookup · NyayaAI',
  );

  /* Deep links and in-app links (?ipc=420) resolve on arrival, once each. */
  useEffect(() => {
    const requested = normalizeSectionInput(searchParams.get('ipc') || '');
    if (!requested || requested === requestedRef.current) return;
    requestedRef.current = requested;
    setValue(requested);
    void lookup(requested);
  }, [searchParams, lookup]);

  const run = (raw: string) => {
    const section = normalizeSectionInput(raw);
    if (!section) {
      reset();
      setSearchParams({}, { replace: true });
      return;
    }
    requestedRef.current = section;
    setValue(section);
    setSearchParams({ ipc: section }, { replace: true });
    void lookup(section);
  };

  const reviewedSections = Object.entries(SECTION_NOTES);
  const showIdleGuidance = status === 'idle';

  return (
    <div className="relative min-h-screen bg-ink text-fg">
      <Backdrop />
      <Navbar />

      <main id="main-content" className="relative pb-24 pt-[calc(var(--nav-h)+3rem)]">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Section index</p>
            <h1 className="t-h1 lum-heading mt-4">IPC → BNS lookup</h1>
            <p className="t-lead mt-3">
              Enter the section number as it appears in your document. Prefixes like “IPC” or “Sec.”
              are fine.
            </p>
          </div>

          {/* --------------------------------------------------------- Search */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              run(value);
            }}
            className="mt-8 max-w-2xl"
            role="search"
          >
            <label htmlFor="ipc-search" className="sr-only">
              IPC section number
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
                  aria-hidden="true"
                />
                <input
                  id="ipc-search"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="e.g. 302, 420, 498A"
                  autoComplete="off"
                  spellCheck={false}
                  className="input input-icon-lg h-12 font-mono text-base"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading' || !value.trim()}
                className={buttonClass({ variant: 'primary', size: 'lg' })}
              >
                {status === 'loading' && <span className="spinner" aria-hidden="true" />}
                Find mapping
              </button>
            </div>
          </form>

          {/* Quick picks and recents share a row: both are one tap to a result. */}
          <div className="mt-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="t-label mr-1 text-fg-subtle">Common</span>
              {QUICK_PICKS.map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => run(section)}
                  className={`chip font-mono ${result?.ipcSection === section ? 'chip-active' : ''}`}
                >
                  {section}
                </button>
              ))}
            </div>

            {recents.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="t-label mr-1 text-fg-subtle">Recent</span>
                {recents.map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => run(section)}
                    className="chip font-mono"
                  >
                    {section}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* --------------------------------------------------------- Results */}
          <div className="mt-10 max-w-3xl" aria-live="polite" aria-atomic="true">
            <AnimatePresence mode="wait">
              {status === 'loading' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="card p-6 md:p-8"
                >
                  <Skeleton className="h-7 w-56" />
                  <Skeleton className="mt-4 h-8 w-3/4" />
                  <div className="mt-8 space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <span className="sr-only">Looking up section…</span>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="card border-danger/25 p-6"
                  role="alert"
                >
                  <p className="flex items-start gap-2.5 text-[0.9375rem] text-fg">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                    {error}
                  </p>
                  <button
                    onClick={() => run(value)}
                    className={buttonClass({ variant: 'secondary', size: 'sm', className: 'mt-4' })}
                  >
                    <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Try again
                  </button>
                </motion.div>
              )}

              {status === 'done' && result && (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                >
                  <MappingRecord result={result} />
                </motion.div>
              )}
            </AnimatePresence>

            {showIdleGuidance && (
              <div className="card">
                <EmptyState
                  icon={<Scale className="h-5 w-5" aria-hidden="true" />}
                  title="No section looked up yet"
                  description="Search a number above, or start from one of the sections below."
                />
              </div>
            )}
          </div>

          {/* ------------------------------------------------- Reviewed sections */}
          <section aria-labelledby="reviewed-heading" className="mt-16 max-w-3xl">
            <h2 id="reviewed-heading" className="t-h3 text-fg">
              Sections with a reviewed note
            </h2>
            <p className="t-sm mt-1.5 text-fg-subtle">
              These carry punishment and bail details in addition to the mapping.
            </p>

            <ul className="mt-5 overflow-hidden rounded-lg border border-line">
              {reviewedSections.map(([section, note], index) => (
                <li key={section} className={index > 0 ? 'border-t border-line' : ''}>
                  {/* Inset focus ring: the row is flush with a clipped
                      container, which would crop an offset one. */}
                  <button
                    type="button"
                    onClick={() => run(section)}
                    className="group flex w-full items-center gap-4 bg-surface px-4 py-3.5 text-left transition-colors duration-150 hover:bg-surface-2 focus-visible:-outline-offset-2"
                  >
                    <span className="badge badge-past shrink-0">IPC {section}</span>
                    <span className="t-sm min-w-0 flex-1 truncate text-fg-muted group-hover:text-fg">
                      {note.ipcTitle}
                    </span>
                    <Search
                      className="h-3.5 w-3.5 shrink-0 text-fg-subtle group-hover:text-gold"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
