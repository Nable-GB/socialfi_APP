import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Music, Zap, Shield, Star, Users, Target, Coins, ArrowRight,
  Play, Headphones, Radio, Gem, Rocket, Globe, UserPlus, Share2, Crown,
} from "lucide-react";
import { useLang, type Lang } from "../contexts/LangContext";
import { PRODUCT_PHASES, type ProductPhaseStatus } from "../lib/productAlignment";

// ─── Animated SVG Background ─────────────────────────────────────────────────

function SpectrumBackground() {
  const bars = Array.from({ length: 48 }, (_, i) => i);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="specGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {bars.map((i) => {
          const x = (i / bars.length) * 100;
          const delay = i * 0.12;
          const baseHeight = 15 + Math.sin(i * 0.5) * 10;
          return (
            <motion.rect
              key={i}
              x={`${x}%`}
              y="70%"
              width={`${100 / bars.length - 0.3}%`}
              rx="2"
              fill="url(#specGrad)"
              initial={{ height: `${baseHeight}%` }}
              animate={{
                height: [
                  `${baseHeight}%`,
                  `${baseHeight + 12 + Math.random() * 10}%`,
                  `${baseHeight - 4}%`,
                  `${baseHeight + 6 + Math.random() * 8}%`,
                  `${baseHeight}%`,
                ],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay,
              }}
            />
          );
        })}
      </svg>

      {/* Floating orbs */}
      {[
        { cx: "15%", cy: "25%", r: 180, color: "#8b5cf6", delay: 0 },
        { cx: "80%", cy: "35%", r: 220, color: "#06b6d4", delay: 1.5 },
        { cx: "50%", cy: "60%", r: 150, color: "#a855f7", delay: 3 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: orb.cx,
            top: orb.cy,
            width: orb.r,
            height: orb.r,
            background: `radial-gradient(circle, ${orb.color}18, transparent 70%)`,
            filter: "blur(60px)",
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -25, 15, -10, 0],
            scale: [1, 1.15, 0.95, 1.08, 1],
          }}
          transition={{
            duration: 12 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}

// ─── Animated SVG Connection Paths ───────────────────────────────────────────

function SectionConnector() {
  return (
    <div className="relative h-24 w-full flex items-center justify-center overflow-hidden">
      <svg width="100%" height="100" viewBox="0 0 800 100" preserveAspectRatio="none" className="opacity-40">
        <defs>
          <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0,50 C200,20 300,80 400,50 C500,20 600,80 800,50"
          stroke="url(#pathGrad)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
          viewport={{ once: true }}
        />
        <motion.path
          d="M0,50 C200,20 300,80 400,50 C500,20 600,80 800,50"
          stroke="#06b6d4"
          strokeWidth="2"
          fill="none"
          strokeDasharray="6 14"
          initial={{ strokeDashoffset: 200 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          opacity={0.5}
        />
        {/* Nodes */}
        {[100, 300, 500, 700].map((cx, i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={50 + (i % 2 === 0 ? -15 : 15)}
            r="4"
            fill="#8b5cf6"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
            viewport={{ once: true }}
          >
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
          </motion.circle>
        ))}
      </svg>
    </div>
  );
}

// ─── Animated Token Wireframe ────────────────────────────────────────────────

function TokenWireframe() {
  return (
    <motion.div
      className="relative w-40 h-40 mx-auto"
      animate={{ rotateY: 360 }}
      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      style={{ perspective: 600 }}
    >
      <svg viewBox="0 0 160 160" className="w-full h-full">
        <defs>
          <linearGradient id="tokenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {/* Outer ring */}
        <motion.circle
          cx="80" cy="80" r="70"
          fill="none" stroke="url(#tokenGrad)" strokeWidth="2"
          strokeDasharray="8 4"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "80px 80px" }}
        />
        {/* Inner ring */}
        <motion.circle
          cx="80" cy="80" r="50"
          fill="none" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6"
          strokeDasharray="4 8"
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "80px 80px" }}
        />
        {/* Core */}
        <circle cx="80" cy="80" r="30" fill="url(#tokenGrad)" opacity="0.15" />
        <circle cx="80" cy="80" r="20" fill="url(#tokenGrad)" opacity="0.25" />
        {/* S letter */}
        <text x="80" y="87" textAnchor="middle" fill="url(#tokenGrad)" fontSize="28" fontWeight="bold" fontFamily="inherit">
          S
        </text>
        {/* Sparkle dots */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const cx = 80 + Math.cos(rad) * 62;
          const cy = 80 + Math.sin(rad) * 62;
          return (
            <motion.circle
              key={i}
              cx={cx} cy={cy} r="2.5"
              fill="#06b6d4"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
          );
        })}
      </svg>
    </motion.div>
  );
}

