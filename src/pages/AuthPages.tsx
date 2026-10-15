import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole,
  Mail, ShieldCheck, Sparkles, UserRound,
} from "lucide-react";
import { useFintech } from "../App";
import { AuthApiError, authApi } from "../services/auth";

type AuthKind = "login" | "register" | "forgot" | "verify" | "reset";

function Brand() {
  return <Link to="/" className="auth-brand" aria-label="FinTech home">
    <span className="cinematic-brand-mark"><span /><span /><span /></span>
    <span>FIN<span>TECH</span></span>
  </Link>;
}

function AuthBackdrop() {
  return <div className="auth-world" aria-hidden="true">
    <div className="auth-art-grid" />
    <div className="auth-art-plane auth-art-plane-back">
      <span>FINANCIAL PICTURE</span>
      <svg viewBox="0 0 520 250" role="presentation">
        <path d="M0 212 C72 203 91 171 155 181 S245 123 292 141 S365 93 415 102 S479 58 520 35" />
      </svg>
      <i />
    </div>
    <div className="auth-art-plane auth-art-plane-front">
      <span>YOUR LIFE · YOUR PRIORITIES</span>
      <b>Clarity creates<br />room to plan.</b>
      <i /><i /><i />
    </div>
    <div className="auth-world-shade" />
  </div>;
}

function AuthFrame({ kind, children }: { kind: AuthKind; children: React.ReactNode }) {
  const messages: Record<AuthKind, { eyebrow: string; title: React.ReactNode; description: string }> = {
    login: {
      eyebrow: "YOUR FINANCIAL JOURNEY CONTINUES",
      title: <>See your money<br />with <em>clarity.</em></>,
      description: "A calmer way to understand your finances and decide what deserves attention next.",
    },
    register: {
      eyebrow: "A CLEARER VIEW STARTS HERE",
      title: <>Your financial<br />life, in <em>focus.</em></>,
      description: "Start with the details that matter to you. Build a plan at your own pace.",
    },
    forgot: {
      eyebrow: "SECURE ACCOUNT RECOVERY",
      title: <>Your next step<br />is still <em>within reach.</em></>,
      description: "We’ll help you securely get back to your FinTech account.",
    },
    verify: {
      eyebrow: "ONE LAST ACCOUNT CHECK",
      title: <>Protect your<br />financial <em>space.</em></>,
      description: "Confirm your account to continue to your welcome dashboard.",
    },
    reset: {
      eyebrow: "ACCOUNT SECURITY",
      title: <>A fresh start<br />with a <em>new key.</em></>,
      description: "Choose a new password to secure your account.",
    },
  };
  return <div className="auth-page">
    <section className="auth-visual">
      <AuthBackdrop />
      <div className="auth-visual-overlay" />
      <header className="auth-topbar"><Brand /><span className="auth-country-mark">FINANCIAL WELLNESS · INDIA</span></header>
      <div className="auth-editorial">
        <span className="auth-editorial-kicker"><span /> {messages[kind].eyebrow}</span>
        <h1>{messages[kind].title}</h1>
        <p>{messages[kind].description}</p>
        <div className="auth-trust"><span><ShieldCheck size={15} /> Private by design</span><span><Sparkles size={15} /> Made around your life</span></div>
      </div>
      <div className="auth-visual-caption"><span className="auth-caption-line" /> FINANCIAL LIFE, CONNECTED</div>
    </section>
    <section className="auth-side">
      <div className="auth-side-top"><Link to="/" className="auth-home-link"><ArrowLeft size={14} /> Back to FinTech</Link></div>
      <section className="auth-panel" aria-labelledby="auth-title">
        {children}
      </section>
      <footer className="auth-footer"><div><Link to="/terms">Terms of Service</Link><Link to="/privacy">Privacy Policy</Link></div></footer>
    </section>
  </div>;
}

function Field({ label, icon: Icon, children, hint }: { label: string; icon: typeof Mail; children: React.ReactNode; hint?: string }) {
  return <label className="auth-field"><span>{label}</span><div className="auth-input-wrap"><Icon size={16} aria-hidden="true" />{children}</div>{hint && <small>{hint}</small>}</label>;
}

