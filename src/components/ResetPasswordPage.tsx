import { useState } from "react";
import { authApi } from "../lib/api";
import { Lock, CheckCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ResetPasswordPageProps {
  token: string;
  onDone: () => void;
}

export function ResetPasswordPage({ token, onDone }: ResetPasswordPageProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in both fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" }}>
      <div className="glass rounded-2xl p-10 max-w-md w-full border border-slate-700/20"
        style={{ boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}>

        {!success ? (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-4"
                style={{ border: "2px solid rgba(245,158,11,0.3)" }}>
                <Lock size={28} className="text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Reset Your Password</h2>
              <p className="text-sm text-slate-400 mt-1">Enter your new password below.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleReset()}
                    className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-amber-500/50 placeholder:text-slate-600"
                    placeholder="Min. 8 characters"
                  />
                  <button onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Confirm New Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleReset()}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-amber-500/50 placeholder:text-slate-600"
                  placeholder="Repeat password"
                />
              </div>

              {newPassword && (
                <div className="flex gap-1.5 mt-1">
                  {[newPassword.length >= 8, /[A-Z]/.test(newPassword), /[0-9]/.test(newPassword)].map((ok, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${ok ? "bg-emerald-400" : "bg-slate-700"}`} />
                  ))}
                </div>
              )}

              <button onClick={handleReset} disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90 mt-2"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <Lock size={15} />}
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4"
              style={{ border: "2px solid rgba(16,185,129,0.3)" }}>
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Password Reset!</h2>
            <p className="text-sm text-slate-400 mb-6">Your password has been updated. You can now log in with your new password.</p>
            <button onClick={onDone}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)" }}>
              Go to Login →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
