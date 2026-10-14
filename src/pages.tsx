import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Banknote,
  BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, FileDown, HeartPulse,
  LockKeyhole, Plus, Shield, ShieldCheck, Target, Trash2, TrendingUp,
  Wallet, X, ChartNoAxesCombined, PiggyBank, Umbrella,
  CircleDot, MoveUpRight,
} from "lucide-react";
import { useFintech } from "./App";
import { buildPriorities, calculateMetrics, money, monthlyGoalContribution } from "./lib/finance";
import { clearDraft, deleteLocalData, readDraft, writeDraft } from "./lib/storage";
import { emptyProfile, expenseCategories } from "./types";
import type { FinancialProfile, Goal, Transaction } from "./types";
import { CinematicWorldFrame } from "./components/CinematicWorldFrame";

const FinancialCharts = lazy(() => import("./components/FinancialCharts"));

function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="page-intro"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function StatCard({ label, value, note, icon: Icon, tone = "" }: { label: string; value: string; note?: string; icon: typeof Wallet; tone?: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18} /></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong>{note && <span className="stat-note">{note}</span>}</div>;
}

function NumberField({ label, value, onChange, min = 0, max, step = "any", hint, prefix = "₹" }: {
  label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number | "any"; hint?: string; prefix?: string;
}) {
  return <label className="field"><span>{label}</span><div className="input-wrap">{prefix && <span className="input-prefix" aria-hidden="true">{prefix}</span>}<input type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Math.max(min, Math.min(max ?? Infinity, Number(event.target.value) || 0)))} /></div>{hint && <small>{hint}</small>}</label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

