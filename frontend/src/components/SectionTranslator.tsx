import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowUpRight, CornerDownLeft, MessageSquare, Search } from 'lucide-react';
import { useSectionLookup } from '../hooks/useSectionLookup';
import { EXAMPLE_MAPPING, QUICK_PICKS } from '../lib/sections';
import { SectionMappingRow } from './SectionMappingRow';
import { Skeleton } from './ui/Feedback';
import { buttonClass } from './ui/Button';

/**
 * A working IPC → BNS lookup, placed in the hero.
 *
 * This is the product rather than a picture of it: it calls the same public
 * `/map` endpoint the mapping page uses, needs no account, and answers in one
 * keystroke-and-enter. It replaced a decorative mock chat window whose contents
 * were invented — including a section number that contradicted the app's own
 * data.
 */
export default function SectionTranslator() {
  const inputId = useId();
  const [value, setValue] = useState('');
  const { status, result, error, lookup } = useSectionLookup();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void lookup(value);
  };

  const pick = (section: string) => {
    setValue(section);
    void lookup(section);
  };

  /* The panel sits directly on the hero's aurora. Left plain it read as a
     rectangle pasted over the effect, so it catches light instead: a gold
     filament along its top edge and a wide, very low bloom around it, both the
     same hue as the glow behind it. */
  return (
    <div className="panel relative overflow-hidden shadow-[0_0_70px_-24px_rgb(var(--lum-gold)/0.22)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent"
      />

      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="t-label lum-label text-fg-subtle">Section translator</p>
        <Link
          to="/mapping"
          className="lum-interactive lum-interactive-gold t-xs inline-flex items-center gap-1 text-fg-subtle hover:text-gold"
        >
          Full lookup
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="p-4">
        <form onSubmit={submit}>
          <label htmlFor={inputId} className="field-label mb-1.5 block">
            Enter an IPC section
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
                aria-hidden="true"
              />
              <input
                id={inputId}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="302, 420, 498A…"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                className="input input-icon font-mono"
                aria-describedby={`${inputId}-hint`}
              />
            </div>
            <button
              type="submit"
              className={buttonClass({ variant: 'primary' })}
              disabled={status === 'loading' || !value.trim()}
            >
              {status === 'loading' ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <CornerDownLeft className="h-4 w-4" aria-hidden="true" />
              )}
              Translate
            </button>
          </div>
          <p id={`${inputId}-hint`} className="field-hint mt-2">
            Live lookup against the section index. No account needed.
          </p>
        </form>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_PICKS.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => pick(section)}
              className={`chip font-mono ${value === section ? 'chip-active' : ''}`}
            >
              {section}
            </button>
          ))}
        </div>

        {/* Result region. Announced on change, and never empty: before the first
            lookup it shows a labelled example so the output format is visible
            straight away without inventing anything. */}
        <div aria-live="polite" aria-atomic="true">
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div
                key="example"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 border-t border-line pt-4"
              >
                <p className="t-label mb-2.5 text-fg-subtle">Example</p>
                <div className="statute">
                  <SectionMappingRow
                    ipcSection={EXAMPLE_MAPPING.ipcSection}
                    bnsSection={EXAMPLE_MAPPING.bnsSection}
                    size="lg"
                  />
                  <p className="t-sm mt-2.5 text-fg-muted">{EXAMPLE_MAPPING.title}</p>
                </div>
              </motion.div>
            )}

            {status === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 space-y-2 border-t border-line pt-4"
              >
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </motion.div>
            )}

            {status === 'error' && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="field-error mt-4 border-t border-line pt-4"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {error}
              </motion.p>
            )}

            {status === 'done' && result && (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.17, ease: [0.25, 1, 0.5, 1] }}
                className="mt-4 border-t border-line pt-4"
              >
                {result.outcome === 'unindexed' ? (
                  <div className="statute-past">
                    <p className="t-sm text-fg">
                      IPC {result.ipcSection} is not in the section index.
                    </p>
                    <p className="t-sm mt-1 text-fg-subtle">
                      Check the number, or ask the assistant to look at the provision directly.
                    </p>
                    <Link
                      to="/chat"
                      className={buttonClass({ variant: 'secondary', size: 'sm', className: 'mt-3' })}
                    >
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      Ask the assistant
                    </Link>
                  </div>
                ) : (
                  <div className="statute">
                    <SectionMappingRow
                      ipcSection={result.ipcSection}
                      bnsSection={result.bnsSection}
                      size="lg"
                    />
                    <p className="t-sm mt-2.5 text-fg-muted">
                      {result.outcome === 'no-equivalent'
                        ? `${result.ipcTitle} — no numbered successor in the BNS.`
                        : result.bnsTitle || result.ipcTitle}
                    </p>
                    <Link
                      to={`/mapping?ipc=${encodeURIComponent(result.ipcSection)}`}
                      className="lum-interactive lum-interactive-gold t-xs mt-2.5 inline-flex items-center gap-1 text-gold"
                    >
                      Open the full record
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
