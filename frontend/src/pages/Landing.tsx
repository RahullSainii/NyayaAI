import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpenText, FileUp, Quote, Replace, ShieldAlert } from 'lucide-react';
import Navbar from '../components/Navbar';
import SectionTranslator from '../components/SectionTranslator';
import { HeroBackdrop } from '../components/ui/Backdrop';
import { BrandLockup } from '../components/ui/BrandMark';
import { buttonClass } from '../components/ui/Button';
import { SectionMappingRow } from '../components/SectionMappingRow';
import { BNS_COMMENCEMENT, EXAMPLE_MAPPING, INDEX_STATS } from '../lib/sections';

/**
 * One entrance animation, used everywhere. Runs once, moves 8px, then stops.
 *
 * `as="li"` matters: wrapping list items in a motion `div` would put a `div`
 * between `ul`/`ol` and its `li` children, which is invalid and can cost the
 * list its semantics in a screen reader.
 */
function Reveal({
  children,
  delay = 0,
  className = '',
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'li';
}) {
  const Element = as === 'li' ? motion.li : motion.div;

  return (
    <Element
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1], delay }}
      className={className}
    >
      {children}
    </Element>
  );
}

/** Section header: eyebrow, title, and an optional standfirst. */
function SectionHeader({
  eyebrow,
  title,
  standfirst,
}: {
  eyebrow: string;
  title: string;
  standfirst?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="t-h2 lum-heading mt-4">{title}</h2>
      {standfirst && <p className="t-lead mt-3">{standfirst}</p>}
    </div>
  );
}

/**
 * The lead capability, given its own panel.
 *
 * Three equal boxes gave the section no entry point — the eye had nowhere to
 * start. This one leads because it is the product's actual differentiator and
 * the only one that can be *demonstrated* rather than described: the example
 * below it is real data from the index, not an illustration.
 */
const LEAD_CAPABILITY = {
  icon: Replace,
  title: 'Old numbers, new code',
  body:
    'FIRs, notices and judgments written before July 2024 still speak in IPC sections. Translate them to the BNS provision that now applies — or find out that none does, which is an answer in itself.',
};

const CAPABILITIES = [
  {
    icon: Quote,
    title: 'Every answer names its source',
    body:
      'Responses come back with the provisions they were drawn from. Open a citation to read the passage that was retrieved, then judge the answer against it.',
  },
  {
    icon: FileUp,
    title: 'Bring your own document',
    body:
      'Attach a PDF, a DOCX or a photograph of a notice. NyayaAI reads it and answers questions about what it contains, in the same thread.',
  },
];

const STEPS = [
  {
    title: 'Ask in your own words',
    body: 'Describe the situation or name a section. No legal phrasing required.',
  },
  {
    title: 'The corpus is searched',
    body:
      'Your question is matched against the indexed statutes and the IPC → BNS table before anything is written.',
  },
  {
    title: 'Read the answer against its sources',
    body:
      'The reply arrives with citations attached, so the reasoning can be checked rather than trusted.',
  },
];