export function LandingPage() {
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [activeRoadmap, setActiveRoadmap] = useState(0);
  const [persona, setPersona] = useState(0);
  const [dimension, setDimension] = useState("Income");
  const scrollScene = useRef({ progress: 0, persona: 0, dimension: "Income" });
  const storyRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLSpanElement>(null);

  const personas = [
    { name: "First job", detail: "A new income, first savings habits, and choices about near-term goals.", icon: "01" },
    { name: "Growing family", detail: "Shared responsibilities, protection needs, and plans for the years ahead.", icon: "02" },
    { name: "Self-employed", detail: "Irregular income makes cash-flow planning and accessible reserves important.", icon: "03" },
    { name: "Planning retirement", detail: "A longer view of savings, future income, and changing priorities.", icon: "04" },
  ];
  const dimensions = [
    { name: "Income", detail: "What you bring in, and how reliable that income is." },
    { name: "Spending", detail: "The regular commitments and flexible costs in your month." },
    { name: "Savings", detail: "Resources available for planned or unexpected needs." },
    { name: "Debt", detail: "Balances and repayments that shape your cash flow." },
    { name: "Protection", detail: "How your household may be affected by unexpected events." },
    { name: "Investments", detail: "Longer-term resources and experience, considered in context." },
  ];

  useEffect(() => {
    const viewport = window.matchMedia("(max-width: 680px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateViewport = () => setMobile(viewport.matches);
    const updateMotion = () => setReducedMotion(motion.matches);
    updateViewport();
    updateMotion();
    viewport.addEventListener("change", updateViewport);
    motion.addEventListener("change", updateMotion);
    return () => {
      viewport.removeEventListener("change", updateViewport);
      motion.removeEventListener("change", updateMotion);
    };
  }, []);

  useEffect(() => {
    const root = storyRef.current;
    if (!root) return;
    let cancelled = false;
    let revertContext: (() => void) | undefined;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([gsapModule, triggerModule]) => {
      if (cancelled) return;
      const gsap = gsapModule.gsap;
      gsap.registerPlugin(triggerModule.ScrollTrigger);
      const sections = gsap.utils.toArray<HTMLElement>("[data-scene-phase]", root);
      const context = gsap.context(() => {
        gsap.to(scrollScene.current, {
          progress: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: reducedMotion ? false : 1.1,
            onUpdate: (trigger) => {
              scrollScene.current.progress = trigger.progress;
              if (progressBarRef.current) progressBarRef.current.style.transform = `scaleX(${trigger.progress})`;
              const sectionProgress = trigger.progress * sections.length;
              const active = Math.min(sections.length - 1, Math.floor(sectionProgress));
              setActiveScene((previous) => previous === active ? previous : active);
            },
          },
        });
        const roadmap = root.querySelector("#chapter-roadmap");
        if (roadmap) triggerModule.ScrollTrigger.create({
          trigger: roadmap,
          start: "top center",
          end: "bottom center",
          onUpdate: (trigger) => {
            const stage = Math.min(3, Math.floor(trigger.progress * 4));
            setActiveRoadmap((previous) => previous === stage ? previous : stage);
          },
        });
        sections.forEach((section) => {
          const copy = section.querySelector(".story-copy");
          if (!copy) return;
          gsap.fromTo(copy, { y: reducedMotion ? 0 : 24, opacity: reducedMotion ? 1 : 0.72 }, {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: { trigger: section, start: "top 72%", end: "top 38%", scrub: reducedMotion ? false : 0.55 },
          });
        });
      }, root);
      revertContext = () => context.revert();
    }).catch((error: unknown) => {
      console.error("Unable to initialize cinematic scroll animation.", error);
    });
    return () => {
      cancelled = true;
      revertContext?.();
    };
  }, [reducedMotion]);

  useEffect(() => {
    scrollScene.current.persona = persona;
  }, [persona]);

  useEffect(() => {
    scrollScene.current.dimension = dimension;
  }, [dimension]);

  return <div className="cinematic-home">
    <div className="cinematic-world-layer" aria-hidden="true">
      <CinematicWorldFrame scene={scrollScene} mobile={mobile} reducedMotion={reducedMotion} />
      <div className="world-vignette" />
    </div>
    <div className="cinematic-progress" aria-hidden="true"><span ref={progressBarRef} /></div>
    <header className="cinematic-nav">
      <Link to="/" className="cinematic-brand" aria-label="FinTech home">
        <span className="cinematic-brand-mark"><span /><span /><span /></span>
        <span>FIN<span>TECH</span></span>
      </Link>
      <nav aria-label="Main navigation">
        <a href="#chapter-people">The story</a>
        <a href="#chapter-dimensions">Financial world</a>
        <Link to="/how-it-works">How it works</Link>
        <Link to="/login" className="cinematic-nav-auth">Sign in</Link>
        <Link to="/register" className="cinematic-nav-cta">Get started <MoveUpRight size={14} /></Link>
      </nav>
      <a className="cinematic-menu-cta" href="#chapter-final" aria-label="Skip to your financial plan"><ArrowDownRight size={17} /></a>
    </header>

    <div className="cinematic-story" ref={storyRef}>
    <section className="cinematic-hero" data-scene-phase="0" aria-labelledby="cinematic-title">
      <div className="cinematic-hero-copy">
        <span className="cinematic-eyebrow"><span /> A clearer view of your financial world</span>
        <p className="cinematic-wordmark">FINTECH <span>· INDIA</span></p>
        <h1 id="cinematic-title">Your Financial Future<br />Is a World of <em>Possibilities.</em></h1>
        <p className="cinematic-lede">Understand where you stand. Discover what matters. Build a future that fits your life.</p>
        <div className="cinematic-hero-actions">
          <a className="cinematic-button" href="#chapter-people">Explore FinTech <ArrowRight size={17} /></a>
          <Link className="cinematic-scroll-link" to="/register">Start My Financial Journey <MoveUpRight size={14} /></Link>
        </div>
        <div className="cinematic-detail-strip" aria-label="What FinTech helps with">
          <div><span>01</span><b>Build clarity</b><small>Understand cash flow, obligations, and pressure points.</small></div>
          <div><span>02</span><b>Protect your future</b><small>Spot gaps in emergency savings, insurance, and debt risk.</small></div>
          <div><span>03</span><b>Plan with purpose</b><small>Create connected goals and a practical next step.</small></div>
        </div>
        <div className="cinematic-footnote"><LockKeyhole size={13} /> Your information stays in this browser <span /> Education first</div>
      </div>
      <div className="hero-coordinate" aria-hidden="true"><span>IN</span><span>20.5937° N</span><span>78.9629° E</span></div>
      <a className="hero-scroll-indicator" href="#chapter-people" aria-label="Scroll to discover the story"><span>0{activeScene + 1} / 07</span><span className="scroll-line" /><span>SCROLL TO DISCOVER</span></a>
    </section>

    <section className="story-chapter human-stories" id="chapter-people" data-scene-phase="1" aria-labelledby="people-title">
      <div className="story-copy story-left">
        <p className="story-index"><span>01</span> EVERY LIFE HAS ITS OWN ROUTE</p>
        <h2 id="people-title">One Country.<br /><em>Millions of Financial Stories.</em></h2>
        <p className="story-description">Your priorities are shaped by real life. Guidance should adapt to the person—not the other way around.</p>
        <div className="persona-selector" role="group" aria-label="Illustrative financial life situations">
          {personas.map((item, index) => <button key={item.name} className={persona === index ? "persona-choice selected" : "persona-choice"} aria-pressed={persona === index} onClick={() => setPersona(index)}><span>{item.icon}</span>{item.name}<ArrowUpRight size={14} /></button>)}
        </div>
        <p className="persona-description" aria-live="polite"><b>{personas[persona].name}:</b> {personas[persona].detail}</p>
        <p className="example-caption"><CircleDot size={11} /> ILLUSTRATIVE PERSONAS · NOT REAL USERS OR STATISTICS</p>
      </div>
      <div className="human-scene-caption" aria-hidden="true"><span>01 — 04</span> DIFFERENT LIVES, DIFFERENT PRIORITIES</div>
    </section>

    <section className="story-chapter orbit-story" id="chapter-dimensions" data-scene-phase="2" aria-labelledby="orbit-title">
      <div className="story-copy story-left">
        <p className="story-index"><span>02</span> SIX CONNECTED DIMENSIONS</p>
        <h2 id="orbit-title">Your Financial<br /><em>World, in Focus.</em></h2>
        <p className="story-description">Explore the parts of your financial life. This is an educational map—not your personal assessment.</p>
        <div className="dimension-orbit" role="group" aria-label="Explore financial dimensions">
          {dimensions.map((item, index) => <button key={item.name} className={`dimension-node dimension-${index + 1}${dimension === item.name ? " selected" : ""}`} aria-pressed={dimension === item.name} onFocus={() => setDimension(item.name)} onClick={() => setDimension(item.name)}><span className="dimension-node-number">0{index + 1}</span><span>{item.name}</span></button>)}
          <span className="orbit-center" aria-hidden="true">FIN<br />LIFE</span>
        </div>
        <div className="dimension-description" aria-live="polite"><b>{dimension}</b><span>{dimensions.find((item) => item.name === dimension)?.detail}</span></div>
        <p className="example-caption"><CircleDot size={11} /> NO PERSONAL FINANCIAL FIGURES SHOWN</p>
      </div>
    </section>

    <section className="story-chapter clarity-story" id="chapter-clarity" data-scene-phase="3" aria-labelledby="clarity-title">
      <div className="story-copy story-right">
        <p className="story-index"><span>03</span> FROM UNCERTAINTY TO CLARITY</p>
        <h2 id="clarity-title">Money Can Feel<br /><em>Complicated.</em></h2>
        <p className="story-description">When information feels disconnected, it can be hard to know what deserves attention first.</p>
        <div className="clarity-transition" aria-label="A pathway from uncertainty to clarity">
          <div><span className="clarity-mark scattered">·· ·</span><b>Understand</b><small>See the whole picture</small></div>
          <ArrowRight size={19} />
          <div className="clarity-destination"><span className="clarity-mark connected">•──•</span><b>Your next step</b><small>Grounded in your situation</small></div>
        </div>
        <p className="story-aside">Understanding comes before action. Outcomes are never guaranteed.</p>
      </div>
    </section>

    <section className="story-chapter preview-story" id="chapter-preview" data-scene-phase="4" aria-labelledby="preview-title">
      <div className="story-copy story-left preview-intro">
        <p className="story-index"><span>04</span> A CLEARER FINANCIAL PICTURE</p>
        <h2 id="preview-title">See Your Complete<br /><em>Financial Picture.</em></h2>
        <p className="story-description">An example of the kinds of measures a personal check-in can explain. These values are synthetic demo data—not yours.</p>
      </div>
      <div className="preview-dashboard" aria-label="Synthetic demonstration of a financial health summary">
        <div className="preview-dashboard-top"><span><i /> FINANCIAL SNAPSHOT</span><small>SYNTHETIC DEMO DATA</small></div>
        <div className="preview-dashboard-heading"><div><small>MONTHLY CASH FLOW</small><b>Understand the balance</b></div><span>DEMO ONLY</span></div>
        <div className="preview-cashflow"><div><small>Income</small><b>₹ 85,000</b></div><span><ArrowRight size={15} /></span><div><small>Expenses</small><b>₹ 58,000</b></div></div>
        <div className="preview-metrics-grid">
          <div><span>EMERGENCY SAVINGS</span><b>4.2 months</b><small>Coverage of essential costs</small></div>
          <div><span>OUTSTANDING DEBT</span><b>₹ 2.4 lakh</b><small>Balances entered by demo</small></div>
          <div><span>INSURANCE REVIEW</span><b>Review needed</b><small>Coverage is not verified</small></div>
          <div><span>INVESTMENT READINESS</span><b>In context</b><small>Depends on your full profile</small></div>
        </div>
        <div className="preview-goal-row"><span>GOAL PROGRESS</span><div><i /></div><b>62% <small>demo</small></b></div>
        <p className="preview-disclaimer"><ShieldCheck size={12} /> Fictional values for illustration only. Your assessment uses only the information you provide.</p>
      </div>
    </section>

    <section className="story-chapter roadmap-story" id="chapter-roadmap" data-scene-phase="5" aria-labelledby="roadmap-title">
      <div className="story-copy story-left">
        <p className="story-index"><span>05</span> A PATH THAT CAN ADAPT</p>
        <h2 id="roadmap-title">A Thoughtful<br /><em>Financial Roadmap.</em></h2>
        <p className="story-description">A helpful sequence is a guide, not a rule. The right order depends on your resources, needs, and responsibilities.</p>
      </div>
      <div className="roadmap-stages" data-active-stage={activeRoadmap} aria-label="Understand, Protect, Prepare, Grow">
        <article><span>01</span><div><b>UNDERSTAND</b><p>Cash flow, savings, debt, and obligations.</p></div><i /></article>
        <article><span>02</span><div><b>PROTECT</b><p>Potential protection gaps and important risks.</p></div><i /></article>
        <article><span>03</span><div><b>PREPARE</b><p>Emergency savings, debt, and upcoming costs.</p></div><i /></article>
        <article><span>04</span><div><b>GROW</b><p>Long-term goals and investing education, when appropriate.</p></div><i /></article>
      </div>
      <p className="roadmap-note"><LockKeyhole size={13} /> Essential needs and debt may come before investing. There is no one-size-fits-all plan.</p>
    </section>

    <section className="story-chapter story-plan final-story" id="chapter-final" data-scene-phase="6" aria-labelledby="final-title">
      <div className="story-copy story-plan-copy">
        <p className="story-index"><span>06</span> THE NEXT CHAPTER IS YOURS</p>
        <h2 id="final-title">Your Future<br /><em>Deserves a Plan.</em></h2>
        <p className="story-description">Start by understanding your financial life. Your first step is simpler than you think.</p>
        <div className="cinematic-hero-actions">
          <Link className="cinematic-button" to="/register">Discover My Financial Health <ArrowRight size={17} /></Link>
          <Link className="cinematic-scroll-link" to="/financial-education">Explore Financial Education <MoveUpRight size={14} /></Link>
        </div>
        <p className="last-disclaimer">No guaranteed outcomes. No product pressure. Education first.</p>
      </div>
      <div className="horizon-caption"><span /> FINTECH · YOUR JOURNEY STARTS HERE</div>
    </section>
    </div>
    <footer className="cinematic-footer">
      <Link to="/" className="cinematic-brand"><span className="cinematic-brand-mark"><span /><span /><span /></span><span>FIN<span>TECH</span></span></Link>
      <span>Understand Your Money. Shape Your Future.</span>
      <div><Link to="/about">About</Link><Link to="/financial-education">Learn</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div>
      <small>For education only · Local development mode · Your financial details stay in this browser</small>
    </footer>
  </div>;
}

