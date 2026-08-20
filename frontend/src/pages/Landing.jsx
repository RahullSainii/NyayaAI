import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowRight, Bot, BookOpenText, BrainCircuit, FileSearch, Landmark, 
  Scale, Search, ShieldCheck, Sparkles, Workflow, ChevronRight, Star, 
  Users, Zap, ArrowUpRight, MessageSquare, Globe, Clock, CheckCircle2 
} from 'lucide-react';
import Navbar from '../components/Navbar';
import logo from '../assets/nyaya.jpeg';
import AetherHero from '../components/ui/aether-hero';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }
  })
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};

function CountUpStat({ end, label, suffix = '', duration = 2.5 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(easeProgress * end));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }
  }, [isInView, end, duration]);

  return (
    <div ref={ref} className="flex flex-col items-center justify-center p-8 premium-card rounded-2xl border border-line bg-surface-glass backdrop-blur-md relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="text-4xl md:text-5xl font-display font-bold text-gold mb-2 relative z-10 drop-shadow-md">
        {count}{suffix}
      </div>
      <div className="text-sm font-medium text-fg-muted uppercase tracking-wider relative z-10">{label}</div>
    </div>
  );
}

function SpotlightCard({ children, className }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const cardRef = useRef(null);
  
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  
  return (
    <div 
      ref={cardRef} 
      onMouseMove={handleMouseMove} 
      onMouseEnter={() => setHovering(true)} 
      onMouseLeave={() => setHovering(false)} 
      className={`relative overflow-hidden border border-line bg-surface-glass backdrop-blur-sm rounded-3xl ${className}`}
    >
      {hovering && (
        <div 
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300" 
          style={{ background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(212,166,78,0.06), transparent 40%)` }} 
          aria-hidden="true"
        />
      )}
      <div className="relative z-20 h-full">
        {children}
      </div>
    </div>
  );
}

const FloatingMockup = ({ mousePos }) => {
  return (
    <div 
      className="relative w-full max-w-lg mx-auto md:max-w-xl lg:max-w-2xl aspect-[4/3] perspective-1000"
      style={{
        transform: `rotateY(${mousePos.x * 5}deg) rotateX(${-mousePos.y * 5}deg) translateY(${mousePos.y * 10}px)`,
        transition: 'transform 0.1s ease-out'
      }}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-surface-glass-strong to-surface-2 border border-line shadow-2xl overflow-hidden backdrop-blur-xl group hover:border-gold/30 transition-colors duration-500">
        {/* Glow */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* Topbar */}
        <div className="h-12 border-b border-line flex items-center px-4 justify-between bg-surface-glass z-10 relative">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-line-2" />
            <div className="w-3 h-3 rounded-full bg-line-2" />
            <div className="w-3 h-3 rounded-full bg-line-2" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-surface rounded-md border border-line text-xs text-fg-muted font-mono">
            <ShieldCheck size={12} className="text-gold" /> Secure Connection
          </div>
        </div>

        {/* Content */}
        <div className="p-6 h-[calc(100%-3rem)] flex flex-col gap-4 relative z-0">
          <motion.div 
            animate={{ y: [0, -5, 0] }} 
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-3/4 p-4 rounded-lg bg-surface border border-line self-start shadow-sm flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-ink flex-shrink-0 flex items-center justify-center border border-line text-fg">U</div>
            <div>
              <div className="text-sm text-fg mb-1">What is the punishment for cyber terrorism under BNS?</div>
              <div className="text-xs text-fg-faint">Just now</div>
            </div>
          </motion.div>

          <motion.div 
            animate={{ y: [0, 5, 0] }} 
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
            className="w-4/5 p-4 rounded-lg bg-surface-glass-strong border border-gold/20 self-end shadow-lg flex items-start gap-3 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-gold" />
            <div className="w-8 h-8 rounded-full bg-gold/10 flex-shrink-0 flex items-center justify-center border border-gold/30 text-gold">
              <Bot size={16} />
            </div>
            <div>
              <div className="text-sm text-fg mb-2 leading-relaxed">
                Under the Bharatiya Nyaya Sanhita (BNS), 2023, cyber terrorism is covered under <strong>Section 113 (Terrorist Act)</strong>...
              </div>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-gold/10 text-gold border border-gold/20 font-mono">Sec 113 BNS</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-surface text-fg-muted border border-line flex items-center gap-1"><BookOpenText size={10}/> Sources</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Elements */}
      <motion.div 
        animate={{ y: [-10, 10, -10], rotate: [-2, 2, -2] }} 
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        className="absolute -right-6 top-1/4 p-3 bg-surface-glass border border-line rounded-lg shadow-xl backdrop-blur-md flex items-center gap-3 z-20 hidden md:flex"
      >
        <div className="w-10 h-10 rounded bg-gold/10 flex items-center justify-center text-gold">
          <Scale size={20} />
        </div>
        <div>
          <div className="text-xs font-bold text-fg">Verified Mapping</div>
          <div className="text-[10px] text-fg-muted">IPC to BNS Active</div>
        </div>
      </motion.div>
    </div>
  );
};


export default function Landing() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

  const handleHeroMouseMove = (e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 2 - 1;
    const y = (e.clientY - rect.top) / rect.height * 2 - 1;
    setMousePos({ x, y });
  };

  const headline = "Indian law, made clear and usable for real people.";
  const headlineWords = headline.split(" ");

  return (
    <div className="min-h-screen bg-ink text-fg font-body overflow-x-hidden selection:bg-gold/20 selection:text-gold-bright">
      <Navbar />

      {/* 1. CINEMATIC HERO SECTION */}
      <AetherHero height="auto" className="pt-20 lg:pt-32 pb-10">
        <div 
          ref={heroRef}
          onMouseMove={handleHeroMouseMove}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full"
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left Column: Copy */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="flex flex-col items-start text-left"
            >
              <motion.div variants={fadeUp} custom={0}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/50 border border-gold/20 text-gold text-sm font-medium backdrop-blur-md mb-6 shadow-[0_0_15px_rgba(212,166,78,0.1)]">
                  <Sparkles size={14} />
                  AI-powered legal intelligence
                </div>
              </motion.div>
              
              <motion.div variants={fadeUp} custom={0.1} className="section-number text-gold mb-4 text-sm font-mono uppercase tracking-widest">
                01 — Built for modern legal understanding
              </motion.div>

              <h1 className="display-hero text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.1] tracking-tight text-fg mb-6">
                {headlineWords.map((word, i) => (
                  <React.Fragment key={i}>
                    <motion.span
                      custom={0.2 + (i * 0.05)}
                      variants={fadeUp}
                      className="inline-block"
                    >
                      {word}
                    </motion.span>
                    {i !== headlineWords.length - 1 && " "}
                  </React.Fragment>
                ))}
              </h1>

              <motion.p variants={fadeUp} custom={0.6} className="body-lg text-lg md:text-xl text-fg-muted max-w-2xl mb-8 leading-relaxed">
                Navigate the complexities of the Bharatiya Nyaya Sanhita (BNS) and IPC with AI designed specifically for Indian jurisprudence. Fast, accurate, and transparent.
              </motion.p>

              <motion.div variants={fadeUp} custom={0.7} className="flex flex-wrap gap-4 mb-10">
                <Link to="/chat" className="primary-cta group relative overflow-hidden bg-gold text-ink px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-gold-bright transition-all shadow-[0_0_20px_rgba(212,166,78,0.3)] hover:shadow-[0_0_30px_rgba(212,166,78,0.5)]">
                  <span className="relative z-10 flex items-center gap-2">
                    Start with NyayaAI <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                <Link to="/map" className="secondary-cta px-6 py-3 rounded-lg font-semibold text-fg bg-surface border border-line flex items-center gap-2 hover:bg-surface-2 transition-colors">
                  Browse sections
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} custom={0.8} className="flex items-center gap-4 text-sm text-fg-subtle border-t border-line/50 pt-6 w-full max-w-md">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-surface-2 border-2 border-ink flex items-center justify-center text-xs font-bold text-fg z-30">P</div>
                  <div className="w-8 h-8 rounded-full bg-gold/20 border-2 border-ink flex items-center justify-center text-xs font-bold text-gold z-20">L</div>
                  <div className="w-8 h-8 rounded-full bg-surface-2 border-2 border-ink flex items-center justify-center text-xs font-bold text-fg z-10"><Users size={12}/></div>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-fg">Trusted by professionals</span>
                  <span>511+ sections mapped • ~3s avg response</span>
                </div>
              </motion.div>

            </motion.div>

            {/* Right Column: Mockup */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative lg:h-full flex items-center justify-center mt-12 lg:mt-0"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-gold/5 via-transparent to-surface-2/20 rounded-[2rem] transform -rotate-3 scale-105 blur-xl -z-10" />
              <FloatingMockup mousePos={mousePos} />
            </motion.div>

          </div>
        </div>
      </AetherHero>

      {/* 2. STATS SECTION */}
      <section className="py-12 border-y border-line bg-surface/30 relative z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-line">
            <CountUpStat end={511} suffix="+" label="Verified Mappings" duration={2} />
            <CountUpStat end={3} label="Core Workflows" duration={2} />
            <CountUpStat end={3} suffix="s" label="Avg Response Time" duration={2.5} />
          </div>
        </div>
      </section>

      {/* 3. BENTO GRID FEATURES SECTION */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="display-lg text-3xl md:text-4xl font-display font-bold text-fg mb-4">Intelligence built for the legal landscape</h2>
            <p className="body-lg text-fg-muted text-lg">We combine advanced language models with verified legal mapping to deliver actionable insights.</p>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(280px,auto)]"
          >
            {/* Bento 1: Large (2 col) */}
            <motion.div variants={fadeUp} custom={0.1} className="md:col-span-2 h-full">
              <SpotlightCard className="p-8 md:p-10 h-full flex flex-col justify-between group">
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-xl bg-surface border border-line flex items-center justify-center text-gold mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                    <Workflow size={24} />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-fg mb-3">Cross-Code Mapping Engine</h3>
                  <p className="text-fg-muted leading-relaxed max-w-md">Seamlessly translate sections between the old Indian Penal Code (IPC) and the new Bharatiya Nyaya Sanhita (BNS) with verified precision.</p>
                </div>
                <div className="relative mt-auto w-full max-w-sm rounded-lg border border-line/50 bg-surface/50 p-4 backdrop-blur-sm overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 blur-2xl rounded-full" />
                  <div className="flex items-center justify-between text-sm mb-2 relative z-10">
                    <span className="text-fg font-medium">IPC Sec 420</span>
                    <ArrowRight size={14} className="text-gold" />
                    <span className="text-gold font-medium">BNS Sec 318(4)</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden relative z-10">
                    <motion.div 
                      initial={{ width: "0%" }}
                      whileInView={{ width: "100%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                      className="h-full bg-gold"
                    />
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>

            {/* Bento 2: Small */}
            <motion.div variants={fadeUp} custom={0.2} className="md:col-span-1 h-full">
              <SpotlightCard className="p-8 h-full flex flex-col justify-start group">
                <div className="w-12 h-12 rounded-xl bg-surface border border-line flex items-center justify-center text-gold mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                  <BrainCircuit size={24} />
                </div>
                <h3 className="text-xl font-display font-bold text-fg mb-3">Contextual AI</h3>
                <p className="text-fg-muted leading-relaxed text-sm">Understands the nuance of your legal queries. It doesn't just search keywords; it comprehends the legal intent.</p>
                <div className="mt-8 flex justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                  <BrainCircuit size={80} className="text-line-2" strokeWidth={1} />
                </div>
              </SpotlightCard>
            </motion.div>

            {/* Bento 3: Small */}
            <motion.div variants={fadeUp} custom={0.3} className="md:col-span-1 h-full">
              <SpotlightCard className="p-8 h-full flex flex-col justify-start group">
                <div className="w-12 h-12 rounded-xl bg-surface border border-line flex items-center justify-center text-gold mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-xl font-display font-bold text-fg mb-3">Privacy First</h3>
                <p className="text-fg-muted leading-relaxed text-sm">Your queries are processed securely. We don't use your specific case details to train our models without consent.</p>
                <div className="mt-8 flex justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                  <ShieldCheck size={80} className="text-line-2" strokeWidth={1} />
                </div>
              </SpotlightCard>
            </motion.div>

            {/* Bento 4: Large (2 col) */}
            <motion.div variants={fadeUp} custom={0.4} className="md:col-span-2 h-full">
              <SpotlightCard className="p-8 md:p-10 h-full flex flex-col md:flex-row gap-8 items-center group">
                <div className="flex-1">
                  <div className="w-12 h-12 rounded-xl bg-surface border border-line flex items-center justify-center text-gold mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                    <FileSearch size={24} />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-fg mb-3">Source-Linked Explanations</h3>
                  <p className="text-fg-muted leading-relaxed">Every insight is backed by direct references to the text of the law. Verify answers instantly with built-in citations.</p>
                </div>
                <div className="flex-1 w-full bg-surface-2/50 rounded-xl p-5 border border-line relative overflow-hidden group-hover:border-gold/30 transition-colors">
                  <div className="flex flex-col gap-3">
                    <div className="h-4 w-3/4 bg-line-2 rounded animate-pulse" />
                    <div className="h-4 w-full bg-line-2 rounded animate-pulse" style={{ animationDelay: "150ms" }} />
                    <div className="h-4 w-5/6 bg-line-2 rounded animate-pulse" style={{ animationDelay: "300ms" }} />
                    <div className="mt-4 flex gap-2">
                      <div className="px-2 py-1 bg-surface border border-line rounded text-xs text-gold flex items-center gap-1">
                        <CheckCircle2 size={10} /> Verified Source
                      </div>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 4. HOW IT WORKS TIMELINE */}
      <section className="py-24 bg-surface border-y border-line overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="display-lg text-3xl md:text-4xl font-display font-bold text-fg mb-4">How NyayaAI Works</h2>
            <p className="body-lg text-fg-muted text-lg max-w-2xl mx-auto">A streamlined workflow designed to get you accurate legal insights in seconds, not hours.</p>
          </div>

          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden lg:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-line -translate-y-1/2 z-0" />
            <motion.div 
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="hidden lg:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-gold/20 via-gold to-gold/20 -translate-y-1/2 z-0 origin-left"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
              {[
                { step: "01", title: "Ask", desc: "Type your query in plain language, describing the legal scenario or specific section.", icon: MessageSquare },
                { step: "02", title: "Analyze", desc: "Our engine maps your query against the BNS, IPC, and relevant procedures.", icon: BrainCircuit },
                { step: "03", title: "Translate", desc: "Complex legal jargon is broken down into clear, understandable insights.", icon: ({ size, className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg> },
                { step: "04", title: "Apply", desc: "Use the cited sources and structured answers to inform your next steps.", icon: Landmark }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.2 }}
                  className="flex flex-col items-center text-center group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-ink border border-line flex items-center justify-center mb-6 relative group-hover:-translate-y-2 transition-transform duration-300 shadow-lg group-hover:shadow-gold/20 group-hover:border-gold/50 z-10">
                    <item.icon size={28} className="text-gold" />
                    <div className="absolute -bottom-3 -right-3 w-8 h-8 rounded-full bg-surface border border-line flex items-center justify-center text-xs font-mono text-fg-muted font-bold z-20">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-fg mb-2">{item.title}</h3>
                  <p className="text-sm text-fg-muted px-4">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. TRUST / MARQUEE SECTION */}
      <section className="py-12 border-b border-line bg-ink overflow-hidden flex items-center">
        <div className="flex w-[200%] md:w-max animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-12 px-6">
              {[
                "Based on IPC & BNS", "AI-Powered Analysis", "Plain Language Output", 
                "Educational Focus", "Source-Linked Data", "Verified Mappings"
              ].map((text, j) => (
                <div key={j} className="flex items-center gap-3 text-fg-muted font-medium text-lg">
                  <Star size={16} className="text-gold/50" /> {text}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* 6. CTA SECTION */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface/50 z-0 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <SpotlightCard className="p-10 md:p-16 text-center border-gold/30 shadow-[0_0_50px_rgba(212,166,78,0.1)]">
            <h2 className="display-lg text-4xl md:text-5xl font-display font-bold text-fg mb-6">Ready to understand Indian law?</h2>
            <p className="body-lg text-lg text-fg-muted max-w-2xl mx-auto mb-12">
              Join professionals, students, and citizens who are using NyayaAI to decode legal complexities effortlessly.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/chat" className="primary-cta group relative overflow-hidden bg-gold text-ink px-8 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gold-bright transition-all">
                Start Exploring Now <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-ink border-t border-line relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <img src={logo} alt="NyayaAI Logo" className="h-8 w-auto" />
                <span className="text-xl font-display font-bold text-fg">NyayaAI</span>
              </Link>
              <p className="text-sm text-fg-muted leading-relaxed mb-8">
                Bridging the gap between complex Indian jurisprudence and clear understanding.
              </p>
            </div>
            
            <div>
              <h4 className="text-fg font-semibold mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-fg-muted">
                <li><Link to="/chat" className="hover:text-gold transition-colors">AI Assistant</Link></li>
                <li><Link to="/map" className="hover:text-gold transition-colors">IPC-BNS Map</Link></li>
                <li><Link to="/pricing" className="hover:text-gold transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-fg font-semibold mb-6">Resources</h4>
              <ul className="space-y-4 text-sm text-fg-muted">
                <li><a href="#" className="hover:text-gold transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Legal Blog</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">API Access</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-fg font-semibold mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-fg-muted">
                <li><a href="#" className="hover:text-gold transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Disclaimer</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-line pt-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-fg-faint">
            <p>&copy; {new Date().getFullYear()} NyayaAI. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <Globe size={14} /> Made in India
            </div>
          </div>
        </div>
      </footer>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-20px); }
        }
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}} />
    </div>
  );
}
