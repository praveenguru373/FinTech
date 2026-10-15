import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";

const roadmap = [
  { number: "01", title: "Understand", detail: "See your cash flow, savings, and commitments in one place." },
  { number: "02", title: "Plan", detail: "Choose priorities that fit your needs and responsibilities." },
  { number: "03", title: "Take action", detail: "Move forward at your own pace, with useful context." },
];

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealItems = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const photoSections = [...root.querySelectorAll<HTMLElement>("[data-photo-section]")];
    const visibilityRatios = new Map<HTMLElement, number>();
    let activePhoto: HTMLElement | null = null;
    let reducedMotion = motionPreference.matches;
    let animationFrame = 0;
    let revealObserver: IntersectionObserver | null = null;

    root.classList.add("motion-ready");

    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });

      revealObserver = observer;
      revealItems.forEach((item) => observer.observe(item));
    }

    const photoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        visibilityRatios.set(entry.target as HTMLElement, entry.isIntersecting ? entry.intersectionRatio : 0);
      });
      const nextSection = [...visibilityRatios.entries()]
        .filter(([, ratio]) => ratio > 0)
        .sort((first, second) => second[1] - first[1])[0]?.[0] ?? null;
      const nextPhoto = nextSection?.querySelector<HTMLElement>(".story-photo") ?? null;
      if (activePhoto !== nextPhoto) {
        activePhoto?.classList.remove("is-photo-active");
        activePhoto = nextPhoto;
        activePhoto?.classList.add("is-photo-active");
      }
    }, { threshold: [0, 0.08, 0.2, 0.35, 0.5, 0.7], rootMargin: "-8% 0px -8% 0px" });

    photoSections.forEach((section) => photoObserver.observe(section));

    const updateParallax = () => {
      animationFrame = 0;
      if (reducedMotion) return;
      const viewportHeight = window.innerHeight;
      photoSections.forEach((section) => {
        const bounds = section.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (viewportHeight - bounds.top) / (viewportHeight + bounds.height)));
        section.style.setProperty("--photo-parallax", `${(progress - 0.5) * -64}px`);
        section.style.setProperty("--photo-zoom", `${1.08 + Math.sin(progress * Math.PI) * 0.055}`);
      });
    };
    const scheduleParallax = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateParallax);
    };
    const updateMotionPreference = () => {
      reducedMotion = motionPreference.matches;
      root.classList.toggle("reduced-motion", reducedMotion);
      if (reducedMotion) {
        revealObserver?.disconnect();
        revealItems.forEach((item) => item.classList.add("is-visible"));
      }
      scheduleParallax();
    };

    root.classList.toggle("reduced-motion", reducedMotion);
    scheduleParallax();
    window.addEventListener("scroll", scheduleParallax, { passive: true });
    window.addEventListener("resize", scheduleParallax);
    motionPreference.addEventListener("change", updateMotionPreference);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleParallax);
      window.removeEventListener("resize", scheduleParallax);
      motionPreference.removeEventListener("change", updateMotionPreference);
      photoObserver.disconnect();
      revealObserver?.disconnect();
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return <div className="fintech-story" ref={rootRef}>
    <header className="story-header">
      <Link to="/" className="story-brand" aria-label="FinTech home" onClick={closeMenu}>
        <span className="story-brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span>FIN<span>TECH</span></span>
      </Link>
      <button className="story-menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen}>
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav className={menuOpen ? "story-navigation is-open" : "story-navigation"} aria-label="Main navigation">
        <a href="#chapter-personal" onClick={closeMenu}>Our approach</a>
        <a href="#chapter-picture" onClick={closeMenu}>Your financial picture</a>
        <Link to="/financial-education" onClick={closeMenu}>Learn</Link>
        <Link className="story-signin" to="/login" onClick={closeMenu}>Sign in</Link>
        <Link className="story-nav-cta" to="/register" onClick={closeMenu}>Get started <ArrowUpRight size={16} /></Link>
      </nav>
    </header>

    <main>
      <section className="story-hero" data-photo-section aria-labelledby="story-hero-title">
        <div className="story-photo story-photo-hero" aria-hidden="true" />
        <div className="story-hero-copy" data-reveal>
          <p className="story-eyebrow"><span /> FINANCIAL WELLNESS, WITH CLARITY</p>
          <p className="story-wordmark">FINTECH <span>· INDIA</span></p>
          <h1 id="story-hero-title">Your Money.<br /><em>Your Future.</em></h1>
          <p className="story-lede">Understand where you stand. Discover what matters next.</p>
          <div className="story-actions">
            <Link className="story-button" to="/register">Discover My Financial Health <ArrowRight size={18} /></Link>
            <Link className="story-text-link" to="/financial-education">Explore Financial Education <ArrowUpRight size={16} /></Link>
          </div>
          <p className="story-reassurance">A clear, private starting point for the life you’re building.</p>
        </div>

        <a className="story-scroll-cue" href="#chapter-personal"><span /> SCROLL TO EXPLORE</a>
      </section>

      <section className="story-section story-personal" id="chapter-personal" data-photo-section aria-labelledby="personal-title">
        <div className="story-photo story-photo-personal" aria-hidden="true" />
        <div className="story-section-number" data-reveal><span>01</span> A PERSONAL STARTING POINT</div>
        <div className="story-personal-layout">
          <div className="story-personal-art" data-reveal aria-hidden="true">
            <div className="personal-line personal-line-one" />
            <div className="personal-line personal-line-two" />
            <div className="personal-core"><span>YOUR<br />LIFE</span></div>
            <div className="personal-label personal-label-one"><i /> INCOME</div>
            <div className="personal-label personal-label-two"><i /> RESPONSIBILITIES</div>
            <div className="personal-label personal-label-three"><i /> GOALS</div>
          </div>
          <div className="story-copy-block" data-reveal>
            <h2 id="personal-title">Money<br />is <em>personal.</em></h2>
            <p>Different incomes. Different responsibilities. Different ideas of a life well lived. Your financial picture should start with your reality—not a one-size-fits-all template.</p>
            <a className="story-inline-link" href="#chapter-picture">See what comes into focus <ArrowRight size={17} /></a>
          </div>
        </div>
      </section>

      <section className="story-section story-picture" id="chapter-picture" data-photo-section aria-labelledby="picture-title">
        <div className="story-photo story-photo-picture" aria-hidden="true" />
        <div className="story-section-number" data-reveal><span>02</span> SEE THE WHOLE PICTURE</div>
        <div className="picture-layout">
          <div className="picture-copy story-copy-block" data-reveal>
            <h2 id="picture-title">See your<br />financial <em>picture.</em></h2>
            <p>Bring the important pieces together—from monthly cash flow to savings, protection, and readiness.</p>
            <p className="picture-note">Your assessment is based on the details you choose to share. No personal figures are shown here.</p>
          </div>
          <div className="picture-panel" data-reveal aria-label="Financial areas that can be explored">
            <div className="picture-panel-heading"><span>THE PIECES THAT MATTER</span><i>01 — 05</i></div>
            <div className="picture-row"><span className="picture-row-index">01</span><b>Income & spending</b><span className="picture-row-line" /><i>01</i></div>
            <div className="picture-row"><span className="picture-row-index">02</span><b>Savings & resilience</b><span className="picture-row-line" /><i>02</i></div>
            <div className="picture-row"><span className="picture-row-index">03</span><b>Debt & commitments</b><span className="picture-row-line" /><i>03</i></div>
            <div className="picture-row"><span className="picture-row-index">04</span><b>Protection & cover</b><span className="picture-row-line" /><i>04</i></div>
            <div className="picture-row"><span className="picture-row-index">05</span><b>Goals & the future</b><span className="picture-row-line" /><i>05</i></div>
            <div className="picture-panel-foot"><span /><p>Connected, considered, and always in context.</p></div>
          </div>
        </div>
      </section>

      <section className="story-section story-guidance" data-photo-section aria-labelledby="guidance-title">
        <div className="story-photo story-photo-guidance" aria-hidden="true" />
        <div className="guidance-light" aria-hidden="true" />
        <div className="story-section-number" data-reveal><span>03</span> RELEVANT, NOT GENERIC</div>
        <div className="guidance-layout">
          <div className="guidance-art" data-reveal aria-hidden="true">
            <div className="guidance-axis" />
            <div className="guidance-node guidance-node-a"><span>01</span><b>Your situation</b></div>
            <div className="guidance-node guidance-node-b"><span>02</span><b>What matters next</b></div>
            <div className="guidance-node guidance-node-c"><span>03</span><b>Your own pace</b></div>
            <svg viewBox="0 0 600 420" role="presentation"><path d="M68 321 C175 325 167 215 282 226 S377 139 525 86" /></svg>
          </div>
          <div className="story-copy-block" data-reveal>
            <h2 id="guidance-title">Know what<br />matters <em>next.</em></h2>
            <p>Explore practical next steps shaped around the information you provide. Understand the trade-offs, then decide what feels right for you.</p>
            <p className="guidance-caveat">Educational guidance only. No guaranteed outcomes or product promises.</p>
          </div>
        </div>
      </section>

      <section className="story-section story-roadmap" data-photo-section aria-labelledby="roadmap-title">
        <div className="story-photo story-photo-roadmap" aria-hidden="true" />
        <div className="story-section-number" data-reveal><span>04</span> A WAY FORWARD, AT YOUR PACE</div>
        <div className="roadmap-heading story-copy-block" data-reveal>
          <h2 id="roadmap-title">Build towards<br />your <em>future.</em></h2>
          <p>Start with a clearer view. Make a plan that fits. Take the next step when you’re ready.</p>
        </div>
        <div className="roadmap-track">
          {roadmap.map((step, index) => <article className="roadmap-step" data-reveal key={step.number}>
            <span className="roadmap-number">{step.number}</span>
            <div className="roadmap-marker"><i /></div>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
            {index < roadmap.length - 1 && <span className="roadmap-connector" aria-hidden="true" />}
          </article>)}
        </div>
      </section>

      <section className="story-final" data-photo-section aria-labelledby="final-title">
        <div className="story-photo story-photo-final" aria-hidden="true" />
        <div className="final-light" aria-hidden="true" />
        <div className="story-section-number" data-reveal><span>05</span> YOUR NEXT CHAPTER</div>
        <div className="final-content story-copy-block" data-reveal>
          <p className="final-overline">A clearer beginning starts here.</p>
          <h2 id="final-title">Your future<br />deserves <em>a plan.</em></h2>
          <p>Take a moment to understand where you stand—and what could matter next.</p>
          <div className="story-actions">
            <Link className="story-button" to="/register">Discover My Financial Health <ArrowRight size={18} /></Link>
            <Link className="story-text-link" to="/financial-education">Explore Financial Education <ArrowUpRight size={16} /></Link>
          </div>
        </div>
      </section>
    </main>

    <footer className="story-footer">
      <Link to="/" className="story-brand" aria-label="FinTech home"><span className="story-brand-mark" aria-hidden="true"><i /><i /><i /></span><span>FIN<span>TECH</span></span></Link>
      <p>Understand your money. Plan your future.</p>
      <nav aria-label="Footer navigation"><Link to="/about">About</Link><Link to="/financial-education">Education</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></nav>
      <small>For education only—not financial, investment, tax, or insurance advice.</small>
    </footer>
  </div>;
}
