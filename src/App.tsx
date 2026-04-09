import { useState, useEffect } from "react";
import {
  Wallet,
  RefreshCw,
  Shield,
  LogOut,
  Mail,
  X,
  Headphones,
  Trophy,
  Upload,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { useLang } from "./contexts/LangContext";
import { useRewards } from "./hooks/useRewards";
import { useWallet } from "./hooks/useWallet";
import { usePlayer } from "./contexts/PlayerContext";
import { AuthModal } from "./components/AuthModal";
import { VerifyEmailPage } from "./components/VerifyEmailPage";
import { ResetPasswordPage } from "./components/ResetPasswordPage";
import { AudioPlayerBar } from "./components/AudioPlayerBar";
import { SocialMusicFiLanding } from "./components/SocialMusicFiLanding";
import { ListenPage } from "./components/ListenPage";
import { CompetePage } from "./components/CompetePage";
import { CreatePage } from "./components/CreatePage";
import { MePage } from "./components/MePage";
import { FABMenu } from "./components/FABMenu";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { NotificationCenter } from "./components/NotificationCenter";
import { authApi } from "./lib/api";
import { toast } from "sonner";

function LangSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <div
      className="flex items-center rounded-xl overflow-hidden border border-slate-700/30"
      style={{ background: "rgba(15,23,42,0.6)" }}
    >
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1.5 text-xs font-bold transition-all ${
          lang === "en"
            ? "bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-400"
            : "text-slate-500 hover:text-slate-300"
        }`}
      >
        EN
      </button>
      <div className="w-px h-4 bg-slate-700/50" />
      <button
        onClick={() => setLang("ko")}
        className={`px-2.5 py-1.5 text-xs font-bold transition-all ${
          lang === "ko"
            ? "bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-400"
            : "text-slate-500 hover:text-slate-300"
        }`}
      >
        한국어
      </button>
    </div>
  );
}

function Header({ onOpenAuth, onOpenLanding }: { onOpenAuth: () => void; onOpenLanding: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLang();
  const wallet = useWallet();
  const { balance } = useRewards();
  const shortAddr = wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : null;

  const handleConnectWallet = async () => {
    try {
      await wallet.connect();
      toast.success(t.header.connectWallet);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to connect wallet");
    }
  };

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl border-b border-slate-800/50"
      style={{ background: "rgba(3,7,17,0.85)" }}
    >
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button onClick={onOpenLanding} className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-white font-black text-sm">
            S
          </div>
          <div className="min-w-0 text-left">
            <div className="text-sm font-black tracking-tight text-slate-100">SocialMusicFi</div>
            <div className="text-[10px] text-slate-500">Music. Competition. Ownership.</div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-700/30"
            style={{ background: "rgba(15,23,42,0.6)" }}
          >
            <Wallet size={13} className="text-amber-400" />
            <span className="text-xs font-mono text-slate-300">{parseFloat(balance || "0").toFixed(2)} SMFI</span>
          </div>

          {!wallet.address && isAuthenticated && (
            <button
              onClick={handleConnectWallet}
              disabled={wallet.isConnecting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.1))",
                border: "1px solid rgba(245,158,11,0.35)",
                color: "#fbbf24",
              }}
            >
              {wallet.isConnecting ? <RefreshCw size={13} className="animate-spin" /> : <Wallet size={13} />}
              <span className="hidden sm:inline">
                {wallet.isConnecting ? t.header.connecting : t.header.connectWallet}
              </span>
            </button>
          )}

          {isAuthenticated && wallet.address && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(34,211,238,0.08))",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
              <span className="text-emerald-400 font-semibold">{shortAddr}</span>
            </div>
          )}

          <LangSwitcher />
          {isAuthenticated && <NotificationCenter />}

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {(user?.displayName ?? user?.username ?? "U")[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-emerald-400">{user?.displayName ?? user?.username}</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  toast.info(t.header.signedOut);
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-slate-800 border border-slate-700/20 text-slate-500 hover:text-red-400"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15))",
                border: "1px solid rgba(99,102,241,0.35)",
                color: "#a5b4fc",
              }}
            >
              <Wallet size={14} />
              <span className="hidden sm:block">{t.header.signIn}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function DesktopNavUserChip({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLang();

  if (!isAuthenticated) {
    return (
      <div className="mt-auto pt-6 pb-2">
        <button
          onClick={onOpenAuth}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.15))",
            border: "1px solid rgba(99,102,241,0.35)",
            color: "#a5b4fc",
          }}
        >
          {t.header.signInRegister}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-auto pt-6 pb-2">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/10">
        <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {(user?.displayName ?? user?.username ?? "U")[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-200 truncate">{user?.displayName ?? user?.username}</p>
          <p className="text-xs truncate text-slate-600 font-mono">@{user?.username}</p>
        </div>
        <button
          onClick={() => {
            logout();
            toast.info(t.header.signedOut);
          }}
          className="text-slate-500 hover:text-red-400 ml-auto flex-shrink-0 p-1 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

function DesktopNav({ activeNav, setActiveNav, onOpenAuth }: { activeNav: string; setActiveNav: (id: string) => void; onOpenAuth: () => void }) {
  const { user } = useAuth();
  const { t } = useLang();

  const navItems = [
    { id: "listen", icon: Headphones, label: t.nav.listen },
    { id: "compete", icon: Trophy, label: t.nav.compete },
    { id: "create", icon: Upload, label: t.nav.create },
    { id: "me", icon: UserIcon, label: t.nav.me },
    ...(user?.role === "ADMIN" ? [{ id: "admin", icon: Shield, label: t.nav.admin }] : []),
  ];

  return (
    <nav className="sticky top-14 pt-6 flex flex-col gap-1 h-fit">
      {navItems.map((item, idx) => (
        <div key={item.id}>
          {idx === 4 && <div className="my-2 h-px bg-slate-700/30" />}
          <button
            onClick={() => setActiveNav(item.id)}
            className={`nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-left w-full transition-all ${activeNav === item.id ? "active" : ""}`}
            style={{ color: activeNav === item.id ? "#22d3ee" : "#94a3b8", fontWeight: activeNav === item.id ? 600 : 400 }}
          >
            <item.icon size={18} />
            <span className="text-sm">{item.label}</span>
          </button>
        </div>
      ))}
      <DesktopNavUserChip onOpenAuth={onOpenAuth} />
    </nav>
  );
}

function BottomNav({ mobileTab, setMobileTab }: { mobileTab: string; setMobileTab: (id: string) => void }) {
  const { t } = useLang();

  const navItems = [
    { id: "listen", icon: Headphones, label: t.nav.listen },
    { id: "compete", icon: Trophy, label: t.nav.compete },
    { id: "create", icon: Upload, label: t.nav.create },
    { id: "me", icon: UserIcon, label: t.nav.me },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.04] flex lg:hidden"
      style={{ background: "rgba(3,7,17,0.95)", backdropFilter: "blur(20px)" }}
    >
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setMobileTab(item.id)}
          className={`bnav-item flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all ${mobileTab === item.id ? "active" : ""}`}
          style={{ color: mobileTab === item.id ? "#22d3ee" : "#475569" }}
        >
          <item.icon size={20} className="bnav-icon" />
          <span className="text-[10px]" style={{ fontWeight: mobileTab === item.id ? 600 : 400 }}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useLang();
  const { currentTrack } = usePlayer();
  const appEnteredKey = "smfi_app_entered";
  const defaultPage = "listen";
  const onboardingKey = "smfi_onboarding_done";

  const getPageFromHash = () => {
    const raw = window.location.hash.replace(/^#/, "").trim();
    return raw || null;
  };

  const [mobileTab, setMobileTab] = useState(() => getPageFromHash() || localStorage.getItem("mobileTab") || defaultPage);
  const [activeNav, setActiveNav] = useState(() => getPageFromHash() || localStorage.getItem("activeNav") || defaultPage);
  const [authOpen, setAuthOpen] = useState(false);
  const [forceLanding, setForceLanding] = useState(false);
  const [showLanding, setShowLanding] = useState(() => {
    try {
      if (getPageFromHash()) return false;
      return localStorage.getItem(appEnteredKey) !== "true";
    } catch {
      return true;
    }
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem(onboardingKey) !== "true";
    } catch {
      return false;
    }
  });
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  const navigateTo = (page: string) => {
    setForceLanding(false);
    setActiveNav(page);
    setMobileTab(page);
  };

  const openLandingPage = () => {
    setAuthOpen(false);
    setForceLanding(true);
    try {
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
    } catch {}
  };

  useEffect(() => {
    localStorage.setItem("mobileTab", mobileTab);
  }, [mobileTab]);

  useEffect(() => {
    localStorage.setItem("activeNav", activeNav);
  }, [activeNav]);

  useEffect(() => {
    const currentPage = activeNav || mobileTab || defaultPage;
    if (window.location.hash !== `#${currentPage}`) {
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}#${currentPage}`);
    }
  }, [activeNav, mobileTab, defaultPage]);

  useEffect(() => {
    const handleHashChange = () => {
      const page = getPageFromHash();
      if (!page) return;
      setActiveNav(page);
      setMobileTab(page);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        setShowLanding(false);
        setForceLanding(false);
        try {
          localStorage.setItem(appEnteredKey, "true");
        } catch {}
      } else if (getPageFromHash()) {
        setShowLanding(false);
      }
    }
  }, [isLoading, isAuthenticated]);

  const urlParams = new URLSearchParams(window.location.search);
  const verifyToken = window.location.pathname === "/verify-email" ? urlParams.get("token") : null;
  const resetToken = window.location.pathname === "/reset-password" ? urlParams.get("token") : null;

  if (verifyToken) {
    return (
      <VerifyEmailPage
        token={verifyToken}
        onDone={() => {
          window.history.replaceState({}, "", "/");
          window.location.reload();
        }}
      />
    );
  }

  if (resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
        onDone={() => {
          window.history.replaceState({}, "", "/");
          window.location.reload();
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030711] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 animate-pulse" />
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "0s" }} />
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0.1s" }} />
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
        </div>
      </div>
    );
  }

  const handleSendVerification = async () => {
    setSendingVerification(true);
    try {
      await authApi.sendVerification();
      toast.success(t.auth.verificationSent);
    } catch (err: any) {
      toast.error(err?.message ?? t.auth.verificationFailed);
    } finally {
      setSendingVerification(false);
    }
  };

  if (forceLanding || (!isAuthenticated && showLanding)) {
    return (
      <>
        <SocialMusicFiLanding
          onLaunchApp={() => {
            setForceLanding(false);
            setShowLanding(false);
            navigateTo(activeNav || mobileTab || defaultPage);
          }}
          onApplyArtist={() => setAuthOpen(true)}
        />
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  const showVerifyBanner = user?.email && !user.emailVerified && !verifyBannerDismissed;

  return (
    <div className="bg-mesh min-h-screen">
      {showOnboarding && isAuthenticated && (
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false);
            try {
              localStorage.setItem(onboardingKey, "true");
            } catch {}
          }}
        />
      )}

      <Header onOpenAuth={() => setAuthOpen(true)} onOpenLanding={openLandingPage} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />

      {showVerifyBanner && (
        <div
          className="sticky top-14 z-40 w-full"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.1))",
            borderBottom: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center gap-3">
            <Mail size={15} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-300 flex-1">{t.auth.verifyEmailBanner}</p>
            <button
              onClick={handleSendVerification}
              disabled={sendingVerification}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/40 px-3 py-1 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
            >
              {sendingVerification ? <RefreshCw size={11} className="animate-spin" /> : null}
              {sendingVerification ? t.auth.sending : t.auth.sendLink}
            </button>
            <button onClick={() => setVerifyBannerDismissed(true)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-4">
        <div className="hidden lg:grid gap-6 py-6" style={{ gridTemplateColumns: "220px 1fr" }}>
          <DesktopNav activeNav={activeNav} setActiveNav={navigateTo} onOpenAuth={() => setAuthOpen(true)} />

          <main className="min-w-0">
            {activeNav === "listen" && <ListenPage />}
            {activeNav === "compete" && <CompetePage />}
            {activeNav === "create" && <CreatePage onOpenAuth={() => setAuthOpen(true)} onNavigate={navigateTo} />}
            {activeNav === "me" && <MePage onOpenAuth={() => setAuthOpen(true)} />}
            {activeNav === "admin" && <MePage onOpenAuth={() => setAuthOpen(true)} />}
          </main>
        </div>

        <div className={`lg:hidden ${currentTrack ? "pb-52" : "pb-24"} pt-4`}>
          {mobileTab === "listen" && <ListenPage />}
          {mobileTab === "compete" && <CompetePage />}
          {mobileTab === "create" && <CreatePage onOpenAuth={() => setAuthOpen(true)} onNavigate={navigateTo} />}
          {mobileTab === "me" && <MePage onOpenAuth={() => setAuthOpen(true)} />}
        </div>
      </div>

      <AudioPlayerBar />
      <BottomNav mobileTab={mobileTab} setMobileTab={navigateTo} />
      <div className="lg:hidden">
        <FABMenu onNavigate={navigateTo} onOpenAuth={() => setAuthOpen(true)} />
      </div>
    </div>
  );
}