export function MobileEntryPage() {
  const { verifyPhone, verifiedPhone } = useFintech();
  const navigate = useNavigate();
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState(verifiedPhone?.replace(/^\+\d+/, "") ?? "");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const digits = mobile.replace(/\D/g, "");
    const valid = countryCode === "+91" ? /^[6-9]\d{9}$/.test(digits) : /^\d{7,14}$/.test(digits);
    if (!valid) return setError(countryCode === "+91" ? "Enter a valid 10-digit Indian mobile number." : "Enter a valid mobile number for the selected country.");
    if (!consent) return setError("Please agree to the local-development privacy notice to continue.");
    setError("");
    setBusy(true);
    window.setTimeout(() => {
      try {
        verifyPhone(`${countryCode}${digits}`);
        setBusy(false);
        navigate("/welcome-dashboard");
      } catch (storageError) {
        console.error("Unable to save local development phone state.", storageError);
        setBusy(false);
        setError("This browser could not save the local session. Check browser storage settings and try again.");
      }
    }, 350);
  };
  return <section className="mobile-entry-page">
    <div className="welcome-topbar"><Link to="/" className="brand"><span className="brand-icon"><span /><span /><span /></span><span>Fin<span className="brand-accent">Tech</span></span></Link><Link className="welcome-quiet-link" to="/privacy">Privacy <ShieldCheck size={15} /></Link></div>
    <div className="mobile-entry-card">
      <div className="mobile-entry-symbol"><span className="brand-icon"><span /><span /><span /></span></div>
      <span className="welcome-overline">YOUR FINANCIAL JOURNEY, YOUR WAY</span>
      <h1>Let’s get you started.</h1>
      <p>Enter your mobile number to continue to your personal FinTech space.</p>
      <form onSubmit={submit} noValidate>
        <label className="field"><span>Mobile number</span><div className="phone-input">
          <select aria-label="Country calling code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)}><option value="+91">🇮🇳 India (+91)</option><option value="+1">🇺🇸 United States (+1)</option><option value="+44">🇬🇧 United Kingdom (+44)</option><option value="+61">🇦🇺 Australia (+61)</option><option value="+971">🇦🇪 UAE (+971)</option></select>
          <input aria-label="Mobile number" autoComplete="tel-national" inputMode="numeric" type="tel" maxLength={16} value={mobile} onChange={(event) => setMobile(event.target.value.replace(/[^\d\s()-]/g, ""))} placeholder={countryCode === "+91" ? "98765 43210" : "Your mobile number"} />
        </div></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <label className="check-row mobile-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I agree to store this number on this device for this local development session. <Link to="/privacy">Privacy details</Link>.</span></label>
        <button type="submit" className="button button-primary welcome-primary" disabled={busy}>{busy ? <><span className="loading-dot" /> Preparing your space…</> : <>Continue <ArrowRight size={18} /></>}</button>
      </form>
      <div className="development-note"><ShieldCheck size={17} /><div><b>Development-only verification</b><p>No SMS or OTP is sent or verified. A local continuation state is saved in this browser. A real OTP provider has not been configured.</p></div></div>
      <Link to="/" className="back-link"><ChevronLeft size={15} /> Back to welcome</Link>
    </div>
    <div className="welcome-foot"><span>FinTech keeps your finances in focus, not your inbox.</span><span>Never enter an OTP, password, or bank PIN here.</span></div>
  </section>;
}

export function WelcomeDashboardPage() {
  const { profile, verifiedPhone, authUser, authLoading } = useFintech();
  const savedDraft = readDraft<{ profile?: FinancialProfile; step?: number }>();
  if (authLoading) return <div className="auth-loading" role="status">Loading your financial space…</div>;
  if (!authUser && !(import.meta.env.DEV && verifiedPhone)) return <Navigate to="/login" replace />;
  const savedStep = savedDraft?.profile ? Math.min(savedDraft.step ?? 0, onboardingSteps.length - 1) : -1;
  const stepCount = onboardingSteps.length;
  const ctaLabel = savedStep >= 0 ? "Continue My Financial Profile" : profile ? "View My Financial Summary" : "Build My Financial Profile";
  return <section className="welcome-dashboard">
    <div className="welcome-topbar"><Link to="/" className="brand"><span className="brand-icon"><span /><span /><span /></span><span>Fin<span className="brand-accent">Tech</span></span></Link><span className="local-pill"><ShieldCheck size={14} /> Local development mode</span></div>
    <div className="welcome-dashboard-content">
      {authUser
        ? <div className="verification-banner"><ShieldCheck size={16} /><span><b>Signed in as {authUser.full_name}.</b> Account access is verified. Financial assessment data is still stored locally in this browser.</span></div>
        : <div className="verification-banner"><ShieldCheck size={16} /><span><b>Development mode only:</b> no SMS or OTP was sent or verified. This local continuation step does not secure your financial data.</span></div>}
      <span className="welcome-overline"><span /> YOUR PERSONAL FINANCIAL SPACE</span>
      <h1>Welcome to FinTech</h1>
      <p>Let’s understand your financial life, one step at a time.</p>
      <div className="welcome-feature-grid">
        <FeatureCard icon={ChartNoAxesCombined} title="Financial Health Check" description="See your whole picture clearly, with calculations based on your answers." number="01" />
        <FeatureCard icon={Activity} title="Income and Expense Overview" description="Understand your monthly flow and where your money is going." number="02" />
        <FeatureCard icon={Umbrella} title="Insurance and Protection" description="Review the coverage and responsibilities that matter to your household." number="03" />
        <FeatureCard icon={PiggyBank} title="Savings and Investment Goals" description="Plan achievable goals without assumed returns or product pressure." number="04" />
      </div>
      {profile && <div className="resume-banner"><span><Check size={16} /></span><div><b>Your financial profile is saved on this device.</b><small>Pick up where you left off or review your latest assessment.</small></div><Link to="/profile" className="text-link">Continue <ArrowRight size={15} /></Link></div>}
      {savedStep >= 0 && !profile && <div className="onboarding-progress-card"><div className="progress-copy"><b>Your financial profile is in progress</b><span>Step {savedStep + 1} of {stepCount} · {onboardingSteps[savedStep]}</span></div><div className="progress-track"><div style={{ width: `${((savedStep + 1) / stepCount) * 100}%` }} /></div></div>}
      <div className="welcome-dashboard-actions">
        <Link to={savedStep >= 0 ? "/profile" : profile ? "/dashboard" : "/profile"} className="button button-primary welcome-primary">{ctaLabel} <ArrowRight size={18} /></Link>
        {profile && <Link className="welcome-secondary-action" to="/profile">Update my financial profile</Link>}
      </div>
      <div className="welcome-safety"><LockKeyhole size={14} /> No products are recommended before understanding your circumstances.</div>
    </div>
    <div className="welcome-foot"><span>Estimated progress is saved in this browser. Continue whenever you’re ready.</span><Link to="/privacy">Your privacy</Link></div>
  </section>;
}

function FeatureCard({ icon: Icon, title, description, number }: { icon: typeof Wallet; title: string; description: string; number: string }) {
  return <article className="welcome-feature-card"><span className="feature-card-number">{number}</span><span className="welcome-feature-icon"><Icon size={21} /></span><h2>{title}</h2><p>{description}</p><span className="feature-card-arrow"><ArrowUpRight size={17} /></span></article>;
}

const onboardingSteps = ["About you", "Income & spending", "Savings & debt", "Protection & goals", "Review"];

