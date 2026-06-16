import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  BookOpenText,
  BrainCircuit,
  FileSearch,
  Landmark,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import logo from '../assets/nyayaai-logo.svg';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: 'easeOut', delay },
  }),
};

const floatingCards = [
  { title: 'IPC Section 302', text: 'Punishment for murder', className: 'left-[-3.5rem] top-[8%]' },
  { title: 'BNS Mapping', text: 'Mapped to Section 101', className: 'right-[-2.5rem] top-[16%]' },
  { title: 'FIR Guidance', text: 'Step-by-step procedure help', className: 'left-[-1rem] bottom-[16%]' },
  { title: 'AI Legal Assistant', text: 'Plain language legal answers', className: 'right-[-3rem] bottom-[10%]' },
];

const trustBadges = [
  'Based on IPC & BNS',
  'AI-Powered Legal Search',
  'Plain Language Explanations',
  'Educational Legal Assistant',
];

const stats = [
  { value: 511, suffix: '+', label: 'Verified section mappings', icon: Landmark },
  { value: 3, suffix: '', label: 'Core legal workflows', icon: Workflow },
  { value: 3, prefix: '~', suffix: 's', label: 'Average response time', icon: Sparkles },
];

const features = [
  {
    icon: Scale,
    eyebrow: 'Precision mapping',
    title: 'Move from IPC to BNS without the confusion.',
    desc: 'Search sections, compare provisions, and understand modern equivalents through a cleaner legal-tech workflow.',
    accent: 'from-[#192540] to-[#11192c]',
    layout: 'lg:col-span-2',
  },
  {
    icon: Bot,
    eyebrow: 'AI assistant',
    title: 'Ask legal questions naturally.',
    desc: 'Get concise, grounded explanations instead of intimidating legal prose.',
    accent: 'from-[#151f35] to-[#0d1526]',
    layout: '',
  },
  {
    icon: FileSearch,
    eyebrow: 'Procedure clarity',
    title: 'Understand FIR steps and criminal procedure.',
    desc: 'Turn procedural uncertainty into clear next steps with guided explanations.',
    accent: 'from-[#121d33] to-[#101929]',
    layout: '',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Trust and grounding',
    title: 'Source-linked answers built for credibility.',
    desc: 'Every response can point back to the legal basis so users stay oriented and confident.',
    accent: 'from-[#192540] to-[#11192c]',
    layout: 'lg:col-span-2',
  },
];

const steps = [
  {
    title: 'Select IPC or BNS section',
    desc: 'Start from the legal code you already know and instantly find the related law.',
    icon: BookOpenText,
  },
  {
    title: 'Ask your question',
    desc: 'Use simple natural language instead of searching through legal databases manually.',
    icon: Search,
  },
  {
    title: 'AI analysis',
    desc: 'NyayaAI analyzes the law, relevant mapping, and procedural context in seconds.',
    icon: BrainCircuit,
  },
  {
    title: 'Get a simplified explanation',
    desc: 'Receive a readable, structured legal answer that is easier to act on.',
    icon: Sparkles,
  },
];

const particles = [
  { left: '6%', top: '10%', size: 5, delay: 0 },
  { left: '12%', top: '24%', size: 4, delay: 1.2 },
  { left: '20%', top: '72%', size: 6, delay: 2.4 },
  { left: '28%', top: '42%', size: 3, delay: 0.8 },
  { left: '36%', top: '18%', size: 4, delay: 1.8 },
  { left: '48%', top: '82%', size: 5, delay: 2.1 },
  { left: '58%', top: '12%', size: 6, delay: 0.6 },
  { left: '68%', top: '62%', size: 4, delay: 1.4 },
  { left: '77%', top: '28%', size: 5, delay: 2.8 },
  { left: '84%', top: '76%', size: 3, delay: 0.9 },
  { left: '90%', top: '16%', size: 4, delay: 2.2 },
  { left: '94%', top: '52%', size: 5, delay: 1.1 },
];

