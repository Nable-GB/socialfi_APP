import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { authApi } from "../lib/api";
import { Mail, Lock, User, Zap, RefreshCw, ArrowLeft, ShieldCheck, BadgeCheck, KeyRound, X } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mode = "login" | "register" | "forgot";

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { login, register } = useAuth();
  const { t } = useLang();
  const [mode, setMode] = useState<Mode>("login");
  const [isLoading, setIsLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register extra fields
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const reset = () => {
    setEmail(""); setPassword(""); setUsername("");
    setDisplayName(""); setReferralCode("");
  };

  const handleLogin = async () => {
    if (!email || !password) { toast.error(t.auth.fillAllFields); return; }
    try {
      setIsLoading(true);
      await login(email, password);
      toast.success(t.auth.welcomeBack);
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.auth.loginFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !username) {
      toast.error(t.auth.emailReq);
      return;
    }
    if (password.length < 8) { toast.error(t.auth.passwordMin); return; }
    try {
      setIsLoading(true);
      await register({ email, password, username, displayName: displayName || username, referralCode: referralCode || undefined });
      toast.success(t.auth.accountCreated);
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.auth.regFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { toast.error(t.auth.enterEmail); return; }
    try {
      setIsLoading(true);
      await authApi.forgotPassword(email);
      toast.success(t.auth.resetSent);
      setMode("login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.auth.resetFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const title = mode === "login" ? t.auth.signInTitle : mode === "register" ? t.auth.registerTitle : t.auth.resetTitle;
  const description = mode === "login"
    ? t.auth.signInDesc
    : mode === "register"
      ? t.auth.joinSmfi
      : t.auth.resetDesc;
  const trustSignals = [
    { icon: ShieldCheck, label: t.auth.trustEncrypted },
    { icon: KeyRound, label: t.auth.trustRecovery },
    { icon: BadgeCheck, label: t.auth.trustVerified },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-lg overflow-hidden border border-slate-200 bg-white p-0 text-slate-900 shadow-[0_32px_90px_rgba(15,23,42,0.22)]">
        <div className="relative bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_38%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="px-6 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-8">
            <DialogHeader className="items-center text-center">
              <div className="mb-5 flex flex-col items-center gap-4">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-slate-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:h-32 sm:w-32">
                  <img src="/smfi-logo.jpeg" alt="SMFI" className="h-16 w-16 rounded-full object-contain sm:h-20 sm:w-20" />
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  <ShieldCheck size={13} />
                  {t.auth.secureAccess}
                </div>
              </div>

              <DialogTitle className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                {title}
              </DialogTitle>
              <DialogDescription className="max-w-md text-sm leading-6 text-slate-600">
                {description}
              </DialogDescription>
              <p className="max-w-md text-xs leading-5 text-slate-500">
                {t.auth.officialPortal}
              </p>
            </DialogHeader>

            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {trustSignals.map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-cyan-700">
                      <Icon size={15} />
                    </span>
                    <span>{label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#2563eb)] text-white shadow-[0_10px_26px_rgba(37,99,235,0.22)]">
                  {mode === "forgot" ? <Lock size={18} /> : <Zap size={18} />}
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-950">{title}</p>
                  <p className="text-xs text-slate-500">{t.auth.securityNote}</p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {mode === "forgot" && (
                  <>
                    <p className="text-sm leading-6 text-slate-600">{t.auth.enterEmailReset}</p>
                    <div className="relative">
                      <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="email"
                        placeholder={t.auth.emailPlaceholder}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
                        className="h-14 rounded-2xl border-slate-200 !bg-white pl-11 text-slate-900 placeholder:text-slate-400 focus-visible:border-cyan-400/40"
                      />
                    </div>
                    <Button
                      onClick={handleForgotPassword}
                      disabled={isLoading}
                      className="h-14 w-full rounded-2xl text-sm font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)", boxShadow: "0 14px 30px rgba(37,99,235,0.18)" }}
                    >
                      {isLoading ? <><RefreshCw size={15} className="animate-spin mr-2" /> {t.auth.sending}</> : t.auth.sendResetLink}
                    </Button>
                    <button
                      onClick={() => setMode("login")}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
                    >
                      <ArrowLeft size={12} /> {t.auth.backToSignIn}
                    </button>
                  </>
                )}

                {mode !== "forgot" && <div className="relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    placeholder={t.auth.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleLogin()}
                    className="h-14 rounded-2xl border-slate-200 !bg-white pl-11 text-slate-900 placeholder:text-slate-400"
                  />
                </div>}

                {mode === "register" && (
                  <div className="relative">
                    <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder={t.auth.usernamePlaceholder}
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, "_"))}
                      className="h-14 rounded-2xl border-slate-200 !bg-white pl-11 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                )}

                {mode === "register" && (
                  <div className="relative">
                    <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder={t.auth.displayPlaceholder}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-14 rounded-2xl border-slate-200 !bg-white pl-11 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                )}

                {mode !== "forgot" && (
                  <div>
                    <div className="relative">
                      <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="password"
                        placeholder={mode === "register" ? t.auth.passwordMinPlaceholder : t.auth.passwordPlaceholder}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleLogin()}
                        className="h-14 rounded-2xl border-slate-200 !bg-white pl-11 text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                    {mode === "login" && (
                      <button
                        onClick={() => setMode("forgot")}
                        className="mt-2 block w-full text-right text-xs font-medium text-slate-500 transition-colors hover:text-sky-700"
                      >
                        {t.auth.forgotPassword}
                      </button>
                    )}
                  </div>
                )}

                {mode === "register" && (
                  <Input
                    placeholder={t.auth.referralPlaceholder}
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="h-14 rounded-2xl border-slate-200 !bg-white font-mono text-sm text-slate-900 placeholder:text-slate-400"
                  />
                )}

                {mode !== "forgot" && <>
                  <Button
                    onClick={mode === "login" ? handleLogin : handleRegister}
                    disabled={isLoading}
                    className="h-14 w-full rounded-2xl text-sm font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
                      boxShadow: "0 16px 34px rgba(37,99,235,0.2)",
                    }}
                  >
                    {isLoading ? (
                      <><RefreshCw size={15} className="animate-spin mr-2" /> {t.profile.loading}</>
                    ) : mode === "login" ? t.auth.signInTitle : t.auth.registerTitle}
                  </Button>

                  <p className="pt-1 text-center text-sm text-slate-500">
                    {mode === "login" ? t.auth.noAccount : t.auth.hasAccount}{" "}
                    <button
                      onClick={() => { setMode(mode === "login" ? "register" : "login"); reset(); }}
                      className="font-semibold text-sky-700 transition-colors hover:text-sky-900"
                    >
                      {mode === "login" ? t.auth.signUp : t.auth.signInTitle}
                    </button>
                  </p>
                </>}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