export function ProfileWizardPage() {
  const { profile: savedProfile, saveProfile } = useFintech();
  const navigate = useNavigate();
  const savedDraft = readDraft<{ profile: FinancialProfile; step: number } | FinancialProfile>();
  const currentDraft = savedDraft && "profile" in savedDraft ? savedDraft : null;
  const [form, setForm] = useState<FinancialProfile>(() => {
    const previous = currentDraft?.profile ?? (savedDraft && !("profile" in savedDraft) ? savedDraft : null);
    return previous ?? savedProfile ?? { ...emptyProfile, expenses: { ...emptyProfile.expenses }, assets: { ...emptyProfile.assets }, debts: { ...emptyProfile.debts } };
  });
  const [step, setStep] = useState(() => currentDraft?.step ?? 0);
  const [error, setError] = useState("");
  const setWizardStep = (nextStep: number) => {
    setStep(nextStep);
    writeDraft({ profile: form, step: nextStep });
  };

  const update = <K extends keyof FinancialProfile>(key: K, value: FinancialProfile[K]) => {
    const next = { ...form, [key]: value };
    setForm(next);
    writeDraft({ profile: next, step });
  };
  const updateExpenses = (category: string, value: number) => update("expenses", { ...form.expenses, [category]: value });
  const updateAssets = (key: keyof FinancialProfile["assets"], value: number) => update("assets", { ...form.assets, [key]: value });
  const updateDebts = (key: keyof FinancialProfile["debts"], value: number | boolean) => update("debts", { ...form.debts, [key]: value });

  const next = () => {
    setError("");
    if (step === 0 && !form.name.trim()) return setError("Please enter your name or a nickname to continue.");
    if (step === 1 && form.income < 0) return setError("Income cannot be a negative amount.");
    if (step < onboardingSteps.length - 1) setWizardStep(step + 1);
  };
  const finish = () => {
    if (!form.consent) return setError("Please confirm consent before saving your information on this device.");
    const finalProfile = { ...form, name: form.name.trim(), reviewedAt: new Date().toISOString() };
    saveProfile(finalProfile);
    clearDraft();
    navigate("/dashboard");
  };

  return <div className="onboarding-wrap">
    <div className="onboarding-top"><Link to="/welcome-dashboard" className="text-link"><ChevronLeft size={16} /> Back to welcome</Link><span className="local-pill"><LockKeyhole size={14} /> Saved on this device only</span></div>
    <div className="onboarding-card">
      <div className="onboarding-heading"><p className="eyebrow">YOUR FINANCIAL HEALTH CHECK</p><h1>Let’s understand your money.</h1><p>Your estimates are enough to start. Skip anything you don’t know — we’ll clearly mark what’s missing.</p></div>
      <div className="progress-head"><span>Step {step + 1} of {onboardingSteps.length}</span><span>{onboardingSteps[step]}</span></div><div className="progress-track"><div style={{ width: `${((step + 1) / onboardingSteps.length) * 100}%` }} /></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="wizard-content">
        {step === 0 && <div className="form-section"><h2>A little about you</h2><p>We use this to make explanations and planning relevant. Please don’t enter government ID or account credentials.</p><div className="form-grid">
          <label className="field"><span>Your name or nickname</span><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="How should we address you?" maxLength={60} /></label>
          <NumberField label="Age" value={form.age} min={18} max={100} step={1} prefix="" onChange={(value) => update("age", Math.min(100, value))} />
          <SelectField label="Work situation" value={form.employment} options={["Salaried", "Self-employed", "Student", "Business owner", "Other"]} onChange={(value) => update("employment", value as FinancialProfile["employment"])} />
          <NumberField label="People financially dependent on you" value={form.dependants} min={0} max={30} step={1} prefix="" onChange={(value) => update("dependants", value)} />
          <SelectField label="Preferred language (for now)" value="English" options={["English"]} onChange={() => undefined} />
        </div></div>}
        {step === 1 && <div className="form-section"><h2>Income & monthly spending</h2><p>Use take-home amounts and a typical month. Loan payments, premiums, and investments have their own rows to help avoid counting them twice.</p><div className="form-grid">
          <NumberField label="Monthly take-home income" value={form.income} onChange={(value) => update("income", value)} hint="After tax and payroll deductions" />
          <NumberField label="Other recurring monthly income" value={form.otherIncome} onChange={(value) => update("otherIncome", value)} />
          <SelectField label="Income pattern" value={form.stability} options={["Stable", "Variable", "Seasonal"]} onChange={(value) => update("stability", value as FinancialProfile["stability"])} />
        </div><h3 className="subsection-title">Typical monthly expenses</h3><div className="expense-input-grid">{expenseCategories.map((category) => <NumberField key={category} label={category} value={form.expenses[category] ?? 0} onChange={(value) => updateExpenses(category, value)} step={500} />)}</div></div>}
        {step === 2 && <div className="form-section"><h2>Savings, assets & debt</h2><p>Approximate values are fine. Retirement funds or property may not be readily available for emergencies.</p><h3 className="subsection-title">Savings and assets</h3><div className="form-grid">
          <NumberField label="Emergency savings (readily accessible)" value={form.emergencySavings} onChange={(value) => update("emergencySavings", value)} />
          <NumberField label="Other bank savings / cash" value={form.assets.cash} onChange={(value) => updateAssets("cash", value)} />
          <NumberField label="Fixed / recurring deposits" value={form.assets.deposits} onChange={(value) => updateAssets("deposits", value)} />
          <NumberField label="Mutual funds, shares, ETFs" value={form.assets.investments} onChange={(value) => updateAssets("investments", value)} />
          <NumberField label="EPF, PPF, NPS, retirement savings" value={form.assets.retirement} onChange={(value) => updateAssets("retirement", value)} />
          <NumberField label="Other assets (optional)" value={form.assets.other} onChange={(value) => updateAssets("other", value)} />
        </div><h3 className="subsection-title">Debts and liabilities</h3><div className="form-grid">
          <NumberField label="Outstanding loans (excluding cards)" value={form.debts.balance} onChange={(value) => updateDebts("balance", value)} />
          <NumberField label="Credit-card balance" value={form.debts.creditCard} onChange={(value) => updateDebts("creditCard", value)} />
          <NumberField label="Total monthly EMI / required repayments" value={form.debts.monthlyPayment} onChange={(value) => updateDebts("monthlyPayment", value)} />
          <NumberField label="Loan interest rate (if known)" value={form.debts.interestRate} onChange={(value) => updateDebts("interestRate", value)} step={0.5} prefix="%" />
        </div><label className="check-row"><input type="checkbox" checked={form.debts.overdue} onChange={(e) => updateDebts("overdue", e.target.checked)} /><span>One or more debt payments are overdue</span></label></div>}
        {step === 3 && <div className="form-section"><h2>Protection, goals & investing</h2><p>These answers help us flag things worth reviewing — they do not determine that a particular product is right for you.</p>
          <div className="form-grid">
            <label className="check-row"><input type="checkbox" checked={form.hasHealthCover} onChange={(e) => update("hasHealthCover", e.target.checked)} /><span>I currently have health insurance</span></label>
            {form.hasHealthCover && <NumberField label="Approximate health cover" value={form.healthCover} onChange={(value) => update("healthCover", value)} />}
            <label className="check-row"><input type="checkbox" checked={form.hasLifeCover} onChange={(e) => update("hasLifeCover", e.target.checked)} /><span>I currently have life insurance</span></label>
            {form.hasLifeCover && <NumberField label="Approximate life cover" value={form.lifeCover} onChange={(value) => update("lifeCover", value)} />}
            <SelectField label="Investment experience" value={form.investmentExperience} options={["None", "Some", "Experienced"]} onChange={(value) => update("investmentExperience", value as FinancialProfile["investmentExperience"])} />
            <SelectField label="How much loss could your finances absorb?" value={form.riskCapacity} options={["Low", "Medium", "High"]} onChange={(value) => update("riskCapacity", value as FinancialProfile["riskCapacity"])} />
            <SelectField label="How comfortable are you with market ups and downs?" value={form.riskComfort} options={["Low", "Medium", "High"]} onChange={(value) => update("riskComfort", value as FinancialProfile["riskComfort"])} />
          </div>
          <div className="goal-builder"><h3 className="subsection-title">Financial goals</h3><p>Add a goal now, or skip and add it later.</p><GoalForm onAdd={(goal) => update("goals", [...form.goals, goal])} />{form.goals.length > 0 && <ul className="simple-list">{form.goals.map((goal) => <li key={goal.id}><span>{goal.name} · {money(goal.target)}</span><button className="icon-button danger-icon" onClick={() => update("goals", form.goals.filter((item) => item.id !== goal.id))} aria-label={`Remove ${goal.name}`}><X size={15} /></button></li>)}</ul>}</div>
        </div>}
        {step === 4 && <div className="form-section"><h2>Review & consent</h2><p>Check your answers. You can go back to change any section before saving.</p><div className="review-grid">
          <div><small>Profile</small><b>{form.name || "Name not provided"} · Age {form.age} · {form.employment}</b></div><div><small>Income</small><b>{money(form.income + form.otherIncome)} / month · {form.stability.toLowerCase()}</b></div>
          <div><small>Monthly expenses</small><b>{money(Object.values(form.expenses).reduce((a, b) => a + b, 0))}</b></div><div><small>Emergency savings</small><b>{money(form.emergencySavings)}</b></div>
          <div><small>Debt balances</small><b>{money(form.debts.balance + form.debts.creditCard)}</b></div><div><small>Goals</small><b>{form.goals.length} added</b></div>
        </div><div className="privacy-consent"><ShieldCheck size={21} /><div><b>Your information stays on this device.</b><p>FinTech saves this financial profile in this browser’s local storage. It is not sent to a server or AI. Anyone with access to this browser profile may be able to view it. You can export or delete it from Settings.</p></div></div>
          <label className="check-row consent-row"><input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} /><span>I understand and consent to saving this information locally to generate my educational assessment.</span></label>
        </div>}
      </div>
      <div className="wizard-controls"><button className="button button-quiet" onClick={() => step > 0 ? setWizardStep(step - 1) : navigate("/welcome-dashboard")}>{step > 0 ? <><ChevronLeft size={16} /> Back</> : "Cancel"}</button><button className="text-button" onClick={() => { writeDraft({ profile: form, step }); navigate("/welcome-dashboard"); }}>Save & exit</button>{step < 4 ? <button className="button button-primary" onClick={next}>Continue <ChevronRight size={16} /></button> : <button className="button button-primary" onClick={finish}>Save & see my results <ArrowRight size={16} /></button>}</div>
    </div>
  </div>;
}

function GoalForm({ onAdd }: { onAdd: (goal: Goal) => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState(100000);
  const [saved, setSaved] = useState(0);
  const [months, setMonths] = useState(12);
  const [priority, setPriority] = useState<Goal["priority"]>("Important");
  const [error, setError] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || target <= saved || months < 1) return setError("Enter a name, a target above current savings, and at least 1 month.");
    onAdd({ id: crypto.randomUUID(), name: name.trim(), target, saved, months, priority });
    setName(""); setError("");
  };
  return <form className="goal-form" onSubmit={submit}><label className="field"><span>Goal name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Further education" maxLength={60} /></label><NumberField label="Target amount" value={target} onChange={setTarget} /><NumberField label="Already saved" value={saved} onChange={setSaved} /><NumberField label="Months until target" value={months} min={1} max={600} step={1} prefix="" onChange={setMonths} /><SelectField label="Importance" value={priority} options={["Essential", "Important", "Flexible"]} onChange={(value) => setPriority(value as Goal["priority"])} /><button className="button button-secondary" type="submit"><Plus size={16} /> Add goal</button>{error && <span className="inline-error">{error}</span>}</form>;
}