function CountUpStat({ value, prefix = '', suffix = '', label, icon: Icon }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;

    const durationMs = 1200;
    const stepMs = 16;
    const stepsCount = Math.max(1, Math.round(durationMs / stepMs));
    let currentStep = 0;

    const timer = window.setInterval(() => {
      currentStep += 1;
      const progress = currentStep / stepsCount;
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(Math.round(value * eased));

      if (currentStep >= stepsCount) {
        window.clearInterval(timer);
        setDisplayValue(value);
      }
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [inView, value]);

  return (
    <motion.div
      ref={ref}
      className="premium-card group p-6"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="icon-chip">
          <Icon className="h-5 w-5 text-gold" />
        </div>
        <div className="text-right text-gold/40">0{Math.min(value, 9)}</div>
      </div>
      <div className="mt-8 font-heading text-5xl leading-none text-text-primary">
        <span className="text-gold">{prefix}</span>
        {displayValue}
        <span className="text-gold">{suffix}</span>
      </div>
      <p className="mt-3 max-w-[18ch] text-sm leading-6 text-muted-blue">{label}</p>
    </motion.div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-navy text-text-primary">
      <div className="page-aura" />
      <div className="particle-field" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={`${particle.left}-${particle.top}`}
            className="particle-dot"
            style={{
              left: particle.left,
              top: particle.top,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      <Navbar />

      <main className="relative overflow-hidden">
        <section className="px-4 pb-18 pt-32 md:px-6 lg:px-8 lg:pb-24">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="relative z-10"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/8 px-4 py-2 text-sm text-gold shadow-[0_10px_30px_rgba(227,187,86,0.08)]">
                <Sparkles className="h-4 w-4" />
                Premium legal AI assistant
              </div>

              <div className="headline-glow mt-8">
                <p className="text-sm uppercase tracking-[0.34em] text-muted-blue">
                  Built for modern legal understanding
                </p>
                <h1 className="mt-5 max-w-3xl font-heading text-[3.8rem] font-semibold leading-[0.94] tracking-tight text-balance md:text-[5.2rem] lg:text-[6rem]">
                  Indian law, made clear and usable for real people.
                </h1>
              </div>

              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 md:text-[1.15rem]">
                NyayaAI helps users navigate IPC sections, BNS mappings, FIR procedures, and legal
                questions through a startup-grade product experience with grounded answers and plain
                language explanations.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link to="/chat" className="primary-cta">
                  Start with NyayaAI
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/mapping" className="secondary-cta">
                  Browse sections
                  <BookOpenText className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {trustBadges.map((badge) => (
                  <div key={badge} className="trust-pill">
                    <ShieldCheck className="h-4 w-4 text-gold" />
                    {badge}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="relative"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.15}
            >
              <div className="hero-mockup">
                <div className="hero-panel-glow" />

                {floatingCards.map((card, index) => (
                  <motion.div
                    key={card.title}
                    className={`floating-info-card hidden lg:block ${card.className}`}
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 5 + index * 0.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.3,
                    }}
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-gold/80">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{card.text}</p>
                  </motion.div>
                ))}

                <div className="dashboard-shell">
                  <div className="dashboard-topbar">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 overflow-hidden rounded-2xl border border-gold/20 bg-[#f6f0e1] p-1">
                        <img src={logo} alt="NyayaAI logo" className="h-full w-full rounded-xl object-cover" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">NyayaAI Legal Assistant</p>
                        <p className="text-sm text-muted-blue">Grounded answers for Indian law</p>
                      </div>
                    </div>
                    <div className="hidden rounded-full border border-gold/15 bg-gold/8 px-3 py-1 text-xs uppercase tracking-[0.24em] text-gold md:block">
                      Live workspace
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                    <div className="dashboard-chat-card">
                      <div className="chat-search-row">
                        <Search className="h-4 w-4 text-muted-blue" />
                        Explain IPC Section 302 and show the matching BNS provision
                      </div>

                      <div className="mt-4 rounded-[1.5rem] border border-gold/12 bg-card/90 p-4">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-gold">
                          <Scale className="h-3.5 w-3.5" />
                          AI response
                        </div>
                        <p className="text-sm leading-7 text-slate-100">
                          IPC Section 302 addresses punishment for murder. Under the Bharatiya Nyaya
                          Sanhita, the corresponding provision is Section 101, with aligned legal context
                          and procedural relevance.
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="glass-subcard">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-blue">Mapped section</p>
                            <p className="mt-2 font-heading text-2xl text-text-primary">BNS 101</p>
                          </div>
                          <div className="glass-subcard">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-blue">Answer mode</p>
                            <p className="mt-2 font-heading text-2xl text-text-primary">Plain language</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="glass-subcard">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-blue">Case assistant</p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">
                          Search sections, rights, and procedure without switching tools.
                        </p>
                      </div>
                      <div className="glass-subcard">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-blue">Source grounding</p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">
                          Linked to legal sections for higher trust and clearer interpretation.
                        </p>
                      </div>
                      <div className="glass-subcard">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-blue">Workflow fit</p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">
                          Designed for students, citizens, and researchers who need clarity fast.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-4 py-10 md:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              {stats.map((stat, index) => (
                <CountUpStat key={stat.label} {...stat} index={index} />
              ))}
            </motion.div>
          </div>
        </section>

        <section id="features" className="px-4 py-20 md:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mx-auto max-w-3xl text-center"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              <p className="text-sm uppercase tracking-[0.34em] text-gold/80">Features</p>
              <h2 className="mt-4 font-heading text-4xl font-semibold md:text-[3.6rem]">
                A legal-tech product that feels built like modern software
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Clear hierarchy, refined surfaces, and focused product modules make the platform feel
                like a premium AI startup rather than a project demo.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <motion.div
                    key={feature.title}
                    className={`feature-panel ${feature.layout}`}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    custom={index * 0.08}
                    whileHover={{ y: -6 }}
                  >
                    <div className={`feature-panel-inner bg-gradient-to-br ${feature.accent}`}>
                      <div className="icon-chip">
                        <Icon className="h-5 w-5 text-gold" />
                      </div>
                      <p className="mt-7 text-xs uppercase tracking-[0.28em] text-gold/75">{feature.eyebrow}</p>
                      <h3 className="mt-4 max-w-xl font-heading text-3xl text-text-primary md:text-[2.2rem]">
                        {feature.title}
                      </h3>
                      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{feature.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 md:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mx-auto max-w-3xl text-center"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              <p className="text-sm uppercase tracking-[0.34em] text-gold/80">How it works</p>
              <h2 className="mt-4 font-heading text-4xl font-semibold md:text-[3.4rem]">
                A simple workflow from legal section to useful explanation
              </h2>
            </motion.div>

            <div className="timeline-shell mt-14">
              <div className="timeline-line" />
              <div className="grid gap-6 lg:grid-cols-4">
                {steps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <motion.div
                      key={step.title}
                      className="timeline-card"
                      variants={fadeUp}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: '-80px' }}
                      custom={index * 0.08}
                      whileHover={{ y: -4 }}
                    >
                      <div className="timeline-dot-wrap">
                        <div className="timeline-dot" />
                      </div>
                      <div className="icon-chip mt-6">
                        <Icon className="h-5 w-5 text-gold" />
                      </div>
                      <p className="mt-6 text-sm uppercase tracking-[0.24em] text-gold/70">
                        Step {index + 1}
                      </p>
                      <h3 className="mt-3 font-heading text-3xl text-text-primary">{step.title}</h3>
                      <p className="mt-4 text-base leading-7 text-slate-300">{step.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/8 px-4 py-14 md:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-[1.4rem] border border-gold/25 bg-[#f6f0e1] p-1">
                <img src={logo} alt="NyayaAI footer logo" className="h-full w-full rounded-[1rem] object-cover" />
              </div>
              <div>
                <p className="font-heading text-2xl text-text-primary">
                  Nyaya<span className="text-gold">AI</span>
                </p>
                <p className="text-sm text-muted-blue">A premium legal-tech assistant for plain language law</p>
              </div>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm text-slate-300">Powered by Groq and Qdrant RAG</p>
              <p className="mt-2 text-xs text-muted-blue">For educational and informational use.</p>
              <p className="mt-1 text-xs text-muted-blue/70">© 2025 NyayaAI</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default Landing;
