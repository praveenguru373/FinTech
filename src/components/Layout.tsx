import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowUpRight, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { useFintech } from "../App";

const publicLinks = [
  ["/", "Home"],
  ["/how-it-works", "How it works"],
  ["/financial-education", "Learn"],
  ["/about", "About"],
];
const appLinks = [
  ["/dashboard", "Overview"],
  ["/income-expenses", "Transactions"],
  ["/emergency-fund", "Emergency fund"],
  ["/insurance", "Protection"],
  ["/debt", "Debt"],
  ["/investments", "Investing"],
  ["/goals", "Goals"],
  ["/action-plan", "Action plan"],
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, authUser, authLoading, signOut } = useFintech();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const minimalExperience = ["/", "/onboarding", "/mobile-number", "/welcome-dashboard", "/profile", "/onboarding/profile", "/login", "/register", "/forgot-password", "/verify-email", "/reset-password"].includes(location.pathname);
  const isAppRoute = location.pathname !== "/" && !["/about", "/how-it-works", "/financial-education", "/privacy", "/terms", "/onboarding", "/mobile-number", "/welcome-dashboard", "/profile", "/onboarding/profile"].includes(location.pathname);

  if (minimalExperience) return <div className="minimal-shell"><main>{children}</main></div>;

  const logout = async () => {
    setSignOutError("");
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch {
      setSignOutError("Unable to sign out because the authentication service is unavailable. Try again.");
    }
  };

  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label="FinTech home">
            <span className="brand-icon"><span /><span /><span /></span>
            <span>Fin<span className="brand-accent">Tech</span></span>
          </Link>
          <button className="icon-button mobile-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav className={`main-nav ${menuOpen ? "nav-open" : ""}`} aria-label="Main navigation">
            {(isAppRoute && profile ? appLinks : publicLinks).map(([to, label]) => (
              <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                {label}
              </NavLink>
            ))}
            {profile && <NavLink to="/settings" className="nav-link" onClick={() => setMenuOpen(false)}>Settings</NavLink>}
            {!authLoading && authUser ? (
              <>
                <span className="account-name">{authUser.full_name}</span>
                <button type="button" className="nav-link sign-out-button" onClick={() => void logout()}><LogOut size={14} /> Sign out</button>
              </>
            ) : !profile ? (
              <>
                <span className="local-pill"><ShieldCheck size={14} /> Local mode</span>
                <Link className="nav-link" to="/login">Sign in</Link>
                <Link className="button button-primary nav-cta" to="/register">Get started <ArrowUpRight size={16} /></Link>
              </>
            ) : (
              <span className="local-pill"><ShieldCheck size={14} /> Local mode</span>
            )}
          </nav>
        </div>
        {signOutError && <p className="sign-out-error" role="alert">{signOutError}</p>}
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div className="footer-main">
          <div>
            <Link to="/" className="brand"><span className="brand-icon"><span /><span /><span /></span><span>Fin<span className="brand-accent">Tech</span></span></Link>
            <p>Understand your money. Plan your future.</p>
            <span className="local-pill"><ShieldCheck size={14} /> Your data stays in this browser</span>
          </div>
          <div className="footer-links">
            <Link to="/about">About</Link><Link to="/how-it-works">How it works</Link>
            <Link to="/financial-education">Education</Link><Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link><Link to="/about#contact">Contact</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} FinTech · Financial wellness, with clarity.</span>
          <span>For education only — not financial, investment, tax, or insurance advice.</span>
        </div>
      </footer>
    </div>
  );
}