export function DashboardPage() {
  const { profile, saveProfile } = useFintech();
  if (!profile) return null;
  const metrics = calculateMetrics(profile);
  const priorities = buildPriorities(profile);
  const expenses = Object.entries(profile.expenses).filter(([, value]) => value > 0);
  const markReviewed = () => saveProfile({ ...profile, reviewedAt: new Date().toISOString() });
  return <div className="app-page wrap">
    <PageIntro eyebrow={`WELCOME${profile.name ? `, ${profile.name.toUpperCase()}` : ""}`} title="Your financial picture" description="A transparent snapshot based only on the information you entered." action={<button className="button button-secondary" onClick={markReviewed}><Activity size={16} /> Recalculate</button>} />
    <div className="local-notice"><ShieldCheck size={16} /><span><b>Local development mode:</b> this profile is stored only in your browser on this device, not shared or sent to a server.</span><Link to="/settings">Manage data</Link></div>
    {metrics.dataWarnings.length > 0 && <div className="warning-box"><CircleHelp size={18} /><div><b>Some information may be missing</b><ul>{metrics.dataWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><Link to="/profile">Review your answers</Link></div></div>}
    <div className="stats-grid">
      <StatCard label="Monthly income" value={money(metrics.totalIncome)} note="Take-home + other" icon={Banknote} />
      <StatCard label="Monthly expenses" value={money(metrics.totalExpenses)} note="From your estimates" icon={ArrowDownRight} tone="tone-orange" />
      <StatCard label={metrics.surplus >= 0 ? "Estimated surplus" : "Estimated shortfall"} value={money(Math.abs(metrics.surplus))} note="Income minus expenses" icon={metrics.surplus >= 0 ? ArrowUpRight : ArrowDownRight} tone={metrics.surplus >= 0 ? "tone-green" : "tone-red"} />
      <StatCard label="Savings rate" value={metrics.savingsRate === null ? "Not available" : `${metrics.savingsRate}%`} note="From reported monthly investments" icon={TrendingUp} tone="tone-blue" />
      <StatCard label="Emergency fund" value={metrics.emergencyMonths === null ? "Not available" : `${metrics.emergencyMonths} mo`} note={metrics.emergencyMonths === null ? "Add essential expenses" : "Of essential expenses" } icon={Shield} tone="tone-purple" />
      <StatCard label="Total assets" value={money(metrics.assets)} note="Includes emergency savings" icon={Wallet} tone="tone-green" />
      <StatCard label="Total liabilities" value={money(metrics.liabilities)} note="Loans + card balances entered" icon={Banknote} tone="tone-orange" />
      <StatCard label="Estimated net worth" value={money(metrics.netWorth)} note="Included assets less debts" icon={Activity} tone="tone-green" />
    </div>
    <div className="dashboard-grid">
      <Suspense fallback={<><Panel><div className="panel-heading"><h2>Income vs expenses</h2></div><div className="chart-box" /></Panel><Panel><div className="panel-heading"><h2>Spending breakdown</h2></div><div className="chart-box" /></Panel></>}>
        <FinancialCharts income={metrics.totalIncome} totalExpenses={metrics.totalExpenses} expenses={expenses} />
      </Suspense>
    </div>
    <div className="dashboard-grid lower-grid">
      <Panel><div className="panel-heading"><div><h2>Your next priorities</h2><p>Rule-based guidance from the details you shared</p></div><Link className="text-link" to="/action-plan">Full plan <ArrowRight size={15} /></Link></div><div className="priority-list">{priorities.slice(0, 3).map((item, i) => <div className="priority-item" key={item.title}><span className={`priority-number p${i + 1}`}>0{i + 1}</span><div><div className="priority-title-row"><b>{item.title}</b><span className="confidence">{item.confidence} confidence</span></div><p>{item.reason}</p><small>{item.action}</small></div></div>)}</div></Panel>
      <Panel><div className="panel-heading"><div><h2>Your goals</h2><p>Simple, no-return estimates</p></div><Link to="/goals" className="text-link">Manage <ArrowRight size={15} /></Link></div>{profile.goals.length ? <div className="goal-progress-list">{profile.goals.slice(0, 3).map((goal) => <div key={goal.id} className="goal-progress"><div className="goal-line"><b>{goal.name}</b><span>{Math.min(100, Math.round(goal.saved / goal.target * 100))}%</span></div><div className="progress-track small"><div style={{ width: `${Math.min(100, goal.saved / goal.target * 100)}%` }} /></div><small>{money(goal.saved)} of {money(goal.target)} · ~{money(monthlyGoalContribution(goal))}/month</small></div>)}</div> : <div className="empty-state compact"><Target size={22} /><p>No goals added yet. Start with something that matters to you.</p><Link to="/goals">Create a goal</Link></div>}</Panel>
    </div>
    <div className="dashboard-actions"><Link to="/income-expenses" className="quick-action"><span><Plus size={17} /></span><div><b>Add a transaction</b><small>Track actual income and spending</small></div><ArrowRight size={16} /></Link><Link to="/settings" className="quick-action"><span><ShieldCheck size={17} /></span><div><b>Review your data</b><small>Export or delete your local profile</small></div><ArrowRight size={16} /></Link></div>
  </div>;
}

export function GoalsPage() {
  const { profile, saveProfile } = useFintech();
  const [showForm, setShowForm] = useState(false);
  if (!profile) return null;
  const addGoal = (goal: Goal) => { saveProfile({ ...profile, goals: [...profile.goals, goal] }); setShowForm(false); };
  const updateGoal = (goal: Goal) => saveProfile({ ...profile, goals: profile.goals.map((item) => item.id === goal.id ? goal : item) });
  const removeGoal = (id: string) => saveProfile({ ...profile, goals: profile.goals.filter((goal) => goal.id !== id) });
  return <div className="app-page wrap"><PageIntro eyebrow="PLAN FOR WHAT MATTERS" title="Your financial goals" description="Estimate steady monthly savings with a simple no-return calculation. You can pause, edit, or remove a goal at any time." action={<button className="button button-primary" onClick={() => setShowForm(!showForm)}>{showForm ? <X size={16} /> : <Plus size={16} />}{showForm ? "Close" : "Add a goal"}</button>} />
    {showForm && <Panel className="goal-panel"><h2>Add a financial goal</h2><GoalForm onAdd={addGoal} /></Panel>}
    {profile.goals.length === 0 && !showForm ? <Panel><div className="empty-state"><Target size={30} /><h3>Your goals start here.</h3><p>Add an amount and timeline to see the monthly savings estimate.</p><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add your first goal</button></div></Panel> : <div className="goal-card-grid">{profile.goals.map((goal) => {
      const percentage = goal.target ? Math.min(100, Math.round(goal.saved / goal.target * 100)) : 0;
      return <Panel key={goal.id} className="goal-card"><div className="goal-card-head"><div className="goal-symbol"><Target size={18} /></div><button className="icon-button danger-icon" aria-label={`Delete ${goal.name}`} onClick={() => removeGoal(goal.id)}><Trash2 size={16} /></button></div><span className="scenario-tag">{goal.priority}{goal.paused ? " · Paused" : ""}</span><h2>{goal.name}</h2><div className="goal-line"><span>{money(goal.saved)} saved</span><b>{percentage}%</b></div><div className="progress-track"><div style={{ width: `${percentage}%` }} /></div><p className="goal-target">{money(goal.target)} target · {goal.months} months</p><div className="goal-estimate"><span>Monthly amount (no assumed return)</span><b>{money(monthlyGoalContribution(goal))}</b></div><div className="goal-edit-grid"><NumberField label="Update saved" value={goal.saved} onChange={(value) => updateGoal({ ...goal, saved: Math.min(value, goal.target) })} step={500} /><NumberField label="Timeline (months)" value={goal.months} min={1} max={600} step={1} prefix="" onChange={(value) => updateGoal({ ...goal, months: value })} /></div><button className="text-button" onClick={() => updateGoal({ ...goal, paused: !goal.paused })}>{goal.paused ? "Resume goal" : "Pause goal"}</button></Panel>;
    })}</div>}
    <div className="inline-disclaimer">If a monthly estimate doesn’t fit your budget, consider changing the target or deadline. This calculation assumes no return and does not account for inflation.</div>
  </div>;
}

export function ActionPlanPage() {
  const { profile } = useFintech();
  const [completed, setCompleted] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("fintech.completed-actions") || "[]") as string[]; } catch { return []; }
  });
  if (!profile) return null;
  const items = buildPriorities(profile);
  const toggle = (title: string) => {
    const next = completed.includes(title) ? completed.filter((item) => item !== title) : [...completed, title];
    setCompleted(next);
    localStorage.setItem("fintech.completed-actions", JSON.stringify(next));
  };
  return <div className="app-page wrap"><PageIntro eyebrow="YOUR NEXT STEPS" title="A plan at your pace" description="These educational prompts are based on your inputs. You decide what to do, and when." />
    <div className="plan-timeline"><div className="plan-period"><span className="period-marker">01</span><div><p className="eyebrow">NEXT 7 DAYS</p><h2>Start with the immediate picture</h2>{items.slice(0, 2).map((item) => <PlanItem key={item.title} item={item} done={completed.includes(item.title)} onToggle={() => toggle(item.title)} />)}</div></div>
      <div className="plan-period"><span className="period-marker">02</span><div><p className="eyebrow">THIS MONTH</p><h2>Make room for stability</h2>{items.slice(2, 4).length ? items.slice(2, 4).map((item) => <PlanItem key={item.title} item={item} done={completed.includes(item.title)} onToggle={() => toggle(item.title)} />) : <PlanItem item={{ title: "Review your regular spending", reason: "A monthly review can help you notice changes before they become surprises.", action: "Check the categories you estimated and update anything that has changed.", horizon: "This month", confidence: "Low", tradeoff: "Keep spending that supports your wellbeing and responsibilities." }} done={completed.includes("Review your regular spending")} onToggle={() => toggle("Review your regular spending")} />}</div></div>
      <div className="plan-period"><span className="period-marker">03</span><div><p className="eyebrow">NEXT 3–6 MONTHS</p><h2>Build around your goals</h2>{profile.goals.length ? profile.goals.map((goal) => <div className="action-card" key={goal.id}><b>Keep {goal.name} achievable</b><p>Your no-return estimate is {money(monthlyGoalContribution(goal))} monthly. Revisit the timeline if this amount is not affordable.</p><Link className="text-link" to="/goals">Update goal <ArrowRight size={15} /></Link></div>) : <div className="action-card"><b>Choose a goal to work toward</b><p>Start with a target and timeline that fit your priorities. You can refine the numbers later.</p><Link className="text-link" to="/goals">Add a goal <ArrowRight size={15} /></Link></div>}</div></div>
    </div><div className="inline-disclaimer">This plan is educational, not regulated financial advice. Priorities may change when estimates are updated or missing details become available.</div>
  </div>;
}

