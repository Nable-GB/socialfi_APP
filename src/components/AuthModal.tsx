import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { authApi } from "../lib/api";
import { Wallet, Mail, Lock, User, Zap, RefreshCw, ArrowLeft } from "lucide-react";

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

  // Demo quick-login for testing
  const demoLogin = async (demoEmail: string) => {
    try {
      setIsLoading(true);
      await login(demoEmail, "Password123!");
      toast.success(t.auth.demoSuccess);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.auth.demoFailed);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-400 to-indigo-500">
              {mode === "forgot" ? <Lock size={14} className="text-white" /> : <Zap size={14} className="text-white" />}
            </div>
            {mode === "login" ? t.auth.signInTitle : mode === "register" ? t.auth.registerTitle : t.auth.resetTitle}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {mode === "login"
              ? t.auth.signInDesc
              : mode === "register"
              ? t.auth.joinSmfi
              : t.auth.resetDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {/* Forgot Password mode */}
          {mode === "forgot" && (
            <>
              <p className="text-xs text-slate-400">{t.auth.enterEmailReset}</p>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input type="email" placeholder={t.auth.emailPlaceholder} value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
                  className="bg-slate-800 border-slate-700 text-white pl-9 placeholder:text-slate-500" />
              </div>
              <Button onClick={handleForgotPassword} disabled={isLoading} className="w-full py-5 font-bold text-sm"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
                {isLoading ? <><RefreshCw size={15} className="animate-spin mr-2" /> {t.auth.sending}</> : t.auth.sendResetLink}
              </Button>
              <button onClick={() => setMode("login")}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mx-auto">
                <ArrowLeft size={12} /> {t.auth.backToSignIn}
              </button>
            </>
          )}

          {/* Email (login/register) */}
          {mode !== "forgot" && <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              type="email"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleLogin()}
              className="bg-slate-800 border-slate-700 text-white pl-9 placeholder:text-slate-500"
            />
          </div>}

          {/* Username (register only) */}
          {mode === "register" && (
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder={t.auth.usernamePlaceholder}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, "_"))}
                className="bg-slate-800 border-slate-700 text-white pl-9 placeholder:text-slate-500"
              />
            </div>
          )}

          {/* Display Name (register only) */}
          {mode === "register" && (
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder={t.auth.displayPlaceholder}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white pl-9 placeholder:text-slate-500"
              />
            </div>
          )}

          {/* Password (login/register only) */}
          {mode !== "forgot" && (
            <div>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type="password"
                  placeholder={mode === "register" ? t.auth.passwordMinPlaceholder : t.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleLogin()}
                  className="bg-slate-800 border-slate-700 text-white pl-9 placeholder:text-slate-500"
                />
              </div>
              {mode === "login" && (
                <button onClick={() => setMode("forgot")}
                  className="text-xs text-slate-500 hover:text-cyan-400 transition-colors mt-1.5 block text-right w-full">
                  {t.auth.forgotPassword}
                </button>
              )}
            </div>
          )}

          {/* Referral Code (register only) */}
          {mode === "register" && (
            <Input
              placeholder={t.auth.referralPlaceholder}
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-mono text-sm"
            />
          )}

          {/* Submit (login/register only) */}
          {mode !== "forgot" && <>
            <Button
              onClick={mode === "login" ? handleLogin : handleRegister}
              disabled={isLoading}
              className="w-full py-5 font-bold text-sm"
              style={{
                background: "linear-gradient(135deg, #22d3ee, #6366f1)",
                boxShadow: "0 4px 15px rgba(34,211,238,0.25)",
              }}
            >
              {isLoading ? (
                <><RefreshCw size={15} className="animate-spin mr-2" /> {t.profile.loading}</>
              ) : mode === "login" ? t.auth.signInTitle : t.auth.registerTitle}
            </Button>

            {/* Toggle mode */}
            <p className="text-center text-xs text-slate-500">
              {mode === "login" ? t.auth.noAccount : t.auth.hasAccount}{" "}
              <button
                onClick={() => { setMode(mode === "login" ? "register" : "login"); reset(); }}
                className="text-cyan-400 hover:text-cyan-300 font-medium"
              >
                {mode === "login" ? t.auth.signUp : t.auth.signInTitle}
              </button>
            </p>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/50" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900 px-2 text-slate-500">{t.auth.orDemo}</span>
              </div>
            </div>

            {/* Demo accounts */}
            <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => demoLogin("alice@example.com")}
              disabled={isLoading}
              className="py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Wallet size={12} /> {t.auth.demoUser}
              </span>
            </button>
            <button
              onClick={() => demoLogin("merchant@nftstore.io")}
              disabled={isLoading}
              className="py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80 border border-indigo-500/30 text-indigo-400 hover:text-white hover:bg-indigo-500/10"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Zap size={12} /> {t.auth.demoMerchant}
              </span>
            </button>
            </div>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