// ─── Reusable Animated Section Wrapper ───────────────────────────────────────

function AnimatedSection({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}

// ─── Feature Card ────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, title, description, index }: {
  icon: typeof Music;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <motion.div
      className="group relative rounded-2xl p-6 border border-slate-700/30 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-cyan-500/40"
      style={{ background: "rgba(15,23,42,0.6)" }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
    >
      {/* Glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(6,182,212,0.08), transparent 70%)" }} />

      {/* Pulse play button on hover */}
      <motion.div
        className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Play size={12} className="text-cyan-400 ml-0.5" />
      </motion.div>

      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))", border: "1px solid rgba(6,182,212,0.2)" }}>
          <Icon size={22} className="text-cyan-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ─── Roadmap Item ────────────────────────────────────────────────────────────

function RoadmapItem({ phase, title, description, status, icon: Icon, index, isLast }: {
  phase: string;
  title: string;
  description: string;
  status: string;
  icon: typeof Rocket;
  index: number;
  isLast: boolean;
}) {
  return (
    <motion.div
      className="relative flex gap-6"
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.2 }}
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <motion.div
          className="w-12 h-12 rounded-full flex items-center justify-center z-10"
          style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", boxShadow: "0 0 25px rgba(6,182,212,0.3)" }}
          whileInView={{ scale: [0, 1.2, 1] }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.2 + 0.2 }}
        >
          <Icon size={20} className="text-white" />
        </motion.div>
        {!isLast && (
          <motion.div
            className="w-0.5 flex-1 mt-2"
            style={{ background: "linear-gradient(to bottom, #8b5cf6, transparent)", transformOrigin: "top" }}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.2 + 0.4 }}
          />
        )}
      </div>

      {/* Content */}
      <div className="pb-12">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 block">{phase}</span>
          <span className="rounded-full border border-slate-700/25 bg-slate-900/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">{status}</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed max-w-lg">{description}</p>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN LANDING PAGE COMPONENT ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function SocialMusicFiLanding({ onLaunchApp, onApplyArtist }: { onLaunchApp?: () => void; onApplyArtist?: () => void }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const { t, lang, setLang } = useLang();
  const lp = t.landing;

  const features = [
    { icon: Coins, title: lp.feat1Title, description: lp.feat1Desc },
    { icon: Shield, title: lp.feat2Title, description: lp.feat2Desc },
    { icon: Target, title: lp.feat3Title, description: lp.feat3Desc },
    { icon: Star, title: lp.feat4Title, description: lp.feat4Desc },
    { icon: Users, title: lp.feat5Title, description: lp.feat5Desc },
  ];

  const roadmap = [
    ...PRODUCT_PHASES.map((phase) => {
      const iconMap = {
        gem: Gem,
        trophy: Crown,
        globe: Globe,
        coins: Coins,
      } as const;

      const statusMap: Record<ProductPhaseStatus, string> = {
        live: lp.statusLive,
        rolling: lp.statusRolling,
        planned: lp.statusPlanned,
        later: lp.statusLater,
      };

      return {
        phase: lp[phase.id as keyof typeof lp] as string,
        title: lp[`${phase.id}Title` as keyof typeof lp] as string,
        description: lp[`${phase.id}Desc` as keyof typeof lp] as string,
        status: statusMap[phase.status],
        icon: iconMap[phase.icon],
      };
    }),
  ];

  const incentivePlan = [
    { icon: UserPlus, title: lp.planJoinTitle, description: lp.planJoinDesc },
    { icon: Users, title: lp.planReferTitle, description: lp.planReferDesc },
    { icon: Share2, title: lp.planShareTitle, description: lp.planShareDesc },
    { icon: Crown, title: lp.planMemberTitle, description: lp.planMemberDesc },
  ];

  const policyRules = [
    lp.planRule1,
    lp.planRule2,
    lp.planRule3,
    lp.planRule4,
  ];

  const memberBenefits = [
    {
      label: lp.planProLabel,
      description: lp.planProDesc,
      border: "rgba(34,211,238,0.25)",
      background: "rgba(34,211,238,0.08)",
      color: "#22d3ee",
    },
    {
      label: lp.planPremiumLabel,
      description: lp.planPremiumDesc,
      border: "rgba(168,85,247,0.28)",
      background: "rgba(168,85,247,0.08)",
      color: "#c084fc",
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#0a0e1a] text-white overflow-hidden">

      {/* ────────────────── STICKY NAV ────────────────── */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-slate-700/20"
        style={{ background: "rgba(10,14,26,0.75)" }}
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0"
              style={{ boxShadow: '0 0 12px rgba(34,211,238,0.4)' }}>
              <img src="/smfi-logo.jpeg" alt="SMFI" className="w-full h-full object-cover" />
            </div>
            <span className="hidden sm:flex flex-col leading-none">
              <span className="font-extrabold text-sm tracking-tight shimmer-text">SMFI</span>
              <span className="text-[9px] text-slate-400 font-medium tracking-wide">Social Music Fi</span>
            </span>
          </div>

          {/* Nav links — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-6 text-xs text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">{lp.navFeatures}</a>
            <a href="#incentives" className="hover:text-white transition-colors">{lp.navIncentives}</a>
            <a href="#ecosystem" className="hover:text-white transition-colors">{lp.navEcosystem}</a>
            <a href="#roadmap" className="hover:text-white transition-colors">{lp.navRoadmap}</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 border border-slate-700/40 rounded-lg overflow-hidden">
              {(["en", "ko"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 text-[10px] font-bold uppercase transition-all ${
                    lang === l
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {l === "en" ? "EN" : "한"}
                </button>
              ))}
            </div>
            <button
              onClick={onApplyArtist}
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors hidden sm:block"
            >
              {lp.signIn}
            </button>
            <motion.button
              onClick={onLaunchApp}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              {lp.launchApp}
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ────────────────── HERO SECTION ────────────────── */}
      <div ref={heroRef} className="relative min-h-screen flex items-center justify-center">
        <SpectrumBackground />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a]/40 via-transparent to-[#0a0e1a] z-[1]" />

        <motion.div
          className="relative z-10 max-w-4xl mx-auto px-6 text-center"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-xs font-medium text-cyan-400 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Radio size={12} />
            <span>{lp.badge}</span>
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient_6s_linear_infinite]">
              {lp.heroTitle1}
            </span>
            <br />
            <span className="text-white">
              {lp.heroTitle2}
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            {lp.heroSub1} <span className="text-cyan-400 font-semibold">Social Music Fi</span>{lp.heroSub2}{" "}
            <em className="text-purple-400">{lp.heroSub3}</em> {lp.heroSub4}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
          >
            <motion.button
              onClick={onLaunchApp}
              className="group relative px-8 py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden"
              style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center gap-2">
                <Headphones size={16} />
                {lp.launchApp}
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
              {/* Glow */}
              <span className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg"
                style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }} />
            </motion.button>

            <motion.button
              onClick={onApplyArtist}
              className="group px-8 py-3.5 rounded-xl font-bold text-sm border border-slate-600/50 text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all duration-300"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="flex items-center gap-2">
                <Music size={16} />
                {lp.applyArtist}
              </span>
            </motion.button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-6 h-10 rounded-full border-2 border-slate-600/50 flex items-start justify-center p-1.5">
              <motion.div
                className="w-1 h-2.5 rounded-full bg-cyan-400"
                animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ────────────────── VISION SECTION ────────────────── */}
      <SectionConnector />

      <AnimatedSection className="relative py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Zap size={12} /> {lp.visionLabel}
          </motion.div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
            {lp.visionTitle1}{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              {lp.visionTitle2}
            </span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            {lp.visionText1}{" "}
            <span className="text-cyan-400 font-medium">{lp.visionHighlight1}</span>
            {lp.visionText2}{" "}
            <span className="text-purple-400 font-medium">{lp.visionHighlight2}</span>.
          </p>
        </div>
      </AnimatedSection>

      {/* ────────────────── FEATURES SECTION ────────────────── */}
      <SectionConnector />

      <AnimatedSection className="relative py-20 px-6" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <Star size={12} /> {lp.featuresLabel}
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              {lp.featuresTitle1}{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {lp.featuresTitle2}
              </span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              {lp.featuresSub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} index={i} />
            ))}
          </div>
        </div>
      </AnimatedSection>

      <SectionConnector />

      <AnimatedSection className="relative py-20 px-6" id="incentives">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <Zap size={12} /> {lp.planLabel}
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              {lp.planTitle1}{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {lp.planTitle2}
              </span>
            </h2>
            <p className="text-slate-400 max-w-3xl mx-auto leading-relaxed">
              {lp.planSub}
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-6 items-start">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {incentivePlan.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    className="rounded-2xl p-6 border border-slate-700/30 backdrop-blur-sm"
                    style={{ background: "rgba(15,23,42,0.65)" }}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    whileHover={{ y: -4, borderColor: "rgba(6,182,212,0.35)" }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))", border: "1px solid rgba(6,182,212,0.2)" }}>
                      <Icon size={22} className="text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              className="rounded-3xl p-6 border border-purple-500/20"
              style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.82))" }}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-4">
                <Shield size={12} /> {lp.planPolicyLabel}
              </div>
              <h3 className="text-2xl font-extrabold text-white leading-tight mb-3">{lp.planPolicyTitle}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{lp.planPolicySub}</p>

              <div className="space-y-3 mt-6">
                {policyRules.map((rule, index) => (
                  <div key={rule} className="flex items-start gap-3 rounded-2xl border border-slate-700/30 px-4 py-3"
                    style={{ background: "rgba(15,23,42,0.5)" }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mt-6">
                {memberBenefits.map((benefit) => (
                  <div key={benefit.label} className="rounded-2xl p-4 border"
                    style={{ borderColor: benefit.border, background: benefit.background }}>
                    <p className="text-sm font-bold mb-1" style={{ color: benefit.color }}>{benefit.label}</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* ────────────────── ECOSYSTEM & ECONOMY ────────────────── */}
      <SectionConnector />

      <AnimatedSection className="relative py-20 px-6" id="ecosystem">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <motion.div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-6"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <Coins size={12} /> {lp.ecoLabel}
              </motion.div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
                {lp.ecoTitle1}{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {lp.ecoTitle2}
                </span>
              </h2>
              <div className="space-y-4 text-slate-400 text-sm leading-relaxed">
                <p>{lp.ecoText1}</p>
                <p>
                  {lp.ecoText2}{" "}
                  <span className="font-bold text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text">
                    SMFI Points
                  </span>
                  {lp.ecoText2b}
                </p>
                <p>{lp.ecoText3}</p>
              </div>

              {/* Token badges */}
              <div className="flex flex-wrap gap-3 mt-6">
                {[
                  { label: lp.ecoBadge1, sub: lp.ecoBadge1Sub },
                  { label: lp.ecoBadge2, sub: lp.ecoBadge2Sub },
                  { label: lp.ecoBadge3, sub: lp.ecoBadge3Sub },
                ].map((badge, i) => (
                  <motion.div
                    key={i}
                    className="px-4 py-2 rounded-xl border border-slate-700/40"
                    style={{ background: "rgba(15,23,42,0.7)" }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ borderColor: "rgba(6,182,212,0.4)" }}
                  >
                    <p className="text-sm font-bold text-white">{badge.label}</p>
                    <p className="text-[10px] text-slate-500">{badge.sub}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Animated Token */}
            <div className="flex items-center justify-center">
              <TokenWireframe />
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ────────────────── ROADMAP SECTION ────────────────── */}
      <SectionConnector />

      <AnimatedSection className="relative py-20 px-6" id="roadmap">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <Rocket size={12} /> {lp.roadmapLabel}
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              {lp.roadmapTitle1}{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {lp.roadmapTitle2}
              </span>
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              {lp.roadmapSub}
            </p>
          </div>

          <div className="pl-2">
            {roadmap.map((item, i) => (
              <RoadmapItem key={i} {...item} index={i} isLast={i === roadmap.length - 1} />
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-amber-500/15 bg-amber-500/[0.06] p-5 text-sm leading-7 text-slate-300">
            <div className="font-semibold uppercase tracking-[0.18em] text-amber-200">{lp.roadmapRuleLabel}</div>
            <div className="mt-2">{lp.roadmapRuleBody}</div>
          </div>
        </div>
      </AnimatedSection>

      {/* ────────────────── FOOTER CTA ────────────────── */}
      <AnimatedSection className="relative py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            className="rounded-3xl p-10 border border-slate-700/30 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.05), rgba(139,92,246,0.05))" }}
            whileHover={{ borderColor: "rgba(6,182,212,0.3)" }}
          >
            {/* Background glow */}
            <div className="absolute inset-0 opacity-30"
              style={{ background: "radial-gradient(circle at 50% 50%, rgba(6,182,212,0.1), transparent 70%)" }} />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                {lp.ctaTitle1}{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {lp.ctaTitle2}
                </span>
                ?
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                {lp.ctaSub}
              </p>
              <motion.button
                onClick={onLaunchApp}
                className="group relative inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-white overflow-hidden"
                style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
              >
                <Headphones size={18} />
                {lp.ctaBtn}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                <span className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                  style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }} />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ────────────────── GRADIENT KEYFRAMES (inline) ────────────────── */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}

export default SocialMusicFiLanding;