function PasswordField({ label, value, onChange, autoComplete, name = "password", hint }: {
  label: string; value: string; onChange: (value: string) => void; autoComplete: string; name?: string; hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return <Field label={label} icon={LockKeyhole} hint={hint}>
    <input name={name} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required minLength={12} maxLength={128} />
    <button type="button" className="password-toggle" onClick={() => setVisible((shown) => !shown)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
  </Field>;
}

function ErrorNotice({ children }: { children: string }) {
  return <p className="auth-error" role="alert">{children}</p>;
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <button className="auth-submit" type="submit" disabled={busy}>{busy ? <><span className="auth-spinner" /> Please wait…</> : <>{children} <ArrowRight size={16} /></>}</button>;
}

function LoginForm() {
  const { authenticated, onAuthenticated } = useFintech();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const returnTo = params.get("returnTo");

  useEffect(() => {
    if (authenticated) navigate("/welcome-dashboard", { replace: true });
  }, [authenticated, navigate]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await authApi.login({ identifier: identifier.trim(), password, remember_me: remember });
      onAuthenticated(user);
      const safeReturn = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/welcome-dashboard";
      navigate(safeReturn, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in could not be completed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return <AuthFrame kind="login">
    <span className="auth-eyebrow">SIGN IN TO FINTECH</span>
    <h2 id="auth-title">Welcome Back.</h2>
    <p className="auth-subtitle">Continue your journey toward financial clarity.</p>
    <form className="auth-form" onSubmit={submit}>
      <Field label="Email address" icon={Mail}><input autoComplete="username" type="email" inputMode="email" placeholder="you@example.com" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required maxLength={254} /></Field>
      <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
      <div className="auth-form-options"><label className="auth-checkbox"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Remember me</span></label><Link to="/forgot-password">Forgot password?</Link></div>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <SubmitButton busy={busy}>Sign In</SubmitButton>
    </form>
    <p className="auth-switch">Don’t have an account? <Link to="/register">Create one</Link></p>
    <p className="auth-privacy-note"><ShieldCheck size={13} /> Secure server-managed sign-in</p>
  </AuthFrame>;
}

function RegisterForm() {
  const { onAuthenticated } = useFintech();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const navigate = useNavigate();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password !== confirmation) return setError("Your passwords do not match.");
    if (!accepted) return setError("Please accept the Terms of Service and Privacy Policy to continue.");
    setBusy(true);
    try {
      const result = await authApi.register({ full_name: fullName.trim(), email: email.trim(), password });
      if (result.development_verification_token) {
        await authApi.verifyEmail(result.development_verification_token);
        const user = await authApi.me();
        onAuthenticated(user);
        navigate("/welcome-dashboard", { replace: true, state: { welcomeName: user.full_name } });
      } else {
        setVerificationToken("email");
      }
    } catch (cause) {
      setError(cause instanceof AuthApiError && cause.status === 409
        ? "An account already uses this email address. Try signing in instead."
        : cause instanceof Error ? cause.message : "Account creation could not be completed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return <AuthFrame kind="register">
    <span className="auth-eyebrow">CREATE YOUR ACCOUNT</span>
    <h2 id="auth-title">Shape Your Financial Future.</h2>
    <p className="auth-subtitle">Build a clearer picture of your money and discover what matters next.</p>
    {verificationToken === "email" && <div className="auth-success" role="status"><CheckCircle2 size={20} /><div><b>Account created</b><p>Follow the verification link sent to your email, then sign in.</p></div></div>}
    {verificationToken !== "email" && <form className="auth-form auth-form-register" onSubmit={submit}>
      <Field label="Full name" icon={UserRound}><input type="text" autoComplete="name" placeholder="Your full name" value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} maxLength={100} /></Field>
      <Field label="Email address" icon={Mail}><input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></Field>
      <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 12 characters, including uppercase, lowercase, and a number." />
      <PasswordField label="Confirm password" name="confirm-password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
      <label className="auth-checkbox auth-terms"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.</span></label>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <SubmitButton busy={busy}>Create Account</SubmitButton>
    </form>}
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    <p className="auth-privacy-note"><ShieldCheck size={13} /> Your financial profile comes later, never at sign up.</p>
  </AuthFrame>;
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await authApi.forgotPassword(email.trim());
      setComplete(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password recovery could not be requested. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return <AuthFrame kind="forgot">
    <span className="auth-eyebrow">ACCOUNT RECOVERY</span>
    <h2 id="auth-title">Forgot Password?</h2>
    <p className="auth-subtitle">Enter the email address associated with your account.</p>
    {complete ? <div className="auth-success" role="status"><CheckCircle2 size={20} /><div><b>Check the recovery instructions</b><p>If an account matches that email, instructions are on the way. Local development does not send email; reset links are printed in the backend console.</p></div></div> : <form className="auth-form" onSubmit={submit}>
      <Field label="Email address" icon={Mail}><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></Field>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <SubmitButton busy={busy}>Send Recovery Instructions</SubmitButton>
    </form>}
    <p className="auth-switch"><Link to="/login"><ArrowLeft size={13} /> Back to sign in</Link></p>
  </AuthFrame>;
}

function VerifyEmailPage() {
  const [search] = useSearchParams();
  const token = search.get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { onAuthenticated } = useFintech();

  const verify = async () => {
    setBusy(true);
    setError("");
    try {
      await authApi.verifyEmail(token);
      const user = await authApi.me();
      onAuthenticated(user);
      navigate("/welcome-dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This verification link could not be confirmed.");
    } finally {
      setBusy(false);
    }
  };

  return <AuthFrame kind="verify">
    <span className="auth-eyebrow">EMAIL VERIFICATION</span>
    <h2 id="auth-title">Verify your email</h2>
    <p className="auth-subtitle">{token ? "Confirm this single-use link to activate your account." : "Open the single-use link from your email to verify your account."}</p>
    {error && <ErrorNotice>{error}</ErrorNotice>}
    {token && <button className="auth-submit" type="button" disabled={busy} onClick={() => void verify()}>{busy ? "Verifying…" : "Verify and continue"} <ArrowRight size={16} /></button>}
    <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
  </AuthFrame>;
}

function ResetPasswordForm() {
  const [search] = useSearchParams();
  const [token, setToken] = useState(search.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const navigate = useNavigate();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password !== confirmation) return setError("Your passwords do not match.");
    setBusy(true);
    try {
      await authApi.resetPassword(token.trim(), password);
      setComplete(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The password could not be reset. Request a new link.");
    } finally {
      setBusy(false);
    }
  };

  return <AuthFrame kind="reset">
    <span className="auth-eyebrow">SECURE PASSWORD RESET</span>
    <h2 id="auth-title">Choose a new password</h2>
    <p className="auth-subtitle">Reset links are single-use and expire automatically.</p>
    {complete ? <div className="auth-success" role="status"><CheckCircle2 size={20} /><div><b>Password updated</b><p>You can now sign in using your new password.</p><button type="button" className="auth-inline-button" onClick={() => navigate("/login")}>Go to sign in</button></div></div> : <form className="auth-form" onSubmit={submit}>
      <Field label="Recovery token" icon={LockKeyhole}><input value={token} onChange={(event) => setToken(event.target.value)} required minLength={32} maxLength={128} autoComplete="one-time-code" /></Field>
      <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" hint="12+ characters, with uppercase, lowercase, and a number." />
      <PasswordField label="Confirm new password" name="confirm-password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <SubmitButton busy={busy}>Reset Password</SubmitButton>
    </form>}
    <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
  </AuthFrame>;
}

export function AuthPage({ kind }: { kind: AuthKind }) {
  if (kind === "login") return <LoginForm />;
  if (kind === "register") return <RegisterForm />;
  if (kind === "forgot") return <ForgotPasswordForm />;
  if (kind === "verify") return <VerifyEmailPage />;
  return <ResetPasswordForm />;
}
