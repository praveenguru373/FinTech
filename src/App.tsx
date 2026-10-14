import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { readProfile, setStorageUserId, writeProfile } from "./lib/storage";
import type { FinancialProfile } from "./types";
import { Layout } from "./components/Layout";
import {
  AboutPage,
  ActionPlanPage,
  DashboardPage,
  EducationPage,
  GoalsPage,
  LandingPage,
  MobileEntryPage,
  PrivacyPage,
  ProfileWizardPage,
  SectionPage,
  SettingsPage,
  TransactionsPage,
  WelcomeDashboardPage,
} from "./pages";
import { AuthPage } from "./pages/AuthPages";
import { clearLocalVerification, readLocalVerification, writeLocalVerification } from "./lib/storage";
import { authApi } from "./services/auth";
import type { AuthUser } from "./services/auth";

interface AppContextValue {
  profile: FinancialProfile | null;
  verifiedPhone: string | null;
  authUser: AuthUser | null;
  authLoading: boolean;
  authenticated: boolean;
  saveProfile: (profile: FinancialProfile) => void;
  clearProfile: () => void;
  verifyPhone: (phone: string) => void;
  clearVerification: () => void;
  onAuthenticated: (user: AuthUser) => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useFintech(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useFintech must be used inside App.");
  return context;
}

function PrivatePage({ children }: { children: React.ReactNode }) {
  const { profile, verifiedPhone, authUser, authLoading } = useFintech();
  const location = useLocation();
  if (authLoading) return <div className="auth-loading" role="status">Checking your secure session…</div>;
  if (!authUser && !(import.meta.env.DEV && verifiedPhone)) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  return profile ? <>{children}</> : <Navigate to="/welcome-dashboard" replace />;
}

function VerifiedPage({ children }: { children: React.ReactNode }) {
  const { verifiedPhone, authUser, authLoading } = useFintech();
  const location = useLocation();
  if (authLoading) return <div className="auth-loading" role="status">Checking your secure session…</div>;
  return authUser || (import.meta.env.DEV && verifiedPhone)
    ? <>{children}</>
    : <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
}

export default function App() {
  const [profile, setProfile] = useState<FinancialProfile | null>(() => readProfile());
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(() => readLocalVerification());
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authApi.session().then((user) => {
      if (!active) return;
      if (user) {
        setStorageUserId(user.id);
        setAuthUser(user);
        setVerifiedPhone(null);
        clearLocalVerification();
        setProfile(readProfile());
      } else {
        setStorageUserId(null);
        setAuthUser(null);
      }
    }).catch(() => {
      if (!active) return;
      setStorageUserId(null);
      setAuthUser(null);
    }).finally(() => {
      if (active) setAuthLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const refresh = () => setProfile(readProfile());
    window.addEventListener("fintech-profile-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("fintech-profile-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const saveProfile = (next: FinancialProfile) => {
    writeProfile(next);
    setProfile(next);
  };
  const clearProfile = () => setProfile(null);
  const verifyPhone = (phone: string) => {
    writeLocalVerification(phone);
    setVerifiedPhone(phone);
  };
  const clearVerification = () => {
    clearLocalVerification();
    setVerifiedPhone(null);
  };
  const onAuthenticated = (user: AuthUser) => {
    setStorageUserId(user.id);
    setAuthUser(user);
    setVerifiedPhone(null);
    clearLocalVerification();
    setProfile(readProfile());
  };
  const signOut = async () => {
    await authApi.logout();
    setAuthUser(null);
    setStorageUserId(null);
    clearVerification();
    setProfile(readProfile());
  };

  const authenticated = Boolean(authUser) || Boolean(import.meta.env.DEV && verifiedPhone);

  return (
    <AppContext.Provider value={{ profile, verifiedPhone, authUser, authLoading, authenticated, saveProfile, clearProfile, verifyPhone, clearVerification, onAuthenticated, signOut }}>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage kind="login" />} />
          <Route path="/register" element={<AuthPage kind="register" />} />
          <Route path="/forgot-password" element={<AuthPage kind="forgot" />} />
          <Route path="/verify-email" element={<AuthPage kind="verify" />} />
          <Route path="/reset-password" element={<AuthPage kind="reset" />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/how-it-works" element={<SectionPage type="how" />} />
          <Route path="/financial-education" element={<EducationPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<SectionPage type="terms" />} />
          <Route path="/onboarding" element={<MobileEntryPage />} />
          <Route path="/mobile-number" element={<MobileEntryPage />} />
          <Route path="/welcome-dashboard" element={<WelcomeDashboardPage />} />
          <Route path="/profile" element={<VerifiedPage><ProfileWizardPage /></VerifiedPage>} />
          <Route path="/onboarding/profile" element={<VerifiedPage><ProfileWizardPage /></VerifiedPage>} />
          <Route path="/dashboard" element={<PrivatePage><DashboardPage /></PrivatePage>} />
          <Route path="/financial-health" element={<PrivatePage><DashboardPage /></PrivatePage>} />
          <Route path="/income-expenses" element={<PrivatePage><TransactionsPage /></PrivatePage>} />
          <Route path="/emergency-fund" element={<PrivatePage><SectionPage type="emergency" /></PrivatePage>} />
          <Route path="/insurance" element={<PrivatePage><SectionPage type="insurance" /></PrivatePage>} />
          <Route path="/debt" element={<PrivatePage><SectionPage type="debt" /></PrivatePage>} />
          <Route path="/investments" element={<PrivatePage><SectionPage type="investments" /></PrivatePage>} />
          <Route path="/goals" element={<PrivatePage><GoalsPage /></PrivatePage>} />
          <Route path="/action-plan" element={<PrivatePage><ActionPlanPage /></PrivatePage>} />
          <Route path="/settings" element={<PrivatePage><SettingsPage onDelete={() => { clearProfile(); clearVerification(); }} /></PrivatePage>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AppContext.Provider>
  );
}