function PlanItem({ item, done, onToggle }: { item: ReturnType<typeof buildPriorities>[number]; done: boolean; onToggle: () => void }) {
  return <article className={`action-card ${done ? "action-done" : ""}`}><div className="action-card-heading"><b>{item.title}</b><button className={`complete-button ${done ? "complete" : ""}`} onClick={onToggle} aria-label={done ? "Mark action incomplete" : "Mark action complete"}>{done ? <Check size={16} /> : "Mark done"}</button></div><p>{item.reason}</p><div className="action-detail"><span><b>Suggested step:</b> {item.action}</span><span><b>Why it may help:</b> Supports a more resilient, informed plan.</span><span><b>Trade-off:</b> {item.tradeoff}</span></div><div className="action-meta"><span>{item.horizon}</span><span>{item.confidence} confidence</span>{item.amount !== undefined && <span>Possible amount: {money(item.amount)}</span>}</div></article>;
}

export function TransactionsPage() {
  const { profile, saveProfile } = useFintech();
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState("Food & groceries");
  const [date, setDate] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()));
  const [note, setNote] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  if (!profile) return null;
  const transactions = profile.transactions ?? [];
  const shown = transactions.filter((transaction) =>
    (typeFilter === "All" || transaction.type === typeFilter.toLowerCase()) &&
    (monthFilter === "All" || transaction.date.slice(0, 7) === monthFilter) &&
    (categoryFilter === "All" || transaction.category === categoryFilter),
  );

  const addTransaction = (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter an amount greater than zero.");
    if (!date) return setError("Choose a transaction date.");
    const transaction: Transaction = { id: editingId ?? crypto.randomUUID(), type: kind, amount, category, date, note: note.trim() };
    const nextTransactions = editingId
      ? transactions.map((item) => item.id === editingId ? transaction : item)
      : [transaction, ...transactions];
    saveProfile({ ...profile, transactions: nextTransactions });
    setAmount(0); setNote(""); setEditingId(null); setError(""); setMessage(editingId ? "Transaction updated." : "Transaction added.");
  };
  const edit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setKind(transaction.type);
    setAmount(transaction.amount);
    setCategory(transaction.category);
    setDate(transaction.date);
    setNote(transaction.note);
    setError("");
    setMessage(`Editing ${transaction.category}.`);
  };
  const cancelEdit = () => {
    setEditingId(null); setAmount(0); setNote(""); setError(""); setMessage("");
  };
  const remove = (id: string) => {
    saveProfile({ ...profile, transactions: transactions.filter((item) => item.id !== id) });
    if (editingId === id) cancelEdit();
  };
  const exportCsv = () => {
    const lines = ["date,type,amount,category,note", ...transactions.map((item) => [item.date, item.type, item.amount, `"${item.category.replaceAll('"', '""')}"`, `"${item.note.replaceAll('"', '""')}"`].join(","))];
    downloadFile(lines.join("\n"), "fintech-transactions.csv", "text/csv");
  };
  const importCsv = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(Boolean);
    const parsed: Transaction[] = [];
    let rejected = 0;
    for (const [index, row] of rows.entries()) {
      if (index === 0 && row.toLowerCase().includes("date")) continue;
      const cells = row.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((cell) => cell.replace(/,$/, "").replace(/^"|"$/g, "").replaceAll('""', '"')) ?? [];
      const [rowDate, rowType, rowAmount, rowCategory, rowNote] = cells;
      const numericAmount = Number(rowAmount);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rowDate || "") || !["income", "expense"].includes((rowType || "").toLowerCase()) || !Number.isFinite(numericAmount) || numericAmount <= 0 || !rowCategory?.trim()) {
        rejected++;
        continue;
      }
      parsed.push({ id: crypto.randomUUID(), date: rowDate, type: rowType.toLowerCase() as Transaction["type"], amount: numericAmount, category: rowCategory.trim(), note: rowNote || "" });
    }
    if (!parsed.length) return setError(`No valid rows were found. ${rejected} row(s) rejected.`);
    saveProfile({ ...profile, transactions: [...parsed, ...transactions] });
    setMessage(`Imported ${parsed.length} transaction(s); ${rejected} invalid row(s) rejected.`);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  };
  const totalIncome = shown.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = shown.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const availableCategories = [...new Set(transactions.map((item) => item.category))].sort((left, right) => left.localeCompare(right));
  const availableMonths = [...new Set(transactions.map((item) => item.date.slice(0, 7)))].sort().reverse();
  return <div className="app-page wrap"><PageIntro eyebrow="YOUR MONEY, IN MOTION" title="Income & expenses" description="Track transactions manually — no bank connection or credentials needed." action={<button className="button button-secondary" onClick={exportCsv}><FileDown size={16} /> Export CSV</button>} />
    <div className="stats-grid two-stats"><StatCard label="Tracked income" value={money(totalIncome)} note={`${shown.length} visible transactions`} icon={ArrowUpRight} tone="tone-green" /><StatCard label="Tracked expenses" value={money(totalExpenses)} note="Based on visible transactions" icon={ArrowDownRight} tone="tone-orange" /></div>
    <div className="transactions-layout"><Panel><h2>{editingId ? "Edit transaction" : "Add a transaction"}</h2><form className="transaction-form" onSubmit={addTransaction}><SelectField label="Type" value={kind} options={["expense", "income"]} onChange={(value) => { const nextKind = value as typeof kind; setKind(nextKind); setCategory(nextKind === "income" ? "Salary" : "Housing"); }} /><NumberField label="Amount" value={amount} min={0} onChange={setAmount} /><label className="field"><span>Category</span><select value={category} onChange={(e) => setCategory(e.target.value)}>{[...new Set([...(kind === "expense" ? [...expenseCategories] : ["Salary", "Business income", "Freelance", "Interest", "Other income"]), category])].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label className="field full-field"><span>Note (optional)</span><input maxLength={160} value={note} onChange={(e) => setNote(e.target.value)} placeholder="A short description" /></label>{error && <div className="inline-error full-field">{error}</div>}{message && <div className="success-message full-field">{message}</div>}<button type="submit" className="button button-primary full-field"><Plus size={16} /> {editingId ? "Save changes" : "Add transaction"}</button>{editingId && <button type="button" className="button button-quiet full-field" onClick={cancelEdit}>Cancel editing</button>}</form></Panel>
      <Panel><div className="panel-heading"><div><h2>Transaction history</h2><p>Your locally stored records</p></div></div><div className="filter-controls"><label className="field"><span>Type</span><select className="compact-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option>All</option><option>Income</option><option>Expense</option></select></label><label className="field"><span>Month</span><select className="compact-select" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}><option value="All">All months</option>{availableMonths.map((month) => <option key={month} value={month}>{month}</option>)}</select></label><label className="field"><span>Category</span><select className="compact-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="All">All categories</option>{availableCategories.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="import-row"><span>Import CSV</span><button className="text-button" onClick={() => fileInput.current?.click()}>Choose file</button><input ref={fileInput} className="visually-hidden" type="file" accept=".csv,text/csv" onChange={(e) => void importCsv(e.target.files?.[0])} /><small>Template: date,type,amount,category,note</small></div><div className="transaction-list">{shown.length ? shown.map((item) => <div className="transaction-row" key={item.id}><div className={`transaction-icon ${item.type}`} aria-hidden="true">{item.type === "income" ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}</div><div className="transaction-copy"><b>{item.category}</b><small>{item.date}{item.note && ` · ${item.note}`}</small></div><strong className={item.type === "income" ? "text-positive" : ""}>{item.type === "income" ? "+" : "−"}{money(item.amount)}</strong><button className="icon-button" aria-label={`Edit ${item.category} transaction`} onClick={() => edit(item)}><Activity size={15} /></button><button className="icon-button danger-icon" aria-label={`Delete ${item.category} transaction`} onClick={() => remove(item.id)}><Trash2 size={15} /></button></div>) : <div className="empty-state compact"><Wallet size={23} /><p>No transactions match these filters. Add one or adjust the filters.</p></div>}</div></Panel></div>
    <div className="inline-disclaimer">The transaction tracker is separate from the estimates in your financial assessment. Transactions do not automatically change assessment totals.</div>
  </div>;
}

function downloadFile(content: string, name: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  URL.revokeObjectURL(url);
}

export function SectionPage({ type }: { type: "how" | "terms" | "emergency" | "insurance" | "debt" | "investments" }) {
  const { profile } = useFintech();
  if (type === "how") return <div className="wrap content-page"><PageIntro eyebrow="HOW IT WORKS" title="Understand first. Decide with confidence." description="A personal finance check-in should explain what it knows, what it doesn’t, and why a next step might matter." /><div className="content-steps">{[
    ["01", "Share what you’re comfortable sharing", "A short guided check-in covers your household, income, spending, savings, obligations, and goals. Skip figures you don’t know."],
    ["02", "Review before anything is saved", "See your answers and understand local storage and its limits. No account credentials or government IDs are requested."],
    ["03", "Get transparent calculations", "Simple, deterministic calculations use your inputs. Missing or uncertain information is called out rather than filled in."],
    ["04", "Choose your own next step", "A rule-based plan highlights priorities and trade-offs. It is educational, not a product recommendation."],
  ].map(([number, title, text]) => <article className="how-card" key={number}><span>{number}</span><h2>{title}</h2><p>{text}</p></article>)}</div><Link className="button button-primary button-large" to="/mobile-number">Start my financial health check <ArrowRight size={16} /></Link></div>;
  if (type === "terms") return <div className="wrap content-page"><PageIntro eyebrow="TERMS" title="Using FinTech" description="This local prototype is provided to support financial education and personal reflection." /><div className="prose"><h2>Educational information only</h2><p>Calculations, guidance, and learning materials are general educational information. They are not personal financial, investment, insurance, tax, legal, or credit advice, and are not a substitute for a qualified professional.</p><h2>Estimates have limitations</h2><p>Results rely on information you enter and may be incomplete, outdated, or incorrect. No return, coverage, affordability, or outcome is guaranteed. Always confirm product terms and seek qualified advice for decisions that require it.</p><h2>Local prototype</h2><p>This application stores your profile only in the browser’s local storage. It does not provide authentication, server-side backups, or shared accounts. Anyone who can use your browser profile may access its stored data.</p><h2>Responsible use</h2><p>Do not enter passwords, payment credentials, government identity numbers, or other highly sensitive information. Use Settings to export or delete locally stored data.</p></div></div>;
  if (!profile) return null;
  if (type === "emergency") return <EmergencyFundPage profile={profile} />;
  const metrics = calculateMetrics(profile);
  if (type === "insurance") return <div className="app-page wrap"><PageIntro eyebrow="PROTECTION CHECK-IN" title="Insurance needs assessment" description="Identify questions to review, not products to buy. This is general education, not regulated insurance advice." /><div className="dashboard-grid"><Panel><div className="feature-icon"><HeartPulse size={20} /></div><h2>Health cover</h2><p>Status: <b>{profile.hasHealthCover ? "You reported existing cover" : "No existing cover reported"}</b></p><p>Reported amount: {profile.hasHealthCover ? money(profile.healthCover) : "Not available"}</p><p>Review waiting periods, exclusions, room limits, co-payments, claim process, and whether employer cover remains available when you change jobs.</p><div className="inline-disclaimer">Policy details and healthcare needs are personal. Check your policy documents and consult a qualified professional.</div></Panel><Panel><div className="feature-icon"><Shield size={20} /></div><h2>Life cover</h2><p>People relying on you: <b>{profile.dependants}</b></p><p>Status: <b>{profile.hasLifeCover ? "You reported existing cover" : "No existing cover reported"}</b></p><p>Reported amount: {profile.hasLifeCover ? money(profile.lifeCover) : "Not available"}</p><p>Consider dependants’ needs, liabilities, future obligations, existing resources, and affordability. Not everyone needs life cover, and no exact amount is estimated here.</p><div className="inline-disclaimer">Review terms, exclusions, and suitability before making a decision.</div></Panel></div></div>;
  if (type === "debt") return <div className="app-page wrap"><PageIntro eyebrow="BORROWING WITH CLARITY" title="Debt overview" description="A screening view of reported debt. This does not assess creditworthiness or replace lender terms." /><div className="stats-grid three-stats"><StatCard label="Loan balances" value={money(profile.debts.balance)} note="Excludes credit-card balance" icon={Banknote} /><StatCard label="Credit-card balance" value={money(profile.debts.creditCard)} note="Confirm your actual rates" icon={Activity} tone="tone-orange" /><StatCard label="Monthly repayments" value={money(profile.debts.monthlyPayment)} note={metrics.debtRatio === null ? "Debt ratio unavailable" : `${metrics.debtRatio}% of entered income`} icon={ArrowDownRight} tone="tone-blue" /></div><Panel className="top-gap"><h2>Two common repayment approaches</h2><div className="comparison-grid"><div><h3>Highest-interest-first</h3><p>Pay required amounts on all debts, then direct extra funds toward the highest confirmed interest rate. This can reduce total interest, if terms and fees support it.</p></div><div><h3>Smallest-balance-first</h3><p>Pay required amounts on all debts, then focus extra funds on the smallest balance. Visible progress can help motivation, though it may cost more interest.</p></div></div>{profile.debts.overdue && <div className="warning-box"><CircleHelp size={17} /><span>You reported overdue payments. Check notices, due dates, and contact your lender if you are struggling to pay; do not ignore contractual obligations.</span></div>}</Panel></div>;
  return <div className="app-page wrap"><PageIntro eyebrow="LEARN BEFORE YOU INVEST" title="Investment readiness" description="Educational product overviews. No securities are selected or recommended, and returns are never guaranteed." /><div className="local-notice"><BookOpen size={17} /><span>A SIP (systematic investment plan) is a way to invest regularly — it is not itself an investment product.</span><Link to="/financial-education">More learning</Link></div><div className="education-grid">{[
    ["Savings accounts", "Purpose: everyday liquidity. Benefits: easy access. Risks: interest may not keep pace with inflation. Consider fees, access limits, and deposit protection rules."],
    ["FDs and RDs", "Purpose: planned savings over a chosen term. Benefits: defined interest terms. Risks: early withdrawal rules, tax treatment, and inflation. Check current institution terms."],
    ["PPF, EPF & NPS", "Purpose: long-term or retirement saving, each with distinct rules. Benefits, liquidity, tax, lock-ins, and withdrawal conditions vary; verify current official rules."],
    ["Mutual funds & ETFs", "Purpose: pooled investments across assets. Risks include market losses, costs, tracking or manager variation, and liquidity differences. Review the scheme documents."],
    ["Equity shares", "Purpose: ownership in a company. Prices can fall sharply, and individual company risk is concentrated. Research and diversification matter."],
    ["Government securities", "Purpose: lending to a government issuer. Market prices can change before maturity; understand credit, interest-rate, liquidity, and platform risks."],
  ].map(([title, text]) => <article key={title} className="education-card"><span className="education-symbol"><TrendingUp size={18} /></span><h2>{title}</h2><p>{text}</p></article>)}</div><div className="inline-disclaimer">Current tax, regulatory, cost, and product rules can change. This prototype avoids quoting time-sensitive rates; verify with authoritative sources before acting.</div></div>;
}

function EmergencyFundPage({ profile }: { profile: FinancialProfile }) {
  const { saveProfile } = useFintech();
  const metrics = calculateMetrics(profile);
  return <div className="app-page wrap"><PageIntro eyebrow="BUILD YOUR SAFETY NET" title="Emergency fund planner" description="An accessible reserve can help with unexpected essential costs. The 3–6 month reference is a starting point for learning, not a universal target." /><div className="planner-grid"><Panel className="planner-main"><p className="eyebrow">CURRENT ESTIMATE</p><div className="big-number">{metrics.emergencyMonths === null ? "Not available" : `${metrics.emergencyMonths} months`}</div><p>Based on {money(profile.emergencySavings)} in emergency savings and {money(metrics.essentialExpenses)} monthly essential expenses.</p><div className="progress-track"><div style={{ width: `${metrics.emergencyTarget > 0 ? Math.min(100, profile.emergencySavings / metrics.emergencyTarget * 100) : 0}%` }} /></div><div className="goal-line"><span>Current {money(profile.emergencySavings)}</span><b>Reference {money(metrics.emergencyTarget)}</b></div><div className="callout-row"><b>Remaining to reference target</b><strong>{money(metrics.emergencyGap)}</strong></div></Panel><Panel><h2>Make it work for you</h2><p>Variable income, dependants, health needs, and job stability can affect how much accessible savings feels appropriate.</p><p>{metrics.availableMonthlySurplus > 0 ? `Your estimated surplus is ${money(metrics.availableMonthlySurplus)}. A contribution should remain affordable after essentials and required payments.` : "Your entered cash flow does not show a positive surplus. Addressing that may come before setting a monthly savings amount."}</p><Link className="button button-secondary" to="/income-expenses">Review transactions <ArrowRight size={15} /></Link></Panel></div><Panel className="top-gap"><h2>Update your emergency savings</h2><NumberField label="Accessible emergency savings" value={profile.emergencySavings} onChange={(value) => saveProfile({ ...profile, emergencySavings: value })} /></Panel></div>;
}

export function AboutPage() {
  return <div className="wrap content-page"><PageIntro eyebrow="ABOUT FINTECH" title="Financial clarity should be for everyone." description="A personal finance check-in can be practical, respectful, and honest about uncertainty." /><div className="about-panel"><div className="about-mark"><span className="brand-icon"><span /><span /><span /></span></div><div><h2>Understand your money. Plan your future.</h2><p>FinTech is a financial wellness prototype designed to help people in India understand their cash flow, savings, obligations, and goals in simple language. It is built around transparency and user choice — never product sales.</p><p>The current version runs locally in your browser. It does not connect to banks, use paid AI, or share your profile.</p></div></div><div className="feature-grid top-gap"><div className="feature-card"><ShieldCheck size={21} /><h3>Privacy conscious</h3><p>Only the details you choose are stored in this local prototype.</p></div><div className="feature-card"><Activity size={21} /><h3>Explainable</h3><p>Calculations use deterministic formulas and show their assumptions.</p></div><div className="feature-card"><BadgeCheck size={21} /><h3>Independent</h3><p>No commissions, financial-product rankings, or buy/sell signals.</p></div></div><div id="contact" className="inline-disclaimer">Contact details are not configured in this local prototype.</div></div>;
}

export function PrivacyPage() {
  return <div className="wrap content-page"><PageIntro eyebrow="PRIVACY" title="Your information stays in your browser." description="This build does not send financial-profile data to a backend or third-party API." /><div className="prose"><h2>What is stored</h2><p>Your profile, goals, and manually added transactions are kept in this browser’s local storage. An unfinished onboarding form may be stored as a local draft.</p><h2>Who can see it</h2><p>This prototype has no user accounts or server-side access controls. Anyone who can use your device and browser profile may be able to access data saved there. Do not use a shared or public computer for sensitive information.</p><h2>Export and deletion</h2><p>Use Settings to download a JSON summary or delete locally stored profile data. Clearing site data in your browser also removes it. Exported files are not deleted when you delete in-app data.</p><h2>AI and third parties</h2><p>No AI processing or bank connection is active. Financial numbers are calculated in your browser. Future versions must ask for clear consent before optional processing.</p></div></div>;
}

export function EducationPage() {
  const articles = [
    ["Budgeting", "A budget is a way to make your priorities visible, not a test of willpower. Start by writing down take-home income and regular essential costs, then revisit estimates as life changes."],
    ["Emergency savings", "A cash reserve may reduce the need to borrow for an unexpected essential cost. The right amount depends on income reliability, dependants, health needs, and access to other resources."],
    ["Inflation", "Inflation means prices rise over time, so the same amount may buy less in the future. Compare goals in today’s rupees and review them periodically."],
    ["Compound interest", "Compounding means returns can themselves earn returns over time. It also works in reverse for debt. Any investment illustration depends on uncertain returns and is not a promise."],
    ["Insurance", "Insurance transfers specified risks under a contract. Understand exclusions, waiting periods, limits, claims requirements, and affordability before choosing cover."],
    ["Debt", "Borrowing has costs and contractual terms. Compare annual interest, fees, due dates, prepayment rules, and the consequences of missed payments."],
    ["Mutual funds & SIPs", "A mutual fund pools investor money into a portfolio. A SIP is a method to invest periodically in a chosen scheme; it does not remove market risk."],
    ["Risk & diversification", "Diversification spreads exposure but cannot eliminate all loss. The level of risk that feels comfortable may differ from what your finances can withstand."],
    ["Retirement planning", "Retirement planning considers future needs, time horizon, inflation, existing benefits, and liquidity. Rules for Indian products can change; check official sources."],
    ["Financial fraud awareness", "Never share OTPs, UPI PINs, passwords, or card details with callers or links. Verify requests using the institution’s official app or website and report suspected fraud promptly."],
    ["Common financial mistakes", "Common pitfalls include ignoring cash flow, relying on return promises, overlooking policy exclusions, and investing money needed soon. Check assumptions and product documents."],
  ];
  const [query, setQuery] = useState("");
  const results = articles.filter(([title, text]) => `${title} ${text}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="wrap content-page"><PageIntro eyebrow="FINANCIAL EDUCATION" title="Money concepts, in plain language." description="An independent learning library. No product promotions, price targets, or return promises." /><label className="search-field"><BookOpen size={18} /><input aria-label="Search financial education" placeholder="Search a topic..." value={query} onChange={(e) => setQuery(e.target.value)} />{query && <button className="icon-button" aria-label="Clear search" onClick={() => setQuery("")}><X size={16} /></button>}</label><div className="education-grid">{results.map(([title, text]) => <article className="education-card" key={title}><span className="education-symbol"><BookOpen size={17} /></span><h2>{title}</h2><p>{text}</p></article>)}</div>{results.length === 0 && <div className="empty-state"><p>No matching topics. Try another search term.</p></div>}<div className="inline-disclaimer">Educational information only. Rules, taxes, terms, and rates can change; verify current details using authoritative sources.</div></div>;
}

export function SettingsPage({ onDelete }: { onDelete: () => void }) {
  const { profile } = useFintech();
  const [message, setMessage] = useState("");
  if (!profile) return null;
  const exportData = () => {
    downloadFile(JSON.stringify({ exportedAt: new Date().toISOString(), profile }, null, 2), "fintech-financial-summary.json", "application/json");
    setMessage("Your export has been downloaded.");
  };
  const removeData = () => {
    if (!window.confirm("Delete your FinTech profile, goals, transactions, and draft from this browser? This cannot be undone.")) return;
    deleteLocalData();
    localStorage.removeItem("fintech.completed-actions");
    onDelete();
  };
  return <div className="app-page wrap"><PageIntro eyebrow="YOUR ACCOUNT" title="Settings & data" description="This is a local-development version without sign-in or cloud storage." /><div className="settings-grid"><Panel><div className="settings-icon"><ShieldCheck size={20} /></div><h2>Local data storage</h2><p>Your financial profile and transactions are stored only in this browser’s local storage. This is not encrypted account storage and is not suitable for a shared device.</p><div className="data-meta"><span>Profile name</span><b>{profile.name}</b><span>Last assessment</span><b>{profile.reviewedAt ? new Date(profile.reviewedAt).toLocaleString("en-IN") : "Not available"}</b><span>Goals</span><b>{profile.goals.length}</b><span>Transactions</span><b>{profile.transactions.length}</b></div><div className="settings-buttons"><button className="button button-secondary" onClick={exportData}><FileDown size={16} /> Export my data</button><Link className="button button-secondary" to="/profile">Edit financial details</Link></div>{message && <div className="success-message">{message}</div>}</Panel><Panel className="danger-panel"><div className="settings-icon danger-bg"><Trash2 size={19} /></div><h2>Delete local data</h2><p>Remove your saved profile, financial information, goals, and transactions from this browser. Download an export first if you may need it later.</p><button className="button button-danger" onClick={removeData}>Delete my local data</button></Panel></div></div>;
}