const LIMITS = [
  {
    title: 'It is not legal advice',
    body: 'General information about Indian law, for understanding — not a substitute for an advocate.',
  },
  {
    title: 'No lawyer–client relationship',
    body: 'Nothing here is privileged or confidential in the way a consultation with counsel is.',
  },
  {
    title: 'It can be wrong',
    body: 'Language models misread statutes. That is why every answer carries the text it relied on.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink text-fg">
      <Navbar />

      <main id="main-content">
        {/* ---------------------------------------------------------------- Hero */}
        <section className="relative isolate overflow-hidden pb-16 pt-[calc(var(--nav-h)+3rem)] md:pb-24 md:pt-[calc(var(--nav-h)+5rem)]">
          <HeroBackdrop />

          <div className="container-page relative">
            <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
              <div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="eyebrow"
                >
                  Bharatiya Nyaya Sanhita · in force since {BNS_COMMENCEMENT}
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1], delay: 0.04 }}
                  /* 24ch, not 19: at 19 the second sentence split as
                     "Find your / way around it.", which reads as a mistake.
                     At 24 the first sentence takes two lines and the second
                     takes one. */
                  className="t-display lum-gradient lum-display mt-5 max-w-[24ch]"
                >
                  India rewrote its criminal code.{' '}
                  {/* No colour class here on purpose: the gradient runs across
                      both lines, so the second line falls away on its own and
                      the pair reads as one lit surface. */}
                  <span className="block">Find your way around it.</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1], delay: 0.1 }}
                  /* Held to `lg` so the lines end inside the veiled zone rather
                     than running out over the bright part of the shader. */
                  className="t-lead mt-6 max-w-lg"
                >
                  Ask a question in plain language. NyayaAI answers with the provisions it relied
                  on, and translates Indian Penal Code sections into the Bharatiya Nyaya Sanhita
                  numbering that replaced them.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1], delay: 0.16 }}
                  className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <Link
                    to="/chat"
                    className={buttonClass({ variant: 'primary', size: 'lg', className: 'group' })}
                  >
                    Ask a question
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                  <Link to="/mapping" className={buttonClass({ variant: 'secondary', size: 'lg' })}>
                    <BookOpenText className="h-4 w-4" aria-hidden="true" />
                    Browse the section index
                  </Link>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.24 }}
                  className="t-sm mt-6 flex items-center gap-2 text-fg-subtle"
                >
                  <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Educational information about Indian law — not legal advice.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1], delay: 0.2 }}
              >
                <SectionTranslator />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- What's indexed */}
        {/* `bg-ink-2` alone was almost indistinguishable from the page, so the
            band read as an accidental gap between two sections. A lit gold
            filament along its top edge — the same device as the eyebrow rule —
            makes it read as a deliberate ledger strip. */}
        <section
          aria-labelledby="index-heading"
          className="relative border-y border-line-2 bg-ink-2"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"
          />
          <div className="container-page py-11 md:py-14">
            <h2 id="index-heading" className="eyebrow">
              The IPC → BNS index
            </h2>

            <ul className="mt-6 grid gap-8 sm:grid-cols-3 sm:gap-10">
              {[
                {
                  value: INDEX_STATS.indexed,
                  label: 'IPC sections indexed',
                  note: 'Searchable by number, however you write it.',
                },
                {
                  value: INDEX_STATS.withEquivalent,
                  label: 'Mapped to a BNS provision',
                  note: 'Renumbered, reworded, or merged into a broader section.',
                },
                {
                  value: INDEX_STATS.withoutEquivalent,
                  label: 'With no direct successor',
                  note: 'Provisions the new code dropped rather than renumbered.',
                },
              ].map((stat, index) => (
                <Reveal as="li" key={stat.label} delay={index * 0.06}>
                  <p className="t-numeral lum-metric text-[2.75rem] leading-none">{stat.value}</p>
                  <h3 className="t-ui mt-2.5 text-fg">{stat.label}</h3>
                  <p className="t-sm mt-1 text-fg-subtle">{stat.note}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* --------------------------------------------------------- Capabilities */}
        {/* Less top padding than bottom: stacked against the band's own padding,
            a symmetric py-28 opened a ~160px void that looked like a bug. */}
        <section
          aria-labelledby="capabilities-heading"
          className="container-page pb-20 pt-16 md:pb-28 md:pt-20"
        >
          <Reveal>
            <SectionHeader
              eyebrow="What it does"
              title="Built to be checked, not just believed"
              standfirst="A legal answer is only as good as the provision behind it. Everything here is arranged so you can get to that provision quickly."
            />
          </Reveal>

          {/* Asymmetric on purpose: the lead panel spans both rows, so the
              section has a reading order — big, then small, then small —
              instead of three items competing at equal weight. */}
          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-[1.25fr_1fr] md:grid-rows-2">
            <Reveal className="bg-surface md:row-span-2">
              <div className="flex h-full flex-col p-6 md:p-8">
                <LEAD_CAPABILITY.icon className="h-5 w-5 text-gold" aria-hidden="true" />
                <h3 className="t-h2 lum-heading mt-5">{LEAD_CAPABILITY.title}</h3>
                <p className="t-body mt-3 max-w-md text-fg-muted">{LEAD_CAPABILITY.body}</p>

                {/* Shown, not claimed. These values come from the same table the
                    lookup queries, so the example cannot drift from the product. */}
                <div className="mt-auto pt-8">
                  <p className="t-label lum-label mb-3 text-fg-subtle">For example</p>
                  <div className="rounded-md border border-line-2 bg-ink-2 p-4">
                    <SectionMappingRow
                      ipcSection={EXAMPLE_MAPPING.ipcSection}
                      bnsSection={EXAMPLE_MAPPING.bnsSection}
                      size="lg"
                    />
                    <p className="t-sm mt-2.5 text-fg-muted">{EXAMPLE_MAPPING.title}</p>
                  </div>
                </div>
              </div>
            </Reveal>

            {CAPABILITIES.map((capability, index) => (
              <Reveal key={capability.title} delay={0.06 + index * 0.06} className="bg-surface">
                <div className="flex h-full flex-col p-6 md:p-7">
                  <capability.icon className="h-5 w-5 text-gold" aria-hidden="true" />
                  <h3 className="t-h3 mt-5 text-fg">{capability.title}</h3>
                  <p className="t-body mt-2.5 text-fg-muted">{capability.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ How it works */}
        <section
          aria-labelledby="process-heading"
          className="border-y border-line bg-ink-2 py-20 md:py-28"
        >
          <div className="container-page">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
              <Reveal>
                <div>
                  <p className="eyebrow">How it works</p>
                  <h2 id="process-heading" className="t-h2 lum-heading mt-4">
                    Retrieval first, then an answer
                  </h2>
                  <p className="t-lead mt-3">
                    The model does not answer from memory. It answers from the statutes that were
                    retrieved for your question.
                  </p>
                </div>
              </Reveal>

              <ol className="flex flex-col">
                {STEPS.map((step, index) => (
                  <Reveal
                    as="li"
                    key={step.title}
                    delay={index * 0.06}
                    className="flex gap-5 border-t border-line py-6 first:border-t-0 first:pt-0"
                  >
                    <span className="t-mono mt-0.5 shrink-0 text-gold">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="t-ui text-fg">{step.title}</h3>
                      <p className="t-body mt-1.5 max-w-xl text-fg-muted">{step.body}</p>
                    </div>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------------- Limits */}
        <section aria-labelledby="limits-heading" className="container-page py-20 md:py-28">
          <Reveal>
            <SectionHeader
              eyebrow="Where it stops"
              title="What NyayaAI will not do"
              standfirst="Stated up front, because a legal tool that overstates itself is worse than no tool."
            />
          </Reveal>

          <ul className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
            {LIMITS.map((limit, index) => (
              <Reveal
                as="li"
                key={limit.title}
                delay={index * 0.06}
                className="h-full border-t border-line pt-5"
              >
                <h3 className="t-ui text-fg">{limit.title}</h3>
                <p className="t-body mt-1.5 text-fg-subtle">{limit.body}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* -------------------------------------------------------------------- CTA */}
        <section className="border-t border-line bg-ink-2">
          <div className="container-page py-18 md:py-20">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                {/* The lone icon above the heading read as an orphan at this
                    scale; the heading carries the section on its own. */}
                <h2 className="t-h1 lum-heading">Start with the section you have</h2>
                <p className="t-lead mx-auto mt-4 max-w-lg">
                  A number from an FIR, a phrase from a notice, or a plain question about what the
                  law now says.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    to="/chat"
                    className={buttonClass({ variant: 'primary', size: 'lg', className: 'group' })}
                  >
                    Ask a question
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                  <Link to="/mapping" className={buttonClass({ variant: 'secondary', size: 'lg' })}>
                    Look up a section
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ----------------------------------------------------------------- Footer */}
      <footer className="border-t border-line">
        <div className="container-page py-12">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              {/* The emblem lockup, not the full light-ground artwork: at footer
                  scale that plate became a bright rectangle dominating an
                  otherwise dark band. Same asset, cropped to the emblem, paired
                  with live type — consistent with the header. */}
              <BrandLockup to="/" size="lg" showTagline />
              <p className="t-sm mt-5 text-fg-subtle">
                A reading aid for Indian criminal law, built around the shift from the Indian Penal
                Code to the Bharatiya Nyaya Sanhita.
              </p>
            </div>

            <nav aria-label="Footer" className="flex gap-16">
              <div>
                <h2 className="t-label text-fg-subtle">Product</h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  <li>
                    <Link to="/chat" className="t-sm link-quiet">
                      Ask a question
                    </Link>
                  </li>
                  <li>
                    <Link to="/mapping" className="t-sm link-quiet">
                      IPC → BNS lookup
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h2 className="t-label text-fg-subtle">Account</h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  <li>
                    <Link to="/login" className="t-sm link-quiet">
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="t-sm link-quiet">
                      Create an account
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="t-xs text-fg-subtle">
              © {new Date().getFullYear()} NyayaAI · Educational information, not legal advice
            </p>
            <p className="t-xs text-fg-subtle">Made in India</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
